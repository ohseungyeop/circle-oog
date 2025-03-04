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
                'Content-Type': 'application/json',
            },
            // body: JSON.stringify({ email }),
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

                return {
                    id: index + 1,
                    pckNo: Number(excelRowObject['No번호']) || 0,
                    itmNm: String(excelRowObject['Item Name품목']) || '',
                    pckLen: Number(excelRowObject['Package Dimension(㎜)']) || 0,
                    pckWdt: Number(excelRowObject['__EMPTY']) || 0,
                    pckHgt: Number(excelRowObject['__EMPTY_1']) || 0,
                    pckQty: Number(excelRowObject["Q'ty수량"]) || 0,
                    pckWgt: Number(excelRowObject['G/W중량(㎏)']) || 0,
                    pckCbm: Number(excelRowObject['CBM입방미터']) || 0,
                    pckRmk:
                        excelRowObject['RMKS비고'] !== undefined && excelRowObject['RMKS비고'] !== null
                            ? String(excelRowObject['RMKS비고']).trim()
                            : '',
                };
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
        const response = await fetch(`${apiUrl}/vos/oog/v1/files/details?pckOrdSeq=${pckOrdSeq}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${cookies.authToken}`,
                'Content-Type': 'application/json',
            },
            // body: JSON.stringify({
            //     pckOrdSeq: pckOrdSeq,
            // }),
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
            pckNo: item.PCK_NO,
            itmNm: item.ITM_NM,
            pckLen: item.PCK_LEN,
            pckWdt: item.PCK_WDT,
            pckHgt: item.PCK_HGT,
            pckQty: item.PCK_QTY,
            pckWgt: item.PCK_WGT,
            pckCbm: item.PCK_CBM,
            pckRmk: item.PCK_RMK,
        }));

        return formattedData;
    } catch (error) {
        console.error('Error fetching Excel data:', error);
        return [];
    }
};

export const handleDeleteRows = async (apiUrl, cookies, selectionModel, rows, setSnackbar, fetchData, setRows) => {
    let selectedRows = rows.filter((row) => selectionModel.includes(row.id)).map((row) => row.pckOrdSeq);

    if (selectedRows.length === 0) {
        setSnackbar({
            open: true,
            message: '선택된 로우가 없습니다!',
            severity: 'error',
        });
        return;
    }

    try {
        const response = await fetch(`${apiUrl}/vos/oog/v1/pck/files`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${cookies.authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: selectedRows }),
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
