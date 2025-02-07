const jwt = require('jsonwebtoken');
const { setAuthToken  } = require('helpers/cookieHelper');

async function sendEmail(fastify, options) {
  fastify.post('/', async (request, reply) => {
      const { to, subject, text } = request.body;
  
      try {
      const info = await fastify.mailer.sendMail({
          from: process.env.EMAIL_FROM,
          to,
          subject,
          text,
      });
  
      reply.send({ message: '✅ Email sent successfully!', info });
      } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: '❌ Failed to send email', details: error.message });
      }
  });
}

async function verifyEmail(fastify, options) {
  const redirectUrl = `${process.env.FRONTEND_URL}`;

  fastify.get('/', async (request, reply) => {
      const token = request.query.token;

      if (!token) {
          return reply.status(400).type('text/html').send(`
              <html>
                <head>
                  <meta charset="utf-8">
                  <title>❌ Verification Failed</title>
                  <style>
                    body { font-family: Arial, sans-serif; background-color: #f9f9f9; text-align: center; padding: 50px; }
                    .container { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: inline-block; }
                    a { text-decoration: none; color: #007BFF; font-weight: bold; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>❌ Token is missing</h1>
                    <p>유효한 토큰이 필요합니다.</p>
                    <a href="${redirectUrl}">🏠 홈으로 가기</a>
                  </div>
                </body>
              </html>
          `);
      }

      try {
          // JWT 검증
          const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
          const email = decoded.email;

          // DB 업데이트 (이메일 인증 완료 처리)
          const updatedRows = await fastify.knex('vos_oog_usr')
              .where({ USR_EML: email })
              .update({
                  USR_STS: 'A',
                  EML_VRF_YN: 'Y',
                  UPD_DT: fastify.knex.raw('CURRENT_TIMESTAMP')
              });

          if (updatedRows === 0) {
              return reply.status(404).type('text/html').send(`
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <title>❌ User Not Found</title>
                      <style>
                        body { font-family: Arial, sans-serif; background-color: #f9f9f9; text-align: center; padding: 50px; }
                        .container { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: inline-block; }
                        a { text-decoration: none; color: #007BFF; font-weight: bold; }
                      </style>
                    </head>
                    <body>
                      <div class="container">
                        <h1>❌ 사용자 정보를 찾을 수 없습니다.</h1>
                        <p>이메일 주소가 잘못되었거나 이미 검증된 계정입니다.</p>
                        <a href="${redirectUrl}">🏠 홈으로 가기</a>
                      </div>
                    </body>
                  </html>
              `);
          }

          // ✅ **쿠키에 토큰 저장**
          setAuthToken(reply, token);

          // ✅ **클라이언트로 리다이렉트**
          // return reply.redirect(`${redirectUrl}/grid`);
          return reply.type('text/html').send(`
              <html>
                <head>
                  <meta charset="utf-8">
                  <title>✅ 이메일 검증 완료</title>
                  <style>
                    body { font-family: Arial, sans-serif; background-color: #f0f8ff; text-align: center; padding: 50px; }
                    .container { background: #fff; padding: 30px; border-radius: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); display: inline-block; }
                    h1 { color: #28a745; }
                    p { font-size: 18px; }
                    a { display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px; transition: background-color 0.3s; }
                    a:hover { background-color: #0056b3; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>✅ 이메일이 성공적으로 검증되었습니다!</h1>
                    <p>이제 모든 서비스를 자유롭게 이용하실 수 있습니다.</p>
                    <a href="${redirectUrl}/grid">🏠 홈으로 가기</a>
                  </div>
                </body>
              </html>
            `);
          
      } catch (error) {
          fastify.log.error(`❌ Email verification failed: ${error.message}`);
          return reply.status(400).type('text/html').send(`
              <html>
                <head>
                  <meta charset="utf-8">
                  <title>❌ Verification Failed</title>
                  <style>
                    body { font-family: Arial, sans-serif; background-color: #f9f9f9; text-align: center; padding: 50px; }
                    .container { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); display: inline-block; }
                    a { text-decoration: none; color: #007BFF; font-weight: bold; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>❌ 이메일 검증에 실패했습니다</h1>
                    <p>토큰이 만료되었거나 잘못되었습니다.</p>
                    <a href="${redirectUrl}">🏠 홈으로 가기</a>
                  </div>
                </body>
              </html>
          `);
      }
  });
}

module.exports = {
    sendEmail,
    verifyEmail
};
