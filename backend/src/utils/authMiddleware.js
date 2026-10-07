import { SESSION_COOKIE, verifyTyped } from './session.js';
import { isAdminEmail, isAllowedEmail } from './users.js';

// 세션 쿠키를 확인하고, 그 이메일이 아직 허용 목록에 있는지 매 요청마다 확인합니다.
// (목록에서 빼거나 차단하면 세션이 남아 있어도 바로 막힙니다)
async function authMiddleware(request, reply) {
    const payload = verifyTyped(request.cookies?.[SESSION_COOKIE], 'session');
    if (!payload) {
        return reply.status(401).send({ code: 'E', status: 'Error', message: 'Login required' });
    }
    if (!(await isAllowedEmail(this, payload.email))) {
        return reply.status(401).send({ code: 'E', status: 'Error', message: 'User is not allowed' });
    }
    request.user = { email: payload.email, admin: isAdminEmail(payload.email) }; // ✅ 검증된 사용자 정보 저장
}

/** authMiddleware 뒤에 붙여 관리자만 통과시킵니다. */
export async function adminOnly(request, reply) {
    if (!request.user?.admin) {
        return reply.status(403).send({ code: 'E', status: 'Error', message: 'Admin only' });
    }
}

/**
 * authMiddleware 뒤에 붙여, 요청이 가리키는 업로드 차수(PCK_ORD_SEQ)가 모두 로그인한 사용자의 것인지 확인합니다.
 * getSeqs(request) → 확인할 PCK_ORD_SEQ 목록
 */
export const requireOwner = (getSeqs) =>
    async function (request, reply) {
        const seqs = [...new Set((getSeqs(request) ?? []).map(Number))];
        if (seqs.length === 0 || seqs.some((seq) => !Number.isInteger(seq))) {
            return reply.status(400).send({ code: 'E', status: 'Error', message: 'pckOrdSeq is required' });
        }
        const [{ cnt }] = await this.knex('VOS_OOG_UPLD_MST')
            .where({ EMAIL: request.user.email })
            .whereIn('PCK_ORD_SEQ', seqs)
            .count({ cnt: '*' });
        if (Number(cnt) !== seqs.length) {
            return reply.status(404).send({ code: 'E', status: 'Error', message: 'Not found' });
        }
    };

/** URL 경로의 :pckOrdSeq */
export const seqFromParams = (request) => [request.params.pckOrdSeq];

/** body.data[].pckOrdSeq */
export const seqsFromBodyData = (request) => (Array.isArray(request.body?.data) ? request.body.data.map((item) => item.pckOrdSeq) : []);

export default authMiddleware;
