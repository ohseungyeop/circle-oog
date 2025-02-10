const { replyHelper } = require('helpers/replyHelper');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fastifyMultipart = require("@fastify/multipart");
const authMiddleware = require('middlewares/authMiddleware');

async function getPckRoutes(fastify, options) {
  fastify.get('/', replyHelper(async (request, reply) => {
    const pckList = await fastify.knex('vos_oog_pck').select('*');
    return pckList;
  }));
};

async function uploadOogFile(fastify, options) {
  // 파일 업로드 엔드포인트
  fastify.post('/', {
    preHandler: [
      authMiddleware,
      async (req, reply) => {
        const { email } = req.body;
        if (!email) {
          return reply.status(400).send('Email is required');
        }
        req.email = email; // email을 req 객체에 저장하여, 이후 사용할 수 있도록 전달
      }
    ]
  }, async (req, reply) => {

    try {
      const data = await req.file(); // ✅ 단일 파일 받기

      if (!data) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      // UUID & Timestamp
      const fileUUID = uuidv4();
      const timestamp = new Date().toISOString();
      const extname = path.extname(data.filename);
      const filename = `${fileUUID}-${timestamp}${extname}`;

      // 저장할 경로 생성 (이메일 기준)
      const filePath = path.join(process.env.ATTACH_PATH, req.email);
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }

      // 파일 저장
      const saveToPath = path.join(filePath, filename);
      await data.toBuffer().then((buffer) => fs.writeFileSync(saveToPath, buffer));

      // DB 저장
      await fastify.knex("VOS_OOG_UPLD_MST").insert({
        UPLD_DT: timestamp, // 업로드 날짜
        FILE_PATH: saveToPath, // 저장된 파일 경로
        ORGN_FILE_NM: data.filename, // 원본 파일명
        EMAIL: req.email, // 이메일
      });

      reply.status(200).send({
        message: "File uploaded successfully",
        fileUUID,
        filePath,
        filename,
        timestamp,
      });
    } catch (err) {
      console.error("File upload error:", err);
      reply.status(500).send({ error: "Error uploading file" });
    }
  });
}

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
