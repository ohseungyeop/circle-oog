const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'prd'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss Z' },
        },
  },
  bodyLimit: 10485760, // 10MB로 설정
});

// 환경별 `.env` 파일 불러오기
const dotenv = require('dotenv');
const envFile = `.env.${process.env.NODE_ENV || 'local'}`;
dotenv.config({ path: envFile });

console.log(`✅ Loaded environment: ${process.env.NODE_ENV}`);
console.log(`✅ Using DB: ${process.env.DB_NAME}`);

const cookie = require('@fastify/cookie');

// Fastify에서 플러그인은 라우트보다 먼저 등록해야 합니다
// ✅ 플러그인 등록 (라우트 등록 전에 해야 함)
fastify.register(require('@fastify/multipart'));

// 플러그인 & 라우트 등록
fastify.register(require('./plugins/cors'));     // ✅ CORS 추가
fastify.register(require('./plugins/db'));       // ✅ DB 플러그인
fastify.register(require('./plugins/mailer'));   // ✅ 메일러 플러그인 등록 (라우트보다 먼저)
fastify.register(require('./routes'));           // ✅ 기존 라우트
fastify.register(cookie, {
  // secret: process.env.COOKIE_SECRET, // 선택적 (서명된 쿠키에 사용)
  parseOptions: {} // 쿠키 옵션 설정 가능
});

// 요청 로그 미들웨어
fastify.addHook('onRequest', (request, reply, done) => {
  console.log(`[${new Date().toISOString()}] Request: ${request.method} ${request.url}`);
  done();
});

// 서버 실행
const start = async () => {
  try {
    await fastify.listen({
      port: process.env.BACKEND_PORT,
      host: '0.0.0.0'
    });
    console.log(`🚀 Server running at ${process.env.BACKEND_URL}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
