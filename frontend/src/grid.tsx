"use client";

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCookies } from "react-cookie";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ColDef,
  CsvExportModule,
  ModuleRegistry,
  Theme,
  iconSetMaterial,
  themeQuartz,
} from "ag-grid-community";
import withAuth from "./withAuth";
import jwtDecode from "jwt-decode"; // ✅ JWT 디코드 라이브러리 추가
ModuleRegistry.registerModules([AllCommunityModule, CsvExportModule]);

const myTheme = themeQuartz
  .withPart(iconSetMaterial)
  .withParams({
    browserColorScheme: "light",
    fontFamily: {
      googleFont: "Open Sans",
    },
    fontSize: 15,
    headerBackgroundColor: "#0E4491",
    headerFontFamily: {
      googleFont: "Open Sans",
    },
    headerFontSize: 20,
    headerTextColor: "#FFFFFF",
    iconSize: 18,
  });

const GridIndex = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [columnDefs] = useState<ColDef[]>([
    { field: "No", minWidth: 170 },
    { field: "Item name" },
    { field: "Length" },
    { field: "Width" },
    { field: "Height" },
    { field: "Q'ty" },
    { field: "G/W" },
    { field: "CBM" },
    { field: "RMKS" },
  ]);
  const theme = useMemo<Theme | "legacy">(() => myTheme, []);
  const defaultColDef = useMemo<ColDef>(() => ({ editable: true, filter: true }), []);
  const [cookies] = useCookies(['authToken']);
  const apiUrl = import.meta.env.VITE_BACKEND_URL;
  const [message, setMessage] = useState<string | null>(null); // ✅ 메시지 상태 추가

  const exportBtn = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv();
  }, []);

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

      debugger;

      const result = await response.json();
      console.log("File uploaded successfully:", result);
      setMessage("저장되었습니다"); // ✅ 성공 메시지 설정
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage("파일 업로드 실패"); // ✅ 실패 메시지 설정
    }
  };

  const UploadControl = () => {
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        importExcel(file);
      }
    };

    const handleTemplateDownload = () => {
      // 템플릿 파일 다운로드 로직 추가
      const link = document.createElement('a');
      link.href = '/path/to/template.xlsx'; // 템플릿 파일 경로
      link.download = 'template.xlsx';
      link.click();
    };

    return (
      <div style={{ marginBottom: "10px", textAlign: "center" }}>
        <button
          onClick={exportBtn}
          style={{
            marginRight: "10px",
            padding: "10px 20px",
            backgroundColor: "#0E4491",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Export
        </button>
        <button
          onClick={handleTemplateDownload}
          style={{
            padding: "10px 20px",
            backgroundColor: "#0E4491",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Template Download
        </button>
        {message && <div style={{ marginTop: "10px", color: "green" }}>{message}</div>} {/* ✅ 메시지 표시 */}
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <UploadControl />
      <div style={gridStyle}>
        <AgGridReact<null>
          ref={gridRef}
          columnDefs={columnDefs}
          theme={theme}
          defaultColDef={defaultColDef}
        />
      </div>
    </div>
  );
};

export default withAuth(GridIndex);
