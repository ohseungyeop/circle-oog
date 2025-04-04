import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton, Box, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid, GridColDef, GridValueFormatterParams } from '@mui/x-data-grid';
import { useCookies } from 'react-cookie';

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
    { field: 'CNTR_TPSZ_CD', headerName: 'Type/Szie Code', width: 180 },
    { field: 'CNTR_LEN', headerName: 'Length', width: 120 },
    { field: 'CNTR_LEN_PCTG', headerName: 'Length Percentage', width: 120 },
    { field: 'CNTR_WDT', headerName: 'Width', width: 120 },
    { field: 'CNTR_WDT_PCTG', headerName: 'Width Percentage', width: 120 },
    { field: 'CNTR_HGT', headerName: 'Height', width: 120 },
    { field: 'CNTR_HGT_PCTG', headerName: 'Height Percentage', width: 120 },
    { field: 'CNTR_WGT', headerName: 'Weight', width: 120 },
    { field: 'CNTR_WGT_PCTG', headerName: 'Weight Percentage', width: 120 },
];

const ContainerTpszModal: React.FC<ContainerTpszModalProps> = ({ isOpen, onClose }) => {
    const CRR_CD = 'VOS';
    const apiUrl = import.meta.env.VITE_BACKEND_URL;
    const [cookies] = useCookies(['authToken']);

    const [data, setData] = useState<TpszData[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            fetchTpszData();
        }
    }, [isOpen]);

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
        try {
            const response = await fetch(`${apiUrl}/vos/oog/v1/container/spec/${CRR_CD}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${cookies.authToken}`,
                },
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle sx={{ backgroundColor: '#1976d2', color: 'white' }}>
                <strong>Type/Size 확인</strong>
                <IconButton
                    aria-label="close"
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
                    ) : (
                        <DataGrid rows={data} columns={columns} hideFooter />
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ContainerTpszModal;
