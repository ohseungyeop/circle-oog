// const estimateBoxSize = async (fastify, lwhTpCd, lwhValue) => {
//     const estmBxSz = await fastify
//         .knex('VOS_OOG_ESTM_BX_SZ')
//         .where({ LEN_WDT_TY_CD: lwhTpCd })
//         .andWhere('PCK_FM_NUM', '<=', lwhValue)
//         .andWhere('PCK_TO_NUM', '>=', lwhValue)
//         .select('PCK_BX_NUM')
//         .limit(1);
//     if (estmBxSz.length > 0) {
//         return estmBxSz[0].PCK_BX_NUM;
//     } else {
//         return null;
//     }
// };

const calculateCBM = (length, width, height) => {
    return (length * width * height) / 1000000000;
};

/**
 * GRS_WGT가 특정 값을 초과하는 아이템만 추출하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 GRS_WGT 값
 * @returns {Array} - GRS_WGT가 threshold를 초과하는 아이템들
 */
const filterListByWeight = (itemList, threshold) => {
    return itemList.filter((item) => parseFloat(item.GRS_WGT) > threshold);
};

/**
 * BOX_LEN가 특정 값을 초과하는 아이템만 추출하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 BOX_LEN 값
 * @returns {Array} - BOX_LEN가 threshold를 초과하는 아이템들
 */
const filterListByLength = (itemList, threshold) => {
    return itemList.filter((item) => parseFloat(item.BOX_LEN) > threshold);
};

/**
 * BOX_WDT가 특정 값을 초과하는 아이템만 추출하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 BOX_WDT 값
 * @returns {Array} - BOX_WDT가 threshold를 초과하는 아이템들
 */
const filterListByWidth = (itemList, threshold) => {
    return itemList.filter((item) => parseFloat(item.BOX_WDT) > threshold);
};

/**
 * BOX_HGT가 특정 값을 초과하는 아이템만 추출하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 BOX_HGT 값
 * @returns {Array} - BOX_HGT가 threshold를 초과하는 아이템들
 */
const filterListByHeight = (itemList, threshold) => {
    return itemList.filter((item) => parseFloat(item.BOX_HGT) > threshold);
};

export { calculateCBM, filterListByWeight, filterListByLength, filterListByWidth, filterListByHeight };
