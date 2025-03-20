import replyHelper from '../utils/replyHelper.js';

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

export default getPackageList;
