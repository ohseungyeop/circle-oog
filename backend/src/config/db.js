const fp = require('fastify-plugin');
const knex = require('knex');

// MySQL (Knex) 플러그인
async function dbConnector(fastify, options) {
  const db = knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    },
  });

  fastify.decorate('knex', db);
}

module.exports = fp(dbConnector);
