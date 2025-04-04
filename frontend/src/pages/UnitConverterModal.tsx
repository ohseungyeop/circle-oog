import { useState } from 'react';
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

    const applyUnit = () => {
        onApply(lengthUnit, weightUnit); // 부모 컴포넌트로 단위 전달
        onClose(); // 모달 닫기
    };

    return (
        <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle sx={{ backgroundColor: '#1976d2', color: 'white' }}>
                <strong>단위 변환</strong>
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
