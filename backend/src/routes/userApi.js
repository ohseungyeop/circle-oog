import jwt from 'jsonwebtoken';
import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setAuthToken } from '../utils/cookieHelper.js';
import sendEmail from '../utils/emailHelper.js';

const verifyJwtToken = (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
            if (err) {
                reject(new Error('Invalid or expired token'));
            } else {
                resolve(decoded);
            }
        });
    });
};

const registerUser = async (fastify, options) => {
    fastify.post('/', async (request, reply) => {
        const { email } = request.body;
        console.log('📧 이메일 요청:', email);
        console.log('🔍 fastify.knex 확인:', fastify.knex);

        // fastify.knex가 정상적으로 등록되었는지 확인
        if (!fastify.knex) {
            fastify.log.error('❌ Knex is undefined in registerUser route!');
            return reply.status(500).send({
                code: 'E',
                status: 'Error',
                message: 'Database connection is not available. Please check the server logs.',
            });
        }

        try {
            // 1️⃣ 이메일로 사용자 조회
            const existingUser = await fastify.knex('vos_oog_usr').where({ USR_EML: email }).first();

            // 2️⃣ 검증 토큰 생성 (24시간 유효) - 이메일 검증용
            const emailToken = jwt.sign(
                {
                    email,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24시간 후 만료
                },
                process.env.JWT_SECRET_KEY,
                { algorithm: 'HS256' },
            );

            if (existingUser) {
                // 3️⃣ 기존 사용자 상태 체크
                if ('A' === existingUser.USR_STS && 'Y' === existingUser.EML_VRF_YN) {
                    // ✅ 기존 쿠키 확인
                    const existingAuthToken = request.cookies.authToken;

                    if (!existingAuthToken) {
                        // 쿠키가 없는 경우 새로운 토큰 발급
                        setAuthToken(reply, email);
                        return reply.send({
                            code: 'S',
                            status: 'Success',
                            message: 'User exists, new auth token generated',
                            // ,              data: { tokenRefreshed: true }
                        });
                    }
                    return reply.send({
                        code: 'S',
                        status: 'Success',
                        message: 'User already exists',
                    });
                } else if ('I' === existingUser.USR_STS && 'N' === existingUser.EML_VRF_YN) {
                    return reply.send({
                        code: 'V',
                        status: 'Verify',
                        message: 'Email exists, but not verified. Please verify your email.',
                    });
                }
            } else {
                // 4️⃣ 새로운 사용자 등록
                await fastify.knex('vos_oog_usr').insert({
                    USR_EML: email,
                    USR_STS: 'I', // Inactive
                    EML_VRF_YN: 'N', // 검증되지 않음
                });

                // 5️⃣ 이메일 검증 링크 생성
                const verificationLink = `${process.env.BACKEND_URL}/vos/oog/v1/emails/verify?token=${emailToken}`;

                // 6️⃣ 이메일 전송
                const subject = '[VOS OOG System] Email Verification';
                const text = `Hello,\n\nPlease verify your email by clicking the link below:\n\n${verificationLink}\n\nThank you!`;

                await sendEmail(fastify, email, subject, text);
                console.log('📨 이메일 검증 요청 전송 완료:', email);

                return reply.send({
                    code: 'N',
                    status: 'New',
                    message: 'User registered and verification email sent.',
                });
            }
        } catch (error) {
            console.error('Error during user registration or email sending:', error);
            return reply.status(500).send({
                code: 'E',
                status: 'Error',
                message: 'Internal server error. Please try again later.',
            });
        }
    });
};

const verifyToken = async (fastify, options) => {
    fastify.post('/', async (request, reply) => {
        const token = request.headers['authorization']?.split(' ')[1]; // "Bearer <token>"에서 <token>만 추출
        try {
            const decoded = await verifyJwtToken(token);
            // 토큰이 유효한 경우(decoded가 반환되면)
            return reply.send({
                code: 'S',
                status: 'Success',
                message: 'Token is valid',
                data: decoded,
            });
        } catch (error) {
            // 토큰이 유효하지 않은 경우, 사용자 이메일 확인 후 새로운 토큰 발급
            if (error.message === 'Invalid or expired token') {
                const tokenEmail = request.cookies.email;
                const existingUser = await fastify.knex('vos_oog_usr').where({ USR_EML: tokenEmail }).first();

                if (existingUser && 'A' === existingUser.USR_STS && 'Y' === existingUser.EML_VRF_YN) {
                    // 유효한 사용자가 존재하면 새 토큰 발급
                    setAuthToken(reply, tokenEmail); // 쿠키에 새 토큰 저장
                    return reply.send({
                        code: 'S',
                        status: 'Success',
                        message: 'New token issued',
                        data: { token: newAuthToken },
                    });
                } else {
                    return reply.status(400).send({
                        code: 'E',
                        status: 'Error',
                        message: 'Invalid or expired token, user does not exist or is inactive',
                    });
                }
            }
            return reply.status(400).send({ code: 'E', status: 'Error', message: error.message });
        }
    });
};

const verifyEmail = async (fastify, options) => {
    fastify.get('/', async (request, reply) => {
        const emailToken = request.query.token;
        const redirectUrl = `${process.env.FRONTEND_URL}`;
        const viewPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'views');

        if (!emailToken) {
            const filePath = path.join(viewPath, 'token-missing.ejs');
            const html = ejs.render(fs.readFileSync(filePath, 'utf8'), { redirectUrl: `${redirectUrl}` });
            return reply.status(400).type('text/html').send(html);
        }

        try {
            // JWT 검증
            const decoded = jwt.verify(emailToken, process.env.JWT_SECRET_KEY);
            const email = decoded.email;

            // DB 업데이트 (이메일 인증 완료 처리)
            const updatedRows = await fastify
                .knex('vos_oog_usr')
                .where({ USR_EML: email })
                .update({
                    USR_STS: 'A',
                    EML_VRF_YN: 'Y',
                    UPD_DT: fastify.knex.raw('CURRENT_TIMESTAMP'),
                });

            if (updatedRows === 0) {
                const filePath = path.join(viewPath, 'user-missing.ejs');
                const html = ejs.render(fs.readFileSync(filePath, 'utf8'), { redirectUrl: `${redirectUrl}` });
                return reply.status(400).type('text/html').send(html);
            }

            // ✅ **쿠키에 토큰 저장**
            setAuthToken(reply, email);

            // ✅ **클라이언트로 리다이렉트**
            const filePath = path.join(viewPath, 'verify-success.ejs');
            const html = ejs.render(fs.readFileSync(filePath, 'utf8'), { redirectUrl: `${redirectUrl}/mainPage` });
            return reply.type('text/html').send(html);
        } catch (error) {
            fastify.log.error(`❌ Email verification failed: ${error.message}`);

            const filePath = path.join(viewPath, 'verify-failure.ejs');
            const html = ejs.render(fs.readFileSync(filePath, 'utf8'), { redirectUrl: `${redirectUrl}` });
            return reply.status(400).type('text/html').send(html);
        }
    });
};

export { registerUser, verifyToken, verifyEmail };
