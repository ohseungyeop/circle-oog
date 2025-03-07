const { replyHelper } = require('utils/replyHelper');

async function calculate(fastify, options) {
    fastify.post(
        '/',
        replyHelper(async (request, reply) => {
            try {
                const { pckOrdSeq } = request.params;
                console.log('📦 Packing order sequence:', pckOrdSeq);
                const itemList = await fastify.knex('VOS_OOG_UPLD_DTL').where({ PCK_ORD_SEQ: pckOrdSeq }).select('*');

                console.log('📂 select item list:', itemList);
                return itemList; // ✅ `reply.send()` 호출 X (replyHelper가 처리)
            } catch (error) {
                console.error('❌ Error fetching item list:', error);
                throw error; // 🚨 `replyHelper`가 오류 처리하도록 예외 던지기
            }
        }),
    );
}
module.exports = {
    calculate,
};
