// 로그인 허용 목록.
//  - ADMIN_EMAILS 환경변수의 주소: 항상 허용 + 관리자 (사용자 관리 가능)
//  - vos_oog_usr 의 USR_STS = 'A' : 허용
//  - USR_STS = 'I' : 사용 신청(승인 대기), 'S' : 차단
import { normalizeEmail } from './session.js';
import sendEmail from './emailHelper.js';

export const adminEmails = () =>
    (process.env.ADMIN_EMAILS ?? '')
        .split(/[\s,;]+/)
        .map(normalizeEmail)
        .filter(Boolean);

export const isAdminEmail = (email) => adminEmails().includes(email);

export async function isAllowedEmail(fastify, email) {
    if (!email) return false;
    if (isAdminEmail(email)) return true;
    const user = await fastify.knex('vos_oog_usr').where({ USR_EML: email }).first();
    return 'A' === user?.USR_STS;
}

const STATUS_LABEL = { I: '재신청 (승인 대기 중)', S: '차단된 주소의 로그인 시도' };

/**
 * 목록에 없는 주소의 로그인 시도 = 사용 신청. 처음 신청이면 'I' 로 기록합니다.
 * 신규·승인 대기('I')·차단('S') 모두 관리자에게 메일로 알립니다.
 * (같은 주소의 연속 요청은 호출하는 쪽의 60초 쿨다운으로 제한됩니다)
 */
export async function requestAccess(fastify, email, method) {
    const existing = await fastify.knex('vos_oog_usr').where({ USR_EML: email }).first();

    if (!existing) {
        await fastify.knex('vos_oog_usr').insert({ USR_EML: email, USR_STS: 'I', EML_VRF_YN: 'N' });
    }

    const admins = adminEmails();
    if (admins.length === 0) {
        fastify.log.warn(`⚠️ 사용 신청 (${email}) 알림을 보낼 ADMIN_EMAILS 가 없습니다.`);
        return;
    }
    const text = [
        `OOG System 사용 신청이 들어왔습니다.`,
        '',
        `이메일: ${email}`,
        `방법: ${method}`,
        `상태: ${existing ? STATUS_LABEL[existing.USR_STS] ?? existing.USR_STS : '신규'}`,
        '',
        `관리자로 로그인한 뒤 사용자 관리에서 승인할 수 있습니다: ${process.env.FRONTEND_URL}/mainPage`,
    ].join('\n');
    try {
        await sendEmail(fastify, admins.join(','), '[VOS OOG System] 사용 신청', text);
    } catch (error) {
        fastify.log.error(`❌ 사용 신청 알림 메일 실패: ${error.message}`);
    }
}
