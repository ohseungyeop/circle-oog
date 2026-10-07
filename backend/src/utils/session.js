import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// 로그인 세션 쿠키 (httpOnly - 브라우저 스크립트에서 읽을 수 없음)
export const SESSION_COOKIE = 'oogSession';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7일 (초)

// 이메일 로그인 링크 수명. 한 번 쓰면 만료 전이라도 다시 쓸 수 없습니다.
export const LINK_MAX_AGE = 60 * 15; // 15분 (초)

// 구글 OAuth 진행 중 state·PKCE verifier 를 담는 쿠키
export const GOOGLE_STATE_COOKIE = 'oogOauth';
export const GOOGLE_STATE_PATH = '/vos/oog/v1/auth/google';

const secret = () => {
    if (!process.env.JWT_SECRET_KEY) throw new Error('JWT_SECRET_KEY 가 설정되어 있지 않습니다.');
    return process.env.JWT_SECRET_KEY;
};

/** 이메일 주소 정규화. 대소문자·앞뒤 공백 차이를 없앱니다. */
export function normalizeEmail(input) {
    if (typeof input !== 'string') return null;
    const email = input.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** 무작위 문자열 (state, PKCE verifier, 링크 id) */
export const randomId = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');

/** PKCE code_challenge = base64url(SHA-256(verifier)) */
export const sha256B64url = (text) => crypto.createHash('sha256').update(text).digest('base64url');

// typ 으로 세션 토큰과 링크 토큰을 구분합니다 (링크 토큰을 세션으로 쓰거나 그 반대를 막음).
export const signSession = (email) => jwt.sign({ typ: 'session', email }, secret(), { expiresIn: SESSION_MAX_AGE });

export const signLink = (email, jti) => jwt.sign({ typ: 'link', email, jti }, secret(), { expiresIn: LINK_MAX_AGE });

/** 서명·만료·종류를 확인하고 payload 를 돌려줍니다. 틀리면 null. */
export function verifyTyped(token, typ) {
    if (!token) return null;
    try {
        const payload = jwt.verify(token, secret());
        return payload?.typ === typ && typeof payload.email === 'string' ? payload : null;
    } catch {
        return null;
    }
}

/** 쿠키 공통 옵션. 운영에서는 https 전용 + 공용 도메인 */
export function cookieOptions(extra = {}) {
    const options = { httpOnly: true, sameSite: 'Lax', path: '/', ...extra };
    if (process.env.NODE_ENV === 'prd') {
        options.secure = true;
        if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
    }
    return options;
}

export function setSessionCookie(reply, email) {
    reply.setCookie(SESSION_COOKIE, signSession(email), cookieOptions({ maxAge: SESSION_MAX_AGE }));
}

export function clearSessionCookie(reply) {
    reply.clearCookie(SESSION_COOKIE, cookieOptions());
}
