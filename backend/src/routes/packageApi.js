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

export { getPackageList, getContainerMaster };
