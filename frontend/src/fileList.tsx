import * as React from 'react';
import Box from '@mui/material/Box';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useCookies } from "react-cookie";
import withAuth from "./withAuth";
import jwtDecode from "jwt-decode";
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import * as XLSX from "xlsx";
import { drawerClasses } from '@mui/material';



const columns: GridColDef[] = [
  { field: 'id', headerName: 'No', width: 90 },
  { field: 'fileName', headerName: 'File name', width: 600, editable: true },
  { field: 'fileDate', headerName: 'File Date', width: 350, editable: true },
];

const excelColumns: GridColDef[] = [
  // { field: "pckItemSeq", headerName: "ItemSeq", width: 90 },
  // { field: "pckOrdSeq", headerName: "OrdSeq", width: 200 },
  { field: "pckNo", headerName: "PckNo", width: 200 },
  { field: "itmNm", headerName: "ItmNm", width: 200 },
  { field: "pckLeg", headerName: "PckLeg", width: 200 },
  { field: "pckWdt", headerName: "PckWdt", width: 200 },
  { field: "pckHgt", headerName: "PckHgt", width: 200 },
  { field: "pckQty", headerName: "PckQty", width: 200 },
  { field: "pckWgt", headerName: "PckWgt", width: 200 },
  { field: "pckRmk", headerName: "PckRmk", width: 200 },
];

const FileListGrid = () => {
  interface RowData {
    id: number;
    fileName: string;
    fileDate: string;
    pckOrdSeq: number;
  }
  interface ExcelRowData {
    pckNo: number;
    itmNm: string;
    pckLeg: number;
    pckWdt: number;
    pckHgt: number;
    pckQty: number;
    pckWgt: number;
    pckRmk: string;
  }
  const [rows, setRows] = React.useState<RowData[]>([]);
  const [excelRows, setExcelRows] = React.useState<ExcelRowData[]>([]);
  const [cookies] = useCookies(["authToken"]);
  const apiUrl = import.meta.env.VITE_BACKEND_URL;
  const [snackbar, setSnackbar] = React.useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
 
  // 🔹 파일 리스트 가져오기
  const fetchData = async () => {
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
  
    try {
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
      console.log("Fetched data:", data);
  
      if (!Array.isArray(data.data)) {
        console.error("Data is not an array:", data);
        setRows([]);
        return null;
      }
  
      const formattedData = data.data.map((item: any, index: number) => ({
        id: index + 1,
        fileName: item.ORGN_FILE_NM,
        fileDate: new Date(item.UPLD_DT).toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
        }),
        pckOrdSeq: item.PCK_ORD_SEQ,
      }));
  
      setRows(formattedData);

    } catch (error) {
      console.error("Error fetching data:", error);
      setRows([]);
      return null;
    }
  };

React.useEffect(() => {
  if (cookies.authToken) {
    fetchData();
  }
}, [cookies.authToken]);

const handleTemplateDownload = () => {
  // 템플릿 파일 다운로드 로직 추가
  const link = document.createElement('a');
  link.href = '/public/PackingList.xlsx'; // 템플릿 파일 경로
  link.download = 'template.xlsx';
  link.click();
};



// 🔹 엑셀 파일 읽기
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    setSnackbar({ open: true, message: '엑셀 파일만 업로드 가능합니다', severity: 'error' });
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 0 });

      if (jsonData.length === 0) {
        setSnackbar({ open: true, message: "엑셀 파일이 비어 있습니다!", severity: "error" });
        return;
      }
      // 🔹 JSON 데이터를 변환
      const formattedData = jsonData.slice(1).map((row, index) => {
        const excelRow = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key.replace(/\r\n/g, "").trim(), value])
        );

        return {
          id: index + 1,
          pckNo: Number(excelRow["No번호"]) || 0,
          itmNm: String(excelRow["Item Name품목"]) || "",
          pckLeg: Number(excelRow["Package Dimension(㎜)"]) || 0,
          pckWdt: Number(excelRow["Width세로"]) || 0,
          pckHgt: Number(excelRow["Height높이"]) || 0,
          pckQty: Number(excelRow["Q'ty수량"]) || 0,
          pckWgt: Number(excelRow["G/W중량(㎏)"]) || 0,
          pckRmk: String(excelRow["RMKS비고"]) || "No remark",
        };
      });

      setExcelRows(formattedData);
      console.log("Formatted Data:", formattedData);
       
      const pckOrdSeq = await importExcel(file);
      console.log("pckOrdSeq",pckOrdSeq )
      
      if (!pckOrdSeq) {
        setSnackbar({ open: true, message: "PCK_ORD_SEQ 찾을 수 없습니다", severity: "error" });
        return;
      }

      // 🔹 Step 2: `pckOrdSeq` 추가 후 데이터 삽입 실행
      const updatedData = formattedData.map((item) => ({
        ...item,
        pckOrdSeq,
      }));

      await insertExcelData(updatedData);

      setSnackbar({ open: true, message: "파일 업로드 및 데이터 삽입 성공!", severity: "success" });

      fetchData(); // 🔄 파일 리스트 새로고침
    } catch (error) {
      console.error("파일 읽기 오류:", error);
      setSnackbar({ open: true, message: "파일 읽기 중 오류 발생!", severity: "error" });
    }
  };

  reader.readAsArrayBuffer(file);
  event.target.value = "";
};

// 📌 Step 1: 파일 업로드 함수
const importExcel = async (file: File): Promise<number | null> => {
  let email = "";
  try {
    const decoded: any = jwtDecode(cookies.authToken);
    email = decoded.email;
  } catch (error) {
    console.error("JWT 디코딩 오류:", error);
    return null;
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
    console.log("파일 업로드 결과:", result); // 디버깅용 로그 추가
    setSnackbar({ open: true, message: "파일 업로드 성공!", severity: "success" });

    // ✅ PCK_ORD_SEQ를 반환
      return result.pckOrdSeq; // ✅ 서버에서 받은 새 PCK_ORD_SEQ 반환

  } catch (error) {
    setSnackbar({ open: true, message: "파일 업로드 실패!", severity: "error" });
    return null;
  }
};
// 📌 Step 2: 데이터 삽입 함수
const insertExcelData = async (data: ExcelRowData[]) => {
  if (data.length === 0) {
    setSnackbar({ open: true, message: "업로드된 데이터가 없습니다!", severity: "error" });
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/vos/oog/v1/pck/uploadDtl`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cookies.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({data}),

    });

    if (!response.ok) throw new Error("데이터 저장 실패");
    console.log("데이터 삽입 성공!");
  } catch (error) {
    console.error("데이터 삽입 오류:", error);
    setSnackbar({ open: true, message: "데이터 저장 실패!", severity: "error" });
  }
};

const [selectionModel, setSelectionModel] = React.useState<number[]>([]);

debugger;
const handleRowClick = async (params: any) => {
  const selectedRow = fomatter.find(row => row.id === params.id);
  console.log("Selected Row:", selectedRow); // selectedRow 객체 출력

  if (selectedRow) {
    console.log("Selected Row Data:", selectedRow);
       // pckOrdSeq 값을 가져와서 삭제 처리
       await handleDeleteRows(selectedRow.pckOrdSeq);
  }
};

const handleDeleteRows = async (pckOrdSeq?: number) => {
  if (selectionModel.length === 0) {
    setSnackbar({ open: true, message: "선택된 로우가 없습니다!", severity: "error" });
    return;
  }
 debugger;
  try {
    const response = await fetch(`${apiUrl}/vos/oog/v1/pck/delete`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cookies.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: pckOrdSeq ? [pckOrdSeq] : selectionModel }),
    });
    console.log("data", pckOrdSeq || selectionModel);

    if (!response.ok) throw new Error("리스트 삭제 실패");
    console.log("리스트 삭제 !");

    setSnackbar({ open: true, message: "리스트 삭제 성공!", severity: "success" });

    fetchData(); // 🔄 파일 리스트 새로고침
  } catch (error) {
    console.error("로우 삭제 오류:", error);
    setSnackbar({ open: true, message: "로우 삭제 실패!", severity: "error" });
  }
};


React.useEffect(() => {
    fetchData();
  }, []);

  return (
    <Box sx={{ height: 400, width: '100%' }}>
       <button
          onClick={handleTemplateDownload}
          style={{
            padding: "10px 20px",
            margin : "15px",
            backgroundColor: "#0E4491",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontFamily: "sans-serif",
          }}
        >
          Template Download
        </button>

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

      <button
        onClick={() => handleDeleteRows()}
        style={{
          marginBottom: "10px",
          margin: "15px" ,
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
        Delete
      </button>

      {/* 파일 리스트 그리드 */}
      <Box sx={{ height: 400, width: '100%' }}>
        <h3>📂 File List</h3>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSizeOptions={[5]}
        checkboxSelection
        onRowClick={handleRowClick}
        onRowSelectionModelChange={(newSelection) => {
        setSelectionModel(newSelection as number[]);
        }}
            disableRowSelectionOnClick
      />
    </Box>

         {/* 엑셀 업로드 후 데이터 그리드 */}
        {/* {excelRows.length > 0 && ( */}
        <Box sx={{ height: 400, width: '100%' }}>
          <h3>📊 업로드된 엑셀 데이터  미리보기 </h3>
          <DataGrid
            rows={excelRows}
            columns={excelColumns}
            pageSizeOptions={[5]}
            disableRowSelectionOnClick
          />
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default withAuth(FileListGrid);
