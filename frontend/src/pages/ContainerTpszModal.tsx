import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton, Box, CircularProgress, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

interface ContainerTpszModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface TpszData {
    CNTR_TPSZ_CD: string;
    CNTR_LEN: number;
    CNTR_LEN_PCTG: number | string;
    CNTR_WDT: number;
    CNTR_WDT_PCTG: number | string;
    CNTR_HGT: number;
    CNTR_HGT_PCTG: number | string;
    CNTR_WGT: number;
    CNTR_WGT_PCTG: number | string;
}

const columns: GridColDef[] = [
    { field: 'CNTR_TPSZ_CD', headerName: 'Type/Size Code', width: 180 },
    { field: 'CNTR_LEN', headerName: 'Length', width: 120 },
    { field: 'CNTR_LEN_PCTG', headerName: 'Length %', width: 120 },
    { field: 'CNTR_WDT', headerName: 'Width', width: 120 },
    { field: 'CNTR_WDT_PCTG', headerName: 'Width %', width: 120 },
    { field: 'CNTR_HGT', headerName: 'Height', width: 120 },
    { field: 'CNTR_HGT_PCTG', headerName: 'Height %', width: 120 },
    { field: 'CNTR_WGT', headerName: 'Weight', width: 120 },
    { field: 'CNTR_WGT_PCTG', headerName: 'Weight %', width: 120 },
];

const ContainerTpszModal: React.FC<ContainerTpszModalProps> = ({ isOpen, onClose }) => {
    const CRR_CD = 'VOS';
    const apiUrl = import.meta.env.VITE_API_URL;

    const [data, setData] = useState<TpszData[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState('');

    // 드래그 관련 상태
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchTpszData();
        }
    }, [isOpen]);

    // 드래그 이벤트 핸들러
    const handleMouseDown = (e: React.MouseEvent) => {
        if (dialogRef.current) {
            const rect = dialogRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
            setIsDragging(true);
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && dialogRef.current) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;

            // 화면 경계 체크
            const maxX = window.innerWidth - dialogRef.current.offsetWidth;
            const maxY = window.innerHeight - dialogRef.current.offsetHeight;

            dialogRef.current.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            dialogRef.current.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    // 포맷 함수
    function formatNumber(value: any) {
        const num = Number(value);
        return isNaN(num)
            ? ''
            : num.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              });
    }

    const fetchTpszData = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/vos/oog/v1/container/spec/${CRR_CD}`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            console.log(response);
            const json = await response.json();
            console.log(json.data);
            const withIds = json.data.map((item: any, index: number) => ({
                id: index,
                ...item,
                CNTR_LEN: formatNumber(item.CNTR_LEN),
                CNTR_WDT: formatNumber(item.CNTR_WDT),
                CNTR_HGT: formatNumber(item.CNTR_HGT),
                CNTR_WGT: formatNumber(item.CNTR_WGT),
                CNTR_LEN_PCTG: formatNumber(item.CNTR_LEN_PCTG),
                CNTR_WDT_PCTG: formatNumber(item.CNTR_WDT_PCTG),
                CNTR_HGT_PCTG: formatNumber(item.CNTR_HGT_PCTG),
                CNTR_WGT_PCTG: formatNumber(item.CNTR_WGT_PCTG),
            }));
            setData(withIds);
        } catch (error) {
            console.error('Fetch error:', error);
            setError('컨테이너 기준 정보를 불러오지 못했습니다. 닫았다가 다시 열어 주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            fullWidth
            maxWidth="lg"
            PaperProps={{
                ref: dialogRef,
                sx: {
                    position: 'fixed',
                    margin: 0,
                    cursor: isDragging ? 'grabbing' : 'default',
                },
            }}
        >
            <DialogTitle
                sx={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    cursor: 'grab',
                    userSelect: 'none',
                    '&:active': {
                        cursor: 'grabbing',
                    },
                }}
                onMouseDown={handleMouseDown}
            >
                <strong>Type/Size 확인</strong>
                <IconButton
                    aria-label="닫기"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: 'white',
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Box my={2} sx={{ height: '100%' }}>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Typography color="error">{error}</Typography>
                    ) : (
                        <DataGrid rows={data} columns={columns} hideFooter localeText={{ noRowsLabel: '등록된 컨테이너 기준이 없습니다' }} />
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ContainerTpszModal;
