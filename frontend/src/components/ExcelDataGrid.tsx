import * as React from 'react';
import { Box, AppBar, Tabs, Tab, Button, Typography, Stack } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { handleCalculator, fetchOogCalcData, handleSaveChanges } from './FileListHandlers';
import styles from './ExcelDataGrid.module.css';
import commonStyles from '../styles/common.module.css';
import LashingPage from '../pages/LashingPage.tsx';
import UnitConverterModal from '../pages/UnitConverterModal.tsx';
import ContainerTpszModal from '../pages/ContainerTpszModal.tsx';
import { lengthUnits, weightUnits, convertLength, convertWeight } from '../utils/UnitConverter.tsx';
import { useOogColumns } from '../context/OogColumnsContext';
import { excelColumns } from './FileListGrid.tsx';
import { useState, useEffect, useRef } from 'react';

interface ExcelDataGridProps {
    rows: any[];
    oogData: any[];
    pckOrdSeq: string;
    selectionModel: GridRowSelectionModel;
    setCalculatorData: (data: any[]) => void;
    resetTab?: boolean; // 탭 초기화를 위한 prop 추가
}

const TabPanel = ({ children, value, index }: any) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
};

export function getOogColumns(selectedLengthUnit: string, selectedWeightUnit: string): GridColDef[] {
    return [
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
}
export function getSelectedLengthUnit(selectedLengthUnit: keyof typeof lengthUnits) {
    return selectedLengthUnit;
}

export function getSelectedWeightUnit(selectedWeightUnit: keyof typeof weightUnits) {
    return selectedWeightUnit;
}

const ExcelDataGrid: React.FC<ExcelDataGridProps> = ({
    rows: propsRows,
    pckOrdSeq,
    selectionModel,
    oogData,
    setCalculatorData,
    resetTab = false,
}) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const [snackbar, setSnackbar] = React.useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'warning' | 'info';
    }>({ open: false, message: '', severity: 'success' });
    const [tabValue, setTabValue] = React.useState(0);
    const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 10 });
    const handleCloseSnackbar = () => {
        setSnackbar((prevState) => ({
            ...prevState,
            open: false,
        }));
    };

    // 자동으로 스낵바 닫기
    React.useEffect(() => {
        if (snackbar.open) {
            const timer = setTimeout(() => {
                handleCloseSnackbar();
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [snackbar.open]);
    const [isUnitModalOpen, setIsUnitModalOpen] = React.useState(false);
    const [selectedLengthUnit, setSelectedLengthUnit] = React.useState<keyof typeof lengthUnits>('mm');
    const [selectedWeightUnit, setSelectedWeightUnit] = React.useState<keyof typeof weightUnits>('kg');
    const { setOogColumns, setLengthUnit, setWeightUnit } = useOogColumns();

    // useMemo로 oogColumns 메모이제이션
    const oogColumns: GridColDef[] = React.useMemo(
        () => getOogColumns(selectedLengthUnit, selectedWeightUnit),
        [selectedLengthUnit, selectedWeightUnit],
    );

    const handleApply = async (lengthUnit: keyof typeof lengthUnits, weightUnit: keyof typeof weightUnits) => {
        setSelectedLengthUnit(lengthUnit);
        setSelectedWeightUnit(weightUnit);
    };

    React.useEffect(() => {
        setOogColumns(oogColumns);
        setLengthUnit(selectedLengthUnit);
        setWeightUnit(selectedWeightUnit);
    }, [oogColumns, selectedLengthUnit, selectedWeightUnit, setOogColumns, setLengthUnit, setWeightUnit]);

    const [isTpszModalOpen, setIsTpszModalOpen] = React.useState(false);

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

    const handleTabChange = async (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);

        if (newValue === 1) {
            try {
                // 먼저 기존 oogData가 있는지 확인
                if (Array.isArray(oogData) && oogData.length > 0) {
                    // 기존 데이터가 있으면 rowSpan 계산하여 표시
                    const rowSpanMap = calculateRowSpan(oogData);
                    const updatedData = oogData.map((item) => ({
                        ...item,
                        rowSpan: rowSpanMap[item.clpNo],
                    }));

                    setCalculatorData(updatedData);
                } else if (pckOrdSeq && pckOrdSeq !== 'N/A') {
                    // 기존 데이터가 없고 pckOrdSeq가 있으면 백엔드에서 조회
                    const fetchedData = await fetchOogCalcData(Number(pckOrdSeq), apiUrl);

                    if (fetchedData && fetchedData.length > 0) {
                        // rowSpan 계산 추가
                        const rowSpanMap = calculateRowSpan(fetchedData);
                        const updatedData = fetchedData.map((item) => ({
                            ...item,
                            rowSpan: rowSpanMap[item.clpNo],
                        }));

                        setCalculatorData(updatedData);
                    } else {
                        setCalculatorData([]);
                    }
                } else {
                    setCalculatorData([]);
                }
            } catch (error) {
                console.error('OOG 데이터를 가져오는 중 에러 발생:', error);
                setSnackbar({ open: true, message: 'OOG 데이터를 가져오는 중 에러 발생', severity: 'error' });
                setCalculatorData([]);
            }
        } else if (newValue === 0) {
            // OOG Import Data 탭으로 돌아갈 때 calculatorData 초기화
            setCalculatorData([]);
        }
    };

    // 📌 resetTab prop이 변경될 때 탭 초기화
    React.useEffect(() => {
        if (resetTab) {
            setTabValue(0);
        }
    }, [resetTab]);

    // ✅ rows 상태로 관리
    const [rows, setRows] = useState<any[]>(propsRows ?? []);
    const [originalRows, setOriginalRows] = useState<any[]>(propsRows ?? []);
    const prevPropsRowsRef = useRef<any[]>(propsRows ?? []);

    useEffect(() => {
        // propsRows가 완전히 새로 바뀌었을 때만 rows를 덮어씀
        const prevPropsRows = prevPropsRowsRef.current;
        const isDifferent =
            propsRows.length !== prevPropsRows.length ||
            !propsRows.every((row, idx) => JSON.stringify(row) === JSON.stringify(prevPropsRows[idx]));

        if (isDifferent) {
            setRows(propsRows ?? []);
            setOriginalRows(propsRows ?? []);
            prevPropsRowsRef.current = propsRows;
        }
        // eslint-disable-next-line
    }, [propsRows]);

    const getChangedRows = () => {
        return rows.filter((row) => {
            const original = originalRows.find((r) => r.id === row.id);
            return original && (row.boxLen !== original.boxLen || row.boxWdt !== original.boxWdt);
        });
    };

    // ✅ Box Length/Width swap 함수
    const handleSwapBox = (id: any) => {
        setRows((prevRows) =>
            prevRows.map((row) =>
                row.id === id
                    ? {
                          ...row,
                          boxLen: row.boxWdt,
                          boxWdt: row.boxLen,
                      }
                    : row,
            ),
        );
    };

    // ✅ swap 버튼 컬럼
    const swapBoxColumn = {
        field: 'swapBox',
        headerName: 'Length ↔ Width',
        width: 120,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: any) => (
            <Box display="flex" justifyContent="center" alignItems="center" width="100%" height="100%">
                <Button variant="outlined" size="small" onClick={() => handleSwapBox(params.row.id)}>
                    Change
                </Button>
            </Box>
        ),
    };

    // ✅ columns에 swapBox 컬럼 추가 - 메모이제이션
    const columnsWithSwap = React.useMemo(() => {
        const boxWdtIndex = excelColumns.findIndex((col) => col.field === 'boxWdt');
        return [...excelColumns.slice(0, boxWdtIndex + 1), swapBoxColumn, ...excelColumns.slice(boxWdtIndex + 1)];
    }, [excelColumns, swapBoxColumn]);

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

                {/* 우측 버튼들 - 탭과 같은 높이에 배치 */}
                {tabValue === 0 ? (
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Button
                            variant="contained"
                            color="success"
                            onClick={async () => {
                                const changedRows = getChangedRows();
                                if (changedRows.length > 0) {
                                    try {
                                        await handleSaveChanges(changedRows, apiUrl, setSnackbar);
                                        // 저장 성공 후 originalRows 업데이트
                                        setOriginalRows([...rows]);
                                    } catch (error) {
                                        console.error('Save failed:', error);
                                    }
                                } else {
                                    setSnackbar({
                                        open: true,
                                        message: '저장할 변경사항이 없습니다.',
                                        severity: 'warning',
                                    });
                                }
                            }}
                        >
                            SAVE
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() =>
                                handleCalculator(
                                    apiUrl,
                                    Number(pckOrdSeq),
                                    setSnackbar,
                                    Array.from(selectionModel.ids).filter((id): id is number => typeof id === 'number'),
                                    setCalculatorData,
                                )
                            }
                        >
                            Calculator
                        </Button>
                    </Stack>
                ) : (
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Button variant="contained" color="primary" onClick={() => setIsTpszModalOpen(true)}>
                            Container Spec
                        </Button>
                        <Button variant="contained" color="primary" onClick={() => setIsUnitModalOpen(true)}>
                            단위 변환
                        </Button>
                        <Typography>길이 ( {selectedLengthUnit.toUpperCase()} )</Typography>
                        <Typography>무게 ( {selectedWeightUnit.toUpperCase()} )</Typography>
                    </Stack>
                )}
            </Box>

            <TabPanel value={tabValue} index={0}>
                {!propsRows || propsRows.length === 0 ? (
                    <div>데이터가 없습니다. 파일을 Import 하거나 선택하세요.</div>
                ) : (
                    <DataGrid
                        className={styles.excelDataGrid}
                        rows={rows ?? []}
                        getRowId={(row) => row.id}
                        rowCount={rows?.length ?? 0}
                        columns={columnsWithSwap}
                        paginationMode="server"
                        pageSizeOptions={[5, 10, 20, 50]}
                        paginationModel={paginationModel || { page: 0, pageSize: 10 }}
                        disableRowSelectionOnClick
                        rowSelectionModel={selectionModel}
                        sx={{
                            '& .MuiDataGrid-footerContainer': {
                                display: 'none',
                            },
                        }}
                    />
                )}
            </TabPanel>

            {/* TabPanel: 두 번째 탭 (OOG System Data) */}
            <TabPanel value={tabValue} index={1}>
                {!oogData || oogData.length === 0 ? (
                    <div>OOG 데이터가 없습니다. Calculator 버튼을 눌러 데이터를 생성하세요.</div>
                ) : (
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
                                {oogData.map((item, index, array) => {
                                    const isFirstOccurrence = index === 0 || array[index - 1].clpNo !== item.clpNo;
                                    return (
                                        <tr
                                            key={`${item.clpNo}-${item.boxNo}`}
                                            className={item.Item === 'SUM' ? styles.subTotal : ''}
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
                                                        disabled={!item.tpsz?.includes('FR')} // 'FR'이 포함되지 않으면 비활성화
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
                                        <span className={styles.masterTotalCount}>
                                            {Object.entries(
                                                oogData.reduce((countMap, item) => {
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
                                        &emsp;→&emsp;
                                        <span className={styles.detailTotalCount}>
                                            {Object.entries(
                                                oogData.reduce((countMap, item) => {
                                                    const tpsz = item.groupTpsz; // tpsz 값 가져오기
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
                                        {oogData
                                            .filter((item) => item.Item === 'SUM')
                                            .reduce((sum, item) => sum + item.qty, 0)
                                            .toLocaleString(undefined, {
                                                maximumFractionDigits: 2,
                                            })}
                                    </td>
                                    <td align="right">
                                        {oogData
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
                                            oogData.filter((item) => item.Item === 'SUM').reduce((sum, item) => sum + item.nw, 0),
                                            selectedWeightUnit,
                                        ).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td align="right">
                                        {convertWeight(
                                            oogData.filter((item) => item.Item === 'SUM').reduce((sum, item) => sum + item.gw, 0),
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
                )}
            </TabPanel>

            {snackbar.open && (
                <div
                    className={`${commonStyles.snackbar} ${
                        snackbar.severity === 'error'
                            ? commonStyles.snackbarError
                            : snackbar.severity === 'warning'
                            ? commonStyles.snackbarWarning
                            : snackbar.severity === 'info'
                            ? commonStyles.snackbarInfo
                            : commonStyles.snackbarSuccess
                    }`}
                >
                    <span>{snackbar.message}</span>
                    <button onClick={handleCloseSnackbar} className={commonStyles.snackbarCloseButton}>
                        ×
                    </button>
                </div>
            )}

            <ContainerTpszModal isOpen={isTpszModalOpen} onClose={() => setIsTpszModalOpen(false)} />
            <UnitConverterModal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} onApply={handleApply} />
            <LashingPage
                isOpen={isLashingModalOpen}
                onClose={closeModal}
                pckOrdSeq={modalData.pckOrdSeq}
                clpNo={modalData.clpNo}
                tpsz={modalData.tpsz}
                xCount={modalData.xCount}
                yCount={modalData.yCount}
            />
        </Box>
    );
};

export { ExcelDataGrid };
