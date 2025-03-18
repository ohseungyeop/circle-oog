import replyHelper from '../utils/replyHelper.js';
import authMiddleware from '../utils/authMiddleware.js';
import { getDb2Raw, getRaw2Step1 } from '../models/pckData.js';
import {
    calculateCBM,
    filterListByWeight,
    filterListByLength,
    filterListByWidth,
    filterListByHeight,
} from '../utils/calculateHelper.js';

const CRR_CD = 'VOS';
const REF_CNTR_TPSZ = ['D2', '4H'];
const HARD_WGT_40 = 40000; //(kg) → 40t
const HARD_WGT_60 = 60000; //(kg) → 60t
const HARD_WGT_25 = 25000; //(kg) → 25t
let REF_LEN = 0;
let REF_WDT = 0;
let REF_HGT_40 = 0;
let REF_HGT_20 = 0;
let REF_LEN_PCTG = 0;

const calculate = async (fastify, options) => {
    fastify.post(
        '/',
        {
            preHandler: [authMiddleware],
        },
        replyHelper(async (request, reply) => {
            try {
                await fastify.knex.transaction(async (trx) => {
                    const { pckOrdSeq } = request.params;
                    console.log('📦 Packing order sequence:', pckOrdSeq);

                    // 0️⃣ 무게와 부피로 Flatrack 판별
                    const targetList = await processStep1(fastify, pckOrdSeq, trx);

                    //length: 무게에 의한 FR은 제외하고 나머지 FR을 대상 - 으로 length 로 내림차순 정렬해서 4H Length 와 비교해서 그룹핑해준다.
                    // 1️⃣ Length 확인 (무게에 의한 FR 제외)

                    // 18️⃣ OOG 화물로 적재 최적화 계산(40FR 기준)
                    // 19️⃣ 잔여 OOG
                    // 20️⃣ OOG/Dry 혼적 최적화 (40FR 기준)
                    // 21️⃣ Dry 화물로 적재 최적화 계산 (40HC 기준)
                    // 22️⃣ 잔여 OOG
                    // 23️⃣ Dry 화물 적재 최적화 (D2 기준)
                    // 24️⃣ Summary (최종 결과)
                    // 25️⃣ 최종 OOG 데이터(VOS_OOG_PKG) 결과 저장
                    // await database.saveFinalOOGData(finalOOGData);

                    console.log('📂 select item list:', targetList);
                    return targetList; // ✅ `reply.send()` 호출 X (replyHelper가 처리)
                });
            } catch (error) {
                console.error('❌ Error fetching item list:', error);
                throw error; // 🚨 `replyHelper`가 오류 처리하도록 예외 던지기
            }
        }),
    );
};

const processStep1 = async (fastify, pckOrdSeq, trx) => {
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

    REF_LEN = d4Row.CNTR_LEN ?? 11300; //11.3m
    REF_WDT = d4Row.CNTR_WDT ?? 2438; //2.438m
    REF_HGT_40 = d4Row.CNTR_HGT ?? 1955; //1.955m
    REF_HGT_20 = d2Row.CNTR_HGT ?? 2233; //2.233m
    REF_LEN_PCTG = d4Row.CNTR_LEN_PCTG / 100 ?? 0.85; //85%
    console.log('--길이 기준:', REF_LEN);
    console.log('--폭 기준:', REF_WDT);
    console.log('--40높이 기준:', REF_HGT_40);
    console.log('--20높이 기준:', REF_HGT_20);
    console.log('--길이 퍼센티지 기준:', REF_LEN_PCTG);

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
    const step1List = filterListByWeight(targetList, HARD_WGT_40); //40t 초과
    const step1Tail = targetList.filter((item) => !step1List.includes(item)); //allList - step1List(Length 체크 대상)
    const step2List = filterListByWeight(step1List, HARD_WGT_60); //60t 초과
    const step2Tail = step1List.filter((item) => !step2List.includes(item)); //step1List - step2List(✅40FR 2대)
    console.log('무게 40t 초과 item size:', step1List.length);
    console.log('무게 60t 초과 item size:', step2List.length);

    // 4️⃣ Width 2.438M 초과 체크
    console.log('------------------------------');
    console.log('4️⃣ Width 2.438M 초과 체크');
    const step3List = filterListByWidth(step2List, REF_WDT); //2.438m 초과(✅Width / 2.438m = 40FR갯수)
    const step3Tail = step2List.filter((item) => !step3List.includes(item)); //step2List - step3List(✅40FR 2대)
    console.log('폭 2.438m 초과 item size:', step3List.length);
    console.log('무게 60t, 폭 2.438m 초과 item size:', step3Tail.length);

    // 5️⃣ Length 체크
    console.log('------------------------------');
    console.log('5️⃣ Length 체크');
    console.log('Length 체크 대상 item size:', step1Tail.length);
    const step4List = filterListByLength(step1Tail, REF_LEN); //11.3m 초과(✅Length / 2.438m = 40FR갯수)
    const step4Tail = step1Tail.filter((item) => !step4List.includes(item)); //step1Tail - step4List

    const step5List = filterListByLength(step1Tail, REF_LEN * REF_LEN_PCTG); //11.3m * 85% 초과(✅40FR 1대)
    const step5Tail = step4Tail.filter((item) => !step5List.includes(item)); //step4Tail - step5List(G/W 체크 대상)

    // 6️⃣ 두번째 G/W 체크
    console.log('------------------------------');
    console.log('6️⃣ 두번째 G/W 체크');
    const step6List = filterListByWeight(step5Tail, HARD_WGT_25); //25t 초과(✅40FR 1대)
    const step6Tail = step5Tail.filter((item) => !step6List.includes(item)); //step5Tail - step6List(OW 체크 대상)

    // 7️⃣ 장축(OW) 화물 추출 (2.438M 초과)
    console.log('------------------------------');
    console.log('7️⃣ 장축(OW) 화물 추출 (2.438M 초과)');
    const step7List = filterListByWidth(step6Tail, REF_WDT); //2.438m 초과(✅OW)

    // 8️⃣ 장고(OH) 화물 추출 (1.955M/20FR, 2.233M/40FR)
    console.log('------------------------------');
    console.log('8️⃣ 장고(OH) 화물 추출 (1.955M/20FR, 2.233M/40FR)');
    const step8List = filterListByHeight(step6Tail, REF_HGT_40); //1.955m 초과(✅OH)
    const step8Tail = step6Tail.filter((item) => !step8List.includes(item)); //step5Tail - step6List(OW 체크 대상)
    const step9List = filterListByHeight(step8Tail, REF_HGT_20); //2.233m 초과(✅OH)

    // 9️⃣ STEP1 결과 컬럼 데이터 추가
    console.log('------------------------------');
    console.log('9️⃣ STEP1 결과 컬럼 데이터 추가');
    const calcItems = await Promise.all(
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
                        ? Math.floor(item.BOX_WDT / REF_WDT)
                        : step4List.includes(item)
                        ? Math.floor(item.BOX_LEN / REF_WDT)
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

    // 무게로 인한 fr 대상 제외
    const step2Set = new Set(step2List);
    const step6Set = new Set(step6List);
    const target2List = targetList.filter((item) => !step2Set.has(item) && !step6Set.has(item));

    console.log(target2List.length);

    // const target2List = [...new Map(targetList.map((item) => [item.PCK_CALC_SEQ, item])).values()];

    // targetList - (step2Tail + step3List + step6List);

    //length: 무게에 의한 FR은 제외하고 나머지 FR을 대상 - 으로 length 로 내림차순 정렬해서 4H Length 와 비교해서 그룹핑해준다.
    // 1️⃣ Length 확인 (무게에 의한 FR 제외)

    // 기존 데이터 삭제
    await trx('vos_oog_calc_step1').where('PCK_ORD_SEQ', pckOrdSeq).del();

    // 새로운 데이터 삽입
    await trx('vos_oog_calc_step1').insert(calcItems);
    return targetList;
};

export default calculate;
