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
        const order = { '40FR': 1, '40HQ': 2, '20DR': 3, '20FR': 4 };

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
    const lastGroupNo = Math.max(...itemList.map((item) => item.PCK_GRP_NO));
    const totalBoxLen = itemList
        .filter((item) => item.PCK_GRP_NO === lastGroupNo)
        .reduce((sum, item) => sum + Number(item.BOX_LEN), 0);
    // 마지막 그룹의 BOX_LEN 합계가 REF_LEN_20보다 작으면 CNTR_TP_CD를 '20DR'로 변경
    if (totalBoxLen <= REF_LEN_20) {
        itemList.forEach((item) => {
            if (item.PCK_GRP_NO === lastGroupNo) {
                if (
                    item.OVER_HGT_YN === 'Y' ||
                    item.OVER_HGT4_YN === 'Y' ||
                    item.OVER_HGT2_YN === 'Y' ||
                    item.OVER_WDT_YN === 'Y'
                ) {
                    item.CNTR_TP_CD = '20FR';
                } else {
                    item.CNTR_TP_CD = '20DR';
                }
            }
        });
    }

    //////////////////////////그룹별 정렬(s)
    // 2. 그룹별 OVER_*_YN 상태를 계산하기 위한 객체 초기화
    const groupStatuses = {};

    // 3. itemList를 순회하며 그룹별 상태 계산
    itemList.forEach((item) => {
        const groupNo = item.PCK_GRP_NO;

        // 해당 그룹 번호가 처음 나타나면 상태 객체 초기화
        if (!groupStatuses[groupNo]) {
            groupStatuses[groupNo] = {
                OVER_GRP_WGT_YN: 'N',
                OVER_GRP_LEN_YN: 'N',
                OVER_GRP_WDT_YN: 'N',
                OVER_GRP_HGT_YN: 'N', // OVER_HGT4_YN 또는 OVER_HGT2_YN 중 하나라도 Y면 Y가 됨
            };
        }

        // 각 항목의 OVER_*_YN 상태를 확인하고 그룹 상태 업데이트
        // 하나라도 'Y'이면 그룹 상태를 'Y'로 설정하고 더 이상 변경하지 않음
        if (item.OVER_WGT_YN === 'Y') {
            groupStatuses[groupNo].OVER_GRP_WGT_YN = 'Y';
        }
        if (item.OVER_LEN_YN === 'Y') {
            groupStatuses[groupNo].OVER_GRP_LEN_YN = 'Y';
        }
        if (item.OVER_WDT_YN === 'Y') {
            groupStatuses[groupNo].OVER_GRP_WDT_YN = 'Y';
        }
        // 높이(HGT)는 OVER_HGT4_YN 또는 OVER_HGT2_YN 중 하나라도 'Y'이면 'Y'
        if (item.OVER_HGT4_YN === 'Y' || item.OVER_HGT2_YN === 'Y') {
            groupStatuses[groupNo].OVER_GRP_HGT_YN = 'Y';
        }
    });

    // 4. itemList를 다시 순회하며 계산된 그룹 상태를 각 항목에 추가
    itemList.forEach((item) => {
        const groupNo = item.PCK_GRP_NO;
        const statuses = groupStatuses[groupNo];

        // 계산된 그룹 상태 속성들을 해당 항목에 추가
        item.OVER_GRP_WGT_YN = statuses.OVER_GRP_WGT_YN;
        item.OVER_GRP_LEN_YN = statuses.OVER_GRP_LEN_YN;
        item.OVER_GRP_WDT_YN = statuses.OVER_GRP_WDT_YN;
        item.OVER_GRP_HGT_YN = statuses.OVER_GRP_HGT_YN;
    });

    // 함수 호출하여 그룹 번호 재할당
    resortAndReassignGroupNumbers(itemList);
    //////////////////////////그룹별 정렬(e)

    return itemList;
};

/**
 * itemList를 그룹별 정렬 기준에 따라 정렬하고,
 * 정렬된 순서에 따라 PCK_GRP_NO를 1부터 순차적으로 재할당합니다.
 * 중요: 이 함수는 itemList 배열 내 객체의 PCK_GRP_NO 값을 직접 수정합니다.
 *       원본 데이터를 유지하려면 함수 호출 전에 배열 복사본을 사용하세요.
 *
 * @param {Array<Object>} itemList - 정렬 및 재할당할 객체들의 배열.
 *                                  각 객체는 최소한 다음 속성을 포함해야 합니다:
 *                                  - PCK_GRP_NO (Number) - 원본 그룹 번호
 *                                  - CNTR_TP_CD (String)
 *                                  - OVER_GRP_WGT_YN (String: 'Y' or 'N')
 *                                  - OVER_GRP_LEN_YN (String: 'Y' or 'N')
 *                                  - OVER_GRP_WDT_YN (String: 'Y' or 'N')
 *                                  - OVER_GRP_HGT_YN (String: 'Y' or 'N')
 */
function resortAndReassignGroupNumbers(itemList) {
    if (!itemList || itemList.length === 0) {
        console.warn('itemList가 비어있거나 유효하지 않습니다.');
        return;
    }

    // --- 정렬 로직에 필요한 헬퍼 함수 및 상수 정의 ---
    const cntrTypeOrder = {
        '40FR': 1,
        '40HQ': 2,
        '20DR': 3,
        '20FR': 4,
    };
    const ynToSortValue = (yn) => (yn === 'Y' ? 0 : 1);
    const allYnToSortValue = (...yns) => (yns.every((yn) => yn === 'Y') ? 0 : 1);

    // 1. 그룹별 정보 추출 (정렬 기준값 포함)
    const groups = new Map();
    itemList.forEach((item) => {
        const groupNo = item.PCK_GRP_NO;
        if (!groups.has(groupNo)) {
            // 각 그룹의 첫 번째 아이템 정보만으로 정렬 기준을 삼을 수 있음
            // (OVER_GRP_*_YN 값은 그룹 내에서 동일하므로)
            groups.set(groupNo, {
                originalGroupNo: groupNo,
                CNTR_TP_CD: item.CNTR_TP_CD,
                OVER_GRP_WGT_YN: item.OVER_GRP_WGT_YN,
                OVER_GRP_LEN_YN: item.OVER_GRP_LEN_YN,
                OVER_GRP_WDT_YN: item.OVER_GRP_WDT_YN,
                OVER_GRP_HGT_YN: item.OVER_GRP_HGT_YN,
            });
        }
    });

    // Map에서 그룹 정보 배열로 변환
    const groupSortInfo = Array.from(groups.values());

    // 2. 그룹 정보 배열 정렬 (사용자 정의 규칙 적용)
    groupSortInfo.sort((a, b) => {
        // --- 1순위: CNTR_TP_CD ---
        const orderA_cntr = cntrTypeOrder[a.CNTR_TP_CD] ?? Infinity;
        const orderB_cntr = cntrTypeOrder[b.CNTR_TP_CD] ?? Infinity;
        if (orderA_cntr !== orderB_cntr) return orderA_cntr - orderB_cntr;

        // --- 2순위: OVER_GRP_WGT_YN (Y 먼저) ---
        const orderA_wgt = ynToSortValue(a.OVER_GRP_WGT_YN);
        const orderB_wgt = ynToSortValue(b.OVER_GRP_WGT_YN);
        if (orderA_wgt !== orderB_wgt) return orderA_wgt - orderB_wgt;

        // --- 3순위: LEN, WDT, HGT 모두 Y ---
        const orderA_all3 = allYnToSortValue(a.OVER_GRP_LEN_YN, a.OVER_GRP_WDT_YN, a.OVER_GRP_HGT_YN);
        const orderB_all3 = allYnToSortValue(b.OVER_GRP_LEN_YN, b.OVER_GRP_WDT_YN, b.OVER_GRP_HGT_YN);
        if (orderA_all3 !== orderB_all3) return orderA_all3 - orderB_all3;

        // --- 4순위: LEN, WDT 모두 Y ---
        const orderA_lenWdt = allYnToSortValue(a.OVER_GRP_LEN_YN, a.OVER_GRP_WDT_YN);
        const orderB_lenWdt = allYnToSortValue(b.OVER_GRP_LEN_YN, b.OVER_GRP_WDT_YN);
        if (orderA_lenWdt !== orderB_lenWdt) return orderA_lenWdt - orderB_lenWdt;

        // --- 5순위: LEN, HGT 모두 Y ---
        const orderA_lenHgt = allYnToSortValue(a.OVER_GRP_LEN_YN, a.OVER_GRP_HGT_YN);
        const orderB_lenHgt = allYnToSortValue(b.OVER_GRP_LEN_YN, b.OVER_GRP_HGT_YN);
        if (orderA_lenHgt !== orderB_lenHgt) return orderA_lenHgt - orderB_lenHgt;

        // --- 6순위: WDT, HGT 모두 Y ---
        const orderA_wdtHgt = allYnToSortValue(a.OVER_GRP_WDT_YN, a.OVER_GRP_HGT_YN);
        const orderB_wdtHgt = allYnToSortValue(b.OVER_GRP_WDT_YN, b.OVER_GRP_HGT_YN);
        if (orderA_wdtHgt !== orderB_wdtHgt) return orderA_wdtHgt - orderB_wdtHgt;

        // --- 7순위: HGT 만 Y ---
        const orderA_hgt = ynToSortValue(a.OVER_GRP_HGT_YN);
        const orderB_hgt = ynToSortValue(b.OVER_GRP_HGT_YN);
        if (orderA_hgt !== orderB_hgt) return orderA_hgt - orderB_hgt;

        // --- 8순위: WDT 만 Y ---
        const orderA_wdt = ynToSortValue(a.OVER_GRP_WDT_YN);
        const orderB_wdt = ynToSortValue(b.OVER_GRP_WDT_YN);
        if (orderA_wdt !== orderB_wdt) return orderA_wdt - orderB_wdt;

        // 모든 조건 동일 시 원본 그룹 번호 순으로 (안정 정렬 유지)
        // 사실상 sort는 불안정(unstable)할 수 있으나, 명시적 조건 없으므로 기본 동작 따름.
        // 안정성이 중요하다면 원본 순서를 기록하고 추가 비교 필요.
        return a.originalGroupNo - b.originalGroupNo; // Fallback sort by original group number
    });

    // 3. 원본 그룹 번호 -> 새 그룹 번호 매핑 생성
    const groupNoMapping = new Map();
    groupSortInfo.forEach((groupInfo, index) => {
        const newGroupNo = index + 1; // 새 그룹 번호는 1부터 시작
        groupNoMapping.set(groupInfo.originalGroupNo, newGroupNo);
    });

    // 4. itemList의 각 항목에 새 그룹 번호 할당
    itemList.forEach((item) => {
        const originalGroupNo = item.PCK_GRP_NO; // 원본 그룹 번호 참조
        if (groupNoMapping.has(originalGroupNo)) {
            item.PCK_GRP_NO = groupNoMapping.get(originalGroupNo); // 새 그룹 번호로 업데이트
        } else {
            // 이 경우는 발생하면 안 되지만, 방어적 코딩
            console.error(`매핑 오류: 원본 그룹 번호 ${originalGroupNo}에 대한 새 그룹 번호를 찾을 수 없습니다.`);
        }
    });

    // 선택사항: itemList 자체를 새 그룹 번호 순으로 다시 정렬 (필요한 경우)
    itemList.sort((a, b) => a.PCK_GRP_NO - b.PCK_GRP_NO);
}

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
