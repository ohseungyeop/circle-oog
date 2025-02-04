const fastifyPlugin = require('fastify-plugin');
const nodemailer = require('nodemailer');

async function mailer(fastify, options) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,       // Gmail 주소
      pass: process.env.EMAIL_PASS        // 앱 비밀번호
    }
  });

  // Fastify 인스턴스에 mailer 추가
  fastify.decorate('mailer', transporter);
}

module.exports = fastifyPlugin(mailer);
