import * as React from 'react';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useCookies } from "react-cookie";
import withAuth from "./withAuth";
import jwtDecode from "jwt-decode"; // ✅ JWT 디코드 라이브러리 추가
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'No', width: 90 },
  {
    field: 'fileName',
    headerName: 'File name',
    width: 600,
    editable: true,
  },
  {
    field: 'fileDate',
    headerName: 'File Date',
    width: 350,
    editable: true,
  },
];

const FileListGrid = () => {
  const [rows, setRows] = React.useState([]);
  const [cookies] = useCookies(["authToken"]);
  const apiUrl = import.meta.env.VITE_BACKEND_URL;
  const [snackbar, setSnackbar] = React.useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' }); // ✅ Snackbar 상태 추가

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const importExcel = async (file: File) => {
    let email = "";
    try {
      const decoded: any = jwtDecode(cookies.authToken);
      email = decoded.email;
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", email);

    try {
      const response = await fetch(`${apiUrl}/vos/oog/v1/pck/upload/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cookies.authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const result = await response.json();
      console.log("File uploaded successfully:", result);
      setSnackbar({ open: true, message: '저장되었습니다', severity: 'success' });
      fetchData();
    } catch (error) {
      console.error("Error uploading file:", error);
      setSnackbar({ open: true, message: '파일 업로드 실패했습니다', severity: 'error' });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importExcel(file);
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`${apiUrl}/vos/oog/v1/pck/`);
      const data = await response.json();
      setRows(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <input type="file" onChange={handleFileUpload} hidden />
      <button
        onClick={() => document.querySelector('input[type="file"]')?.click()}
        style={{
          marginBottom: "10px",
          padding: "10px 20px",
          backgroundColor: "#0E4491",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontFamily: "sans-serif",
          fontSize:"15px"
        }}
      >
        Import
      </button>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 5,
            },
          },
        }}
        pageSizeOptions={[5]}
        checkboxSelection
        disableRowSelectionOnClick
      />
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default withAuth(FileListGrid);