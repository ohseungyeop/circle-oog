import * as React from 'react';
import Box from '@mui/material/Box';
import { useCookies } from 'react-cookie';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { handleCalculator } from './FileListHandlers';
interface ExcelDataGridProps {
    rows: any[];
    pckOrdSeq: string;
}

const excelColumns: GridColDef[] = [
    { field: 'id', headerName: 'Seq', width: 200 },
    { field: 'pckNo', headerName: 'Item No', width: 200 },
    { field: 'itmNm', headerName: 'Item Name', width: 200 },
    { field: 'itmLen', headerName: 'Package Length', width: 200 },
    { field: 'itmWdt', headerName: 'Package Width', width: 200 },
    { field: 'itmHgt', headerName: 'Package Height', width: 200 },
    { field: 'boxLen', headerName: 'Box Length', width: 200 },
    { field: 'boxWdt', headerName: 'Box Width', width: 200 },
    { field: 'boxHgt', headerName: 'Box Height', width: 200 },
    { field: 'itmQty', headerName: "Q'ty", width: 200 },
    { field: 'itmCbm', headerName: 'CBM', width: 200 },
    { field: 'itmTpNm', headerName: 'Item Type', width: 200 },
    { field: 'netWgt', headerName: 'Net Weight', width: 200 },
    { field: 'grsWgt', headerName: 'Gross Weight', width: 200 },
    { field: 'rmks', headerName: 'Remarks', width: 200 },
];

const ExcelDataGrid: React.FC<ExcelDataGridProps> = ({ rows, pckOrdSeq }) => {


    if (!rows || rows.length === 0) {
        return <div>데이터가 없습니다.</div>;
    }
    const apiUrl = import.meta.env.VITE_BACKEND_URL;
    const [cookies] = useCookies(['authToken']);
    const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'success' });
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };


    return (
        <Box sx={{ height: 400, width: '100%' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    margin: '10px',
                }}
            >
                <h3>🧮 Out of Gauge System</h3>
                <button
                    onClick={() => handleCalculator(apiUrl, pckOrdSeq, cookies, setSnackbar)}
                    style={{
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
                    Calculator
                </button>
            </div>

            <DataGrid
                rows={rows}
                getRowId={(row) => row.pckNo} // 고유 id 지정
                rowCount={rows.length}
                columns={excelColumns}
                paginationMode="server"
                pageSize={5}
                disableRowSelectionOnClick
                pagination
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

        </Box>
    );
};

export default ExcelDataGrid;
