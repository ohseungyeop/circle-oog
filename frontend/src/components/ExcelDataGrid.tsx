import * as React from 'react';
import { Box, AppBar, Tabs, Tab } from '@mui/material';
import * as XLSX from 'xlsx';
import { useCookies } from 'react-cookie';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { handleCalculator, fetchOogCalcData } from './FileListHandlers';
import styles from './ExcelDataGrid.module.css';

interface ExcelDataGridProps {
    rows: any[];
    pckOrdSeq: string;
    selectionModel: GridRowSelectionModel;
}

const excelColumns: GridColDef[] = [
    { field: 'id', headerName: 'NO.', width: 100 },
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
    // { field: 'id', headerName: 'Seq.', width: 100 },
    { field: 'clpNo', headerName: 'CLP No.', width: 100 },
    { field: 'boxNo', headerName: 'Box No.', width: 100 },
    { field: 'Item', headerName: ' Item', width: 100 },
    // { field: 'mcLen', headerName: 'M/C Length(㎜)', width: 100 },
    // { field: 'mcWdt', headerName: 'M/C Width(㎜)', width: 100 },
    // { field: 'mcHgt', headerName: 'M/C Height(㎜)', width: 100 },
    { field: 'boxLen', headerName: 'Box Length(㎜)', width: 100 },
    { field: 'boxWdt', headerName: 'Box Width(㎜)', width: 100 },
    { field: 'boxHgt', headerName: 'Box Height(㎜)', width: 100 },
    { field: 'qty', headerName: "Q'ty", width: 100 },
    { field: 'cbm', headerName: 'CBM', width: 100 },
    { field: 'type', headerName: 'Type', width: 100 },
    { field: 'nw', headerName: 'N/W(㎏)', width: 100 },
    { field: 'gw', headerName: 'G/W(㎏)', width: 100 },
    { field: 'rmks', headerName: 'Remarks', width: 100 },
    { field: 'tpsz', headerName: 'Container Type/Size', width: 100 },
    // { field: 'tpsz', headerName: 'Image', width: 100 },
];

const TabPanel = ({ children, value, index }: any) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
};

export const handleExportToExcel = async () => {
    // HTML 테이블을 선택
    const table = document.getElementById('oogDataTable');

    if (table) {
        // 테이블을 엑셀 시트로 변환
        const ws = XLSX.utils.table_to_sheet(table);

        // 워크북 생성
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'OOG Data');

        // 엑셀 파일로 저장
        XLSX.writeFile(wb, 'OOGList.xlsx');
    } else {
        alert('테이블을 찾을 수 없습니다!');
    }
};

const ExcelDataGrid: React.FC<ExcelDataGridProps> = ({ rows, pckOrdSeq, selectionModel }) => {
    if (!rows || rows.length === 0) {
        return <div>데이터가 없습니다.</div>;
    }
    const CRR_CD = 'VOS';
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
    const [containerData, setContainerData] = React.useState<any[]>([]);
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const getContainerMaster = async (crrCd: string) => {
        try {
            const response = await fetch(`${apiUrl}/vos/oog/v1/container/spec/${crrCd}`);
            const newData = await response.json();
            setContainerData(newData?.data);

            const d40Data = containerData?.filter((item) => item.CNTR_TPSZ_CD === '4H')[0];
            console.log('Container Master Data2:', d40Data);

            const table = document.getElementById('oogDataTable');
            if (table) {
                const thList = table.querySelectorAll('thead th'); // 모든 th 요소 선택
                thList.forEach((th) => {
                    if (th.getAttribute('data-key') === 'boxLen') {
                        th.innerHTML += `<br/><b>${d40Data.CNTR_LEN.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                        })} (${Number(d40Data.CNTR_LEN_PCTG)}%)</b>`; // 기존 텍스트 뒤에 추가
                    } else if (th.getAttribute('data-key') === 'boxWdt') {
                        th.innerHTML += `<br/><b>${d40Data.CNTR_WDT.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                        })} (${Number(d40Data.CNTR_WDT_PCTG)}%)</b>`; // 기존 텍스트 뒤에 추가
                    } else if (th.getAttribute('data-key') === 'boxHgt') {
                        th.innerHTML += `<br/><b>${d40Data.CNTR_HGT.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                        })} (${Number(d40Data.CNTR_HGT_PCTG)}%)</b>`; // 기존 텍스트 뒤에 추가
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
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
    // ✅ CLP_NO 병합을 위한 데이터 가공 함수
    const calculateRowSpan = (data: any[]) => {
        const rowSpanMap: Record<string, number> = {};

        data.forEach((item) => {
            if (rowSpanMap[item.clpNo]) {
                rowSpanMap[item.clpNo]++;
            } else {
                rowSpanMap[item.clpNo] = 1;
            }
        });

        return rowSpanMap;
    };
    // 📌 페이지 변경 시 자동으로 `fetchMoreData` 호출
    const handlePaginationChange = (newModel: { page: number; pageSize: number }) => {
        if (newModel.page > paginationModel.page) {
            fetchMoreData(); // 스크롤하여 다음 페이지 요청
        }
        setPaginationModel(newModel);
    };

    const handleTabChange = async (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        if (newValue === 1) {
            await getContainerMaster(CRR_CD);
            fetchOogCalcData(pckOrdSeq, apiUrl, cookies)
                .then((oogData) => {
                    const rowSpanMap = calculateRowSpan(oogData);
                    setCalculatorData(oogData.map((item) => ({ ...item, rowSpan: rowSpanMap[item.clpNo] })));
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
                    pageSizeOptions={[50, 100, 100]} // 50개 단위로 설정
                    paginationModel={paginationModel}
                    onPaginationModelChange={handlePaginationChange} // ✅ 스크롤 시 자동 로드
                    disableRowSelectionOnClick
                    rowSelectionModel={selectionModel}
                    loading={loading} // ✅ 로딩 상태 표시
                />
            </TabPanel>

            {/* TabPanel: 두 번째 탭 (File List) */}
            <TabPanel value={tabValue} index={1}>
                <table id="oogDataTable" className={styles.oogDataTable} border={1} cellPadding={5} cellSpacing={0}>
                    <thead>
                        <tr>
                            {oogColumns.map((item, index) => {
                                const isTpsz = index === 12;
                                return (
                                    <th key={item.field} data-key={item.field} {...(isTpsz ? { colSpan: 2 } : {})}>
                                        {item.headerName}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {calculatorData.map((item, index, array) => {
                            const isFirstOccurrence = index === 0 || array[index - 1].clpNo !== item.clpNo;
                            return (
                                <tr
                                    key={`${item.clpNo}-${item.boxNo}`}
                                    style={item.Item === 'SUM' ? { backgroundColor: 'yellow' } : {}}
                                >
                                    {/* ✅ CLP_NO 병합 적용 */}
                                    {isFirstOccurrence ? (
                                        <td align="center" rowSpan={item.rowSpan}>
                                            {item.clpNo}
                                        </td>
                                    ) : null}
                                    {item.Item === 'SUM' ? (
                                        <td colSpan={2}></td>
                                    ) : (
                                        <>
                                            <td align="center">{item.boxNo}</td>
                                            <td>{item.Item}</td>
                                            {/* <td align="right">
                                                {item.mcLen.toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td align="right">
                                                {item.mcWdt.toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td align="right">
                                                {item.mcHgt.toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td> */}
                                        </>
                                    )}

                                    <td align="right" className={item.isOverLen ? styles.over : 'normal'}>
                                        {item.boxLen.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td align="right" className={item.isOverWdt ? styles.over : 'normal'}>
                                        {item.boxWdt.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td align="right" className={item.isOverHgt ? styles.over : 'normal'}>
                                        {item.boxHgt.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td align="right">{item.qty}</td>
                                    <td align="right">
                                        {item.cbm.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td align="center">{item.type}</td>
                                    <td align="right">
                                        {item.nw.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td align="right" className={item.isOverWgt ? styles.over : 'normal'}>
                                        {item.gw.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td className={styles.remarkColumn}>{item.rmks}</td>
                                    {/* ✅ TPSZ 병합 */}
                                    {isFirstOccurrence ? <td rowSpan={item.rowSpan}>{item.displayTpsz}</td> : null}
                                    {/* ✅ IMAGE 병합 */}
                                    {isFirstOccurrence ? (
                                        <td align="center" rowSpan={item.rowSpan}>
                                            <img src={item.image} alt="container image" />
                                        </td>
                                    ) : null}
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th>
                                <strong>Total</strong>
                            </th>
                            <td colSpan={5}>
                                <span>
                                    {Object.entries(
                                        calculatorData.reduce((countMap, item) => {
                                            const tpsz = item.tpsz; // tpsz 값 가져오기
                                            if (tpsz) {
                                                const clpNo = item.clpNo;
                                                const key = `${clpNo}-${tpsz}`; // CLP_NO와 tpsz를 조합하여 키 생성

                                                // 이미 해당 tpsz가 countMap에 없으면 배열로 초기화
                                                if (!countMap[tpsz]) {
                                                    countMap[tpsz] = new Set(); // 중복을 제거하기 위해 Set 사용
                                                }

                                                // clpNo가 중복되지 않도록 Set에 추가
                                                countMap[tpsz].add(clpNo);
                                            }

                                            return countMap;
                                        }, {}),
                                    ).map(([tpsz, clpNoSet], index) => {
                                        const count = (clpNoSet as Set<string>).size; // Set의 크기
                                        return (
                                            <span key={tpsz}>
                                                {index > 0 && ', '}
                                                {tpsz}×<span style={{ color: 'red' }}>{count}</span>
                                            </span>
                                        );
                                    })}
                                </span>
                            </td>
                            <td align="right">
                                {calculatorData
                                    .filter((item) => item.Item === 'SUM')
                                    .reduce((sum, item) => sum + item.qty, 0)
                                    .toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                    })}
                            </td>
                            <td align="right">
                                {calculatorData
                                    .filter((item) => item.Item === 'SUM')
                                    .reduce((sum, item) => sum + item.cbm, 0)
                                    .toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                            </td>
                            <td></td>
                            <td align="right">
                                {calculatorData
                                    .filter((item) => item.Item === 'SUM')
                                    .reduce((sum, item) => sum + item.nw, 0)
                                    .toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                            </td>
                            <td align="right">
                                {calculatorData
                                    .filter((item) => item.Item === 'SUM')
                                    .reduce((sum, item) => sum + item.gw, 0)
                                    .toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                            </td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
                {/* <DataGrid
                    rows={calculatorData}
                    getRowId={(row) => row.id} // 고유 id 지정
                    rowCount={calculatorData.length}
                    columns={oogColumns}
                    paginationMode="server"
                    pageSizeOptions={[50, 100, 100]} // 50개 단위로 설정
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
