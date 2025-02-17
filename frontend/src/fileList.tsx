import * as React from 'react';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useCookies } from "react-cookie";
import withAuth from "./withAuth";
import jwtDecode from "jwt-decode";
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const columns: GridColDef[] = [
  { field: 'id', headerName: 'No', width: 90 },
  { field: 'fileName', headerName: 'File name', width: 600, editable: true },
  { field: 'fileDate', headerName: 'File Date', width: 350, editable: true },
];

const FileListGrid = () => {
  interface RowData {
    id: number;
    fileName: string;
    fileDate: string;
  }
  
  const [rows, setRows] = React.useState<RowData[]>([]);
  const [cookies] = useCookies(["authToken"]);
  const apiUrl = import.meta.env.VITE_BACKEND_URL;
  const [snackbar, setSnackbar] = React.useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
debugger;
const fetchData = async () => {
  try {
    if (!cookies.authToken) {
      console.error("No auth token found");
      return;
    }

    let email = "";
    try {
      const decoded: any = jwtDecode(cookies.authToken);
      email = decoded.email;
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return;
    }

    console.log("Fetching data for email:", email);

    const response = await fetch(`${apiUrl}/vos/oog/v1/pck/select/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cookies.authToken}`,
        "Content-Type": "application/json",  
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) throw new Error("데이터 불러오기 실패");

    const data = await response.json();
    console.log("Fetched data:", data); // 🛠 받아온 데이터 확인
    debugger;
    
    const items = data.data; // 배열이 들어 있는 key를 직접 참조
    if (Array.isArray(items)) {
     
      const formattedData = items.map((item: any, index: number) => ({
        id: index + 1,
        fileName: item.ORGN_FILE_NM,
        fileDate: new Date(item.UPLD_DT).toLocaleString("ko-KR", { 
          timeZone: "Asia/Seoul"   }), // KST 변환
      }));
      console.log("Formatted data:", formattedData); // 🛠 포맷된 데이터 확인
      setRows(formattedData);
    } else {
      console.error("Data is not an array:", data);
      setRows([]); // 데이터가 배열이 아닌 경우 빈 배열로 설정
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    setRows([]); // 에러 발생 시 빈 배열로 설정
  }
};

React.useEffect(() => {
  if (cookies.authToken) {
    fetchData();
  }
}, [cookies.authToken]);


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

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "File upload failed");

      console.log("File uploaded successfully:", result);
      setSnackbar({ open: true, message: '저장되었습니다', severity: 'success' });

      await fetchData(); // ✅ 업로드 후 리스트 업데이트
    } catch (error) {
      console.error("Error uploading file:", error);
      setSnackbar({ open: true, message: '파일 업로드 실패했습니다', severity: 'error' });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importExcel(file);
      event.target.value = "";  // ✅ 파일 선택 초기화
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <input ref={fileInputRef} type="file" onChange={handleFileUpload} hidden />
      <button
        onClick={() => fileInputRef.current?.click()}
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
