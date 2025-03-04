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

/*
기능        Method  경로                                        설명
파일 처리   POST    /vos/oog/v1/files                  엑셀 파일 업로드
            POST    /vos/oog/v1/files/details          엑셀 상세 데이터 업로드
            GET     /vos/oog/v1/files                  업로드된 엑셀 목록 조회
            DELETE  /vos/oog/v1/files/:pckOrdSeq       업로드된 엑셀 한 건 삭제
            GET     /vos/oog/v1/files/template	        엑셀 템플릿 다운로드

Package     GET     /vos/oog/v1/packages                        PCK 조회
            POST    /vos/oog/v1/packages                        PCK 데이터 삽입
            GET     /vos/oog/v1/files/details                PCK 데이터 조회
계산 처리    POST    /vos/oog/v1/calculate/:pckOrdSeq   PCK 계산

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
    fastify.register(uploadFile, { prefix: '/vos/oog/v1/files' }); //POST
    fastify.register(uploadDetail, { prefix: '/vos/oog/v1/files/details' }); //POST
    fastify.register(selectFileList, { prefix: '/vos/oog/v1/files' }); //GET
    fastify.register(selectDetails, { prefix: '/vos/oog/v1/files/details' }); //GET
    fastify.register(deleteFileList, { prefix: '/vos/oog/v1/files/:pckOrdSeq([0-9]+)' }); //DELETE
    fastify.register(downloadTemplate, { prefix: '/vos/oog/v1/files/template' }); //GET

    //Package
    fastify.register(getPackageList, { prefix: '/vos/oog/v1/packages' }); //GET
    fastify.register(insertPackage, { prefix: '/vos/oog/v1/packages' }); //POST
    // 계산 처리
    fastify.register(calculate, { prefix: '/vos/oog/v1/calculate/:pckOrdSeq([0-9]+)' }); //POST

    // 사용자 처리
    fastify.register(registerUser, { prefix: '/vos/oog/v1/users' }); //POST
    fastify.register(verifyToken, { prefix: '/vos/oog/v1/users/verify' }); //POST

    // 이메일 처리
    fastify.register(sendEmail, { prefix: '/vos/oog/v1/emails' }); //POST
    fastify.register(verifyEmail, { prefix: '/vos/oog/v1/emails/verify' }); //GET
}

module.exports = routes;
