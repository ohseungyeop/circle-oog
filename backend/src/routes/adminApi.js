import replyHelper from '../utils/replyHelper.js';
import authMiddleware, { adminOnly } from '../utils/authMiddleware.js';
import { normalizeEmail } from '../utils/session.js';
import { adminEmails } from '../utils/users.js';

const USR_STS = ['A', 'I', 'S']; // A: 허용, I: 사용 신청(승인 대기), S: 차단

// 허용 사용자 목록 (관리자만)
//  GET    /vos/oog/v1/admin/users                       → 목록 (ADMIN_EMAILS 포함)
//  PUT    /vos/oog/v1/admin/users  body: { email, status } → 추가 또는 상태 변경
//  DELETE /vos/oog/v1/admin/users?email=…               → 목록에서 삭제
const manageUsers = async (fastify, options) => {
    fastify.addHook('preHandler', authMiddleware);
    fastify.addHook('preHandler', adminOnly);

    fastify.get(
        '/',
        replyHelper(async () => {
            const admins = adminEmails();
            const rows = await fastify.knex('vos_oog_usr').select('USR_EML', 'USR_STS', 'CRE_DT').orderBy('CRE_DT', 'desc');
            return [
                ...admins.map((email) => ({ email, status: 'A', admin: true, creDt: null })),
                ...rows
                    .filter((row) => !admins.includes(row.USR_EML))
                    .map((row) => ({ email: row.USR_EML, status: row.USR_STS, admin: false, creDt: row.CRE_DT })),
            ];
        }),
    );

    fastify.put(
        '/',
        replyHelper(async (request) => {
            const email = normalizeEmail(request.body?.email);
            const status = request.body?.status ?? 'A';
            if (!email || !USR_STS.includes(status)) throw new Error('email and valid status are required');
            if (adminEmails().includes(email)) throw new Error('ADMIN_EMAILS 의 주소는 바꿀 수 없습니다.');

            await fastify
                .knex('vos_oog_usr')
                .insert({ USR_EML: email, USR_STS: status, EML_VRF_YN: 'N' })
                .onConflict('USR_EML')
                .merge({ USR_STS: status, UPD_DT: fastify.knex.raw('CURRENT_TIMESTAMP') });
            return { email, status };
        }),
    );

    fastify.delete(
        '/',
        replyHelper(async (request) => {
            const email = normalizeEmail(request.query.email);
            if (!email) throw new Error('email is required');
            await fastify.knex('vos_oog_usr').where({ USR_EML: email }).del();
            return { email };
        }),
    );
};

export { manageUsers };
