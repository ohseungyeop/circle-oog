import jwtDecode from 'jwt-decode';
import * as XLSX from 'xlsx';

interface Cookies {
    authToken: string;
}

export const fetchData = async (cookies: Cookies, apiUrl: string, setRows: (rows: any[]) => void) => {
    if (!cookies.authToken) {
        console.error('No auth token found');
        return;
    }

    let email = '';
    try {
        const decoded: any = jwtDecode(cookies.authToken);
        email = decoded.email;
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return;
    }

    console.log('Fetching data for email:', email);

    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/files?email=${email}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${cookies.authToken}`,
            },
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
    cookies: Cookies,
    apiUrl: string,
    setSnackbar: any,
    setExcelRows: any,
    fetchData: any,
    setRows: any,
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

            setExcelRows(formattedData);
            console.log('Formatted Data:', formattedData);

            const pckOrdSeq = await importExcel(file, cookies, apiUrl, setSnackbar);
            console.log('pckOrdSeq', pckOrdSeq);

            if (!pckOrdSeq) {
                setSnackbar({
                    open: true,
                    message: 'PCK_ORD_SEQ 찾을 수 없습니다',
                    severity: 'error',
                });
                return;
            }

            const updatedData = formattedData.map((item) => ({
                ...item,
                pckOrdSeq,
            }));

            await insertExcelData(updatedData, apiUrl, cookies, setSnackbar);

            setSnackbar({
                open: true,
                message: '파일 업로드 및 데이터 삽입 성공!',
                severity: 'success',
            });

            fetchData(cookies, apiUrl, setRows);
        } catch (error) {
            console.error('파일 읽기 오류:', error);
            setSnackbar({
                open: true,
                message: '파일 읽기 중 오류 발생!',
                severity: 'error',
            });
        }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = '';
};

const importExcel = async (file: File, cookies: Cookies, apiUrl: string, setSnackbar: any) => {
    let email = '';
    try {
        const decoded: any = jwtDecode(cookies.authToken);
        email = decoded.email;
    } catch (error) {
        console.error('JWT 디코딩 오류:', error);
        return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', email);

    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/files`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${cookies.authToken}`,
            },
            body: formData,
        });

        const result = await response.json();
        console.log('파일 업로드 결과:', result);
        setSnackbar({
            open: true,
            message: '파일 업로드 성공!',
            severity: 'success',
        });

        return result.pckOrdSeq;
    } catch (error) {
        setSnackbar({
            open: true,
            message: '파일 업로드 실패!',
            severity: 'error',
        });
        return null;
    }
};

interface ExcelData {
    id: number;
    [key: string]: any; // Replace with specific keys and types if known
}

const insertExcelData = async (data: ExcelData[], apiUrl: string, cookies: Cookies, setSnackbar: any) => {
    if (data.length === 0) {
        setSnackbar({
            open: true,
            message: '업로드된 데이터가 없습니다!',
            severity: 'error',
        });
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/files/details`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${cookies.authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data }),
        });

        if (!response.ok) throw new Error('데이터 저장 실패');
        console.log('데이터 삽입 성공!');
    } catch (error) {
        console.error('데이터 삽입 오류:', error);
        setSnackbar({
            open: true,
            message: '데이터 저장 실패!',
            severity: 'error',
        });
    }
};

export const handleSelectionChange = async (
    newSelection: number[],
    rows: any[],
    setSelectionModel: (selection: number[]) => void,
    setExcelRows: (rows: any[]) => void,
    setCalculatorData: (data: any[]) => void,
    fetchExcelData: (pckOrdSeq: number, apiUrl: string, cookies: Cookies) => Promise<any[]>,
    apiUrl: string,
    cookies: Cookies,
) => {
    if (newSelection.length > 1) {
        newSelection = [newSelection[newSelection.length - 1]];
    }

    if (newSelection.length > 0) {
        const selectedId = newSelection[0];
        const selectedRow = rows.find((row) => row.id === selectedId);

        if (selectedRow) {
            await handleExcelChk(
                selectedRow.pckOrdSeq,
                setExcelRows,
                setCalculatorData,
                fetchExcelData,
                fetchOogCalcData,
                apiUrl,
                cookies,
            );
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
    fetchExcelData: (pckOrdSeq: number, apiUrl: string, cookies: Cookies) => Promise<any[]>,
    fetchOogCalcData: (pckOrdSeq: number, apiUrl: string, cookies: Cookies) => Promise<any[]>,
    apiUrl: string,
    cookies: Cookies,
) => {
    if (!pckOrdSeq) return;

    console.log('📌 선택된 pckOrdSeq:', pckOrdSeq);

    try {
        // 데이터 비동기적으로 가져오기
        const excelData = await fetchExcelData(pckOrdSeq, apiUrl, cookies);
        const calculatorData = await fetchOogCalcData(pckOrdSeq, apiUrl, cookies);

        console.log('📌 Excel Data:', excelData);
        console.log('📌 Calculator Data:', calculatorData);

        // 상태 업데이트
        setExcelRows(excelData);
        setCalculatorData(calculatorData);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};
export const fetchExcelData = async (pckOrdSeq: number, apiUrl: string, cookies: Cookies) => {
    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/files/details/${pckOrdSeq}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${cookies.authToken}`,
            },
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
            itmLen: Number(item.ITM_LEN).toFixed(2),
            itmWdt: Number(item.ITM_WDT).toFixed(2),
            itmHgt: Number(item.ITM_HGT).toFixed(2),
            boxLen: Number(item.BOX_LEN).toFixed(2),
            boxWdt: Number(item.BOX_WDT).toFixed(2),
            boxHgt: Number(item.BOX_HGT).toFixed(2),
            itmQty: Number(item.ITM_QTY),
            itmCbm: Number(item.ITM_CBM).toFixed(4),
            itmTpNm: item.ITM_TP_NM,
            netWgt: Number(item.NET_WGT).toFixed(2),
            grsWgt: Number(item.GRS_WGT).toFixed(2),
            rmks: item.RMKS,
        }));

        return formattedData;
    } catch (error) {
        console.error('Error fetching Excel data:', error);
        return [];
    }
};

export const fetchOogCalcData = async (pckOrdSeq: number, apiUrl: string, cookies: Cookies) => {
    console.log('🔍 Calling API with:', apiUrl, pckOrdSeq, cookies);
    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/packages/${pckOrdSeq}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${cookies.authToken}`,
            },
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
                // tpsz: tpsz,
                image:
                    null !== item.TPSZ
                        ? '/images/' + (group.hasOverWgtYn ? '40p' : item.TPSZ.replace("'", '').toLowerCase()) + '.png'
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
    cookies: Cookies,
    selectionModel: number[],
    rows: any[],
    setSnackbar: any,
    fetchData: any,
    setRows: any,
) => {
    let selectedRow = rows.filter((row) => selectionModel.includes(row.id)).map((row) => row.pckOrdSeq);

    if (selectedRow.length === 0) {
        setSnackbar({
            open: true,
            message: '선택된 로우가 없습니다!',
            severity: 'error',
        });
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/files/${selectedRow}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${cookies.authToken}`,
            },
        });

        if (!response.ok) throw new Error('리스트 삭제 실패');
        console.log('리스트 삭제 성공!');

        setSnackbar({
            open: true,
            message: '리스트 삭제 성공!',
            severity: 'success',
        });

        fetchData(cookies, apiUrl, setRows);
    } catch (error) {
        console.error('로우 삭제 오류:', error);
        setSnackbar({
            open: true,
            message: '로우 삭제 실패!',
            severity: 'error',
        });
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
    cookies: Cookies,
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
            headers: {
                Authorization: `Bearer ${cookies.authToken}`,
            },
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
        // fetchData(cookies, apiUrl)        // 된 로우에 대한 계산 데이터 가져오기
        const calculatorData = await fetchOogCalcData(pckOrdSeq, apiUrl, cookies);

        const rowSpanMap = calculateRowSpan(calculatorData);
        const updatedData = calculatorData.map((item: { clpNo: string; [key: string]: any }) => ({
            ...item,
            rowSpan: rowSpanMap[item.clpNo], // clpNo 기준으로 rowSpan 값 추가
        }));

        setCalculatorData(updatedData);

        console.log('Calculator Data:', calculatorData);
    } catch (error) {
        setSnackbar({
            open: true,
            message: `계산에 실패했습니다 `,
            severity: 'error',
        });
    }
};
