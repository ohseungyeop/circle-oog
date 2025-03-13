import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import dotenv from 'dotenv';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import corsPlugin from './config/cors.js';
import dbConnector from './config/db.js';
import mailer from './config/mailer.js';
import routes from './routes/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const fastifyInstance = await fastify({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
            process.env.NODE_ENV === 'prd'
                ? undefined
                : {
                      target: 'pino-pretty',
                      options: { colorize: true, translateTime: 'HH:MM:ss Z' },
                  },
    },
    bodyLimit: 10485760, // 10MB로 설정
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경별 `.env` 파일 불러오기
const envFile = `.env.${process.env.NODE_ENV || 'local'}`;
dotenv.config({ path: envFile });

console.log(`✅ Loaded environment: ${process.env.NODE_ENV}`);
console.log(`✅ Using DB: ${process.env.DB_NAME}`);

// 🔥 환경에 따라 정적 파일 경로 설정
const frontendPath =
    process.env.NODE_ENV === 'prd'
        ? '/home/nodeapp/vos-oog/frontend' // ✅ 운영 서버
        : path.join(__dirname, '../../frontend/dist'); // ✅ 로컬 환

const init = async () => {
    // Fastify 플러그인 등록 순서 보장
    try {
        // Fastify에서 플러그인은 라우트보다 먼저 등록해야 합니다
        // ✅ 플러그인 등록 (라우트 등록 전에 해야 함)
        await fastifyInstance.register(multipart);

        // 플러그인 & 라우트 등록
        await fastifyInstance.register(corsPlugin); // ✅ CORS 추가
        await fastifyInstance.register(dbConnector); // ✅ DB 플러그인
        await fastifyInstance.register(mailer); // ✅ 메일러 플러그인 등록 (라우트보다 먼저)
        await fastifyInstance.register(routes); // ✅ 기존 라우트
        await fastifyInstance.register(cookie, {
            // secret: process.env.COOKIE_SECRET, // 선택적 (서명된 쿠키에 사용)
            parseOptions: {}, // 쿠키 옵션 설정 가능
        });

        // 요청 로그 미들웨어
        fastifyInstance.addHook('onRequest', (request, reply, done) => {
            console.log(`[${new Date().toISOString()}] Request: ${request.method} ${request.url}`);
            done();
        });

        // ✅ 정적 파일 서빙 (React 빌드 폴더)
        fastifyInstance.register(fastifyStatic, {
            root: frontendPath,
            prefix: '/', // 정적 파일 경로 프리픽스 (루트 경로로 설정)
        });
        console.log(frontendPath);

        fastifyInstance.setNotFoundHandler((req, reply) => {
            console.log(` 404 발생: ${req.url}, index.html로 리다이렉트`);
            console.log(`index.html 파일 경로: ${path.join(frontendPath, 'index.html')}`); // 추가된 로그
            reply.sendFile(path.join(frontendPath, 'index.html'));
        });

        // 서버 실행

        //로컬 서버
        // if ('local' === process.env.NODE_ENV) {
        fastifyInstance.listen({
            port: process.env.BACKEND_PORT,
            host: '0.0.0.0',
        });
        //운영 서버
        // } else if ('prd' === process.env.NODE_ENV) {
        //   const fs = require('fs');
        //   const https = require('https');
        //   const options = {
        //     key: fs.readFileSync('/etc/letsencrypt/live/valueonsys.com/privkey.pem'),
        //     cert: fs.readFileSync('/etc/letsencrypt/live/valueonsys.com/fullchain.pem'),
        //     minVersion: 'TLSv1.2'  // 최소 TLS 버전 설정 (예: TLS 1.2)
        //   };

        //   https.createServer(options, fastifyInstance.handler).listen(8443, '0.0.0.0', (err) => {
        //     if (err) {
        //       console.error(err);
        //       process.exit(1);
        //     }
        //     console.log('Fastify HTTPS server running on http://172.20.12.6');
        //   });
        // }
    } catch (error) {
        fastifyInstance.log.error(error);
        process.exit(1);
    }
};

init();
