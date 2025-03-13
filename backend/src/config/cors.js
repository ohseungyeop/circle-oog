import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';

const corsPlugin = async (fastify, options) => {
    console.log('🌐 CORS 플러그인 등록');
    console.log('🔗 허용 Origin:', process.env.FRONTEND_URL);

    fastify.register(fastifyCors, {
        credentials: true, // 자격 증명 허용
        //origin: [process.env.FRONTEND_URL],
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 허용할 HTTP 메서드
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        exposedHeaders: ['set-cookie'],
    });
};

export default fp(corsPlugin);
