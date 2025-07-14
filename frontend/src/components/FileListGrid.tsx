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
    fetchExcelData,
    handleExportToExcel,
} from './FileListHandlers';
import { OogColumnsContext } from '../context/OogColumnsContext';
import { GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { FileListHandlers } from './FileListHandlers.tsx';
import { lengthUnits, weightUnits } from '../utils/UnitConverter.tsx';
import styles from './FileListGrid.module.css';
import commonStyles from '../styles/common.module.css';

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
    const [selectionModel, setSelectionModel] = React.useState<any>([]);
    const [oogColumns, setOogColumns] = React.useState<GridColDef[]>([]);
    const [lengthUnit, setLengthUnit] = React.useState<keyof typeof lengthUnits>('mm');
    const [weightUnit, setWeightUnit] = React.useState<keyof typeof weightUnits>('kg');
    const [resetTab, setResetTab] = React.useState<boolean>(false);

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
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

    const handleLogout = () => {
        // 1. 쿠키 삭제
        removeCookie('authToken', { path: '/' });

        // 2. 로컬 상태 초기화
        setRows([]);
        setExcelRows([]);
        setSelectionModel([]);
        setCalculatorData([]);

        // 3. 페이지 리다이렉트
        window.location.href = '/';
    };
    // 쿠키의 authToken이 변경될 때마다 데이터를 불러옵니다.
    React.useEffect(() => {
        if (cookies && cookies.authToken) {
            fetchData(cookies, apiUrl, setRows);
        }
    }, [cookies, apiUrl]);

    React.useEffect(() => {
        if (excelRows.length > 0 && excelRows[0]?.pckOrdSeq) {
            setPckOrdSeq(excelRows[0].pckOrdSeq);
        }
    }, [excelRows]);

    // resetTab이 true로 설정된 후 다시 false로 리셋
    React.useEffect(() => {
        if (resetTab) {
            const timer = setTimeout(() => {
                setResetTab(false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [resetTab]);

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
            <Box sx={{ width: '100%' }}>
                {/* 상단 버튼들 - 좌측: Import, Export, Delete, Template Download / 우측: Logout */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    {/* 좌측 버튼들 */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={(event) =>
                                handleFileUpload(event, cookies, apiUrl, setSnackbar, setExcelRows, fetchData, setRows)
                            }
                            hidden
                        />
                        <button onClick={() => fileInputRef.current?.click()} className={styles.actionButton}>
                            Import
                        </button>

                        <button onClick={() => handleExportToExcel(calculatorData)} className={styles.actionButton}>
                            Export
                        </button>

                        <button
                            onClick={() => handleDeleteRows(apiUrl, cookies, selectionModel, rows, setSnackbar, fetchData, setRows)}
                            className={styles.actionButton}
                        >
                            Delete
                        </button>

                        <button onClick={() => handleTemplateDownload(apiUrl)} className={styles.actionButton}>
                            Template Download
                        </button>
                    </Box>

                    {/* 우측 Logout 버튼 */}
                    <button onClick={handleLogout} className={styles.logoutButton}>
                        Logout
                    </button>
                </Box>

                <FileList
                    rows={rows}
                    columns={columns}
                    selectionModel={selectionModel}
                    handleSelectionChange={async (newSelection: any) => {
                        // GridRowSelectionModel이 배열이 아닐 수 있으므로, 배열로 변환
                        let numberSelection: number[] = [];
                        if (Array.isArray(newSelection)) {
                            numberSelection = newSelection.filter((id): id is number => typeof id === 'number');
                        } else if (typeof newSelection === 'object' && newSelection !== null && 'length' in newSelection) {
                            // 혹시 iterable 객체일 경우
                            numberSelection = Array.from(newSelection).filter((id): id is number => typeof id === 'number');
                        } else if (typeof newSelection === 'object' && newSelection !== null && 'ids' in newSelection) {
                            // MUI v6+의 selectionModel 구조 대응
                            numberSelection = (newSelection.ids as any[]).filter((id): id is number => typeof id === 'number');
                        }
                        setSelectionModel(numberSelection);
                        if (numberSelection.length === 1) {
                            const selectedId = numberSelection[0];
                            const selectedRow = rows.find((row) => row.id === selectedId);
                            if (selectedRow) {
                                const excelData = await fetchExcelData(selectedRow.pckOrdSeq, apiUrl, cookies);
                                setExcelRows(excelData);
                                // calculatorData 초기화 - 새로운 로우 선택 시 이전 데이터 제거
                                setCalculatorData([]);
                                // 탭 초기화 트리거
                                setResetTab(true);
                            }
                        } else {
                            // 선택 해제 시 ExcelDataGrid 완전 초기화
                            setExcelRows([]);
                            setCalculatorData([]);
                            setPckOrdSeq('N/A');
                            // 탭 초기화 트리거
                            setResetTab(true);
                        }
                    }}
                />

                <ExcelDataGrid
                    rows={excelRows}
                    pckOrdSeq={pckOrdSeq}
                    selectionModel={selectionModel}
                    oogData={calculatorData}
                    setCalculatorData={setCalculatorData}
                    resetTab={resetTab}
                />

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
            </Box>
            <FileListHandlers />
        </OogColumnsContext.Provider>
    );
};

export default FileListGrid;
