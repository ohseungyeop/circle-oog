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

// IOlympicData 인터페이스를 가져옵니다.
import { IOlympicData } from "./interfaces";

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
  const gridRef = useRef<AgGridReact<IOlympicData>>(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [rowData, setRowData] = useState<IOlympicData[]>();
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([
    { field: "athlete", minWidth: 170 },
    { field: "age" },
    { field: "country" },
    { field: "year" },
    { field: "date" },
    { field: "sport" },
    { field: "gold" },
    { field: "silver" },
    { field: "bronze" },
    { field: "total" },
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

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridApi = params.api; // gridApi 설정
    fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
      .then((resp) => resp.json())
      .then((data: IOlympicData[]) => setRowData(data));
  }, []);

  const exportBtn = useCallback(() => {
    gridRef.current?.api.exportDataAsCsv();
  }, []);

  // XMLHttpRequest in promise format
  function makeRequest(method: string, url: string, success: any, error: any) {
    const httpRequest = new XMLHttpRequest();
    httpRequest.open("GET", url, true);
    httpRequest.responseType = "arraybuffer";

    httpRequest.open(method, url);
    httpRequest.onload = function () {
      success(httpRequest.response);
    };
    httpRequest.onerror = function () {
      error(httpRequest.response);
    };
    httpRequest.send();
  }

  // read the raw data and convert it to a XLSX workbook
  function convertDataToWorkbook(dataRows: ArrayBuffer) {
    /* convert data to binary string */
    const data = new Uint8Array(dataRows);
    const arr = [];

    for (let i = 0; i !== data.length; ++i) {
      arr[i] = String.fromCharCode(data[i]);
    }

    const bstr = arr.join("");

    return XLSX.read(bstr, { type: "binary" });
  }

  function populateGrid(workbook: any) {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const columns: Record<string, string> = {
      A: "athlete",
      B: "age",
      C: "country",
      D: "year",
      E: "date",
      F: "sport",
      G: "gold",
      H: "silver",
      I: "bronze",
      J: "total",
    };
    const rowData = [];
    // start at the 2nd row - the first row are the headers
    let rowIndex = 2;

    while (worksheet["A" + rowIndex]) {
      var row: any = {};
      Object.keys(columns).forEach((column) => {
        row[columns[column]] = worksheet[column + rowIndex].w;
      });

      rowData.push(row);
      rowIndex++;
    }

    // finally, set the imported rowData into the grid
    gridApi.applyTransaction({ add: rowData });
  }

  function importExcel() {
    fetch("https://www.ag-grid.com/example-assets/olympic-data.xlsx")
      .then((response) => response.arrayBuffer())
      .then((data: ArrayBuffer) => {
        const workbook = convertDataToWorkbook(data);
        populateGrid(workbook);
      });
  }

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: "10px", textAlign: "center" }}>
        <button
          onClick={importExcel}
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
          onClick={() => setRowData([])}
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

      <div style={gridStyle}>
        <AgGridReact<IOlympicData>
          rowData={rowData}
          ref={gridRef}
          columnDefs={columnDefs}
          theme={theme}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
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