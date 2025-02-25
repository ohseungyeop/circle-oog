const { getPckRoutes, uploadOogFile, insertPckRoute, selectOogFile, uploadPckDtl, deleteOogFile, downloadTemplate} = require('./vos/oog/v1/pck');
const { registerOogUser, verifyTokenRoute } = require('./vos/oog/v1/usr');
const { sendEmail, verifyEmail } = require('helpers/emailHelper');

async function routes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    reply.code(200).send({ message: 'VOS OOG API is running!' });
  });
  fastify.register(getPckRoutes, { prefix: '/vos/oog/v1/pck' });
  fastify.register(uploadOogFile, { prefix: '/vos/oog/v1/pck/upload' });
  fastify.register(uploadPckDtl, { prefix: '/vos/oog/v1/pck/uploadDtl' });
  fastify.register(insertPckRoute, { prefix: '/vos/oog/v1/pck' });
  fastify.register(selectOogFile, { prefix: '/vos/oog/v1/pck/select'});
  fastify.register(deleteOogFile, { prefix: '/vos/oog/v1/pck/delete'});
  fastify.register(downloadTemplate, { prefix: '/vos/oog/v1/pck/download/template' });

  fastify.register(registerOogUser, { prefix: '/vos/oog/v1/usr' });
  fastify.register(verifyTokenRoute, { prefix: '/vos/oog/v1/usr' });

  fastify.register(sendEmail, { prefix: '/vos/oog/v1/send-email' });
  fastify.register(verifyEmail, { prefix: '/vos/oog/v1/verify-email' });
}

module.exports = routes;
