import * as React from 'react';
import Box from '@mui/material/Box';
import { useCookies } from 'react-cookie';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import FileList from './FileList';
import { ExcelDataGrid } from './ExcelDataGrid';
import {
    fetchData,
    handleFileUpload,
    handleTemplateDownload,
    handleDeleteRows,
    handleSelectionChange,
    fetchExcelData,
    handleExportToExcel,
} from './FileListHandlers';
import { OogColumnsContext } from '../context/OogColumnsContext';
import { GridColDef } from '@mui/x-data-grid';
import { FileListHandlers } from './FileListHandlers.tsx';
import { lengthUnits, weightUnits } from '../utils/UnitConverter.tsx';

interface ExcelRow {
    pckOrdSeq: string;
}

const columns = [
    { field: 'id', headerName: 'No', width: 90 },
    { field: 'fileName', headerName: 'File name', width: 600, editable: true },
    { field: 'fileDate', headerName: 'File Date', width: 350, editable: true },
];

export const excelColumns: GridColDef[] = [
    { field: 'id', headerName: 'NO.', width: 100 },
    { field: 'pckNo', headerName: 'Item No', width: 100 },
    { field: 'itmNm', headerName: 'Item Name', width: 100 },
    { field: 'itmLen', headerName: 'Package Length', width: 100 },
    { field: 'itmWdt', headerName: 'Package Width', width: 100 },
    { field: 'itmHgt', headerName: 'Package Height', width: 100 },
    { field: 'itmQty', headerName: "Q'ty", width: 100 },
    { field: 'netWgt', headerName: 'Net Weight', width: 100 },
    { field: 'boxLen', headerName: 'Box Length', width: 100 },
    { field: 'boxWdt', headerName: 'Box Width', width: 100 },
    { field: 'boxHgt', headerName: 'Box Height', width: 100 },
    { field: 'itmCbm', headerName: 'CBM', width: 100 },
    { field: 'itmTpNm', headerName: 'Item Type', width: 100 },
    { field: 'grsWgt', headerName: 'Gross Weight', width: 100 },
    { field: 'rmks', headerName: 'Remarks', width: 100 },
];

const FileListGrid = () => {
    const [rows, setRows] = React.useState<any[]>([]);
    const [pckOrdSeq, setPckOrdSeq] = React.useState<string>('N/A');
    const [excelRows, setExcelRows] = React.useState<ExcelRow[]>([]);
    const [calculatorData, setCalculatorData] = React.useState<any[]>([]);
    const [cookies, setCookie, removeCookie] = useCookies(['authToken']);
    const apiUrl = import.meta.env.VITE_API_URL;
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
    const [oogColumns, setOogColumns] = React.useState<GridColDef[]>([]);
    const [lengthUnit, setLengthUnit] = React.useState<keyof typeof lengthUnits>('mm');
    const [weightUnit, setWeightUnit] = React.useState<keyof typeof weightUnits>('kg');

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    React.useEffect(() => {
        if (cookies.authToken) {
            fetchData(cookies, apiUrl, setRows);
        }
    }, [cookies.authToken]);

    React.useEffect(() => {
        if (excelRows.length > 0 && excelRows[0]?.pckOrdSeq) {
            setPckOrdSeq(excelRows[0].pckOrdSeq);
        }
    }, [excelRows]);

    return (
        <OogColumnsContext.Provider
            value={{
                oogColumns,
                setOogColumns,
                lengthUnit,
                setLengthUnit,
                weightUnit,
                setWeightUnit,
            }}
        >
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
                    onChange={(event) => handleFileUpload(event, cookies, apiUrl, setSnackbar, setExcelRows, fetchData, setRows)}
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
                    onClick={() => handleExportToExcel(calculatorData)}
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
                    onClick={() => handleDeleteRows(apiUrl, cookies, selectionModel, rows, setSnackbar, fetchData, setRows)}
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
                            cookies,
                        )
                    }
                />

                <ExcelDataGrid rows={excelRows} pckOrdSeq={pckOrdSeq} selectionModel={selectionModel} oogData={calculatorData} />

                <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
            <FileListHandlers />
        </OogColumnsContext.Provider>
    );
};

export default FileListGrid;
