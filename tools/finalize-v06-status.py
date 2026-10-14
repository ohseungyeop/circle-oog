"""Record the reviewed v0.6 scope; expanded engineering remains incomplete."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'docs/feature-status.json';s=json.loads(p.read_text(encoding='utf-8'))
s.update(version='0.6',updated='2026-10-14');by={i['id']:i for i in s['items']}
by['L03'].update(verification='PASSED',evidence='실제 UI Top/Side/Front 탭과 SVG 화물 표시 확인. UI CLP PDF7페이지 전부 시각 검수')
by['L02']['evidence']='대안 생성·배정/미배정 보존 API와 실제 UI 자동 추천·수동 대안 전환 확인'
by['Q01']['evidence']='API33건. PRE_PACK/PRE_QUOTE 불변 snapshot·통화혼합 거부·미단가 합계 null. 실제 UI 자동 견적 생성 확인'
by['E01'].update(description='확대 공학 모델·운송 경로 전체 검증·선사 실무 승인 연계',evidence='누락 점검/검토 기록19검사 통과. 제한 계산은 E02. 전도·동적 반력·구조 강도·다중 지지·다른 운송 방향·선사 승인 연계는 미구현/미검증')
by['H01']['evidence']='원본 bytes·매핑·계획/감사·회사격리 API 및 실제 UI 원본→개정 계획 비교 확인'
by['O02']['evidence']='API PDF·한글·미배정·대안 보존 및 실제 UI 다운로드7페이지 전부 시각 검수. 공학도면 아님'
by['O03']['evidence']='API Excel11시트·배정/미배정·3면·수식문자 검증과 실제 UI 다운로드 완료'
extra=[
 ('I05','고객 Excel 매핑 템플릿','회사·고객·헤더별 불변 템플릿·자동 제안·수동 최종 확인','실제 고객파일18개 탐지 포함39검사. xls/HTML표xls/xlsx·cm/mm·입력경계; UI 저장/재적용 확인'),
 ('H02','저장 계획 버전 비교','시나리오별 배정·미배정·이동·회전·잠금·규칙 차이','비교/출력 API16검사. 실제 UI 원본→개정 대안의 이동·잠금 차이 확인'),
 ('Q02','견적 Excel/PDF','저장 견적 snapshot·대안별 분리·미확정 금액 명시','비교/출력 API16검사·실제 견적 PDF1페이지 시각 검수 및 UI Excel/PDF 다운로드'),
 ('L06','자동 최소 대수 최적화','CP-SAT 적층없는 1열·128개 제한·시간제한·수동 기본계획','Python10/API35검사. 알려진 예제3대→최적2대, 보수적 반올림·명시적 fallback·수량 보존'),
 ('E02','제한 공학 계산·독립 내부 검토','두 정적 지지점 반력/평균 면압·한 방향 직접 라싱·불변 검토 결정','API43검사. 역할/회사·자기승인·추정값 차단·버전충돌 검증. UI 추정 계산 저장·산식·반력·승인 비활성 확인. 확대공학과 선사승인 제외')]
for id,name,description,evidence in extra:
 item=dict(id=id,name=name,description=description,development='COMPLETE',verification='PASSED',evidence=evidence)
 if id in by:by[id].update(item)
 else:s['items'].append(item)
s['verificationRuns']={'Java 단위 검사':'94건 통과·실패0','Python 검사':'10건 통과','실제 DB/API':'383건 통과·12개 검사군','프런트 TypeScript/build':'통과','UI 직접 업무검증':'로그인·프로젝트·Excel 확인/저장·자동계획·3면·수동이동/잠금차단·버전비교·템플릿·추정공학계산·출력 검증','사용자 매뉴얼':'v0.6 · 검수 기록 참조','DB':'V10 / core_8 / oog_16 / 기술원장1 =25','자동 검증 명령':'tools/verify-all.ps1'}
s['notes']=['전체30·완료29·미완료1(E01 확대공학/실무승인 연계), 기능검증29·대기1. 제한 계산 E02를 전체 공학 완료로 치환하지 않는다.','실제 화면 대표 업무를 검증했으며 모든 브라우저·입력 조합의 무오류 보장을 뜻하지 않는다. 고객 원본파일18개는 읽기만 수행했다.','CP-SAT 최적성은 적층없는 1열 모델에서 OPTIMAL인 경우만 확인된다. FEASIBLE·시간초과·128개 초과·수동 선택은 결과에 표시한다. 비용 최적화와 3차원 적재는 제외된다.','FMS 공통 인증/회사/권한7개와 감사1개를 OOG에 연결했다. 추가 조직·구독·메시지·개인환경·채번 등은 미이식이다.','확인되지 않은 단위·중량 의미·운임·지지점·계수를 임의로 확정하지 않는다. CLP는 PRE_PLAN, 견적은 PRE_QUOTE를 유지한다.']
p.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
