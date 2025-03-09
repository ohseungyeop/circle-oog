import path from 'path';
import fs from 'fs/promises';
import replyHelper from '../utils/replyHelper.js';
import authMiddleware from '../utils/authMiddleware.js';

const uploadFile = async (fastify, options) => {
    // 파일 업로드 엔드포인트
    fastify.post(
        '/',
        {
            preHandler: [
                authMiddleware,
                async (req, reply) => {
                    const email = req.user?.email;
                    console.log(email);
                    if (!email) {
                        return reply.status(400).send('Email is required');
                    }
                    req.email = email; // email을 req 객체에 저장하여, 이후 사용할 수 있도록 전달
                },
            ],
        },
        async (req, reply) => {
            try {
                const data = await req.file(); // ✅ 단일 파일 받기

                if (!data) {
                    return reply.status(400).send({ error: 'No file uploaded' });
                }

                // 저장할 경로 생성 (이메일 기준)
                const filePath = path.join(process.env.ATTACH_PATH, req.email);

                console.log('File path:', filePath);

                // 📌 디렉토리 확인 후 생성
                try {
                    await fs.access(filePath);
                } catch (error) {
                    await fs.mkdir(filePath, { recursive: true });
                }
                console.log('Directory is ready:', filePath);

                // Timestamp
                //const fileUUID = uuidv4();
                const timestamp = new Date(new Date().getTime() + 9 * 60 * 60 * 1000) // UTC+9 보정
                    .toISOString()
                    .replace('T', ' ')
                    .split('.')[0];

                const filename = data.filename;
                const saveToPath = path.join(filePath, filename);

                console.log('Final file path:', saveToPath);

                // 파일 저장
                const buffer = await data.toBuffer();
                fs.writeFile(saveToPath, buffer);
                console.log('File successfully saved!');

                // DB 저장
                await fastify.knex('VOS_OOG_UPLD_MST').insert({
                    UPLD_DT: timestamp, // 업로드 날짜
                    FILE_PATH: saveToPath, // 저장된 파일 경로
                    ORGN_FILE_NM: data.filename, // 원본 파일명
                    EMAIL: req.email, // 이메일
                });

                const result = await fastify.knex.raw('SELECT LAST_INSERT_ID() AS PCK_ORD_SEQ');
                console.log('DB 쿼리 결과:', result); // 쿼리 결과를 콘솔로 확인

                // 결과 형식이 배열인지 확인
                if (result && result[0] && result[0][0]) {
                    const pckOrdSeq = result[0][0].PCK_ORD_SEQ;
                    console.log('PCK_ORD_SEQ:', pckOrdSeq); // pckOrdSeq 확인
                    reply.status(200).send({
                        message: '파일 업로드 성공',
                        filePath,
                        filename,
                        timestamp,
                        pckOrdSeq, // 응답에 PCK_ORD_SEQ 포함
                    });
                } else {
                    console.error('DB query failed:', result);
                    reply.status(500).send({ error: 'DB query failed' });
                }
            } catch (err) {
                console.error('File upload error:', err);
                reply.status(500).send({ error: 'Error uploading file' });
            }
        },
    );
};

const uploadDetail = async (fastify, options) => {
    fastify.post(
        '/',
        replyHelper(async (request) => {
            const { data } = request.body;

            console.log('📩 Received request body:', data);

            await fastify.knex('VOS_OOG_UPLD_DTL').insert(
                data.map((item) => ({
                    PCK_ORD_SEQ: item.pckOrdSeq,
                    PCK_NO: item.pckNo,
                    ITM_NM: item.itmNm,
                    PCK_LEN: item.pckLen,
                    PCK_WDT: item.pckWdt,
                    PCK_HGT: item.pckHgt,
                    PCK_QTY: item.pckQty,
                    PCK_WGT: item.pckWgt,
                    PCK_CBM: item.pckCbm,
                    PCK_RMK: item.pckRmk,
                })),
            );

            return { message: 'Packing dtl inserted successfully' };
        }),
    );
};

const selectFileList = async (fastify, options) => {
    fastify.get(
        '/',
        replyHelper(async (request, reply) => {
            try {
                console.log('📩 Received request query:', request.query);

                const { email } = request.query;
                if (!email) {
                    console.error('❌ Missing email in request');
                    throw new Error('Email is required'); // 🚨 `reply.send()` 없이 예외 던지기
                }

                const fileList = await fastify.knex('VOS_OOG_UPLD_MST').where({ EMAIL: email }).select('*');

                console.log('📂 update file list:', fileList);
                return fileList; // ✅ `reply.send()` 호출 X (replyHelper가 처리)
            } catch (error) {
                console.error('❌ Error fetching file list:', error);
                throw error; // 🚨 `replyHelper`가 오류 처리하도록 예외 던지기
            }
        }),
    );
};

const selectDetails = async (fastify, options) => {
    fastify.get(
        '/',
        replyHelper(async (request, reply) => {
            try {
                const { pckOrdSeq } = request.params;
                console.log('📩 Received request params:', request.params);

                if (!pckOrdSeq) {
                    console.error('❌ Missing pckOrdSeq in request');
                    throw new Error('pckOrdSeq is required'); // 🚨 `reply.send()` 없이 예외 던지기
                }

                const upDateDtl = await fastify.knex('VOS_OOG_UPLD_DTL').where({ PCK_ORD_SEQ: pckOrdSeq }).select('*');

                console.log('📂 update PckDtl:', upDateDtl);
                return upDateDtl; // ✅ `reply.send()` 호출 X (replyHelper가 처리)
            } catch (error) {
                console.error('❌ Error fetching PckDtl:', error);
                throw error; // 🚨 `replyHelper`가 오류 처리하도록 예외 던지기
            }
        }),
    );
};

const deleteFile = async (fastify, options) => {
    fastify.delete(
        '/',
        replyHelper(async (request) => {
            const { pckOrdSeq } = request.params;
            console.log('📦 Packing order sequence for deletion:', pckOrdSeq);

            // `VOS_OOG_UPLD_MST` 테이블에서 삭제
            // `VOS_OOG_UPLD_DTL` 테이블은 trigger되어있음(자동 삭제됨)
            await fastify.knex('VOS_OOG_UPLD_MST').where('PCK_ORD_SEQ', pckOrdSeq).del();

            return { message: 'Rows deleted successfully' };
        }),
    );
};

const downloadTemplate = async (fastify, options) => {
    fastify.get('/', async (req, reply) => {
        try {
            const templatePath = path.join(process.env.TEMPLATE_PATH, 'PackingList.xlsx');

            // 파일 존재 여부 확인
            await fs.access(templatePath);

            // 파일을 전체 읽기
            const fileBuffer = await fs.readFile(templatePath);

            // 파일을 클라이언트로 전송
            reply.header('Content-Disposition', 'attachment; filename=PackingList.xlsx');
            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            reply.send(fileBuffer); // 파일의 내용을 Buffer로 전송
        } catch (error) {
            console.error('❌ 템플릿 파일을 찾을 수 없습니다:', error);
            reply.status(404).send({ error: '템플릿 파일을 찾을 수 없습니다' });
        }
    });
};

export { uploadFile, uploadDetail, selectFileList, selectDetails, deleteFile, downloadTemplate };
