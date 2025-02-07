const jwt = require('jsonwebtoken');

async function authMiddleware(request, reply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ code: 'E', status: 'Error', message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    request.user = decoded.email;  // ✅ 검증된 사용자 정보 저장
  } catch (error) {
    return reply.status(401).send({ code: 'E', status: 'Error', message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
