import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';

const corsPlugin = async (fastify, options) => {
    console.log('🌐 CORS 플러그인 등록');
    console.log('🔗 허용 Origin:', process.env.FRONTEND_URL);

    // 환경별 CORS 설정
    const corsOptions = {
        credentials: true,
        origin: [process.env.FRONTEND_URL],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Accept'],
        maxAge: 3600,
        preflightContinue: false
    };
    fastify.register(fastifyCors, corsOptions);
};

export default fp(corsPlugin);
