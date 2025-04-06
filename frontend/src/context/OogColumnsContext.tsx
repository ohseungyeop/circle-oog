import React, { createContext, useContext } from 'react';
import { GridColDef } from '@mui/x-data-grid';

interface OogColumnsContextType {
    oogColumns: GridColDef[];
    setOogColumns: React.Dispatch<React.SetStateAction<GridColDef[]>>;
}

export const OogColumnsContext = createContext<OogColumnsContextType | null>(null);

export const useOogColumns = () => {
    const context = useContext(OogColumnsContext);
    if (!context) {
        throw new Error('useOogColumns must be used within OogColumnsProvider');
    }
    return context;
};
