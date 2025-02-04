const jwt = require('jsonwebtoken');
const { helpers } = require('routes/helpers');

async function registOogUser(fastify, options) {
  
  fastify.post('/', helpers(async (request, reply) => {
    const email = request.query.email;
    console.log('📧 이메일 요청:', email);

    // 1️⃣ 이메일로 사용자 조회
    const existingUser = await fastify.knex('vos_oog_usr')
      .where({ USR_EML: email,
        USR_STS: 'A',
        EML_VRF_YN: 'Y'
       })
      .first();

    if (existingUser) {
      //redirect main page
      
    }

    // 2️⃣ 새로운 사용자 또는 비활성화된 사용자 등록/업데이트
    await fastify.knex('vos_oog_usr')
      .insert({
        USR_EML: email,
        USR_STS: 'I',         // Inactive
        EML_VRF_YN: 'N'       // 검증되지 않음
      })
      .onConflict('USR_EML')
      .merge({ UPD_DT: fastify.knex.raw('CURRENT_TIMESTAMP') });

    // 3️⃣ 검증 토큰 생성 (24시간 유효)
    const verificationToken = jwt.sign(
      {
        email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24시간 후 만료
      },
      process.env.JWT_SECRET_KEY,
      { algorithm: 'HS256' }
    );

    // 4️⃣ 이메일 검증 링크 생성
    const verificationLink = `${process.env.SERVER_URL}/verify-email?token=${verificationToken}`;

    // 5️⃣ 이메일 전송
    const subject = '[VOS OOG System] Email Verification';
    const text = `Hello,\n\nPlease verify your email by clicking the link below:\n\n${verificationLink}\n\nThank you!`;

    await sendEmail(fastify, email, subject, text);
    console.log('📨 이메일 검증 요청 전송 완료:', email);

    return reply.send({ message: 'User registered and verification email sent.' });
  }));
}

const sendEmail = async (fastify, to, subject, text) => {
  try {
    const info = await fastify.mailer.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text
    });
    fastify.log.info(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    fastify.log.error(`❌ Failed to send email to ${to}: ${error.message}`);
    throw new Error('Failed to send email');
  }
};

module.exports = {
  registOogUser,
  sendEmail
};
