const jwt = require('jsonwebtoken');
const { helpers } = require('routes/helpers');

async function registerOogUser(fastify, options) {
  fastify.post('/', async (request, reply) => {
    const { email } = request.body;
    console.log('📧 이메일 요청:', email);
  
    try {
      // 1️⃣ 이메일로 사용자 조회
      const existingUser = await fastify.knex('vos_oog_usr').where({ USR_EML: email }).first();
    
      if (existingUser) {
        // 2️⃣ 기존 사용자 상태 체크
        if ('A' === existingUser.USR_STS && 'Y' === existingUser.EML_VRF_YN) {
          return reply.send({ code: 'S', status: 'Success', message: 'User already exists' });
        } else if ('I' === existingUser.USR_STS && 'N' === existingUser.EML_VRF_YN) {
          return reply.send({ code: 'V', status: 'Verify', message: 'Email exists, but not verified. Please verify your email.' });
        }
      } else {
        // 3️⃣ 새로운 사용자 등록
        await fastify.knex('vos_oog_usr')
          .insert({
            USR_EML: email,
            USR_STS: 'I',         // Inactive
            EML_VRF_YN: 'N'       // 검증되지 않음
          });

        // 4️⃣ 검증 토큰 생성 (24시간 유효)
        const verificationToken = jwt.sign(
          {
            email,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24시간 후 만료
          },
          process.env.JWT_SECRET_KEY,
          { algorithm: 'HS256' }
        );
      
        // 5️⃣ 이메일 검증 링크 생성
        const verificationLink = `${process.env.BACKEND_URL}/verify-email?token=${verificationToken}`;
      
        // 6️⃣ 이메일 전송
        const subject = '[VOS OOG System] Email Verification';
        const text = `Hello,\n\nPlease verify your email by clicking the link below:\n\n${verificationLink}\n\nThank you!`;
      
        await sendEmail(fastify, email, subject, text);
        console.log('📨 이메일 검증 요청 전송 완료:', email);
    
        return reply.send({ code: 'N', status: 'New', message: 'User registered and verification email sent.' });
      }
    } catch (error) {
      console.error('Error during user registration or email sending:', error);
      return reply.status(500).send({ code: 'E', status: 'Error', message: 'Internal server error. Please try again later.' });
    }
  });
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
  registerOogUser,
  sendEmail
};
