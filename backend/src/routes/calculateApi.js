import replyHelper from '../utils/replyHelper.js';
import authMiddleware from '../utils/authMiddleware.js';
import {
    calculateCBM,
    filterListByWeight,
    filterListByLength,
    filterListByWidth,
    filterListByHeight,
    checkListByWidth,
    checkListByHeight,
    groupItemListByLength,
    regroupItemList,
} from '../utils/calculateHelper.js';

const CRR_CD = 'VOS';
const REF_CNTR_TPSZ = ['D2', '4H'];
const HARD_WGT_40 = 40000; //(kg) → 40t
const HARD_WGT_60 = 60000; //(kg) → 60t
const HARD_WGT_25 = 25000; //(kg) → 25t
let REF_LEN_40 = 0;
let REF_LEN_20 = 0;
let REF_WDT_40 = 0;
let REF_HGT_40 = 0;
let REF_HGT_20 = 0;
let REF_LEN_40_PCTG = 0;
let REF_LEN_20_PCTG = 0;
let REF_WDT_40_PCTG = 0;
let REF_HGT_40_PCTG = 0;
let step1List;
let step1Tail;
let step2List;
let step2Tail;
let step3List;
let step3Tail;
let step4List;
let step4Tail;
let step5List;
let step5Tail;
let step6List;
let step6Tail;
let step7List;
let step8List;
let step8Tail;
let step9List;

const calculate = async (fastify, options) => {
    fastify.post(
        '/',
        {
            preHandler: [authMiddleware],
        },
        replyHelper(async (request, reply) => {
            const { pckOrdSeq } = request.params;
            let step1ItemList;
            let step2ItemList;
            //트랜젝션을 step별로 분리함
            try {
                console.log('📦 Packing order sequence:', pckOrdSeq);

                // 1️⃣ 무게와 부피로 Flatrack 판별
                await fastify.knex.transaction(async (trx) => {
                    step1ItemList = await processStep1(fastify, trx, pckOrdSeq);
                });

                // 2️⃣ Length 확인 (무게에 의한 FR과 기준 길이 초과 건 제외 후 그룹핑)
                await fastify.knex.transaction(async (trx) => {
                    step2ItemList = await processStep2(trx, pckOrdSeq, step1ItemList);
                });

                // 3️⃣ 최종 OOG 데이터(VOS_OOG_CLP) 결과 저장
                await fastify.knex.transaction(async (trx) => {
                    await processStep3(trx, pckOrdSeq);
                });

                const clpList = await fastify.knex('VOS_OOG_CLP').where({ PCK_ORD_SEQ: pckOrdSeq }).select('*');

                return clpList; // ✅ `reply.send()` 호출 X (replyHelper가 처리)
            } catch (error) {
                console.error('❌ Error fetching item list:', error);
                throw error; // 🚨 `replyHelper`가 오류 처리하도록 예외 던지기
            }
        }),
    );
};

const processStep1 = async (fastify, trx, pckOrdSeq) => {
    // 0️⃣ 컨테이너 기준(Dry) 정보 조회
    console.log('------------------------------');
    console.log('0️⃣ 컨테이너 기준(Dry) 정보 조회');
    const cntrInfo = await fastify
        .knex('VOS_OOG_CNTR_MST')
        .where({ CRR_CD: CRR_CD })
        .whereIn('CNTR_TPSZ_CD', REF_CNTR_TPSZ)
        .select('*');

    const d2Row = cntrInfo.find((row) => row.CNTR_TPSZ_CD === REF_CNTR_TPSZ[0]);
    const d4Row = cntrInfo.find((row) => row.CNTR_TPSZ_CD === REF_CNTR_TPSZ[1]);

    REF_LEN_40 = d4Row.CNTR_LEN ?? 11300; //11.3m
    REF_LEN_20 = d2Row.CNTR_LEN ?? 5898; //5.898m
    REF_WDT_40 = d4Row.CNTR_WDT ?? 2438; //2.438m
    REF_HGT_40 = d4Row.CNTR_HGT ?? 1955; //1.955m
    REF_HGT_20 = d2Row.CNTR_HGT ?? 2233; //2.233m
    REF_LEN_40_PCTG = d4Row.CNTR_LEN_PCTG / 100 ?? 0.95; //95%
    REF_LEN_20_PCTG = d2Row.CNTR_LEN_PCTG / 100 ?? 0.85; //85%
    REF_WDT_40_PCTG = d4Row.CNTR_WDT_PCTG / 100 ?? 1; //100%
    REF_HGT_40_PCTG = d4Row.CNTR_HGT_PCTG / 100 ?? 1; //100%
    console.log('--길이 기준:', REF_LEN_40);
    console.log('--폭 기준:', REF_WDT_40);
    console.log('--40높이 기준:', REF_HGT_40);
    console.log('--20높이 기준:', REF_HGT_20);
    console.log('--길이 퍼센티지 기준:', REF_LEN_40_PCTG);

    // 1️⃣ VOS_OOG_UPLD_DTL 조회
    console.log('------------------------------');
    console.log('1️⃣ VOS_OOG_UPLD_DTL 조회');
    const sourceList = await fastify.knex('VOS_OOG_UPLD_DTL').where({ PCK_ORD_SEQ: pckOrdSeq }).select('*');
    console.log('소스 item size:', sourceList.length);

    // 2️⃣ QTY만큼 해당 item 복제
    console.log('------------------------------');
    console.log('2️⃣ QTY만큼 해당 item 복제');
    const targetList = sourceList.flatMap((row) =>
        Array(row.ITM_QTY)
            .fill()
            .map(() => ({ ...row, ITM_QTY: 1 })),
    );
    console.log('대상 item size:', targetList.length);

    // 3️⃣ G/W 체크
    console.log('------------------------------');
    console.log('3️⃣ G/W 체크');
    step1List = filterListByWeight(targetList, HARD_WGT_40); //40t 초과
    step1Tail = targetList.filter((item) => !step1List.includes(item)); //allList - step1List(Length 체크 대상)
    step2List = filterListByWeight(step1List, HARD_WGT_60); //60t 초과
    step2Tail = step1List.filter((item) => !step2List.includes(item)); //step1List - step2List(✅40FR 2대)
    console.log('무게 40t 초과 item size:', step1List.length);
    console.log('무게 60t 초과 item size:', step2List.length);

    // 4️⃣ Width 2.438M 초과 체크
    console.log('------------------------------');
    console.log('4️⃣ Width 2.438M 초과 체크');
    step3List = filterListByWidth(step2List, REF_WDT_40); //2.438m 초과(✅Width / 2.438m = 40FR갯수)
    step3Tail = step2List.filter((item) => !step3List.includes(item)); //step2List - step3List(✅40FR 2대)
    console.log('폭 2.438m 초과 item size:', step3List.length);
    console.log('무게 60t, 폭 2.438m 초과 item size:', step3Tail.length);

    // 5️⃣ Length 체크
    console.log('------------------------------');
    console.log('5️⃣ Length 체크');
    console.log('Length 체크 대상 item size:', step1Tail.length);
    step4List = filterListByLength(step1Tail, REF_LEN_40); //11.3m 초과(✅Length / 2.438m = 40FR갯수)
    step4Tail = step1Tail.filter((item) => !step4List.includes(item)); //step1Tail - step4List
    step5List = filterListByLength(step1Tail, REF_LEN_40 * REF_LEN_40_PCTG); //11.3m * 85% 초과(✅40FR 1대)
    step5Tail = step4Tail.filter((item) => !step5List.includes(item)); //step4Tail - step5List(G/W 체크 대상)

    // 6️⃣ 두번째 G/W 체크
    console.log('------------------------------');
    console.log('6️⃣ 두번째 G/W 체크');
    step6List = filterListByWeight(step5Tail, HARD_WGT_25); //25t 초과(✅40FR 1대)
    step6Tail = step5Tail.filter((item) => !step6List.includes(item)); //step5Tail - step6List(OW 체크 대상)

    // 7️⃣ 장축(OW) 화물 추출 (2.438M 초과)
    console.log('------------------------------');
    console.log('7️⃣ 장축(OW) 화물 추출 (2.438M 초과)');
    step7List = filterListByWidth(step6Tail, REF_WDT_40); //2.438m 초과(✅OW)

    // 8️⃣ 장고(OH) 화물 추출 (1.955M/20FR, 2.233M/40FR)
    console.log('------------------------------');
    console.log('8️⃣ 장고(OH) 화물 추출 (1.955M/20FR, 2.233M/40FR)');
    step8List = filterListByHeight(step6Tail, REF_HGT_40); //1.955m 초과(✅OH)
    step8Tail = step6Tail.filter((item) => !step8List.includes(item)); //step5Tail - step6List(OW 체크 대상)
    step9List = filterListByHeight(step8Tail, REF_HGT_20); //2.233m 초과(✅OH)

    // 9️⃣ STEP1 결과 컬럼 데이터 추가
    console.log('------------------------------');
    console.log('9️⃣ STEP1 결과 컬럼 데이터 추가');
    const step1ItemList = await Promise.all(
        targetList.map(async (item) => {
            return {
                ...item,
                OVER_40T_YN: step1List.includes(item) ? 'Y' : 'N',
                OVER_60T_YN: step2List.includes(item) ? 'Y' : 'N',
                OVER_25T_YN: step6List.includes(item) ? 'Y' : 'N',
                OVER_WDT_YN: step3List.includes(item) ? 'Y' : 'N',
                OVER_LEN_YN: step4List.includes(item) || step7List.includes(item) ? 'Y' : 'N',
                OVER_HGT4_YN: step8List.includes(item) ? 'Y' : 'N',
                OVER_HGT2_YN: step9List.includes(item) ? 'Y' : 'N',
                FR4_CNT:
                    step2Tail.includes(item) || step3Tail.includes(item)
                        ? 2
                        : step3List.includes(item)
                        ? Math.floor(item.BOX_WDT / REF_WDT_40)
                        : step4List.includes(item)
                        ? Math.floor(item.BOX_LEN / REF_WDT_40)
                        : step5List.includes(item) ||
                          step6List.includes(item) ||
                          step7List.includes(item) ||
                          step8List.includes(item)
                        ? 1
                        : 0,
                FR2_CNT: step9List.includes(item) ? 1 : 0,
                CALC_CBM: calculateCBM(item.BOX_LEN, item.BOX_WDT, item.BOX_HGT),
            };
        }),
    );

    // 1️⃣0️⃣ 기존 데이터 삭제 후 step1 저장
    await trx('vos_oog_calc_step1').where('PCK_ORD_SEQ', pckOrdSeq).del();
    await trx('vos_oog_calc_step1').insert(step1ItemList);

    return step1ItemList;
};

const processStep2 = async (trx, pckOrdSeq, step1ItemList) => {
    const step2Set = new Set(step2List.map((item) => item.PCK_NO)); //무게 60t 초과 건
    const step6Set = new Set(step6List.map((item) => item.PCK_NO)); //무게 25t 초과 건
    const step4Set = new Set(step4List.map((item) => item.PCK_NO)); //길이 기준 초과 건

    // 1️⃣ 대상 제외 후 길이로 내림차순 정렬
    const target2List = step1ItemList
        .filter((item) => !step2Set.has(item.PCK_NO) && !step6Set.has(item.PCK_NO) && !step4Set.has(item.PCK_NO))
        .sort((a, b) => b.BOX_LEN - a.BOX_LEN);

    // 2️⃣ 그룹핑된 데이터를 단일 배열로 변환
    const groupItemList = groupItemListByLength(target2List, REF_LEN_40 * REF_LEN_40_PCTG, REF_LEN_20 * REF_LEN_20_PCTG);
    const flattenedGroupItemList = groupItemList.flat(); // 그룹 리스트를 하나의 배열로 변환

    // 3️⃣ 무게와 길이로 제외되었던 step2, step6, step4 항목들을 다시 합침(합치면서 CNTR_TP_CD와 PCK_GRP_NO속성을 추가함)
    let maxPckGrpNo = Math.max(0, ...flattenedGroupItemList.map((item) => item.PCK_GRP_NO || 0));
    const step2AndOverList = [
        ...flattenedGroupItemList,
        ...step1ItemList.reduce((acc, item) => {
            if (step2Set.has(item.PCK_NO) || step6Set.has(item.PCK_NO) || step4Set.has(item.PCK_NO)) {
                acc.push({ ...item, CNTR_TP_CD: '40FR', PCK_GRP_NO: ++maxPckGrpNo });
            }
            return acc;
        }, []),
    ];

    // 4️⃣ OW, OH 점검 매핑
    checkListByWidth(step2AndOverList, REF_WDT_40 * REF_WDT_40_PCTG);
    checkListByHeight(step2AndOverList, REF_HGT_40 * REF_HGT_40_PCTG);

    // 5️⃣ 정렬 및그룹 번호 재지정
    const step2ItemList = regroupItemList(step2AndOverList);

    // 6️⃣ 기존 데이터 삭제 후 step2 저장
    await trx('vos_oog_calc_step2').where('PCK_ORD_SEQ', pckOrdSeq).del();
    await trx('vos_oog_calc_step2').insert(step2AndOverList);

    return step2ItemList;
};

const processStep3 = async (trx, pckOrdSeq) => {
    await trx('vos_oog_clp').where('PCK_ORD_SEQ', pckOrdSeq).del();
    await trx.raw(`
        INSERT INTO VOS_OOG_CLP(
            PCK_ORD_SEQ
            , CLP_NO
            , BOX_NO
            , ITEM
            , MC_LEN
            , MC_WDT
            , MC_HGT
            , BOX_LEN
            , BOX_WDT
            , BOX_HGT
            , QTY
            , CBM
            , TYPE
            , NW
            , GW
            , REMARKS
            , TPSZ
            , OVER_WDT_YN
            , OVER_HGT_YN)
        SELECT ${pckOrdSeq} as pck_ord_seq
            , pck_grp_no as clp_no
            , pck_no as box_no
            , itm_nm as item
            , itm_len as mc_len
            , itm_wdt as mc_wdt
            , itm_hgt as mc_hgt
            , box_len
            , box_wdt
            , box_hgt
            , itm_qty as qty
            , calc_cbm as cbm
            , itm_tp_nm as type
            , net_wgt as nw
            , grs_wgt as gw
            , rmks as remarks
            , CASE
                WHEN '40FR' = cntr_tp_cd THEN '40''FR'
                WHEN '40HQ' = cntr_tp_cd THEN '40''HQ'
                WHEN '20DR' = cntr_tp_cd THEN '20''DR'
            END as tpsz
            , over_wdt_yn
            , over_hgt4_yn
        FROM vos_oog_calc_step2
        WHERE pck_ord_seq = ${pckOrdSeq}

        UNION ALL

        SELECT ${pckOrdSeq} as pck_ord_seq
            , pck_grp_no
            , NULL
            , 'SUM' as itm_nm
            , NULL, NULL, NULL
            , SUM(box_len) as box_len
            , MAX(box_wdt) as box_wdt
            , MAX(box_hgt) as box_hgt
            , SUM(itm_qty) as itm_qty
            , SUM(calc_cbm) as calc_cbm
            , NULL
            , SUM(net_wgt) as net_wgt
            , SUM(grs_wgt) as grs_wgt
            , NULL, NULL, NULL, NULL
        FROM vos_oog_calc_step2
        WHERE pck_ord_seq = ${pckOrdSeq}
        GROUP BY pck_grp_no

        ORDER BY clp_no, 
            CASE WHEN item = 'SUM' THEN 1 ELSE 0 END;
    `);
};

export default calculate;
