// FileList.tsx
import * as React from 'react';
import Box from '@mui/material/Box';
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

const FileList: React.FC<FileListProps> = ({
  rows,
  columns,
  selectionModel,
  handleSelectionChange,
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      <h3>📂 File List</h3>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        rowCount={rows.length}
        paginationMode="server"
        pagination
        checkboxSelection
        rowSelectionModel={selectionModel}
        onRowSelectionModelChange={handleSelectionChange}
        disableRowSelectionOnClick
      />
    </Box>
  );
};

export default FileList;