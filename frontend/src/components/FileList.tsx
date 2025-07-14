// FileList.tsx
import * as React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';

interface FileListProps {
    rows: any[];
    columns: GridColDef[];
    selectionModel: GridRowSelectionModel;
    handleSelectionChange: (newSelection: GridRowSelectionModel) => void;
}

// 컬럼 정의
const columns: GridColDef[] = [
    { field: 'id', headerName: 'No', width: 90 },
    { field: 'fileName', headerName: 'File name', width: 600, editable: true },
    { field: 'fileDate', headerName: 'File Date', width: 350, editable: true },
];

const FileList: React.FC<FileListProps> = ({ rows, columns, selectionModel, handleSelectionChange }) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <h3>📂 File List</h3>
                <IconButton onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
            </Box>
            {isExpanded && (
                <DataGrid
                    rows={rows}
                    columns={columns}
                    initialState={{
                        pagination: {
                            paginationModel: { pageSize: 5 },
                        },
                    }}
                    rowCount={rows.length}
                    paginationMode="server"
                    pagination
                    rowSelectionModel={selectionModel}
                    onRowSelectionModelChange={handleSelectionChange}
                />
            )}
        </Box>
    );
};

export default FileList;
