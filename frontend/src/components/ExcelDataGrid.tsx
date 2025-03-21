import * as React from 'react';
import { Box, AppBar, Tabs, Tab } from '@mui/material';
import { useCookies } from 'react-cookie';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { handleCalculator, fetchOogCalcData } from './FileListHandlers';

interface ExcelDataGridProps {
    rows: any[];
    pckOrdSeq: string;
    selectionModel: GridRowSelectionModel;
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

const oogColumns: GridColDef[] = [
    { field: 'id', headerName: 'Seq', width: 200 },
    { field: 'clpNo', headerName: 'CLP №', width: 200 },
    { field: 'boxNo', headerName: 'BOXNO.', width: 200 },
    { field: 'Item', headerName: ' ITEM', width: 200 },
    { field: 'mcLen', headerName: 'M/C Length', width: 200 },
    { field: 'mcWdt', headerName: 'M/C Width', width: 200 },
    { field: 'mcHgt', headerName: 'M/C Height', width: 200 },
    { field: 'boxLen', headerName: 'Box Length', width: 200 },
    { field: 'boxWdt', headerName: 'Box Width', width: 200 },
    { field: 'boxHgt', headerName: 'Box Height', width: 200 },
    { field: 'qty', headerName: "Q'ty", width: 200 },
    { field: 'cbm', headerName: 'CBM', width: 200 },
    { field: 'type', headerName: 'TYPE', width: 200 },
    { field: 'nw', headerName: 'N/W', width: 200 },
    { field: 'gw', headerName: 'G/W', width: 200 },
    { field: 'rmks', headerName: 'REMARKS', width: 200 },
    { field: 'tpsz', headerName: 'TPSZ', width: 200 },
];

const TabPanel = ({ children, value, index }: any) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
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
    const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 50 });
    const [loading, setLoading] = React.useState(false);
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const fetchMoreData = async () => {
        if (loading) return; // 이미 로딩 중이면 중복 요청 방지
        setLoading(true);

        try {
            const response = await fetch(`${apiUrl}/data?page=${paginationModel.page + 1}&size=${paginationModel.pageSize}`);
            const newData = await response.json();

            setRows((prevRows: any[]) => [...prevRows, ...newData]); // 기존 데이터에 추가
            setPaginationModel((prev) => ({ ...prev, page: prev.page + 1 }));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // 📌 페이지 변경 시 자동으로 `fetchMoreData` 호출
    const handlePaginationChange = (newModel: { page: number; pageSize: number }) => {
        if (newModel.page > paginationModel.page) {
            fetchMoreData(); // 스크롤하여 다음 페이지 요청
        }
        setPaginationModel(newModel);
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
                <DataGrid
                    rows={rows}
                    getRowId={(row) => row.pckNo} // 고유 id 지정
                    rowCount={rows.length}
                    columns={excelColumns}
                    paginationMode="server"
                    pageSizeOptions={[50, 100, 200]} // 50개 단위로 설정
                    paginationModel={paginationModel}
                    onPaginationModelChange={handlePaginationChange} // ✅ 스크롤 시 자동 로드
                    disableRowSelectionOnClick
                    rowSelectionModel={selectionModel}
                    loading={loading} // ✅ 로딩 상태 표시
                />
            </TabPanel>

            {/* TabPanel: 두 번째 탭 (File List) */}
            <TabPanel value={tabValue} index={1}>
                <div>
                    <table border="1" cellPadding="5" cellSpacing="0">
                        <thead>
                            <tr>
                                {oogColumns.map((item) => (
                                    <th>{item.headerName}</th>
                                ))}
                                <th>Image</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calculatorData.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>{item.clpNo}</td>
                                    <td>{item.boxNo}</td>
                                    <td>{item.Item}</td>
                                    <td>{item.mcLen}</td>
                                    <td>{item.mcWdt}</td>
                                    <td>{item.mcHgt}</td>
                                    <td>{item.boxLen}</td>
                                    <td>{item.boxWdt}</td>
                                    <td>{item.boxHgt}</td>
                                    <td>{item.qty}</td>
                                    <td>{item.cbm}</td>
                                    <td>{item.type}</td>
                                    <td>{item.nw}</td>
                                    <td>{item.gw}</td>
                                    <td>{item.rmks}</td>
                                    <td>{item.tpsz}</td>
                                    <td>
                                        <img src={item.image} alt="container image" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                );
                {/* <DataGrid
                    rows={calculatorData}
                    getRowId={(row) => row.id} // 고유 id 지정
                    rowCount={calculatorData.length}
                    columns={oogColumns}
                    paginationMode="server"
                    pageSizeOptions={[50, 100, 200]} // 50개 단위로 설정
                    paginationModel={paginationModel}
                    onPaginationModelChange={handlePaginationChange} // ✅ 스크롤 시 자동 로드
                    disableRowSelectionOnClick
                    rowSelectionModel={selectionModel}
                    loading={loading} // ✅ 로딩 상태 표시
                /> */}
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
