export type Field=[string,string];
export const numeric:Record<string,Field[]>={COUPLED_BEAM:[['lengthMm','보 전체 길이 mm'],['elasticModulusMpa','탄성계수 E MPa'],['inertiaMm4','단면2차모멘트 I mm⁴'],['sectionModulusMm3','단면계수 Z mm³'],['shearAreaMm2','유효 전단 면적 mm²'],['allowableBendingMpa','허용 굽힘 응력 MPa'],['allowableShearMpa','허용 평균 전단 응력 MPa'],['allowableDeflectionMm','허용 절대 처짐 mm']]};
export const confirmations:Record<string,Field[]>={COUPLED_BEAM:[['theoryApplicable','실제 보·접촉 조건에 작은 변위 선형 보 이론 적용 가능']]};
export const texts:Record<string,Field[]>={COUPLED_BEAM:[['evidence','장비/보 도면·강성·단면·하중 조합 확인 근거']]};
export const listFields:Record<string,{key:string;label:string;fields:Field[];max:number}[]>={COUPLED_BEAM:[{key:'supports',label:'공면 압축 지지 스프링 (초기 간극 0) · 2~8개',max:8,fields:[['id','지지 ID'],['xMm','X mm'],['stiffnessKnPerMm','강성 kN/mm'],['capacityKn','허용 반력 kN'],['areaMm2','접촉 면적 mm²'],['allowablePressureMpa','허용 평균 면압 MPa']]},{key:'loads',label:'확인된 하중 조합의 하향 점하중 · 1~16개',max:16,fields:[['id','하중 ID'],['xMm','X mm'],['forceKn','하중 kN']]}]};
export const kindLabels:Record<string,string>={COUPLED_BEAM:'연성 보·압축 지지'};
export const statusLabels:Record<string,string>={CONTACT_EQUILIBRIUM_NOT_PROVEN:'접촉 평형 해 확인 불가',DECLARED_MODEL_LIMITS_PASSED:'선언 모델 한도 통과',DECLARED_MODEL_LIMITS_FAILED:'선언 모델 한도 초과/검토 필요'};
