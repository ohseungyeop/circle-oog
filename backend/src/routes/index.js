const { getPckRoutes, insertPckRoute } = require('./vos/oog/v1/vos.oog.pck');

async function routes(fastify, options) {
  fastify.get('/', async (request, reply) => {
    reply.code(200).send({ message: 'Fastify MySQL API is running!' });
  });
  fastify.register(getPckRoutes, { prefix: '/vos/oog/v1/pcks' });
  fastify.register(insertPckRoute, { prefix: '/vos/oog/v1/pck' });
}

module.exports = routes;
