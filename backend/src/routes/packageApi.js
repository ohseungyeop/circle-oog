import replyHelper from '../utils/replyHelper.js';
import authMiddleware from '../utils/authMiddleware.js';

const CRR_CD = 'VOS';
// const REF_CNTR_TPSZ = ['D2', '4H'];

const getPackageList = async (fastify, options) => {
    fastify.get(
        '/',
        replyHelper(async (request, reply) => {
            const { pckOrdSeq } = request.params;
            const pckList = await fastify.knex('vos_oog_clp').where({ PCK_ORD_SEQ: pckOrdSeq }).select('*');
            return pckList;
        }),
    );
};

const getContainerMaster = async (fastify, options) => {
    fastify.get(
        '/',
        {
            preHandler: [authMiddleware],
        },
        replyHelper(async (request, reply) => {
            const { crrCd } = request.params || CRR_CD;

            const cntrInfo = await fastify
                .knex('VOS_OOG_CNTR_MST')
                .where({ CRR_CD: crrCd || CRR_CD })
                // .whereIn('CNTR_TPSZ_CD', REF_CNTR_TPSZ)
                .select('*');

            return cntrInfo;
        }),
    );
};

const updateDetails = async (fastify, options) => {
    fastify.put(
        '/',
        {
            preHandler: [authMiddleware],
        },
        replyHelper(async (request) => {
            const { data } = request.body;
            console.log('📩 Received update request body:', data);

            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Data array is required and cannot be empty');
            }

            // 각 항목을 개별적으로 업데이트
            for (const item of data) {
                await fastify
                    .knex('VOS_OOG_UPLD_DTL')
                    .where({
                        PCK_ORD_SEQ: item.pckOrdSeq,
                        PCK_NO: item.pckNo,
                    })
                    .update({
                        BOX_LEN: item.boxLen,
                        BOX_WDT: item.boxWdt,
                    });
            }

            return { message: 'Packing details updated successfully', updatedCount: data.length };
        }),
    );
};

export { getPackageList, getContainerMaster, updateDetails };
