import * as React from 'react';
import * as XLSX from 'xlsx';
import { lengthUnits, weightUnits, convertLength, convertWeight } from '../utils/UnitConverter.tsx';
import { useOogColumns } from '../context/OogColumnsContext';
import { GridColDef } from '@mui/x-data-grid';

let latestOogColumns: GridColDef[] = [];
let latestLengthUnit: keyof typeof lengthUnits = 'mm';
let latestWeightUnit: keyof typeof weightUnits = 'kg';

export const FileListHandlers = () => {
    const { oogColumns, lengthUnit, weightUnit } = useOogColumns();
    React.useEffect(() => {
        latestOogColumns = oogColumns; // 컴포넌트 외부에서 참조 가능하게 저장
        latestLengthUnit = lengthUnit; // 컴포넌트 외부에서 참조 가능하게 저장
        latestWeightUnit = weightUnit; // 컴포넌트 외부에서 참조 가능하게 저장
    }, [oogColumns, lengthUnit, weightUnit]);
    return null;
};

type SetSnackbar = (snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }) => void;

export const fetchData = async (apiUrl: string, setRows: (rows: any[]) => void, setSnackbar?: SetSnackbar) => {
    try {
        // 로그인한 사용자의 파일 목록 (사용자는 서버가 세션 쿠키로 판단)
        const response = await fetch(`${apiUrl}/vos/oog/v1/files`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) throw new Error('데이터 불러오기 실패');

        const data = await response.json();
        console.log('Fetched data:', data);

        if (!Array.isArray(data.data)) {
            console.error('Data is not an array:', data);
            setRows([]);
            return;
        }

        const formattedData = data.data.map((item: any, index: number) => ({
            id: index + 1,
            fileName: item.ORGN_FILE_NM,
            fileDate: new Date(item.UPLD_DT).toLocaleString('ko-KR', {
                // timeZone: "Asia/Seoul",
            }),
            pckOrdSeq: item.PCK_ORD_SEQ,
        }));

        setRows(formattedData);
    } catch (error) {
        console.error('Error fetching data:', error);
        setRows([]);
        setSnackbar?.({ open: true, message: '파일 목록을 불러오지 못했습니다. 새로고침해 주세요.', severity: 'error' });
        return;
    }
};

export const handleTemplateDownload = (apiUrl: string) => {
    const link = document.createElement('a');
    link.href = `${apiUrl}/vos/oog/v1/files/template`;
    link.click();
};

export const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    apiUrl: string,
    setSnackbar: SetSnackbar,
    setExcelRows: (rows: any[]) => void,
    fetchData: (apiUrl: string, setRows: (rows: any[]) => void, setSnackbar?: SetSnackbar) => Promise<void>,
    setRows: (rows: any[]) => void,
) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setSnackbar({
            open: true,
            message: '엑셀 파일만 업로드 가능합니다',
            severity: 'error',
        });
        return;
    }

    const reader = new FileReader();
    await new Promise<void>((resolve) => {
        reader.onerror = () => {
            setSnackbar({ open: true, message: '파일을 읽지 못했습니다. 다시 선택해 주세요.', severity: 'error' });
            resolve();
        };
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, {
                    header: 0,
                });
                console.log('jsonData', jsonData);

                if (jsonData.length === 0) {
                    setSnackbar({
                        open: true,
                        message: '엑셀 파일이 비어 있습니다!',
                        severity: 'error',
                    });
                    return;
                }

                const columnMapping: { [key: string]: string } = {
                    No번호: 'pckNo',
                    'Item Name품목': 'itmNm',
                    'Package Dimension(㎜)': 'itmLen',
                    __EMPTY: 'itmWdt',
                    __EMPTY_1: 'itmHgt',
                    'Box Dimension(㎜)': 'boxLen',
                    __EMPTY_2: 'boxWdt',
                    __EMPTY_3: 'boxHgt',
                    "Q'ty수량": 'itmQty',
                    CBM입방미터: 'itmCbm',
                    'Item Type일반/진공': 'itmTpNm',
                    'Net Weight중량(㎏)': 'netWgt',
                    'Gross Weight중량(㎏)': 'grsWgt',
                    Remarks비고: 'rmks',
                };

                const formattedData = jsonData.slice(1).map((row, index) => {
                    const excelRow = Object.entries(row).map(([key, value]) => {
                        const cleanedKey = key.replace(/[\r\n↵]+/g, '').trim();
                        const cleanedValue = (value || '')
                            .toString()
                            .replace(/[\r\n↵]+/g, '')
                            .trim();
                        return [cleanedKey, cleanedValue];
                    });

                    const excelRowObject = Object.fromEntries(excelRow);

                    const result: { id: number; [key: string]: any } = {
                        id: index + 1,
                    };

                    // Map each column based on columnMapping
                    Object.keys(columnMapping).forEach((excelColumn) => {
                        const mappedKey: string = columnMapping[excelColumn];
                        const excelValue = excelRowObject[excelColumn];
                        if (mappedKey === 'rmks') {
                            result[mappedKey] = excelValue !== undefined && excelValue !== null ? String(excelValue).trim() : '';
                        } else if (typeof excelValue === 'string') {
                            result[mappedKey] = String(excelValue).trim() || 0;
                        } else {
                            result[mappedKey] = Number(excelValue) || 0;
                        }
                    });

                    return result;
                });

                console.log('Formatted Data:', formattedData);

                const pckOrdSeq = await importExcel(file, apiUrl, setSnackbar);
                console.log('pckOrdSeq', pckOrdSeq);

                if (!pckOrdSeq) return; // importExcel 이 이미 실패를 알렸다

                const updatedData = formattedData.map((item) => ({
                    ...item,
                    pckOrdSeq,
                }));

                const inserted = await insertExcelData(updatedData, apiUrl, setSnackbar);
                if (!inserted) return;

                setExcelRows(updatedData);
                setSnackbar({
                    open: true,
                    message: '파일을 올리고 패킹 리스트를 저장했습니다.',
                    severity: 'success',
                });

                fetchData(apiUrl, setRows, setSnackbar);
            } catch (error) {
                console.error('파일 읽기 오류:', error);
                setSnackbar({
                    open: true,
                    message: '엑셀을 읽는 중 오류가 났습니다. 템플릿 형식인지 확인해 주세요.',
                    severity: 'error',
                });
            } finally {
                resolve();
            }
        };

        reader.readAsArrayBuffer(file);
    });
    event.target.value = '';
};

const importExcel = async (file: File, apiUrl: string, setSnackbar: SetSnackbar) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/files`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });

        const result = await response.json();
        console.log('파일 업로드 결과:', result);
        if (!response.ok) throw new Error(result.error ?? '파일 업로드 실패');

        return result.pckOrdSeq;
    } catch (error) {
        setSnackbar({
            open: true,
            message: error instanceof Error && error.message !== '파일 업로드 실패' ? error.message : '파일을 올리지 못했습니다. 다시 시도해 주세요.',
            severity: 'error',
        });
        return null;
    }
};

interface ExcelData {
    id: number;
    [key: string]: any; // Replace with specific keys and types if known
}

const insertExcelData = async (data: ExcelData[], apiUrl: string, setSnackbar: SetSnackbar): Promise<boolean> => {
    if (data.length === 0) {
        setSnackbar({
            open: true,
            message: '업로드된 데이터가 없습니다!',
            severity: 'error',
        });
        return false;
    }

    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/files/details`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data }),
        });

        if (!response.ok) throw new Error('데이터 저장 실패');
        console.log('데이터 삽입 성공!');
        return true;
    } catch (error) {
        console.error('데이터 삽입 오류:', error);
        setSnackbar({
            open: true,
            message: '패킹 리스트를 저장하지 못했습니다. 파일을 다시 올려 주세요.',
            severity: 'error',
        });
        return false;
    }
};

export const handleSelectionChange = async (
    newSelection: number[],
    rows: any[],
    setSelectionModel: (selection: number[]) => void,
    setExcelRows: (rows: any[]) => void,
    setCalculatorData: (data: any[]) => void,
    fetchExcelData: (pckOrdSeq: number, apiUrl: string) => Promise<any[]>,
    apiUrl: string,
) => {
    if (newSelection.length > 1) {
        newSelection = [newSelection[newSelection.length - 1]];
    }

    if (newSelection.length > 0) {
        const selectedId = newSelection[0];
        const selectedRow = rows.find((row) => row.id === selectedId);

        if (selectedRow) {
            const calculatorData = await fetchOogCalcData(selectedRow.pckOrdSeq, apiUrl);
            setCalculatorData(calculatorData);

            await handleExcelChk(selectedRow.pckOrdSeq, setExcelRows, setCalculatorData, fetchExcelData, fetchOogCalcData, apiUrl);
        }
    } else {
        setExcelRows([]);
        setCalculatorData([]);
    }

    setSelectionModel(newSelection);
};

export const handleExcelChk = async (
    pckOrdSeq: number,
    setExcelRows: (rows: any[]) => void,
    setCalculatorData: (data: any[]) => void,
    fetchExcelData: (pckOrdSeq: number, apiUrl: string) => Promise<any[]>,
    fetchOogCalcData: (pckOrdSeq: number, apiUrl: string) => Promise<any[]>,
    apiUrl: string,
) => {
    if (!pckOrdSeq) return;

    console.log('📌 선택된 pckOrdSeq:', pckOrdSeq);

    try {
        // 데이터 비동기적으로 가져오기
        const excelData = await fetchExcelData(pckOrdSeq, apiUrl);
        const calculatorData = await fetchOogCalcData(pckOrdSeq, apiUrl);

        console.log('📌 Excel Data:', excelData);
        console.log('📌 Calculator Data:', calculatorData);

        // 상태 업데이트
        setExcelRows(excelData);
        setCalculatorData(calculatorData);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};
export const fetchExcelData = async (pckOrdSeq: number, apiUrl: string) => {
    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/files/details/${pckOrdSeq}`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) throw new Error('데이터 불러오기 실패');

        const data = await response.json();
        console.log('Fetched Excel Data:', data);

        if (!Array.isArray(data.data)) {
            console.error('Data is not an array:', data);
            return [];
        }

        const formattedData = data.data.map((item: any, index: number) => ({
            id: index + 1,
            pckOrdSeq: item.PCK_ORD_SEQ,
            pckNo: item.PCK_NO,
            itmNm: item.ITM_NM,
            itmLen: Number(item.ITM_LEN),
            itmWdt: Number(item.ITM_WDT),
            itmHgt: Number(item.ITM_HGT),
            boxLen: Number(item.BOX_LEN),
            boxWdt: Number(item.BOX_WDT),
            boxHgt: Number(item.BOX_HGT),
            itmQty: Number(item.ITM_QTY),
            itmCbm: Number(item.ITM_CBM),
            itmTpNm: item.ITM_TP_NM,
            netWgt: Number(item.NET_WGT),
            grsWgt: Number(item.GRS_WGT),
            rmks: item.RMKS,
        }));

        return formattedData;
    } catch (error) {
        console.error('Error fetching Excel data:', error);
        return [];
    }
};

export const handleSaveChanges = async (changedRows: any[], apiUrl: string, setSnackbar: any) => {
    try {
        console.log('💾 Saving changes:', changedRows);

        if (!changedRows || changedRows.length === 0) {
            setSnackbar({
                open: true,
                message: '저장할 변경사항이 없습니다.',
                severity: 'warning',
            });
            return;
        }

        // 백엔드로 전송할 데이터 형식으로 변환
        const updateData = changedRows.map((row) => ({
            pckOrdSeq: row.pckOrdSeq,
            pckNo: row.pckNo,
            boxLen: row.boxLen,
            boxWdt: row.boxWdt,
        }));

        console.log('📤 Sending update data to backend:', updateData);

        const response = await fetch(`${apiUrl}/vos/oog/v1/packages/details`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: updateData }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Save response:', result);

        // replyHelper가 응답을 래핑하므로 data 필드에서 실제 결과를 가져옴
        const actualResult = result.data || result;
        const updatedCount = actualResult.updatedCount || 0;

        setSnackbar({
            open: true,
            message: `성공적으로 ${updatedCount}개 항목이 저장되었습니다.`,
            severity: 'success',
        });

        return result;
    } catch (error) {
        console.error('❌ Error saving changes:', error);
        setSnackbar({
            open: true,
            message: '저장 중 오류가 발생했습니다.',
            severity: 'error',
        });
        throw error;
    }
};

// 엑셀로 내보내는 HTML 에 품목명·비고 같은 업로드 값이 그대로 들어가므로 이스케이프한다
const escapeHtml = (value: unknown) =>
    String(value ?? '').replace(
        /[&<>"']/g,
        (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
    );

export const handleExportToExcel = (calculatorData: any[], setSnackbar: SetSnackbar) => {
    try {
        if (!calculatorData || calculatorData.length === 0) {
            setSnackbar({
                open: true,
                message: '내보낼 데이터가 없습니다. 먼저 Calculator 를 실행해 주세요.',
                severity: 'warning',
            });
            return;
        }

        // 1️⃣ RowSpan 계산
        const rowSpanMap = calculateRowSpan(calculatorData);

        // 2️⃣ HTML 테이블 생성 (스타일 포함)
        let tableHTML = `
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 5px; text-align: center; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .subTotal { background-color: yellow; font-weight: bold; }
                .over { color: red; font-weight: bold; }
                .remarkColumn { color: blue; }
            </style>

            <table>
            <body>
                <table>
                    <thead>
                        <tr>
                            ${latestOogColumns
                                .filter((col) => col.field !== 'pckOrdSeq') // 'pckOrdSeq' 필드는 제외
                                .map((col) => `<th>${escapeHtml(col.headerName)}</th>`)
                                .join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        // 3️⃣ 데이터 행 생성
        calculatorData.forEach((item, index, array) => {
            const isFirstOccurrence = index === 0 || array[index - 1].clpNo !== item.clpNo;

            tableHTML += `<tr${item.Item === 'SUM' ? ' class="subTotal"' : ''}>`;

            // 🔹 clpNo (병합 처리)
            if (isFirstOccurrence) {
                const rowSpan = rowSpanMap[item.clpNo] ?? 1;
                tableHTML += `<td align="center" rowspan="${rowSpan}">${escapeHtml(item.clpNo)}</td>`;
            }

            // 🔹 일반 데이터
            if (item.Item === 'SUM') {
                tableHTML += `<td colspan="2"></td>`; // ✅ SUM 행에서 빠지는 열 개수 맞춤
            } else {
                tableHTML += `
                    <td align="center">${escapeHtml(item.boxNo)}</td>
                    <td>${escapeHtml(item.Item)}</td>
                `;
            }

            tableHTML += `
                <td align="right" class="${item.isOverLen ? 'over' : ''}">
                    ${convertLength(item.boxLen, latestLengthUnit).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </td>
                <td align="right" class="${item.isOverWdt ? 'over' : ''}">
                    ${convertLength(item.boxWdt, latestLengthUnit).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </td>
                <td align="right" class="${item.isOverHgt ? 'over' : ''}">
                    ${convertLength(item.boxHgt, latestLengthUnit).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </td>
                <td align="right">${item.qty ?? '0'}</td>
                <td align="right">${(item.cbm ?? 0).toFixed(2)}</td>
                <td align="center">${escapeHtml(item.type)}</td>
                <td align="right">
                    ${convertWeight(item.nw, latestWeightUnit).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </td>
                <td align="right" class="${item.isOverWgt ? 'over' : ''}">
                    ${convertWeight(item.gw, latestWeightUnit).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </td>
                <td class="remarkColumn">${escapeHtml(item.rmks)}</td>
            `;

            // 🔹 displayTpsz (병합 처리)
            if (isFirstOccurrence) {
                const rowSpan = rowSpanMap[item.clpNo] ?? 1;
                tableHTML += `<td rowspan="${rowSpan}">${escapeHtml(item.displayTpsz)}</td>`;
            }

            tableHTML += `</tr>`;
        });

        // 4️⃣ tfoot 섹션 추가
        const totalQty = calculatorData
            .filter((item) => item.Item === 'SUM')
            .reduce((sum, item) => sum + item.qty, 0)
            .toLocaleString(undefined, { maximumFractionDigits: 2 });

        const totalCbm = calculatorData
            .filter((item) => item.Item === 'SUM')
            .reduce((sum, item) => sum + item.cbm, 0)
            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const totalNw = convertWeight(
            calculatorData.filter((item) => item.Item === 'SUM').reduce((sum, item) => sum + item.nw, 0),
            latestWeightUnit,
        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const totalGw = convertWeight(
            calculatorData.filter((item) => item.Item === 'SUM').reduce((sum, item) => sum + item.gw, 0),
            latestWeightUnit,
        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const tpszSummary = Object.entries(
            calculatorData.reduce((countMap, item) => {
                const tpsz = item.groupTpsz;
                if (tpsz) {
                    const clpNo = item.clpNo;
                    if (!countMap[tpsz]) {
                        countMap[tpsz] = new Set();
                    }
                    countMap[tpsz].add(clpNo);
                }
                return countMap;
            }, {}),
        )
            .map(([tpsz, clpNoSet]) => `${escapeHtml(tpsz)}×<span class="totalNumColor">${(clpNoSet as Set<string>).size}</span>`)
            .join(', ');

        tableHTML += `
                        </tbody>
                        <tfoot>
                            <tr>
                                <th><strong>Total</strong></th>
                                <td colspan="5">${tpszSummary}</td>
                                <td align="right">${totalQty}</td>
                                <td align="right">${totalCbm}</td>
                                <td></td>
                                <td align="right">${totalNw}</td>
                                <td align="right">${totalGw}</td>
                                <td></td>
                                <th colspan="1"></th>
                            </tr>
                        </tfoot>
                    </table>
                </body>
                </html>
            `;

        // tableHTML += `</tbody></table></body></html>`;

        // 4️⃣ Blob을 생성하여 엑셀 파일 다운로드
        const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'OOGList.xls';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('엑셀 내보내기 오류:', error);
        setSnackbar({ open: true, message: '엑셀 내보내기에 실패했습니다. 다시 시도해 주세요.', severity: 'error' });
    }
};

export const fetchOogCalcData = async (pckOrdSeq: number, apiUrl: string) => {
    console.log('🔍 Calling API with:', apiUrl, pckOrdSeq);
    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/packages/${pckOrdSeq}`, {
            method: 'GET',
            credentials: 'include',
        });
        console.log('🔍 API Response Status:', response.status);
        // API 응답을 먼저 텍스트로 확인 (HTML인지 JSON인지 판별)
        const rawText = await response.text();
        console.log('🔍 API Raw Response:', rawText);

        if (!response.ok) throw new Error('데이터 불러오기 실패');

        const data = JSON.parse(rawText);
        console.log('Fetched Oog Data:', data);

        if (!Array.isArray(data.data)) {
            console.error('Data is not an array:', data);
            return [];
        }

        // CLP_NO 별로 데이터를 그룹화하여 하나라도 'Y'인 경우를 체크
        const groupedData = data.data.reduce((acc: any, item: any) => {
            const clpNo = item.CLP_NO;
            if (!acc[clpNo]) {
                acc[clpNo] = {
                    hasOverWgtYn: false,
                    hasOverLenYn: false,
                    hasOverWdtYn: false,
                    hasOverHgtYn: false,
                };
            }

            // 같은 CLP_NO의 데이터 중 하나라도 'Y'가 있으면 true로 설정
            if (item.OVER_WGT_YN === 'Y') {
                acc[clpNo].hasOverWgtYn = true;
            }
            if (item.OVER_LEN_YN === 'Y') {
                acc[clpNo].hasOverLenYn = true;
            }
            if (item.OVER_WDT_YN === 'Y') {
                acc[clpNo].hasOverWdtYn = true;
            }
            if (item.OVER_HGT_YN === 'Y') {
                acc[clpNo].hasOverHgtYn = true;
            }

            return acc;
        }, {});

        const tpszCount: { [key: string]: number } = {};

        const formattedData = data.data.map((item: any, index: number) => {
            const clpNo = item.CLP_NO;
            const group = groupedData[clpNo];
            // tpsz 값을 계산
            const tpsz = item.TPSZ
                ? item.TPSZ +
                  (group.hasOverWgtYn
                      ? '(Weight)'
                      : group.hasOverLenYn || group.hasOverWdtYn || group.hasOverHgtYn
                        ? '(O' +
                          (group.hasOverLenYn ? 'L' : '') +
                          (group.hasOverWdtYn ? 'W' : '') +
                          (group.hasOverHgtYn ? 'H' : '') +
                          ')'
                        : '')
                : '';

            // tpsz별로 일련번호를 매기기 위해 count 객체 업데이트
            if (!tpszCount[tpsz]) {
                tpszCount[tpsz] = 1; // 첫 번째 항목에 일련번호 1 부여
            } else if (clpNo !== data.data[index - 1].CLP_NO) {
                tpszCount[tpsz] += 1; // 기존 값이 있으면 일련번호 증가
            }

            return {
                id: index + 1,
                pckOrdSeq: item.PCK_ORD_SEQ,
                clpNo: item.CLP_NO,
                boxNo: item.BOX_NO,
                Item: item.ITEM,
                mcLen: null !== item.MC_LEN ? Number(item.MC_LEN) : null,
                mcWdt: null !== item.MC_WDT ? Number(item.MC_WDT) : null,
                mcHgt: null !== item.MC_HGT ? Number(item.MC_HGT) : null,
                boxLen: Number(item.BOX_LEN),
                boxWdt: Number(item.BOX_WDT),
                boxHgt: Number(item.BOX_HGT),
                qty: Number(item.QTY),
                cbm: Number(item.CBM),
                type: item.TYPE,
                nw: Number(item.NW),
                gw: Number(item.GW),
                rmks: item.RMKS,
                displayTpsz: tpsz + ' ' + tpszCount[tpsz],
                tpsz: item.TPSZ,
                groupTpsz: tpsz,
                image:
                    null !== item.TPSZ
                        ? '/images/' +
                          (group.hasOverWgtYn || 'Y' === item.OVER_LEN_YN ? '40p' : item.TPSZ.replace("'", '').toLowerCase()) +
                          '.png'
                        : null,
                isOverWgt: 'Y' === item.OVER_WGT_YN,
                isOverLen: 'Y' === item.OVER_LEN_YN,
                isOverWdt: 'Y' === item.OVER_WDT_YN,
                isOverHgt: 'Y' === item.OVER_HGT_YN,
                hasOverWgt: group.hasOverWgtYn,
                hasOverLen: group.hasOverLenYn,
                hasOverWdt: group.hasOverWdtYn,
                hasOverHgt: group.hasOverHgtYn,
            };
        });

        console.log('formattedData', formattedData);

        return formattedData;
    } catch (error) {
        console.error('Error fetching Oog data:', error);
        return [];
    }
};

export const handleDeleteRows = async (
    apiUrl: string,
    selectionModel: number[],
    rows: any[],
    setSnackbar: any,
    fetchData: any,
    setRows: any,
) => {
    const selectedSeqs: number[] = rows.filter((row) => selectionModel.includes(row.id)).map((row) => row.pckOrdSeq);

    if (selectedSeqs.length === 0) {
        setSnackbar({
            open: true,
            message: '선택된 로우가 없습니다!',
            severity: 'error',
        });
        return;
    }

    try {
        const responses = await Promise.all(
            selectedSeqs.map((seq) => fetch(`${apiUrl}/vos/oog/v1/files/${seq}`, { method: 'DELETE', credentials: 'include' })),
        );
        const failed = responses.filter((response) => !response.ok).length;
        if (failed > 0) throw new Error(`${failed}건 삭제 실패`);

        setSnackbar({
            open: true,
            message: `${selectedSeqs.length}개 파일을 삭제했습니다.`,
            severity: 'success',
        });

        fetchData(apiUrl, setRows, setSnackbar);
    } catch (error) {
        console.error('로우 삭제 오류:', error);
        setSnackbar({
            open: true,
            message: '일부 파일을 삭제하지 못했습니다. 목록을 확인하고 다시 시도해 주세요.',
            severity: 'error',
        });
        fetchData(apiUrl, setRows, setSnackbar);
    }
};

const calculateRowSpan = (data: any[]) => {
    const rowSpanMap: Record<string, number> = {};

    data.forEach((item) => {
        if (rowSpanMap[item.clpNo]) {
            rowSpanMap[item.clpNo]++;
        } else {
            rowSpanMap[item.clpNo] = 1;
        }
    });

    return rowSpanMap;
};

export const handleCalculator = async (
    apiUrl: string,
    pckOrdSeq: number,
    setSnackbar: any,
    selectionModel: number[],
    setCalculatorData: (data: any[]) => void,
) => {
    if (!selectionModel || selectionModel.length === 0) {
        setSnackbar({
            open: true,
            message: '계산할 로우를 선택해주세요!',
            severity: 'error',
        });
        return;
    }
    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/calculate/${pckOrdSeq}`, {
            method: 'POST',
            credentials: 'include',
        });

        // ✅ 응답이 정상인지 체크
        if (!response.ok) {
            throw new Error(`계산 실패: ${response.status} ${response.statusText}`);
        }

        // ✅ 성공 메시지 출력
        setSnackbar({
            open: true,
            message: '계산이 완료되었습니다!',
            severity: 'success',
        });
        // ✅ 필요하면 fetchData() 호출 (현재는 주석 처리)
        // fetchData(apiUrl)        // 된 로우에 대한 계산 데이터 가져오기
        const calculatorData = await fetchOogCalcData(pckOrdSeq, apiUrl);

        const rowSpanMap = calculateRowSpan(calculatorData);
        const updatedData = calculatorData.map((item: { clpNo: string; [key: string]: any }) => ({
            ...item,
            rowSpan: rowSpanMap[item.clpNo], // clpNo 기준으로 rowSpan 값 추가
        }));

        setCalculatorData(updatedData);

        console.log('Calculator Data:', calculatorData);
    } catch (error) {
        console.error('계산 오류:', error);
        setSnackbar({
            open: true,
            message: '계산에 실패했습니다. 패킹 리스트 값을 확인한 뒤 다시 시도해 주세요.',
            severity: 'error',
        });
    }
};
