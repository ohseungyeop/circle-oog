const { getPckRoutes, uploadOogFile, insertPckRoute } = require('./vos/oog/v1/vos.oog.pck');
const { registerOogUser, verifyTokenRoute } = require('./vos/oog/v1/vos.oog.usr');
const { sendEmail, verifyEmail } = require('helpers/emailHelper');

async function routes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    reply.code(200).send({ message: 'VOS OOG API is running!' });
  });
  fastify.register(getPckRoutes, { prefix: '/vos/oog/v1/pck' });
  fastify.register(uploadOogFile, { prefix: '/vos/oog/v1/pck/upload' });
  fastify.register(insertPckRoute, { prefix: '/vos/oog/v1/pck' });

  fastify.register(registerOogUser, { prefix: '/vos/oog/v1/usr' });
  fastify.register(verifyTokenRoute, { prefix: '/vos/oog/v1/usr' });

  fastify.register(sendEmail, { prefix: '/vos/oog/v1/send-email' });
  fastify.register(verifyEmail, { prefix: '/vos/oog/v1/verify-email' });
}

module.exports = routes;
