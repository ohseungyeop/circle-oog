import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, IconButton, TextField, MenuItem, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { lengthUnits, weightUnits } from '../utils/UnitConverter.tsx';

const UnitConverterModal = ({
    isOpen,
    onClose,
    onApply, // 선택한 단위를 부모로 전달하는 콜백 추가
}: {
    isOpen: boolean;
    onClose: () => void;
    onApply: (lengthUnit: keyof typeof lengthUnits, weightUnit: keyof typeof weightUnits) => void;
}) => {
    const [lengthUnit, setLengthUnit] = useState<keyof typeof lengthUnits>('mm');
    const [weightUnit, setWeightUnit] = useState<keyof typeof weightUnits>('kg');

    // 드래그 관련 상태
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dialogRef = useRef<HTMLDivElement>(null);

    const applyUnit = () => {
        onApply(lengthUnit, weightUnit); // 부모 컴포넌트로 단위 전달
        onClose(); // 모달 닫기
    };

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

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
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
                <strong>단위 변환</strong>
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
                <Box my={4}>
                    <TextField
                        select
                        label="길이 단위"
                        fullWidth
                        value={lengthUnit}
                        onChange={(e) => setLengthUnit(e.target.value as keyof typeof lengthUnits)}
                        margin="dense"
                    >
                        {Object.keys(lengthUnits).map((unit) => (
                            <MenuItem key={unit} value={unit}>
                                {unit.toUpperCase()}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="무게 단위"
                        fullWidth
                        value={weightUnit}
                        onChange={(e) => setWeightUnit(e.target.value as keyof typeof weightUnits)}
                        margin="dense"
                    >
                        {Object.keys(weightUnits).map((unit) => (
                            <MenuItem key={unit} value={unit}>
                                {unit.toUpperCase()}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button variant="contained" color="primary" onClick={applyUnit}>
                    Apply
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UnitConverterModal;
