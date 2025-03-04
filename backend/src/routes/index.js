const {
    getPackageList,
    uploadFile,
    insertPackage,
    selectFileList,
    uploadDetail,
    deleteFileList,
    downloadTemplate,
    selectDetails,
} = require('./vos/oog/v1/pck');
const { calculate } = require('./vos/oog/v1/calc');
const { registerUser, verifyToken } = require('./vos/oog/v1/usr');
const { sendEmail, verifyEmail } = require('utils/emailHelper');

//https://www.notion.so/OOG-175d5cf7a5cc8070b615dd7520403c8c?pvs=4#1acd5cf7a5cc809f9721de2f28f0c891
async function routes(fastify, options) {
    fastify.get('/', async (request, reply) => {
        reply.code(200).send({ message: 'VOS OOG API is running!' });
    });

    // 파일 관리
    fastify.register(uploadFile, { prefix: '/vos/oog/v1/files' }); //POST
    fastify.register(uploadDetail, { prefix: '/vos/oog/v1/files/details' }); //POST
    fastify.register(selectFileList, { prefix: '/vos/oog/v1/files' }); //GET
    fastify.register(selectDetails, { prefix: '/vos/oog/v1/files/details' }); //GET
    fastify.register(deleteFileList, { prefix: '/vos/oog/v1/files/:pckOrdSeq([0-9]+)' }); //DELETE
    fastify.register(downloadTemplate, { prefix: '/vos/oog/v1/files/template' }); //GET

    // 처리 결과
    fastify.register(getPackageList, { prefix: '/vos/oog/v1/packages' }); //GET
    fastify.register(insertPackage, { prefix: '/vos/oog/v1/packages' }); //POST
    // 계산
    fastify.register(calculate, { prefix: '/vos/oog/v1/calculate/:pckOrdSeq([0-9]+)' }); //POST

    // 사용자 관리
    fastify.register(registerUser, { prefix: '/vos/oog/v1/users' }); //POST
    fastify.register(verifyToken, { prefix: '/vos/oog/v1/users/verify' }); //POST

    // 이메일 관리리
    fastify.register(sendEmail, { prefix: '/vos/oog/v1/emails' }); //POST
    fastify.register(verifyEmail, { prefix: '/vos/oog/v1/emails/verify' }); //GET
}

module.exports = routes;
