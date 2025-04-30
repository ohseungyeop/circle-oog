const calculateBoxSize = (sourceList) => {
    return sourceList.map((item) => {
        const { ITM_LEN, ITM_WDT, ITM_HGT, BOX_LEN, BOX_WDT, BOX_HGT } = item;

        // 조건: BOX_* 값이 0이거나 null이거나 빈 문자열인 경우
        const isBoxLenInvalid = !BOX_LEN || BOX_LEN === 0;
        const isBoxWdtInvalid = !BOX_WDT || BOX_WDT === 0;
        const isBoxHgtInvalid = !BOX_HGT || BOX_HGT === 0;

        let additionalHeight = 0;
        const hgtFactor = (ITM_HGT * 40) / 1000;
        if (hgtFactor <= 10) {
            additionalHeight = 30;
        } else if (hgtFactor <= 20) {
            additionalHeight = 25;
        } else if (hgtFactor <= 30) {
            additionalHeight = 20;
        } else {
            additionalHeight = 10;
        }

        return {
            ...item,
            BOX_LEN: isBoxLenInvalid ? ITM_LEN + 30 : BOX_LEN,
            BOX_WDT: isBoxWdtInvalid ? ITM_WDT + 30 : BOX_WDT,
            BOX_HGT: isBoxHgtInvalid ? ITM_HGT + additionalHeight : BOX_HGT,
        };
    });
};

const calculateCBM = (sourceList) => {
    return sourceList.map(async (item) => {
        const len = item.BOX_LEN && item.BOX_LEN !== 0 ? item.BOX_LEN : item.ITM_LEN;
        const wdt = item.BOX_WDT && item.BOX_WDT !== 0 ? item.BOX_WDT : item.ITM_WDT;
        const hgt = item.BOX_HGT && item.BOX_HGT !== 0 ? item.BOX_HGT : item.ITM_HGT;
        return {
            ...item,
            CALC_CBM: (len * wdt * hgt) / 1000000000,
        };
    });
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
 * BOX_WGT가 초과하는 아이템에 속성 추가하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @returns {Array} - 조건에 맞는 항목에 속성 추가된 전체 아이템 리스트
 */
const checkListByWeight = (itemList) => {
    return itemList.map((item) => {
        item.OVER_WGT_YN = 'Y' === item.OVER_40T_YN || 'Y' === item.OVER_60T_YN || 'Y' === item.OVER_25T_YN ? 'Y' : 'N';
        return item;
    });
};

/**
 * BOX_LEN가 특정 값을 초과하는 아이템에 속성 추가하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 BOX_LEN 값
 * @returns {Array} - 조건에 맞는 항목에 속성 추가된 전체 아이템 리스트
 */
const checkListByLength = (itemList, threshold) => {
    return itemList.map((item) => {
        item.OVER_LEN_YN = parseFloat(item.BOX_LEN) > threshold ? 'Y' : 'N';
        return item;
    });
};

/**
 * BOX_WDT가 특정 값을 초과하는 아이템에 속성 추가하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 BOX_WDT 값
 * @returns {Array} - 조건에 맞는 항목에 속성 추가된 전체 아이템 리스트
 */
const checkListByWidth = (itemList, threshold) => {
    return itemList.map((item) => {
        item.OVER_WDT_YN = parseFloat(item.BOX_WDT) > threshold ? 'Y' : 'N';
        return item;
    });
};

/**
 * BOX_HGT가 특정 값을 초과하는 아이템에 속성 추가하는 함수
 * @param {Array} itemList - 아이템 리스트
 * @param {number} threshold - 초과해야 할 BOX_HGT 값
 * @returns {Array} - 조건에 맞는 항목에 속성 추가된 전체 아이템 리스트
 */
const checkListByHeight = (itemList, threshold) => {
    return itemList.map((item) => {
        item.OVER_HGT4_YN = parseFloat(item.BOX_HGT) > threshold ? 'Y' : 'N';
        // item.OVER_HGT4_YN = item.OVER_HGT_YN;
        return item;
    });
};

/**
 * 길이로 내림차순 정렬하고 기준길이에 넘지 않게 그룹핑 한다.
 * "First-Fit Decreasing(FFD)" 또는 "Best-Fit" 알고리즘
 * @param {Array} target2List - 무게와 길이 초과건을 제외한 대상 아이템
 * @param {number} REF_LEN_40 - 40FT 기준 길이
 * @returns
 */
const groupItemListByLength = (target2List, REF_LEN_40) => {
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
    });

    // 6. 결과 확인
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

    return groupItemList;
};

const regroupItemList = (itemList, REF_LEN_20) => {
    // Step 1: CNTR_TP_CD 기준 정렬 (40FR(Weight→OLWH→OL→OWH→OH→OW) → 40HQ → 20DR)
    itemList.sort((a, b) => {
        const order = { '40FR': 1, '40HQ': 2, '20DR': 3 };

        // 1. CNTR_TP_CD 기준으로 먼저 정렬
        const cntrTpCdComparison = order[a.CNTR_TP_CD] - order[b.CNTR_TP_CD];

        // CNTR_TP_CD가 다르면, 그 기준으로 먼저 정렬
        if (cntrTpCdComparison !== 0) {
            return cntrTpCdComparison;
        }

        // 2. CNTR_TP_CD가 동일한 경우, OVER_WGT_YN, OVER_LEN_YN, OVER_WDT_YN, OVER_HGT_YN 기준으로 우선순위 정렬
        // 40FR에 대해서만 추가 정렬 기준 적용
        if (a.CNTR_TP_CD === '40FR' && b.CNTR_TP_CD === '40FR') {
            // 우선순위 계산:
            // 1순위: OVER_WGT_YN (무게)
            // 2순위: OVER_LEN_YN (길이)
            // 3순위: OVER_WDT_YN (폭)
            // 4순위: OVER_HGT_YN (높이)
            const aPriority =
                (a.OVER_WGT_YN === 'Y' ? 204 : 0) +
                (a.OVER_LEN_YN === 'Y' ? 23 : 0) +
                (a.OVER_WDT_YN === 'Y' ? 2 : 0) +
                (a.OVER_HGT_YN === 'Y' ? 1 : 0);
            const bPriority =
                (b.OVER_WGT_YN === 'Y' ? 204 : 0) +
                (b.OVER_LEN_YN === 'Y' ? 23 : 0) +
                (b.OVER_WDT_YN === 'Y' ? 2 : 0) +
                (b.OVER_HGT_YN === 'Y' ? 1 : 0);
            return bPriority - aPriority; // 우선순위가 높은 값이 먼저 오도록 내림차순 정렬
        }

        return 0; // CNTR_TP_CD가 동일하면 순서 그대로 유지
    });

    // Step 2: PCK_GRP_NO를 순차적으로 재할당
    let newGroupNo = 1;
    let lastType = null;
    let groupMapping = {};

    itemList.forEach((item, index) => {
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

// 20DR을 위한 추가 로직(일단 킵)
// 마지막 그룹의 BOX_LEN 합계 계산
    const lastGroupNo = Math.max(...itemList.map(item => item.PCK_GRP_NO));
    const totalBoxLen = itemList.filter(item => item.PCK_GRP_NO === lastGroupNo)
        .reduce((sum, item) => sum + Number(item.BOX_LEN), 0);
console.log("totalBoxLen", totalBoxLen);
console.log("REF_LEN_20", REF_LEN_20);
console.log("lastGroupNo", lastGroupNo);
    // 마지막 그룹의 BOX_LEN 합계가 REF_LEN_20보다 작으면 CNTR_TP_CD를 '20DR'로 변경
    if (totalBoxLen <= REF_LEN_20) {
        itemList.forEach(item => {
            if (item.PCK_GRP_NO === lastGroupNo) {
                item.CNTR_TP_CD = '20DR';
            }
        });
    }

    return itemList;
};

export {
    calculateBoxSize,
    calculateCBM,
    filterListByWeight,
    filterListByLength,
    filterListByWidth,
    filterListByHeight,
    checkListByWeight,
    checkListByLength,
    checkListByWidth,
    checkListByHeight,
    groupItemListByLength,
    regroupItemList,
};
