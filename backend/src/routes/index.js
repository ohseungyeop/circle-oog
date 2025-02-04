const { getPckRoutes, uploadOogFile, insertPckRoute } = require('./vos/oog/v1/vos.oog.pck');
const { registOogUser } = require('./vos/oog/v1/vos.oog.usr');
const { sendEmail, verifyEmail } = require('./email');

async function routes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    reply.code(200).send({ message: 'VOS OOG API is running!' });
  });
  fastify.register(getPckRoutes, { prefix: '/vos/oog/v1/pcks' });
  fastify.register(uploadOogFile, { prefix: '/vos/oog/v1/pcks/upload' });
  fastify.register(insertPckRoute, { prefix: '/vos/oog/v1/pck' });
  fastify.register(registOogUser, { prefix: '/vos/oog/v1/usr' });

  fastify.register(sendEmail, { prefix: '/send-email' });
  fastify.register(verifyEmail, { prefix: '/verify-email' });
}

module.exports = routes;
