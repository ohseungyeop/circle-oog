// controllers/excelController.js
const excelService = require('../services/excelService');

exports.uploadAndProcessExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        const filePath = req.file.path;
        const result = await excelService.processExcelData(filePath);
        res.json({
            message: 'Excel data processed successfully',
            data: result,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error processing Excel data');
    }
};
