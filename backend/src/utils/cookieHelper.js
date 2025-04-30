import jwt from 'jsonwebtoken';

function setAuthToken(reply, email) {
    console.log('-------------------');
    console.log(process.env.NODE_ENV);
    console.log(process.env.COOKIE_DOMAIN);
    console.log('-------------------');

    const authToken = jwt.sign({ email }, process.env.JWT_SECRET_KEY, { expiresIn: '15m' });

    console.log('Setting cookie with token:', authToken);

    // 환경별 쿠키 설정
    const cookieOptions = {
        httpOnly: true, // 모든 환경에서 보안 강화
        sameSite: process.env.NODE_ENV === 'prd' ? 'Lax' : 'Strict', // 프로덕션에서는 Lax, 개발환경에서는 Strict
        path: '/',
        maxAge: 60 * 15 // 15분 (JWT 토큰과 동일한 만료 시간)
    };

    // 프로덕션 환경 설정
    if (process.env.NODE_ENV === 'prd') {
        cookieOptions.secure = true; // HTTPS 필수
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    // 로컬 환경에서는 도메인 설정 제거
    if (process.env.NODE_ENV === 'local') {
        delete cookieOptions.domain;
    }

    reply.setCookie('authToken', authToken, cookieOptions);

    // 헤더 설정 확인을 위한 로그
    console.log('Response headers:', reply.getHeaders());

    return authToken;
}

export { setAuthToken };
