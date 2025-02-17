const { replyHelper } = require('helpers/replyHelper');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises; 
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
        const email = req.user?.email;
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


      // 저장할 경로 생성 (이메일 기준)
      const filePath = path.join(process.env.ATTACH_PATH, req.email);

      console.log("File path:", filePath);
      
      // 📌 디렉토리 확인 후 생성
      try {
        await fs.access(filePath)
      }
      catch(error){
        await fs.mkdir(filePath, { recursive: true });
      }
       console.log("Directory is ready:", filePath);


      // Timestamp
      //const fileUUID = uuidv4();
      const timestamp = new Date(new Date().getTime() + 9 * 60 * 60 * 1000) // UTC+9 보정
                        .toISOString()
                        .replace('T', ' ')
                        .split('.')[0]; 

      // const extname = path.extname(data.filename);
      // const filename = `${fileUUID}-${timestamp}${extname}`;
      const filename = data.filename;
      const saveToPath = path.join(filePath, filename);

      console.log("Final file path:", saveToPath);
     
      // 파일 저장
      const buffer = await data.toBuffer();
      fs.writeFile(saveToPath,buffer);
      console.log("File successfully saved!");
 
      // DB 저장
      await fastify.knex("VOS_OOG_UPLD_MST").insert({
        UPLD_DT: timestamp, // 업로드 날짜
        FILE_PATH: saveToPath, // 저장된 파일 경로
        ORGN_FILE_NM: data.filename, // 원본 파일명
        EMAIL: req.email, // 이메일
      });

      reply.status(200).send({
        message: "File uploaded successfully",
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

async function selectOogFile(fastify, options){
  fastify.post('/', replyHelper(async (request, reply) => {
    try {
      console.log("📩 Received request body:", request.body);

      const { email } = request.body;
      if (!email) {
        console.error("❌ Missing email in request");
        throw new Error("Email is required"); // 🚨 `reply.send()` 없이 예외 던지기
      }

      const fileList = await fastify.knex('VOS_OOG_UPLD_MST')
        .where({ EMAIL: email })
        .select('*');

      console.log("📂 update file list:", fileList);
      return fileList; // ✅ `reply.send()` 호출 X (replyHelper가 처리)
    } catch (error) {
      console.error("❌ Error fetching file list:", error);
      throw error; // 🚨 `replyHelper`가 오류 처리하도록 예외 던지기
    }
  }));
};
module.exports = {
  getPckRoutes,
  uploadOogFile,
  insertPckRoute,
  selectOogFile
};
