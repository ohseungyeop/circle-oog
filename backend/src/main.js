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
});

// 환경별 `.env` 파일 불러오기
const dotenv = require('dotenv');
const envFile = `.env.${process.env.NODE_ENV || 'local'}`;
dotenv.config({ path: envFile });

console.log(`✅ Loaded environment: ${process.env.NODE_ENV}`);
console.log(`✅ Using DB: ${process.env.DB_NAME}`);

// 플러그인 & 라우트 등록
fastify.register(require('./plugins/cors'));  // ✅ CORS 추가
fastify.register(require('./plugins/db'));
fastify.register(require('./routes'));

// 서버 실행
const start = async () => {
  try {
    await fastify.listen({ port: process.env.SERVER_PORT });
    console.log(`🚀 Server running at ${process.env.SERVER_URL}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
