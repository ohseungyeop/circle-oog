import { uploadFile, selectFileList, uploadDetail, deleteFile, downloadTemplate, selectDetails } from './fileApi.js';
import { getPackageList, getContainerMaster, updateDetails } from './packageApi.js';
import calculate from './calculateApi.js';
import { saveLashingInfo, getLashingInfo } from './lashingApi.js';
import { registerUser, verifyToken, verifyEmail } from './userApi.js';

// https://www.notion.so/OOG-175d5cf7a5cc8070b615dd7520403c8c?pvs=4#1acd5cf7a5cc809f9721de2f28f0c891
async function routes(fastify, options) {
    // ping
    fastify.get('/', async (request, reply) => {
        reply.code(200).send({ message: 'VOS OOG API is running!' });
    });

    // 파일 관리
    fastify.register(uploadFile, { prefix: '/vos/oog/v1/files' }); // POST
    fastify.register(uploadDetail, { prefix: '/vos/oog/v1/files/details' }); // POST
    fastify.register(selectFileList, { prefix: '/vos/oog/v1/files' }); // GET
    fastify.register(selectDetails, { prefix: '/vos/oog/v1/files/details/:pckOrdSeq([0-9]+)' }); // GET
    fastify.register(deleteFile, { prefix: '/vos/oog/v1/files/:pckOrdSeq([0-9]+)' }); // DELETE
    fastify.register(downloadTemplate, { prefix: '/vos/oog/v1/files/template' }); // GET

    // 기준 정보 조회
    fastify.register(getContainerMaster, { prefix: '/vos/oog/v1/container/spec/:crrCd' }); // GET

    // 계산 처리
    fastify.register(calculate, { prefix: '/vos/oog/v1/calculate/:pckOrdSeq([0-9]+)' }); // POST

    // 처리 결과
    fastify.register(getPackageList, { prefix: '/vos/oog/v1/packages/:pckOrdSeq([0-9]+)' }); // GET
    fastify.register(updateDetails, { prefix: '/vos/oog/v1/packages/details' }); // PUT

    // Lashing 정보
    fastify.register(saveLashingInfo, { prefix: '/vos/oog/v1/lashing' }); // POST
    fastify.register(getLashingInfo, { prefix: '/vos/oog/v1/lashing/:pckOrdSeq([0-9]+)/:clpNo([0-9]+)' }); // GET

    // 사용자 관리
    fastify.register(registerUser, { prefix: '/vos/oog/v1/users' }); // POST
    fastify.register(verifyToken, { prefix: '/vos/oog/v1/users/verify' }); // POST
    fastify.register(verifyEmail, { prefix: '/vos/oog/v1/emails/verify' }); // GET
}

export default routes;
