const { replyHelper } = require('helpers/replyHelper');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fastifyMulter = require('fastify-multer');

async function getPckRoutes(fastify, options) {
  fastify.get('/', replyHelper(async (request, reply) => {
    const pcks = await fastify.knex('vos_oog_pck').select('*');
    return pcks;
  }));
};

async function uploadOogFile(fastify, options) {
    // Multer 설정
    // fastify.register(fastifyMulter.contentParser);  // ✅ contentParser 등록

    fastify.addContentTypeParser('multipart/form-data', (request, payload, done) => {
      done();
    });

    const upload = fastifyMulter({ storage: fastifyMulter.memoryStorage() });

    // 파일 업로드 엔드포인트
    fastify.post('/', { preHandler: upload.single('file') }, async (req, reply) => {
      if (!req.file) {
        return reply.status(400).send('No file uploaded');
      }

      const { email, access_token } = req.body;

      // JWT 토큰 검증
      const jwt = require('jsonwebtoken');
      try {

console.log(access_token);
console.log(process.env.JWT_SECRET_KEY);


        const decoded = jwt.verify(access_token, process.env.JWT_SECRET_KEY);
        if (decoded.email !== email) {
          return reply.status(403).send('Email does not match token');
        }
      } catch (err) {
        console.log(err);
        return reply.status(401).send('Invalid access token');
      }
    
      // UUID 생성 및 timestamp 추가
      const fileUUID = uuidv4();
      const timestamp = new Date().toISOString();
    
      // 업로드된 파일 경로 생성
      // const filePath = `/uploads/${Date.now()}-${path.extname(req.file.originalname)}`;
      const filePath = `/uploads/${fileUUID}-${Date.now()}-${path.extname(req.file.originalname)}`;

      try {
        // Knex.js를 사용하여 DB에 파일 정보 저장
        await fastify.knex('VOS_OOG_UPLD_MST').insert({
          file_uuid: fileUUID,
          file_path: filePath,
          email: email,
          timestamp: timestamp,
        });
    
        reply.status(200).send({
          message: 'File uploaded successfully',
          fileUUID,
          filePath,
          timestamp,
        });
      } catch (err) {
        console.error(err);
        reply.status(500).send('Error saving file info to database');
      }
    });



    // const pcks = await fastify.knex('vos_oog_pck').select('*');
    // return pcks;
};

// routes/insertPckRoute.js
async function insertPckRoute(fastify, options) {
  fastify.post('/', replyHelper(async (request, reply) => {
    const {
      PCK_ORD_NO,
      PCK_NO,
      ITM_NM,
      PCK_LEN,
      PCK_WDT,
      PCK_HGT,
      PCK_QTY,
      PCK_WGT,
      PCK_RMK,
      ESTM_PCK_LEN,
      ESTM_PCK_WDT,
      ESTM_PCK_HGT,
      PCK_CBM,
      PCK_TP_CD,
      PCK_GRS_WGT,
      UPD_USR_NM,
      CRE_USR_NM
    } = request.body;

    // 데이터 삽입
    await fastify.knex('vos_oog_pck').insert({
      PCK_ORD_NO,
      PCK_NO,
      ITM_NM,
      PCK_LEN,
      PCK_WDT,
      PCK_HGT,
      PCK_QTY,
      PCK_WGT,
      PCK_RMK,
      ESTM_PCK_LEN,
      ESTM_PCK_WDT,
      ESTM_PCK_HGT,
      PCK_CBM,
      PCK_TP_CD,
      PCK_GRS_WGT,
      UPD_USR_NM,
      CRE_USR_NM
    });

    return reply.code(201).send({ message: 'Packing record inserted successfully' });
  }));
};

module.exports = {
  getPckRoutes,
  uploadOogFile,
  insertPckRoute
};
