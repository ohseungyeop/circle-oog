import replyHelper from '../utils/replyHelper.js';
import { getDb2Raw, getRaw2Step1 } from '../models/pckData.js';
import { filterListByWeight, filterListByLength, filterListByWidth, filterListByHeight } from '../utils/calulateHelper.js';

const BASE_WGT_1 = 40000; //40t
const BASE_WGT_2 = 60000; //60t
const BASE_WDT_1 = 2438; //2.438m
const BASE_PCTG = 0.85; //85%
const BASE_WGT_3 = 25000; //25t
const BASE_HGT_1 = 2233; //2.233m
const BASE_HGT_2 = 1955; //1.955m

const calculate = async (fastify, options) => {
    fastify.post(
        '/',
        replyHelper(async (request, reply) => {
            try {
                const { pckOrdSeq } = request.params;
                console.log('📦 Packing order sequence:', pckOrdSeq);

                // 0️⃣ VOS_OOG_UPLD_DTL 조회
                const sourceList = await fastify.knex('VOS_OOG_UPLD_DTL').where({ PCK_ORD_SEQ: pckOrdSeq }).select('*');
                // 1️⃣ QTY만큼 해당 item복제
                const allList = sourceList.flatMap((row) =>
                    Array(row.PCK_QTY)
                        .fill()
                        .map(() => ({ ...row, PCK_QTY: 1 })),
                );

                console.log('전체 item size:', allList.length);

                // 2️⃣ G/W 체크
                const step1List = filterListByWeight(allList, BASE_WGT_1); //40t 초과
                const step1Tail = allList.filter((item) => !step1List.includes(item)); //allList - step1List(Length 체크 대상)
                const step2List = filterListByWeight(step1List, BASE_WGT_2); //60t 초과
                const step2Tail = step1List.filter((item) => !step2List.includes(item)); //step1List - step2List(✅40FR 2대)
                console.log('Wgt:40t 초과 List:', step1List.length);
                console.log('Wgt:60t 초과 List:', step2List.length);

                // 3️⃣ Width 2.438M 초과 체크
                const step3List = filterListByWidth(step2List, BASE_WDT_1); //2.438m 초과(✅Width / 2.438m = 40FR갯수)
                const step3Tail = step2List.filter((item) => !step3List.includes(item)); //step2List - step3List(✅40FR 2대)
                console.log('Wdt:2.438m 초과 List:', step3List.length);
                console.log('Wgt:60t and Wdt:2.438m 초과 List:', step3Tail.length);

                // 4️⃣ Length 체크
                console.log('Length 체크 대상 List:', step1Tail.length);

                const step4List = filterListByLength(step1Tail, 1103); //11.3m 초과(✅Length / 2.438m = 40FR갯수)
                const step4Tail = step1Tail.filter((item) => !step4List.includes(item)); //step1Tail - step4List

                const step5List = filterListByLength(step1Tail, 1103 * BASE_PCTG); //11.3m * 85% 초과(✅40FR 1대)
                const step5Tail = step4Tail.filter((item) => !step5List.includes(item)); //step4Tail - step5List(G/W 체크 대상)

                // 5️⃣ 두번째 G/W 체크
                const step6List = filterListByWeight(step5Tail, BASE_WGT_3); //25t 초과(✅40FR 1대)
                const step6Tail = step5Tail.filter((item) => !step6List.includes(item)); //step5Tail - step6List(OW 체크 대상)

                // 6️⃣ 장축(OW) 화물 추출 (2.438M 초과)
                const step7List = filterListByWidth(step6Tail, BASE_WDT_1); //2.438m 초과(✅OW)

                // 7️⃣ 장고(OH) 화물 추출 (1.955M/40FR, 2.233M/20FR)
                const step8List = filterListByHeight(step6Tail, BASE_HGT_1); //2.233m 초과(✅OH)

                // 1차 필터본 저장
                // await fastify.knex('VOS_OOG_STEP1').insert(
                //     data.map((item) => ({
                //         PCK_ORD_SEQ: item.pckOrdSeq,
                //         PCK_NO: item.pckNo,
                //         ITM_NM: item.itmNm,
                //         PCK_LEN: item.pckLen,
                //         PCK_WDT: item.pckWdt,
                //         PCK_HGT: item.pckHgt,
                //         PCK_QTY: item.pckQty,
                //         PCK_WGT: item.pckWgt,
                //         PCK_CBM: item.pckCbm,
                //         PCK_RMK: item.pckRmk,
                //     })),
                // );

                // 18️⃣ OOG 화물로 적재 최적화 계산(40FR 기준)
                // 19️⃣ 잔여 OOG
                // 20️⃣ OOG/Dry 혼적 최적화 (40FR 기준)
                // 21️⃣ Dry 화물로 적재 최적화 계산 (40HC 기준)
                // 22️⃣ 잔여 OOG
                // 23️⃣ Dry 화물 적재 최적화 (D2 기준)
                // 24️⃣ Summary (최종 결과)
                // 25️⃣ 최종 OOG 데이터(VOS_OOG_PKG) 결과 저장
                // await database.saveFinalOOGData(finalOOGData);

                console.log('📂 select item list:', allList);
                return allList; // ✅ `reply.send()` 호출 X (replyHelper가 처리)
            } catch (error) {
                console.error('❌ Error fetching item list:', error);
                throw error; // 🚨 `replyHelper`가 오류 처리하도록 예외 던지기
            }
        }),
    );
};
export default calculate;
