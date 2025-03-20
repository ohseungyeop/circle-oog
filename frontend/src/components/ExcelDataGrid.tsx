import * as React from 'react';
import { Box, AppBar, Tabs, Tab } from '@mui/material';
import { useCookies } from 'react-cookie';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { handleCalculator, fetchOogCalcData, handleExportToExcel } from './FileListHandlers';
import '@google/model-viewer';
interface ExcelDataGridProps {
    rows: any[];
    pckOrdSeq: string;
    selectionModel: GridRowSelectionModel;
}

const excelColumns: GridColDef[] = [
    { field: 'id', headerName: 'Seq', width: 100 },
    { field: 'pckNo', headerName: 'Item No', width: 100 },
    { field: 'itmNm', headerName: 'Item Name', width: 100 },
    { field: 'itmLen', headerName: 'Package Length', width: 100 },
    { field: 'itmWdt', headerName: 'Package Width', width: 100 },
    { field: 'itmHgt', headerName: 'Package Height', width: 100 },
    { field: 'boxLen', headerName: 'Box Length', width: 100 },
    { field: 'boxWdt', headerName: 'Box Width', width: 100 },
    { field: 'boxHgt', headerName: 'Box Height', width: 100 },
    { field: 'itmQty', headerName: "Q'ty", width: 100 },
    { field: 'itmCbm', headerName: 'CBM', width: 100 },
    { field: 'itmTpNm', headerName: 'Item Type', width: 100 },
    { field: 'netWgt', headerName: 'Net Weight', width: 100 },
    { field: 'grsWgt', headerName: 'Gross Weight', width: 100 },
    { field: 'rmks', headerName: 'Remarks', width: 100 },
];

const oogColumns: GridColDef[] = [
    { field: 'id', headerName: 'Seq', width: 100 },
    { field: 'clpNo', headerName: 'CLP №', width: 100 },
    { field: 'boxNo', headerName: 'BOXNO.', width: 100 },
    { field: 'Item', headerName: ' ITEM', width: 100 },
    { field: 'mcLen', headerName: 'M/C Length', width: 100 },
    { field: 'mcWdt', headerName: 'M/C Width', width: 100 },
    { field: 'mcHgt', headerName: 'M/C Height', width: 100 },
    { field: 'boxLen', headerName: 'Box Length', width: 100 },
    { field: 'boxWdt', headerName: 'Box Width', width: 100 },
    { field: 'boxHgt', headerName: 'Box Height', width: 100 },
    { field: 'qty', headerName: "Q'ty", width: 100 },
    { field: 'cbm', headerName: 'CBM', width: 100 },
    { field: 'type', headerName: 'TYPE', width: 100 },
    { field: 'nw', headerName: 'N/W', width: 100 },
    { field: 'gw', headerName: 'G/W', width: 100 },
    { field: 'rmks', headerName: 'REMARKS', width: 100 },
    { field: 'tpsz', headerName: 'TPSZ', width: 100 },
    {
        field: 'image',
        headerName: 'TPSZ',
        width: 100,
        renderCell: (params) => {
            if (!params.value) return null;
            return (
                <model-viewer
                    src={params.value}
                    alt="3D model"
                    auto-rotate
                    camera-controls
                    style={{ width: '100%', height: '100px' }}
                ></model-viewer>
            );
        },
    },
];

const TabPanel = ({ children, value, index }: any) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
};

const modelUrls = ['/images/40fr.glb', '/images/40hq.glb', '/images/20dr.glb'];

// 이미지 미리 로딩
// const preloadImage = (urls: string[]) => {
//     urls.forEach((url) => {
//         const img = new Image();
//         img.src = url;
//     });
// };
const preloadGLB = (url: string) => {
    fetch(url)
        .then((response) => response.blob()) // 데이터를 Blob 형식으로 변환
        .then((blob) => {
            // 브라우저 캐시에 저장
            const objectURL = URL.createObjectURL(blob);
            console.log(`GLB 파일 미리 로드됨: ${objectURL}`);
        })
        .catch((error) => console.error(`GLB 파일 로딩 실패: ${error}`));
};

const preloadGLBFiles = (urls: string[]) => {
    urls.forEach((url) => preloadGLB(url));
};

const ExcelDataGrid: React.FC<ExcelDataGridProps> = ({ rows, pckOrdSeq, selectionModel }) => {
    if (!rows || rows.length === 0) {
        return <div>데이터가 없습니다.</div>;
    }
    const apiUrl = import.meta.env.VITE_BACKEND_URL;
    const [cookies] = useCookies(['authToken']);
    const [calculatorData, setCalculatorData] = React.useState<any[]>([]);
    const [snackbar, setSnackbar] = React.useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning' | 'info';
    }>({ open: false, message: '', severity: 'success' });
    const [tabValue, setTabValue] = React.useState(0);
    const [loading, setLoading] = React.useState(false);
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue); // 탭 변경 시 상태 업데이트
        if (newValue === 1) {
            fetchOogCalcData(pckOrdSeq, apiUrl, cookies)
                .then((oogData) => {
                    // ✅ 상태 업데이트하여 화면에 반영
                    setCalculatorData(oogData);
                })
                .catch((error) => {
                    console.error('Error fetching OOG data:', error);
                    setSnackbar({ open: true, message: 'Error fetching OOG data', severity: 'error' });
                });
        }
    };

    React.useEffect(() => {
        preloadGLBFiles(modelUrls);
    }, []);

    return (
        <Box sx={{ width: '100%' }}>
            <h3>🧮 Out of Gauge System</h3>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
                <AppBar
                    position="static"
                    sx={{
                        backgroundColor: 'transparent',
                        width: '70%',
                        border: 'none',
                        borderRadius: '5px',
                        boxShadow: 'none',
                    }}
                >
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        indicatorColor="primary"
                        textColor="inherit"
                        variant="standard"
                        sx={{
                            '& .MuiTab-root': {
                                fontFamily: 'sans-serif',
                                fontSize: '15px',
                                textTransform: 'none',
                                color: '#0E4491',
                                fontWeight: 'bold',
                            },
                            '& .Mui-selected': {
                                color: '#0E4491', // 선택된 탭 텍스트 색상
                                borderBottom: '2px solid blue', // 선택된 탭 밑줄 파란색으로 변경
                            },
                        }}
                    >
                        <Tab label="OOG Import Data" />
                        <Tab label="OOG System Data" />
                    </Tabs>
                </AppBar>
                <button
                    onClick={() => handleCalculator(apiUrl, pckOrdSeq, cookies, setSnackbar, selectionModel, setCalculatorData)}
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
            </Box>

            <TabPanel value={tabValue} index={0}>
                <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid
                        rows={rows}
                        getRowId={(row) => row.pckNo} // 고유 id 지정
                        columns={excelColumns}
                        disableRowSelectionOnClick
                        rowSelectionModel={selectionModel}
                        loading={loading} // ✅ 로딩 상태 표시
                        paginationMode="client"
                        components={{
                            Footer: () => <Box sx={{ padding: '10px', textAlign: 'right' }}>총 줄 수: {rows.length}</Box>,
                        }}
                    />
                </Box>
            </TabPanel>

            {/* TabPanel: 두 번째 탭 (File List) */}
            <TabPanel value={tabValue} index={1}>
                <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid
                        rows={calculatorData}
                        getRowId={(row) => row.id} // 고유 id 지정
                        columns={oogColumns}
                        disableRowSelectionOnClick
                        rowSelectionModel={selectionModel}
                        loading={loading} // ✅ 로딩 상태 표시
                        paginationMode="client"
                        components={{
                            Footer: () => <Box sx={{ padding: '10px', textAlign: 'right' }}>총 줄 수: {calculatorData.length}</Box>,
                        }}
                    />
                </Box>
            </TabPanel>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ExcelDataGrid;
