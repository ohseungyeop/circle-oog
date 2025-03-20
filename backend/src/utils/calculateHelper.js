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
 * @param {number} REF_LEN_40 - 40FT 기준 길이
 * @param {number} REF_LEN_20 - 20FT 기준 길이
 * @returns
 */
const groupItemListByLength = (target2List, REF_LEN_40, REF_LEN_20) => {
    const groupItemList = []; // 최종 그룹 리스트

    // 1. 그룹핑 시작
    let pckGrpNo = 1;
    for (const item of target2List) {
        // ITM_TP_NM이 '진공'이 아니면 '일반'으로 설정
        item.ITM_TP_NM = item.ITM_TP_NM === '진공' ? '진공' : '일반';

        let added = false;
        const itemBoxLen = Number(item.BOX_LEN);

        // 2. 기존 그룹에 추가할 수 있는지 확인
        for (const group of groupItemList) {
            const sum = group.reduce((acc, i) => acc + Number(i.BOX_LEN), 0);
            const firstItem = group[0];

            if (sum + itemBoxLen <= REF_LEN_40) {
                item.PCK_GRP_NO = firstItem.PCK_GRP_NO; // 기존 그룹의 번호 사용
                group.push(item);
                added = true;
                break;
            }
        }

        // 3. 기존 그룹에 넣을 수 없으면 새 그룹 생성
        if (!added) {
            item.PCK_GRP_NO = pckGrpNo++; // 새로운 그룹 번호 할당
            groupItemList.push([item]);
        }
    }

    // 4. 그룹별 CNTR_TP_CD 설정 (그룹당 하나의 CNTR_TP_CD)
    groupItemList.forEach((group, groupIndex) => {
        const hasFR4 = group.some((item) => Number(item.FR4_CNT) > 0);
        const defaultCNTR_TP_CD = hasFR4 ? '40FR' : '40HQ';

        // 마지막 그룹인지 확인
        const isLastGroup = groupIndex === groupItemList.length - 1;

        group.forEach((item) => {
            item.CNTR_TP_CD = defaultCNTR_TP_CD;
        });

        // 마지막 그룹인 경우 REF_LEN_20 기준으로 마지막 아이템만 변경
        if (isLastGroup) {
            const lastItem = group[group.length - 1];
            if (Number(lastItem.BOX_LEN) <= REF_LEN_20) {
                lastItem.CNTR_TP_CD = '20DR';
            }
        }
    });

    // 6. 결과 확인
    /*
    console.log(`기준 길이: ${REF_LEN_40}`);
    console.log(`총 그룹 개수: ${groupItemList.length}`);
    groupItemList.forEach((group, index) => {
        console.log(
            `그룹 ${index + 1}: `,
            group.map(
                (i) =>
                    '[' +
                    i.PCK_NO +
                    '] ' +
                    Number(i.BOX_LEN) +
                    (Number(i.FR4_CNT) > 0 ? '(FR4:' + i.FR4_CNT + ')' : '') +
                    // (Number(i.FR2_CNT) > 0 ? '(FR2:' + i.FR2_CNT + ')' : '') +
                    '(' +
                    i.ITM_TP_NM +
                    ')',
            ),
        );
    });
    */

    return groupItemList;
};

const regroupItems = (items) => {
    // Step 1: CNTR_TP_CD 기준 정렬 (40FR → 40HQ → 20DR)
    items.sort((a, b) => {
        const order = { '40FR': 1, '40HQ': 2, '20DR': 3 };
        return order[a.CNTR_TP_CD] - order[b.CNTR_TP_CD];
    });

    // Step 2: PCK_GRP_NO를 순차적으로 재할당
    let newGroupNo = 1;
    let lastType = null;
    let groupMapping = {};

    items.forEach((item, index) => {
        // 기존 그룹이 새 그룹 번호를 유지하도록 매핑
        if (!(item.PCK_GRP_NO in groupMapping)) {
            groupMapping[item.PCK_GRP_NO] = newGroupNo;
            newGroupNo++;
        }

        // 재할당된 그룹 번호 적용
        item.PCK_GRP_NO = groupMapping[item.PCK_GRP_NO];

        // 현재 컨테이너 타입 저장
        lastType = item.CNTR_TP_CD;
    });

    return items;
};

export {
    calculateCBM,
    filterListByWeight,
    filterListByLength,
    filterListByWidth,
    filterListByHeight,
    groupItemListByLength,
    regroupItems,
};
