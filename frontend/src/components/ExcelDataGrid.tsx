import * as React from 'react';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

interface ExcelDataGridProps {
  rows: any[];
}

const excelColumns: GridColDef[] = [
  { field: 'id', headerName: 'No', width: 200 },
  { field: 'pckNo', headerName: 'PckNo', width: 200 },
  { field: 'itmNm', headerName: 'ItmNm', width: 200 },
  { field: 'pckLen', headerName: 'PckLen', width: 200 },
  { field: 'pckWdt', headerName: 'PckWdt', width: 200 },
  { field: 'pckHgt', headerName: 'PckHgt', width: 200 },
  { field: 'pckQty', headerName: 'PckQty', width: 200 },
  { field: 'pckWgt', headerName: 'PckWgt', width: 200 },
  { field: 'pckCbm', headerName: 'PckCbm', width: 200 },
  { field: 'pckRmk', headerName: 'PckRmk', width: 200 },
];

const ExcelDataGrid: React.FC<ExcelDataGridProps> = ({ rows }) => {
  if (!rows || rows.length === 0) {
    return <div>데이터가 없습니다.</div>;
  }

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '10px',
        }}
      >
        <h3>🧮 Out of Gauge System</h3>
        <button
          style={{
            padding: '10px 20px',
            backgroundColor: '#0E4491',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
            fontSize: '15px',
          }}
        >
          Calculator
        </button>
      </div>

      <DataGrid
        rows={rows}
        getRowId={(row) => row.pckNo} // 고유 id 지정
        rowCount={rows.length}
        columns={excelColumns}
        paginationMode="server"
        pageSize={5}
        disableRowSelectionOnClick
        pagination
      />
    </Box>
  );
};

export default ExcelDataGrid;
