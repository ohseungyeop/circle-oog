const replyHelper = (fn) => {
    return async (request, reply) => {
        const timestamp = new Date().toISOString();
        try {
            const result = await fn(request, reply); // Execute the original function

            // Format the response data
            const response = {
                success: true,
                message: result ? 'Request processed successfully' : 'No data found',
                timestamp,
                size: result && Array.isArray(result) ? result.length : undefined,
                data: result || null,
            };

            // Send the response to the client
            return reply.send(response); // Only reply here once
        } catch (error) {
            console.error(error);

            // Error response
            const errorResponse = {
                success: false,
                message: 'An error occurred while processing the request',
                error: error.message,
                timestamp,
            };

            return reply.code(500).send(errorResponse); // Send the error response once
        }
    };
};

export default replyHelper;
