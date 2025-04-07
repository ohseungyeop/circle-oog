import React, { createContext, useContext } from 'react';
import { GridColDef } from '@mui/x-data-grid';
import { lengthUnits, weightUnits } from '../utils/UnitConverter.tsx';

interface OogColumnsContextType {
    oogColumns: GridColDef[];
    setOogColumns: React.Dispatch<React.SetStateAction<GridColDef[]>>;
    lengthUnit: keyof typeof lengthUnits;
    setLengthUnit: React.Dispatch<React.SetStateAction<keyof typeof lengthUnits>>;
    weightUnit: keyof typeof weightUnits;
    setWeightUnit: React.Dispatch<React.SetStateAction<keyof typeof weightUnits>>;
}

export const OogColumnsContext = createContext<OogColumnsContextType | null>(null);

export const useOogColumns = () => {
    const context = useContext(OogColumnsContext);
    if (!context) {
        throw new Error('useOogColumns must be used within OogColumnsProvider');
    }
    return context;
};
