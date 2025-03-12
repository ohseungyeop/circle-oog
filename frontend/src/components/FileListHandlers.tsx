import jwtDecode from 'jwt-decode';
import * as XLSX from 'xlsx';

export const fetchData = async (cookies, apiUrl, setRows) => {
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

export const handleTemplateDownload = (apiUrl) => {
    const link = document.createElement('a');
    link.href = `${apiUrl}/vos/oog/v1/files/template`;
    link.click();
};

export const handleFileUpload = async (event, cookies, apiUrl, setSnackbar, setExcelRows, fetchData, setRows) => {
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

                const result: { id: number;[key: string]: any } = {
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

export const handleExportToExcel = (excelRows, setSnackbar) => {
    if (excelRows.length === 0) {
        setSnackbar({
            open: true,
            message: '내보낼 데이터가 없습니다!',
            severity: 'error',
        });
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PackingList');

    XLSX.writeFile(workbook, 'OogList.xlsx');
};

const importExcel = async (file, cookies, apiUrl, setSnackbar) => {
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

const insertExcelData = async (data, apiUrl, cookies, setSnackbar) => {
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
    newSelection,
    rows,
    setSelectionModel,
    setExcelRows,
    fetchExcelData,
    apiUrl,
    cookies,
) => {
    if (newSelection.length > 1) {
        newSelection = [newSelection[newSelection.length - 1]];
    }

    if (newSelection.length > 0) {
        const selectedId = newSelection[0];
        const selectedRow = rows.find((row) => row.id === selectedId);

        if (selectedRow) {
            await handleExcelChk(selectedRow.pckOrdSeq, setExcelRows, fetchExcelData, apiUrl, cookies);
        }
    } else {
        setExcelRows([]);
    }

    setSelectionModel(newSelection);
};

const handleExcelChk = async (pckOrdSeq, setExcelRows, fetchExcelData, apiUrl, cookies) => {
    if (!pckOrdSeq) return;

    console.log('📌 선택된 pckOrdSeq:', pckOrdSeq);

    const excelData = await fetchExcelData(pckOrdSeq, apiUrl, cookies);
    console.log('📌 Excel Data:', excelData);

    setExcelRows(excelData);
};

export const fetchExcelData = async (pckOrdSeq, apiUrl, cookies) => {
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

export const handleDeleteRows = async (apiUrl, cookies, selectionModel, rows, setSnackbar, fetchData, setRows) => {
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

export const handleCalculator = async (apiUrl, pckOrdSeq, cookies) => {

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

        const data = await response.json(); // 응답 데이터 가져오기

        // // ✅ 성공 메시지 출력
        // setSnackbar({
        //     open: true,
        //     message: '계산이 완료되었습니다!',
        //     severity: 'success',
        // });

        // ✅ 필요하면 데이터 저장 (이전에 있던 코드)
        // setCalculatorData(data); 

        // ✅ 필요하면 fetchData() 호출 (현재는 주석 처리)
        // fetchData(cookies, apiUrl);
    } catch (error) {
        console.error('계산 오류:', error);

        // setSnackbar({
        //     open: true,
        //     message: `계산에 실패했습니다: ${error.message}`,
        //     severity: 'error',
        // });
    }
};

