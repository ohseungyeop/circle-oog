import {
    GOOGLE_STATE_COOKIE,
    GOOGLE_STATE_PATH,
    LINK_MAX_AGE,
    SESSION_COOKIE,
    clearSessionCookie,
    cookieOptions,
    normalizeEmail,
    randomId,
    setSessionCookie,
    sha256B64url,
    signLink,
    verifyTyped,
} from '../utils/session.js';
import { isAdminEmail, isAllowedEmail, requestAccess } from '../utils/users.js';
import sendEmail from '../utils/emailHelper.js';

const backendUrl = () => process.env.BACKEND_URL.replace(/\/$/, '');
const frontendUrl = () => process.env.FRONTEND_URL.replace(/\/$/, '');

/** 로그인 화면으로 오류 코드와 함께 돌려보냅니다. (expired, not_allowed, google, google_off) */
const redirectToLogin = (reply, code) => reply.redirect(`${frontendUrl()}/?error=${code}`);

const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// 같은 주소로 연달아 보내는 것을 막습니다 (메모리, 재시작하면 초기화).
const lastSent = new Map();
const COOLDOWN_MS = 60 * 1000;

/**
 * 한 번 쓴 링크를 기록합니다. 처음 쓰는 링크면 true, 이미 쓴 링크면 false.
 * LNK_JTI 가 PK 라서 동시에 두 번 눌러도 한쪽만 성공합니다.
 */
async function markLinkUsed(fastify, jti, email, exp) {
    await fastify.knex('vos_oog_lgn_lnk').where('EXP_DT', '<', fastify.knex.fn.now()).del();
    try {
        await fastify.knex('vos_oog_lgn_lnk').insert({ LNK_JTI: jti, USR_EML: email, EXP_DT: new Date(exp * 1000) });
        return true;
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return false;
        throw error;
    }
}

// POST /vos/oog/v1/auth/email  body: { email }  → 허용된 주소면 로그인 링크를 메일로 보냅니다.
// 주소가 목록에 있는지 없는지는 응답으로 알려주지 않습니다 (등록 여부 탐색 방지).
const requestEmailLink = async (fastify, options) => {
    fastify.post('/', async (request, reply) => {
        const email = normalizeEmail(request.body?.email);
        if (!email) {
            return reply.status(400).send({ code: 'E', status: 'Error', message: '이메일 주소를 확인해 주세요.' });
        }

        const ok = {
            code: 'S',
            status: 'Success',
            message: `${email} 이 허용된 주소라면 로그인 링크를 보냈습니다. 메일함(스팸함 포함)을 확인하세요.`,
        };

        const last = lastSent.get(email) ?? 0;
        if (Date.now() - last < COOLDOWN_MS) return reply.send(ok);
        lastSent.set(email, Date.now());

        try {
            if (await isAllowedEmail(fastify, email)) {
                const link = `${backendUrl()}/vos/oog/v1/auth/email/callback?token=${encodeURIComponent(signLink(email, randomId()))}`;
                const minutes = LINK_MAX_AGE / 60;
                const text = [
                    `VOS OOG System 로그인 링크입니다. ${minutes}분 안에 아래 주소를 열어 주세요. 한 번 쓰면 다시 쓸 수 없습니다.`,
                    '',
                    link,
                    '',
                    '본인이 요청한 것이 아니면 이 메일은 무시하셔도 됩니다.',
                ].join('\n');
                await sendEmail(fastify, email, '[VOS OOG System] 로그인 링크', text);
            } else {
                // 목록에 없는 주소 = 사용 신청. 관리자에게 알리고, 같은 시간이 걸리는 것처럼 보이게 잠깐 기다립니다.
                await requestAccess(fastify, email, 'email');
                await new Promise((resolve) => setTimeout(resolve, 400));
            }
        } catch (error) {
            lastSent.delete(email);
            fastify.log.error(`❌ 로그인 링크 요청 실패: ${error.message}`);
            return reply.status(502).send({
                code: 'E',
                status: 'Error',
                message: '메일을 보내지 못했습니다. 잠시 후 다시 시도하거나 구글 로그인을 이용하세요.',
            });
        }
        return reply.send(ok);
    });
};

// GET /vos/oog/v1/auth/email/callback?token=…  → 메일의 링크. 토큰을 확인하고 세션을 발급합니다.
const emailLinkCallback = async (fastify, options) => {
    fastify.get('/', async (request, reply) => {
        const payload = verifyTyped(request.query.token, 'link');
        if (!payload || typeof payload.jti !== 'string') return redirectToLogin(reply, 'expired');

        if (!(await isAllowedEmail(fastify, payload.email))) return redirectToLogin(reply, 'not_allowed');
        if (!(await markLinkUsed(fastify, payload.jti, payload.email, payload.exp))) return redirectToLogin(reply, 'expired');

        fastify.log.info(`✅ 로그인 (email): ${payload.email}`);
        setSessionCookie(reply, payload.email);
        return reply.redirect(`${frontendUrl()}/mainPage`);
    });
};

// GET /vos/oog/v1/auth/google  → 구글 로그인 화면으로 보냅니다. (OAuth 2.0 authorization code + PKCE)
const googleLogin = async (fastify, options) => {
    fastify.get('/', async (request, reply) => {
        if (!googleConfigured()) return redirectToLogin(reply, 'google_off');

        const state = randomId();
        const verifier = randomId(48);

        const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
        url.searchParams.set('redirect_uri', `${backendUrl()}/vos/oog/v1/auth/google/callback`);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('scope', 'openid email');
        url.searchParams.set('state', state);
        url.searchParams.set('code_challenge', sha256B64url(verifier));
        url.searchParams.set('code_challenge_method', 'S256');
        url.searchParams.set('prompt', 'select_account');

        // state·verifier 를 10분짜리 쿠키에 담아 콜백에서 대조합니다.
        reply.setCookie(
            GOOGLE_STATE_COOKIE,
            JSON.stringify({ state, verifier }),
            cookieOptions({ path: GOOGLE_STATE_PATH, maxAge: 600 }),
        );
        return reply.redirect(url.toString());
    });
};

// GET /vos/oog/v1/auth/google/callback?code=…&state=…  → 구글에서 돌아온 뒤 이메일을 확인하고 세션을 발급합니다.
const googleCallback = async (fastify, options) => {
    fastify.get('/', async (request, reply) => {
        reply.clearCookie(GOOGLE_STATE_COOKIE, cookieOptions({ path: GOOGLE_STATE_PATH }));
        if (!googleConfigured()) return redirectToLogin(reply, 'google_off');

        let saved = {};
        try {
            saved = JSON.parse(request.cookies[GOOGLE_STATE_COOKIE] ?? '{}');
        } catch {
            /* 쿠키 없음 */
        }
        const { code, state } = request.query;
        if (!code || !state || !saved.state || !saved.verifier || state !== saved.state) return redirectToLogin(reply, 'google');

        try {
            // 인가 코드를 토큰으로 교환
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    redirect_uri: `${backendUrl()}/vos/oog/v1/auth/google/callback`,
                    grant_type: 'authorization_code',
                    code_verifier: saved.verifier,
                }),
            });
            if (!tokenRes.ok) {
                fastify.log.error(`❌ google token error ${tokenRes.status}: ${await tokenRes.text().catch(() => '')}`);
                return redirectToLogin(reply, 'google');
            }
            const { access_token } = await tokenRes.json();
            if (!access_token) return redirectToLogin(reply, 'google');

            // 구글이 확인한 이메일 주소
            const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            if (!infoRes.ok) return redirectToLogin(reply, 'google');
            const info = await infoRes.json();
            const email = normalizeEmail(info.email);
            if (!email || info.email_verified === false) return redirectToLogin(reply, 'google');

            if (!(await isAllowedEmail(fastify, email))) {
                await requestAccess(fastify, email, 'google');
                return redirectToLogin(reply, 'not_allowed');
            }

            fastify.log.info(`✅ 로그인 (google): ${email}`);
            setSessionCookie(reply, email);
            return reply.redirect(`${frontendUrl()}/mainPage`);
        } catch (error) {
            fastify.log.error(`❌ google login error: ${error.message}`);
            return redirectToLogin(reply, 'google');
        }
    });
};

// GET /vos/oog/v1/auth/me  → 현재 로그인한 사용자. 로그인 안 되어 있으면 401
const me = async (fastify, options) => {
    fastify.get('/', async (request, reply) => {
        const payload = verifyTyped(request.cookies[SESSION_COOKIE], 'session');
        if (!payload || !(await isAllowedEmail(fastify, payload.email))) {
            return reply.status(401).send({ code: 'E', status: 'Error', message: 'Login required' });
        }
        return reply.send({
            code: 'S',
            status: 'Success',
            data: { email: payload.email, admin: isAdminEmail(payload.email) },
        });
    });
};

// POST /vos/oog/v1/auth/logout  → 세션 쿠키 삭제
const logout = async (fastify, options) => {
    fastify.post('/', async (request, reply) => {
        clearSessionCookie(reply);
        return reply.send({ code: 'S', status: 'Success', message: 'Logged out successfully' });
    });
};

export { requestEmailLink, emailLinkCallback, googleLogin, googleCallback, me, logout };
