const estimateBoxSize = async (lwhTpCd, lwhValue) => {
    const estmBxSz = await fastify
        .knex('VOS_OOG_ESTM_BX_SZ')
        .where({ LEN_WDT_TY_CD: lwhTpCd })
        .whereBetween(lwhValue, ['PCK_FM_NUM', 'PCK_TO_NUM'])
        .select('PCK_BX_NUM');
    return estmBxSz;
};

const calculateCBM = (length, width, height) => {
    return (length * width * height) / 1000000;
};

/**
 * PCK_WGT가 특정 값을 초과하는 아이템만 추출하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 PCK_WGT 값
 * @returns {Array} - PCK_WGT가 threshold를 초과하는 아이템들
 */
const filterListByWeight = (itemList, threshold) => {
    return itemList.filter((item) => parseFloat(item.PCK_WGT) > threshold);
};

/**
 * PCK_LEN가 특정 값을 초과하는 아이템만 추출하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 PCK_LEN 값
 * @returns {Array} - PCK_LEN가 threshold를 초과하는 아이템들
 */
const filterListByLength = (itemList, threshold) => {
    return itemList.filter((item) => parseFloat(item.PCK_LEN) > threshold);
};

/**
 * PCK_WDT가 특정 값을 초과하는 아이템만 추출하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 PCK_WDT 값
 * @returns {Array} - PCK_WDT가 threshold를 초과하는 아이템들
 */
const filterListByWidth = (itemList, threshold) => {
    return itemList.filter((item) => parseFloat(item.PCK_WDT) > threshold);
};

/**
 * PCK_HGT가 특정 값을 초과하는 아이템만 추출하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 PCK_HGT 값
 * @returns {Array} - PCK_HGT가 threshold를 초과하는 아이템들
 */
const filterListByHeight = (itemList, threshold) => {
    return itemList.filter((item) => parseFloat(item.PCK_HGT) > threshold);
};

export { calculateCBM, filterListByWeight, filterListByLength, filterListByWidth, filterListByHeight };
