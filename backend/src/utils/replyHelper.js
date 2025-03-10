const replyHelper = (fn) => {
    return async (request, reply) => {
        const timestamp = new Date().toISOString();
        try {
            const result = await fn(request, reply);

            // 응답에 타임스탬프 및 추가 메타데이터 포함
            return {
                success: true,
                message: result ? 'Request processed successfully' : 'No data found',
                timestamp,
                size: result && Array.isArray(result) ? result.length : undefined,
                data: result || null,
            };
        } catch (error) {
            // 예외 처리
            console.error(error);

            // 에러 응답
            reply.code(500); // 서버 에러
            return {
                success: false,
                message: 'An error occurred while processing the request',
                error: error.message,
            };
        }
    };
};

export default replyHelper;
