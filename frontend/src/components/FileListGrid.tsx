import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FileList from './FileList';
import UserAdminDialog from './UserAdminDialog';
import { useAuth } from './withAuth';
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
    const user = useAuth();
    const [userAdminOpen, setUserAdminOpen] = React.useState(false);
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
    const [selectionModel, setSelectionModel] = React.useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });
    const [oogColumns, setOogColumns] = React.useState<GridColDef[]>([]);
    const [lengthUnit, setLengthUnit] = React.useState<keyof typeof lengthUnits>('mm');
    const [weightUnit, setWeightUnit] = React.useState<keyof typeof weightUnits>('kg');
    const [resetTab, setResetTab] = React.useState<boolean>(false);
    const [listLoading, setListLoading] = React.useState(true);
    const [uploading, setUploading] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const selectedIds = Array.from(selectionModel.ids).filter((id): id is number => typeof id === 'number');

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

    const handleLogout = async () => {
        try {
            // 1. 백엔드에 로그아웃 요청 (세션 쿠키는 httpOnly 라 서버가 지움)
            const response = await fetch(`${apiUrl}/vos/oog/v1/auth/logout`, {
                method: 'POST',
                credentials: 'include', // 쿠키 포함
            });

            if (!response.ok) {
                console.warn('Backend logout failed, but continuing with client-side logout');
            }
        } catch (error) {
            console.warn('Backend logout request failed:', error);
        }

        // 2. 로컬 상태 초기화
        setRows([]);
        setExcelRows([]);
        setSelectionModel({ type: 'include', ids: new Set() });
        setCalculatorData([]);

        // 3. 로컬 스토리지도 정리 (혹시 있을 경우)
        localStorage.clear();
        sessionStorage.clear();

        // 4. 페이지 리다이렉트
        window.location.href = '/';
    };
    // 로그인한 사용자의 파일 목록을 불러옵니다.
    React.useEffect(() => {
        fetchData(apiUrl, setRows, setSnackbar).finally(() => setListLoading(false));
    }, [apiUrl]);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setUploading(true);
        try {
            await handleFileUpload(event, apiUrl, setSnackbar, setExcelRows, fetchData, setRows);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        setDeleteOpen(false);
        setDeleting(true);
        try {
            await handleDeleteRows(apiUrl, selectedIds, rows, setSnackbar, fetchData, setRows);
            setSelectionModel({ type: 'include', ids: new Set() });
            setExcelRows([]);
            setCalculatorData([]);
        } finally {
            setDeleting(false);
        }
    };

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
                            accept=".xlsx,.xls"
                            onChange={handleUpload}
                            hidden
                        />
                        <button onClick={() => fileInputRef.current?.click()} className={styles.actionButton} disabled={uploading}>
                            {uploading ? '업로드 중…' : 'Import'}
                        </button>

                        <button onClick={() => handleExportToExcel(calculatorData, setSnackbar)} className={styles.actionButton}>
                            Export
                        </button>

                        <button
                            onClick={() => {
                                if (selectedIds.length === 0) {
                                    setSnackbar({ open: true, message: '삭제할 파일을 목록에서 선택해 주세요.', severity: 'warning' });
                                    return;
                                }
                                setDeleteOpen(true);
                            }}
                            className={styles.actionButton}
                            disabled={deleting}
                        >
                            {deleting ? '삭제 중…' : 'Delete'}
                        </button>

                        <button onClick={() => handleTemplateDownload(apiUrl)} className={styles.actionButton}>
                            Template Download
                        </button>
                    </Box>

                    {/* 우측: 로그인 사용자, 사용자 관리(관리자), Logout */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <span>{user?.email}</span>
                        {user?.admin && (
                            <button onClick={() => setUserAdminOpen(true)} className={styles.actionButton}>
                                Users
                            </button>
                        )}
                        <button onClick={handleLogout} className={styles.logoutButton}>
                            Logout
                        </button>
                    </Box>
                </Box>

                <FileList
                    rows={rows}
                    columns={columns}
                    selectionModel={selectionModel}
                    loading={listLoading}
                    handleSelectionChange={async (newSelection: GridRowSelectionModel) => {
                        setSelectionModel(newSelection);

                        // 선택된 ID들을 배열로 변환
                        const selectedIds = Array.from(newSelection.ids);

                        if (selectedIds.length === 1) {
                            const selectedId = selectedIds[0];
                            const selectedRow = rows.find((row) => row.id === selectedId);
                            if (selectedRow) {
                                const excelData = await fetchExcelData(selectedRow.pckOrdSeq, apiUrl);
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
                        role={snackbar.severity === 'error' ? 'alert' : 'status'}
                        aria-live={snackbar.severity === 'error' ? 'assertive' : 'polite'}
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
                        <button onClick={handleCloseSnackbar} className={commonStyles.snackbarCloseButton} aria-label="알림 닫기">
                            ×
                        </button>
                    </div>
                )}
            </Box>
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} aria-labelledby="delete-dialog-title">
                <DialogTitle id="delete-dialog-title">파일 삭제</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        선택한 {selectedIds.length}개 파일과 패킹 리스트가 삭제됩니다. 되돌릴 수 없습니다.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteOpen(false)}>취소</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>
                        삭제
                    </Button>
                </DialogActions>
            </Dialog>
            <UserAdminDialog open={userAdminOpen} onClose={() => setUserAdminOpen(false)} />
            <FileListHandlers />
        </OogColumnsContext.Provider>
    );
};

export default FileListGrid;
