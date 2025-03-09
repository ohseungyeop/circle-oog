// controllers/pckController.js
import fp from 'fastify-plugin';
import pckService from '../services/pckService.js';

const uploadAndProcessPck = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        const filePath = req.file.path;
        const result = await pckService.processPckData(filePath);
        res.json({
            message: 'Pck data processed successfully',
            data: result,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error processing Pck data');
    }
};

export default fp(uploadAndProcessPck);
