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
    // 1. target2List - BOX_LEN 기준 내림차순 정렬
    const groupItemList = []; // 최종 그룹 리스트

    // 2. ITM_TP_NM 별로만 그룹핑을 위함(진공이 아니면 일반으로 취급)
    target2List.forEach((item) => {
        if ('진공' != item.ITM_TP_NM) item.ITM_TP_NM = '일반';
    });

    // 3. 그룹핑 시작
    let pckGrpNo = 1;
    for (const item of target2List) {
        let added = false;

        // '진공/일반'을 구분해야 하는지 판단
        const shouldSeparate = item.FR4_CNT > 0 || item.FR2_CNT > 0;

        // 4. 기존 그룹에 추가할 수 있는지 확인
        for (const group of groupItemList) {
            // 현재 그룹에 포함된 아이템들의 BOX_LEN 합계를 계산
            const sum = group.reduce((acc, i) => acc + Number(i.BOX_LEN), 0);

            // 그룹 내 첫 번째 아이템 가져오기
            const firstItem = group[0];

            // 기존 그룹과 합칠 수 있는 조건 확인
            const sameType = shouldSeparate ? firstItem.ITM_TP_NM === item.ITM_TP_NM : true;

            if (sum + Number(item.BOX_LEN) <= REF_LEN) {
                //} && sameType) {
                item.PCK_GRP_NO = firstItem.PCK_GRP_NO; // 기존 그룹의 번호 사용
                group.push(item);
                added = true;
                break;
            }
        }

        // 5. 기존 그룹에 넣을 수 없으면 새 그룹 생성
        if (!added) {
            item.PCK_GRP_NO = pckGrpNo++; // 새로운 그룹 번호 할당
            groupItemList.push([item]);
        }
    }

    // 6. 그룹별 CNTR_TP_CD 설정
    groupItemList.forEach((group, index) => {
        // 그룹 내에서 FR4_CNT가 0보다 큰 항목이 있는지 확인
        const hasFR4 = group.some((item) => Number(item.FR4_CNT) > 0);

        // CNTR_TP_CD 값을 설정
        group.forEach((item) => {
            // item.PCK_GRP_NO = index + 1; // 그룹 번호 설정
            item.CNTR_TP_CD = hasFR4 ? '40FR' : '40DR'; // 조건에 따라 설정
        });
    });

    // 7. 확인 - 결과 출력
    console.log(`기준 길이: ${REF_LEN}`);
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

    return groupItemList;
};

export { calculateCBM, filterListByWeight, filterListByLength, filterListByWidth, filterListByHeight, groupItemListByLength };
