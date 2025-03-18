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

/**
 * 길이로 내림차순 정렬하고 기준길이에 넘지 않게 그룹핑 한다.
 * "First-Fit Decreasing(FFD)" 또는 "Best-Fit" 알고리즘
 * @param {Array} target2List - 무게와 길이 초과건을 제외한 대상 아이템
 * @param {number} REF_LEN - 기준 길이
 * @returns
 */
const groupItemListByLength = (target2List, REF_LEN) => {
    // 1. BOX_LEN 기준 내림차순 정렬
    const groups = []; // 최종 그룹 리스트

    target2List.forEach((item) => {
        if ('진공' != item.ITM_TP_NM) item.ITM_TP_NM = '일반';
    });

    // 2. 그룹핑 시작
    for (const item of target2List) {
        let added = false;

        // 3. 기존 그룹에 추가할 수 있는지 확인
        for (const group of groups) {
            const sum = group.reduce((acc, i) => acc + Number(i.BOX_LEN), 0);
            if (sum + Number(item.BOX_LEN) <= REF_LEN && group[0].ITM_TP_NM === item.ITM_TP_NM) {
                group.push(item);
                added = true;
                break;
            }
        }

        // 4. 기존 그룹에 넣을 수 없으면 새 그룹 생성
        if (!added) {
            groups.push([item]);
        }
    }

    // 5. 결과 출력
    console.log(`기준 길이: ${REF_LEN}`);
    console.log(`총 그룹 개수: ${groups.length}`);
    groups.forEach((group, index) => {
        console.log(
            `그룹 ${index + 1}: `,
            group.map(
                (i) =>
                    '[' +
                    i.PCK_NO +
                    ']' +
                    Number(i.BOX_LEN) +
                    (Number(i.FR4_CNT) > 0 ? '(FR4:' + i.FR4_CNT + ')' : '') +
                    (Number(i.FR2_CNT) > 0 ? '(FR2:' + i.FR2_CNT + ')' : ''),
            ),
        );
    });

    return groups;
};

export { calculateCBM, filterListByWeight, filterListByLength, filterListByWidth, filterListByHeight, groupItemListByLength };
