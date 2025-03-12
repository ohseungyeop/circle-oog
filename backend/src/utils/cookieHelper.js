import jwt from 'jsonwebtoken';

function setAuthToken(reply, email) {
    console.log('-------------------');
    console.log(process.env.NODE_ENV);
    console.log(process.env.COOKIE_DOMAIN);
    console.log('-------------------');

    const authToken = jwt.sign({ email }, process.env.JWT_SECRET_KEY, { expiresIn: '7d' });

    console.log('Setting cookie with token:', authToken);

    reply.setCookie('authToken', authToken, {
        httpOnly: false, // 클라이언트에서 쿠키를 읽을 수 있도록 설정
        //secure: process.env.NODE_ENV === 'prd', //https 가 아니므로 주석
        sameSite: 'Strict',
        //sameSite: 'None',
        domain: process.env.COOKIE_DOMAIN,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7일 (선택 사항)
    });

    // 헤더 설정 확인을 위한 로그
    console.log('Response headers:', reply.getHeaders());

    return authToken;
}

export { setAuthToken };
