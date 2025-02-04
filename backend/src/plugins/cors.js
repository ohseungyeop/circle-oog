const fp = require('fastify-plugin');
const fastifyCors = require('@fastify/cors');

async function corsPlugin(fastify, options) {
  fastify.register(fastifyCors, {
    origin: '*', // 모든 도메인에서 요청 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // 허용할 HTTP 메서드
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
}

module.exports = fp(corsPlugin);
