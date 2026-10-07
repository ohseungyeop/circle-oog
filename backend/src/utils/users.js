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

const METHOD_LABEL = { google: '구글 로그인', email: '이메일 링크' };

/** 관리자 알림 메일. 신규 신청·재신청·차단 시도에 따라 제목과 안내가 다릅니다. */
function accessMail(email, method, existing) {
    const adminPage = `${process.env.FRONTEND_URL}/mainPage`;
    const methodText = METHOD_LABEL[method] ?? method;

    if ('S' === existing?.USR_STS) {
        return {
            subject: '[VOS OOG System] 차단된 주소의 로그인 시도',
            text: [
                `차단된 주소가 OOG System 로그인을 시도했습니다. 차단 상태는 그대로이며 로그인되지 않았습니다.`,
                '',
                `이메일: ${email}`,
                `방법: ${methodText}`,
                `차단일: ${existing.UPD_DT ?? existing.CRE_DT ?? '-'}`,
                '',
                `차단을 풀려면 관리자로 로그인한 뒤 Users 화면에서 "허용"을 누르세요: ${adminPage}`,
                `시도한 사람에게는 신규 신청과 같은 안내만 보이고, 차단 사실은 알려지지 않습니다.`,
            ].join('\n'),
        };
    }

    const again = !!existing;
    return {
        subject: again ? '[VOS OOG System] 사용 재신청' : '[VOS OOG System] 사용 신청',
        text: [
            again
                ? `승인 대기 중인 주소가 OOG System 로그인을 다시 시도했습니다.`
                : `OOG System 사용 신청이 들어왔습니다.`,
            '',
            `이메일: ${email}`,
            `방법: ${methodText}`,
            again ? `최초 신청일: ${existing.CRE_DT ?? '-'}` : null,
            '',
            `관리자로 로그인한 뒤 Users 화면에서 "허용"을 누르면 로그인할 수 있습니다: ${adminPage}`,
        ]
            .filter((line) => line !== null)
            .join('\n'),
    };
}

/**
 * 목록에 없는 주소의 로그인 시도 = 사용 신청. 처음 신청이면 'I' 로 기록합니다.
 * 신규·승인 대기('I')·차단('S') 모두 관리자에게 메일로 알립니다. 시도한 사람에게는 메일을 보내지 않습니다.
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
    const { subject, text } = accessMail(email, method, existing);
    try {
        await sendEmail(fastify, admins.join(','), subject, text);
    } catch (error) {
        fastify.log.error(`❌ 사용 신청 알림 메일 실패: ${error.message}`);
    }
}
