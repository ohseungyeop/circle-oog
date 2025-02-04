"use client";

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  StrictMode,
} from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import { StyledEngineProvider } from '@mui/material/styles';
import {
  AllCommunityModule,
  ColDef,
  ColGroupDef,
  CsvExportModule,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ModuleRegistry,
  Theme,
  createGrid,
  iconSetMaterial,
  themeQuartz,
} from "ag-grid-community";


declare let XLSX: any;

ModuleRegistry.registerModules([AllCommunityModule, CsvExportModule]);

let gridApi: GridApi;

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

const GridExample = () => {
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  // const [rowData, setRowData] = useState<IOlympicData[]>();
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([
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
  const theme = useMemo<Theme | "legacy">(() => {
    return myTheme;
  }, []);
  const defaultColDef = useMemo<ColDef>(() => {
    return {
      editable: true,
      filter: true,
    };
  }, []);

  // const onGridReady = useCallback((params: GridReadyEvent) => {
  //   gridApi = params.api; // gridApi 설정
  //   fetch("http://localhost:3300/vos/oog/v1/pcks")
  //     .then((resp) => resp.json())
  //     .then((data: IOlympicData[]) => setRowData(data));
  // }, []);

  const exportBtn = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv();
  }, []);

  const importExcel = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:3300/vos/oog/v1/pcks/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const result = await response.json();
      console.log("File uploaded successfully:", result);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const UploadControl = () => {
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]; 
      if (file) {
        importExcel(file);
      }
    };

    return (
      <div style={{ marginBottom: "10px", textAlign: "center" }}>
        <input type="file" onChange={handleFileUpload} hidden />
        <button
          onClick={() => document.querySelector('input[type="file"]')?.click()}
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
          Import
        </button>
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
          onClick={() => ([])}
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

      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <UploadControl />
      <div style={gridStyle}>
        <AgGridReact<null>
         // rowData={rowData}
          ref={gridRef}
          columnDefs={columnDefs}
          theme={theme}
          defaultColDef={defaultColDef}
        />
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <GridExample />
  </StrictMode>
);

export default GridExample;