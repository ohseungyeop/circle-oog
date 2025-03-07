const { replyHelper } = require('utils/replyHelper');

async function insertPackage(fastify, options) {
    fastify.post(
        '/',
        replyHelper(async (request) => {
            console.log('📩 Received request body:', request.body); // 요청 본문 확인
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
                CRE_USR_NM,
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
                CRE_USR_NM,
            });

            return reply.code(201).send({ message: 'Packing record inserted successfully' });
        }),
    );
}

async function getPackageList(fastify, options) {
    fastify.get(
        '/',
        replyHelper(async (request, reply) => {
            const pckList = await fastify.knex('vos_oog_pck').select('*');
            return pckList;
        }),
    );
}

module.exports = {
    insertPackage,
    getPackageList,
};
