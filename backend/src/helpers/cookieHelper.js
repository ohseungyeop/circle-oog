function setAuthToken(reply, token) {
    reply.setCookie('authToken', token, {
      httpOnly: false,  // 클라이언트에서 쿠키를 읽을 수 있도록 설정
      // secure: true,  // HTTPS 환경에서만 동작하도록 설정 (배포 시 true)
      sameSite: 'Strict',
      domain: process.env.COOKIE_DOMAIN,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,  // 7일 (선택 사항)
    });
  }
  
  module.exports = { setAuthToken };
  