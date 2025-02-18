const fp = require('fastify-plugin');
const fastifyCors = require('@fastify/cors');

async function corsPlugin(fastify, options) {
  fastify.register(fastifyCors, {
    credentials: true, // 자격 증명 허용
    // origin: true,  //process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 허용할 HTTP 메서드
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['set-cookie']
  });
}

module.exports = fp(corsPlugin);
