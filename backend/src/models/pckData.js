// models/pckData.js
// PckRaw 인터페이스
/**
 * @typedef {object} PckRaw
 * @property {number} pckOrdSeq
 * @property {number} pckItmSeq
 * @property {number} pckNo
 * @property {string} itmNm
 * @property {number} pckLen
 * @property {number} pckWdt
 * @property {number} pckHgt
 * @property {number} pckQty
 * @property {number} pckWgt
 * @property {number} pckCbm
 * @property {string} pckRmk
 */

/**
 * @typedef {object} PckStep1
 * @property {number} pckOrdSeq
 * @property {number} pckItmSeq
 * @property {number} pckNo
 * @property {string} itmNm
 * @property {number} pckLen
 * @property {number} pckWdt
 * @property {number} pckHgt
 * @property {number} pckQty
 * @property {number} pckWgt
 * @property {number} pckCbm
 * @property {string} pckRmk
 * @property {string} category1 // 추가된 항목 (예시)
 * @property {string} category2 // 추가된 항목 (예시)
 */

/**
 * 조회된 데이터를 PckRaw 모델로 변환하는 함수
 * @param {object} data
 * @returns {PckRaw}
 */
function getDb2Raw(data) {
    return {
        pckOrdSeq: data.PCK_ORD_SEQ ? parseFloat(data.PCK_ORD_SEQ) : 0,
        pckItmSeq: data.PCK_ITM_SEQ ? parseFloat(data.PCK_ITM_SEQ) : 0,
        pckNo: data.PCK_NO ? parseFloat(data.PCK_NO) : 0,
        itmNm: data.ITM_NM || '',
        pckLen: data.PCK_LEN ? parseFloat(data.PCK_LEN) : 0,
        pckWdt: data.PCK_WDT ? parseFloat(data.PCK_WDT) : 0,
        pckHgt: data.PCK_HGT ? parseFloat(data.PCK_HGT) : 0,
        pckQty: data.PCK_QTY ? parseFloat(data.PCK_QTY) : 0,
        pckWgt: data.PCK_WGT ? parseFloat(data.PCK_WGT) : 0,
        pckCbm: data.PCK_CBM ? parseFloat(data.PCK_CBM) : 0,
        pckRmk: data.PCK_RMK || '',
    };
}

/**
 * 추가 가공을 수행하는 함수 (예: 분류 추가)
 * @param {PckRaw} data
 * @returns {PckStep1}
 */
function getRaw2Step1(data) {
    return {
        ...data,
        category1: data.pckWgt > 2000 ? 'Heavy' : 'Light',
        category2: data.pckHgt > 1000 ? 'Tall' : 'Short',
    };
}

module.exports = { getDb2Raw, getRaw2Step1 };
