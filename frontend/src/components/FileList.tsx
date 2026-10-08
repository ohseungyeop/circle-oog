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
    loading?: boolean;
    handleSelectionChange: (newSelection: GridRowSelectionModel) => void;
}

const FileList: React.FC<FileListProps> = ({ rows, columns, selectionModel, loading, handleSelectionChange }) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <h3>📂 File List</h3>
                <IconButton aria-label={isExpanded ? '파일 목록 접기' : '파일 목록 펼치기'} onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? <ExpandLess /> : <ExpandMore />}</IconButton>
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
                    pagination
                    pageSizeOptions={[5, 10, 20]}
                    loading={loading}
                    localeText={{ noRowsLabel: '업로드한 파일이 없습니다. Import 로 패킹 리스트를 올려 주세요.' }}
                    rowSelectionModel={selectionModel}
                    onRowSelectionModelChange={handleSelectionChange}
                />
            )}
        </Box>
    );
};

export default FileList;
