const { helpers } = require('routes/helpers');

async function getPckRoutes(fastify, options) {
  fastify.get('/', helpers(async (request, reply) => {
    const pcks = await fastify.knex('vos_oog_pck').select('*');
    return pcks;
  }));
}

// routes/insertPckRoute.js
async function insertPckRoute(fastify, options) {
  fastify.post('/insert', helpers(async (request, reply) => {
    const {
      PCK_ORD_NO,
      PCK_NO,
      ITM_NM,
      PCK_LEN,
      PCK_WDT,
      PCK_HGT,
      PCK_QTY,
      PCK_WGT,
      PCK_RMK,
      ESTM_PCK_LEN,
      ESTM_PCK_WDT,
      ESTM_PCK_HGT,
      PCK_CBM,
      PCK_TP_CD,
      PCK_GRS_WGT,
      UPD_USR_NM,
      CRE_USR_NM
    } = request.body;

    // 데이터 삽입
    await fastify.knex('vos_oog_pck').insert({
      PCK_ORD_NO,
      PCK_NO,
      ITM_NM,
      PCK_LEN,
      PCK_WDT,
      PCK_HGT,
      PCK_QTY,
      PCK_WGT,
      PCK_RMK,
      ESTM_PCK_LEN,
      ESTM_PCK_WDT,
      ESTM_PCK_HGT,
      PCK_CBM,
      PCK_TP_CD,
      PCK_GRS_WGT,
      UPD_USR_NM,
      CRE_USR_NM
    });

    return reply.code(201).send({ message: 'Packing record inserted successfully' });
  }));
};

module.exports = {
  getPckRoutes,
  insertPckRoute
};
