import fp from 'fastify-plugin';
import knex from 'knex';

// MySQL (Knex) 플러그인
const dbConnector = async (fastify, options) => {
    const db = knex({
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            decimalNumbers: true,
        },
        debug: process.env.NODE_ENV !== 'prd', // 운영에서는 바인딩 값(이메일, 토큰)이 로그에 남지 않게 끈다
        log: {
            warn(message) {
                console.log('⚠️ Knex Warning:', message);
            },
            error(message) {
                console.error('❌ Knex Error:', message);
            },
            deprecate(message) {
                console.log('🚨 Knex Deprecation:', message);
            },
            debug(message) {
                console.log('🔍 Knex Query:', message);
            },
        },
    });

    fastify.decorate('knex', db);
    // fastify.decorateRequest('knex', db);

    // 📌 fastify.knex가 등록되었는지 확인
    fastify.addHook('onReady', async () => {
        if (fastify.knex) {
            fastify.log.info('✅ Knex has been successfully registered in Fastify.');
        } else {
            fastify.log.error('❌ Knex registration failed!');
        }
    });
};

export default fp(dbConnector);
