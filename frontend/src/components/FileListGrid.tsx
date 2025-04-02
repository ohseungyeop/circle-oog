import * as React from 'react';
import Box from '@mui/material/Box';
import { useCookies } from 'react-cookie';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import FileList from './FileList';
import { ExcelDataGrid, handleExportToExcel } from './ExcelDataGrid';
import {
    fetchData,
    handleFileUpload,
    handleTemplateDownload,
    handleDeleteRows,
    handleSelectionChange,
    fetchExcelData,
} from './FileListHandlers';

interface ExcelRow {
    pckOrdSeq: string;
}

const columns = [
    { field: 'id', headerName: 'No', width: 90 },
    { field: 'fileName', headerName: 'File name', width: 600, editable: true },
    { field: 'fileDate', headerName: 'File Date', width: 350, editable: true },
];

const FileListGrid = () => {
    const [rows, setRows] = React.useState<any[]>([]);
    const [pckOrdSeq, setPckOrdSeq] = React.useState<string>('N/A');
    const [excelRows, setExcelRows] = React.useState<ExcelRow[]>([]);
    const [calculatorData, setCalculatorData] = React.useState<any[]>([]);
    const [cookies, setCookie, removeCookie] = useCookies(['authToken']);
    const apiUrl = import.meta.env.VITE_BACKEND_URL;
    const [snackbar, setSnackbar] = React.useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning' | 'info';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [selectionModel, setSelectionModel] = React.useState<number[]>([]);

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    React.useEffect(() => {
        if (cookies.authToken) {
            fetchData({ authToken: cookies.authToken }, apiUrl, setRows);
        }
    }, [cookies.authToken]);

    React.useEffect(() => {
        if (excelRows.length > 0 && excelRows[0]?.pckOrdSeq) {
            setPckOrdSeq(excelRows[0].pckOrdSeq);
        }
    }, [excelRows]);

    return (
        <Box sx={{ height: 400, width: '100%' }}>
            <button
                onClick={() => handleTemplateDownload(apiUrl)}
                style={{
                    padding: '10px 20px',
                    margin: '15px',
                    backgroundColor: '#0E4491',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontFamily: 'sans-serif',
                }}
            >
                Template Download
            </button>

            <input
                ref={fileInputRef}
                type="file"
                onChange={(event) =>
                    handleFileUpload(event, { authToken: cookies.authToken }, apiUrl, setSnackbar, setExcelRows, fetchData, setRows)
                }
                hidden
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                    marginBottom: '10px',
                    padding: '10px 20px',
                    backgroundColor: '#0E4491',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontFamily: 'sans-serif',
                    fontSize: '15px',
                }}
            >
                Import
            </button>

            <button
                onClick={() => handleExportToExcel()}
                style={{
                    marginBottom: '10px',
                    margin: '15px',
                    padding: '10px 20px',
                    backgroundColor: '#0E4491',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontFamily: 'sans-serif',
                    fontSize: '15px',
                }}
            >
                Export
            </button>

            <button
                onClick={() =>
                    handleDeleteRows(
                        apiUrl,
                        { authToken: cookies.authToken },
                        selectionModel,
                        rows,
                        setSnackbar,
                        fetchData,
                        setRows,
                    )
                }
                style={{
                    marginBottom: '10px',
                    padding: '10px 20px',
                    backgroundColor: '#0E4491',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontFamily: 'sans-serif',
                    fontSize: '15px',
                }}
            >
                Delete
            </button>

            <FileList
                rows={rows}
                columns={columns}
                selectionModel={selectionModel}
                handleSelectionChange={(newSelection) =>
                    handleSelectionChange(
                        [...newSelection].filter((id): id is number => typeof id === 'number'),
                        rows,
                        setSelectionModel,
                        setExcelRows,
                        setCalculatorData,
                        fetchExcelData,
                        apiUrl,
                        { authToken: cookies.authToken },
                    )
                }
            />

            <ExcelDataGrid
                rows={excelRows}
                setRows={setRows}
                pckOrdSeq={pckOrdSeq}
                selectionModel={selectionModel}
                oogData={calculatorData}
            />

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default FileListGrid;
