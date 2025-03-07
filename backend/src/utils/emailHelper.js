const sendEmail = async (fastify, to, subject, text) => {
    try {
        const info = await fastify.mailer.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            text,
        });
        fastify.log.info(`✅ Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        fastify.log.error(`❌ Failed to send email to ${to}: ${error.message}`);
        throw new Error('Failed to send email');
    }
};

module.exports = {
    sendEmail,
};
