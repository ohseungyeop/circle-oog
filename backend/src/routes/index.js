const {
    getPckRoutes,
    uploadOogFile,
    insertPckRoute,
    selectOogFile,
    uploadPckDtl,
    deleteOogFile,
    downloadTemplate,
    selectPckDtl,
} = require('./vos/oog/v1/pck');
const { calcOog } = require('./vos/oog/v1/calc');
const { registerOogUser, verifyTokenRoute } = require('./vos/oog/v1/usr');
const { sendEmail, verifyEmail } = require('utils/emailHelper');

/*
기능        Method  경로                                        설명
파일 처리   POST    /vos/oog/v1/packages/files                  엑셀 파일 업로드
            POST    /vos/oog/v1/packages/files/details          엑셀 상세 데이터 업로드
            GET     /vos/oog/v1/packages/files                  업로드된 엑셀 목록 조회
            DELETE  /vos/oog/v1/packages/files/:pckOrdSeq       업로드된 엑셀 한 건 삭제
            GET     /vos/oog/v1/packages/files/template	        엑셀 템플릿 다운로드

Package     GET     /vos/oog/v1/packages                        PCK 조회
            POST    /vos/oog/v1/packages                        PCK 데이터 삽입
            GET     /vos/oog/v1/packages/details                PCK 데이터 조회
계산 처리    POST    /vos/oog/v1/packages/calculate/:pckOrdSeq   PCK 계산

사용자 처리  POST    /vos/oog/v1/users                          사용자 등록
            POST    /vos/oog/v1/users/verify                    사용자 검증

이메일 처리  POST    /vos/oog/v1/emails                         이메일 보내기
            GET     /vos/oog/v1/emails/verify                   이메일 검증
*/
async function routes(fastify, options) {
    fastify.get('/', async (request, reply) => {
        reply.code(200).send({ message: 'VOS OOG API is running!' });
    });

    // 파일 처리
    fastify.register(uploadOogFile, { prefix: '/vos/oog/v1/packages/files' }); //POST
    fastify.register(uploadPckDtl, {
        prefix: '/vos/oog/v1/packages/files/details',
    }); //POST
    fastify.register(selectOogFile, { prefix: '/vos/oog/v1/packages/files' }); //GET
    fastify.register(deleteOogFile, {
        prefix: '/vos/oog/v1/packages/files/:pckOrdSeq([0-9]+)',
    }); //DELETE
    fastify.register(downloadTemplate, {
        prefix: '/vos/oog/v1/packages/files/template',
    }); //GET

    //Package
    fastify.register(getPckRoutes, { prefix: '/vos/oog/v1/packages' }); //GET
    fastify.register(insertPckRoute, { prefix: '/vos/oog/v1/packages' }); //POST
    fastify.register(selectPckDtl, { prefix: '/vos/oog/v1/packages/details' }); //GET
    // 계산 처리
    fastify.register(calcOog, {
        prefix: '/vos/oog/v1/packages/calculate/:pckOrdSeq([0-9]+)',
    }); //POST

    // 사용자 처리
    fastify.register(registerOogUser, { prefix: '/vos/oog/v1/users' }); //POST
    fastify.register(verifyTokenRoute, { prefix: '/vos/oog/v1/users/verify' }); //POST

    // 이메일 처리
    fastify.register(sendEmail, { prefix: '/vos/oog/v1/emails' }); //POST
    fastify.register(verifyEmail, { prefix: '/vos/oog/v1/emails/verify' }); //GET
}

module.exports = routes;
