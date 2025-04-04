import * as React from 'react';
import { Box, AppBar, Tabs, Tab, Button, Typography, Stack } from '@mui/material';
import * as XLSX from 'xlsx';
import { useCookies } from 'react-cookie';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { handleCalculator } from './FileListHandlers';
import styles from './ExcelDataGrid.module.css';
import LashingPage from '../pages/LashingPage.tsx';
import UnitConverterModal from './UnitConverterModal';
import { lengthUnits, weightUnits, convertLength, convertWeight } from '../utils/UnitConverter.tsx';

interface ExcelDataGridProps {
    rows: any[];
    setRows: React.Dispatch<React.SetStateAction<any[]>>; // 부모로부터 전달받은 setRows
    oogData: any[];
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

const TabPanel = ({ children, value, index }: any) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
};
const ExcelDataGrid: React.FC<ExcelDataGridProps> = ({ rows, setRows, pckOrdSeq, selectionModel, oogData }) => {
    if (!rows || rows.length === 0) {
        return <div>데이터가 없습니다.</div>;
    }
    const CRR_CD = 'VOS';
    const apiUrl = import.meta.env.VITE_BACKEND_URL;
    const [cookies] = useCookies(['authToken']);
    const [snackbar, setSnackbar] = React.useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning' | 'info';
    }>({ open: false, message: '', severity: 'success' });
    const [tabValue, setTabValue] = React.useState(0);
    const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 10 });
    const [loading, setLoading] = React.useState(false);
    const [containerData, setContainerData] = React.useState<any[]>([]);
    const [calculatorData, setCalculatorData] = React.useState<any[]>([]);
    const handleCloseSnackbar = () => {
        setSnackbar((prevState) => ({
            ...prevState,
            open: false,
        }));
    };
    const [isUnitModalOpen, setIsUnitModalOpen] = React.useState(false);
    const [selectedLengthUnit, setSelectedLengthUnit] = React.useState<keyof typeof lengthUnits>('mm');
    const [selectedWeightUnit, setSelectedWeightUnit] = React.useState<keyof typeof weightUnits>('kg');
    const oogColumns: GridColDef[] = [
        { field: 'pckOrdSeq', headerName: 'PCK_ORD_SEQ', width: 0 },
        { field: 'clpNo', headerName: 'CLP No.', width: 100 },
        { field: 'boxNo', headerName: 'Box No.', width: 100 },
        { field: 'Item', headerName: ' Item', width: 100 },
        { field: 'boxLen', headerName: `Box Length(${selectedLengthUnit.toUpperCase()})`, width: 100 },
        { field: 'boxWdt', headerName: `Box Width(${selectedLengthUnit.toUpperCase()})`, width: 100 },
        { field: 'boxHgt', headerName: `Box Height(${selectedLengthUnit.toUpperCase()})`, width: 100 },
        { field: 'qty', headerName: "Q'ty", width: 100 },
        { field: 'cbm', headerName: 'CBM', width: 100 },
        { field: 'type', headerName: 'Type', width: 100 },
        { field: 'nw', headerName: `N/W(${selectedWeightUnit.toUpperCase()})`, width: 100 },
        { field: 'gw', headerName: `G/W(${selectedWeightUnit.toUpperCase()})`, width: 100 },
        { field: 'rmks', headerName: 'Remarks', width: 100 },
        { field: 'tpsz', headerName: 'Container Type/Size', width: 100 },
    ];

    const handleApply = async (lengthUnit: keyof typeof lengthUnits, weightUnit: keyof typeof weightUnits) => {
        setSelectedLengthUnit(lengthUnit);
        setSelectedWeightUnit(weightUnit);
    };
    React.useEffect(() => {
        if (selectedLengthUnit && selectedWeightUnit) {
            getContainerMaster(CRR_CD);
        }
    }, [selectedLengthUnit, selectedWeightUnit]); // selectedLengthUnit, selectedWeightUnit 변경 시 실행

    const [isLashingModalOpen, setIsDialogOpen] = React.useState(false);
    const [modalData, setModalData] = React.useState({
        pckOrdSeq: 0,
        clpNo: 0,
        tpsz: '',
        xCount: 0,
        yCount: 0,
    });

    const openModal = (pckOrdSeq: number, clpNo: number, tpsz: string, xCount?: number, yCount?: number) => {
        xCount = xCount ?? 13;
        yCount = yCount ?? 3;
        setModalData({ pckOrdSeq, clpNo, tpsz, xCount, yCount });
        setIsDialogOpen(true);
    };

    const closeModal = () => {
        setIsDialogOpen(false);
    };

    const getContainerMaster = async (crrCd: string) => {
        try {
            const response = await fetch(`${apiUrl}/vos/oog/v1/container/spec/${crrCd}`);
            const newData = await response.json();
            setContainerData(newData?.data);

            const d40Data = newData?.data?.find((item: { CNTR_TPSZ_CD: string }) => item.CNTR_TPSZ_CD === '4H');
            if (!d40Data) {
                console.warn('No container data found for CNTR_TPSZ_CD = 4H');
                return;
            }

            console.log('Container Master Data2:', d40Data);

            const table = document.getElementById('oogDataTable');
            if (!table) return;

            const thMappings: Record<string, { value: number; percentage: number }> = {
                boxLen: { value: d40Data.CNTR_LEN, percentage: Number(d40Data.CNTR_LEN_PCTG) },
                boxWdt: { value: d40Data.CNTR_WDT, percentage: Number(d40Data.CNTR_WDT_PCTG) },
                boxHgt: { value: d40Data.CNTR_HGT, percentage: Number(d40Data.CNTR_HGT_PCTG) },
            };

            for (const th of table.querySelectorAll('thead th')) {
                const key = th.getAttribute('data-key');
                if (key && thMappings[key]) {
                    const { value, percentage } = thMappings[key];
                    th.insertAdjacentHTML(
                        'beforeend',
                        `<br/><b>${convertLength(value, selectedLengthUnit).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                        })} (${percentage}%)</b>`,
                    );
                }
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

    // // ✅ CLP_NO 병합을 위한 데이터 가공 함수
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
            try {
                if (Array.isArray(oogData) && oogData.length > 0) {
                    // rowSpan 계산 추가
                    const rowSpanMap = calculateRowSpan(oogData);
                    const updatedData = oogData.map((item) => ({
                        ...item,
                        rowSpan: rowSpanMap[item.clpNo],
                    }));

                    setCalculatorData(updatedData);
                    console.log('OOG Data:', updatedData);
                }
                // 추가 작업 실행 (예: 컨테이너 데이터 가져오기)
                await getContainerMaster(CRR_CD);
            } catch (error) {
                console.error('OOG 데이터를 가져오는 중 에러 발생:', error);
                setSnackbar({ open: true, message: 'OOG 데이터를 가져오는 중 에러 발생', severity: 'error' });
            }
        }
    };

    // 📌 calculatorData가 변경될 때마다 rowSpan을 업데이트
    React.useEffect(() => {
        if (tabValue === 1 && oogData.length > 0) {
            const rowSpanMap = calculateRowSpan(oogData);
            const updatedData = oogData.map((item) => ({
                ...item,
                rowSpan: rowSpanMap[item.clpNo], // rowSpan 계산 후 추가
            }));

            setCalculatorData(updatedData); // 상태 업데이트
        }
    }, [oogData, tabValue]); // tabValue와 oogData가 변경될 때만 실행

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
                {tabValue === 1 && oogData.length > 0 ? (
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Button variant="contained" color="primary" onClick={() => setIsUnitModalOpen(true)}>
                            단위 변환
                        </Button>
                        <Typography>길이 ( {selectedLengthUnit.toUpperCase()} )</Typography>
                        <Typography>무게 ( {selectedWeightUnit.toUpperCase()} )</Typography>
                    </Stack>
                ) : (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() =>
                            handleCalculator(
                                apiUrl,
                                Number(pckOrdSeq),
                                cookies.authToken,
                                setSnackbar,
                                selectionModel.filter((id): id is number => typeof id === 'number'),
                                setCalculatorData,
                            )
                        }
                    >
                        Calculator
                    </Button>
                )}
            </Box>

            <TabPanel value={tabValue} index={0}>
                <DataGrid
                    className={styles.excelDataGrid} // ✅ DataGrid 컴포넌트 추가{
                    rows={rows ?? []}
                    getRowId={(row) => row.pckNo ?? `fallback-${row.id}`} // 고유 id 지정
                    rowCount={rows?.length ?? 0}
                    columns={excelColumns}
                    paginationMode="server"
                    pageSizeOptions={[5, 10, 20, 50]}
                    paginationModel={paginationModel || { page: 0, pageSize: 10 }}
                    disableRowSelectionOnClick
                    rowSelectionModel={selectionModel || []}
                    sx={{
                        '& .MuiDataGrid-footerContainer': {
                            display: 'none', // 푸터 숨기기
                        },
                    }}
                />
            </TabPanel>

            {/* TabPanel: 두 번째 탭 (OOG System Data) */}
            <TabPanel value={tabValue} index={1}>
                <div className={styles.oogTableContainer}>
                    <table id="oogDataTable" className={styles.oogDataTable}>
                        <thead>
                            <tr>
                                {oogColumns
                                    .filter((item) => item.field !== 'pckOrdSeq')
                                    .map((item, index) => {
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
                                    <tr key={`${item.clpNo}-${item.boxNo}`} className={item.Item === 'SUM' ? styles.subTotal : ''}>
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
                                            </>
                                        )}
                                        <td align="right" className={item.isOverLen ? styles.over : 'normal'}>
                                            {convertLength(item.boxLen, selectedLengthUnit).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td align="right" className={item.isOverWdt ? styles.over : 'normal'}>
                                            {convertLength(item.boxWdt, selectedLengthUnit).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td align="right" className={item.isOverHgt ? styles.over : 'normal'}>
                                            {convertLength(item.boxHgt, selectedLengthUnit).toLocaleString(undefined, {
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
                                            {convertWeight(item.nw, selectedWeightUnit).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td align="right" className={item.isOverWgt ? styles.over : 'normal'}>
                                            {convertWeight(item.gw, selectedWeightUnit).toLocaleString(undefined, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td className={styles.remarkColumn}>{item.rmks}</td>
                                        {/* ✅ TPSZ 병합 */}
                                        {isFirstOccurrence ? (
                                            <td rowSpan={item.rowSpan}>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    sx={{
                                                        textTransform: 'none',
                                                        '&.Mui-disabled': {
                                                            color: 'black', // 비활성화된 버튼의 글자 색상
                                                        },
                                                        // 활성화된 상태에서의 글자 색상은 기본색을 유지하도록 설정
                                                        color: 'white', // 기본 색상을 그대로 사용
                                                    }}
                                                    onClick={() => openModal(item.pckOrdSeq, item.clpNo, item.tpsz)}
                                                    disabled={!item.tpsz.includes('FR')} // 'FR'이 포함되지 않으면 비활성화
                                                >
                                                    {item.displayTpsz}
                                                </Button>
                                            </td>
                                        ) : null}
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
                                                    {tpsz}×<span className={styles.totalNumColor}>{count}</span>
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
                                    {convertWeight(
                                        calculatorData
                                            .filter((item) => item.Item === 'SUM')
                                            .reduce((sum, item) => sum + item.nw, 0),
                                        selectedWeightUnit,
                                    ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </td>
                                <td align="right">
                                    {convertWeight(
                                        calculatorData
                                            .filter((item) => item.Item === 'SUM')
                                            .reduce((sum, item) => sum + item.gw, 0),
                                        selectedWeightUnit,
                                    ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </td>
                                <td></td>
                                <th colSpan={2}></th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </TabPanel>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <LashingPage
                isOpen={isLashingModalOpen}
                onClose={closeModal}
                pckOrdSeq={modalData.pckOrdSeq}
                clpNo={modalData.clpNo}
                tpsz={modalData.tpsz}
                xCount={modalData.xCount}
                yCount={modalData.yCount}
            />
            <UnitConverterModal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} onApply={handleApply} />
        </Box>
    );
};

export { ExcelDataGrid };
