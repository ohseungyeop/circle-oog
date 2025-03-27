import replyHelper from '../utils/replyHelper.js';
import authMiddleware from '../utils/authMiddleware.js';

const saveLashingInfo = async (fastify, options) => {
    fastify.post(
        '/',
        {
            preHandler: [authMiddleware],
        },
        replyHelper(async (request, reply) => {
            const { pckOrdSeq, clpNo, tpsz, xCount, yCount, data } = request.body;

            // Request body validation
            if (!pckOrdSeq || !clpNo || !tpsz || !data) {
                throw new Error('Invalid request body');
            }

            try {
                // Begin transaction
                await fastify.knex.transaction(async (trx) => {
                    // Delete existing data
                    await trx('vos_oog_lashing').where('PCK_ORD_SEQ', pckOrdSeq).where('CLP_NO', clpNo).del();

                    // Insert new data
                    await trx('vos_oog_lashing').insert({
                        PCK_ORD_SEQ: pckOrdSeq,
                        CLP_NO: clpNo,
                        TPSZ: tpsz || '40FR',
                        X_COUNT: xCount || null,
                        Y_COUNT: yCount || null,
                        LASH_DATA: JSON.stringify(data),
                    });
                });
                return { message: 'Lashing data saved successfully' };
            } catch (error) {
                console.error('Error inserting data:', error);
                throw new Error('Database error occurred');
            }
        }),
    );
};

const getLashingInfo = async (fastify, options) => {
    fastify.get('/', async (request, reply) => {
        const { pckOrdSeq, clpNo } = request.params;
        if (!pckOrdSeq || !clpNo) {
            return reply.code(400).send({ error: 'PCK_ORD_SEQ and CLP_NO are required' });
        }

        try {
            const connections = await fastify
                .knex('vos_oog_lashing')
                .select('LASH_DATA')
                .where('PCK_ORD_SEQ', pckOrdSeq)
                .where('CLP_NO', clpNo);

            // 데이터가 없다면 빈 배열 반환
            if (!connections.length) {
                return reply.code(200).send({ message: 'No connections found' });
            }

            return JSON.parse(connections[0]?.LASH_DATA);
        } catch (error) {
            console.error('Error retrieving lashing data:', error);
            return reply.code(500).send({ error: 'Failed to retrieve lashing data' });
        }
    });
};

export { saveLashingInfo, getLashingInfo };
