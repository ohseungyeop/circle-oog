# CLP 자동 최적화

AUTO는 Google OR-Tools CP-SAT로 장비 대수를 최소화한다. HEURISTIC은 사용자가 기존 first-fit-decreasing을 직접 선택하는 방식이다. 두 방식은 적층 없는 보수적 1열 배치이며 자동 생성 결과는 PRE_PLAN이다.

입력의 모든 장비 적합 화물을 정확히 한 번 배정한다. 불가능한 화물은 미배정 목록에 보존한다. 허용 회전, 길이·폭·높이·계획 중량과 선택된 규칙을 적용한다. CP-SAT는 화물 길이를 1 mm로 올림하고 중량을 1 g로 올림하며 장비 허용값을 내림하여 용량을 초과하지 않게 한다. 단일 화물의 정수 반올림만으로 경계 적합성이 바뀌면 원래 float 검증 휴리스틱으로 되돌린다.

128개 이하와 배정변수 18,000개 이하만 CP-SAT를 수행하며 기본 탐색시간은 3초, 요청 설정은 0.05~10초다. OPTIMAL은 이 정수 1열 모델의 장비 대수 최적해만 의미한다. FEASIBLE은 최적을 증명하지 못한 배치다. 시간 내 해 없음·패키지 없음·규모 한도 초과는 이유를 기록하고 기존 배치로 되돌린다. FEASIBLE 결과가 기존 배치보다 장비 대수를 늘리는 경우에도 기존 배치를 보존한다.

`scenario.optimization`은 요청 모드, 실제 방법, 솔버 상태, optimal, bestBound, 장비 대수, 시간 제한, 실제 솔버 시간, fallbackReason, 모델과 반올림 정책을 보존한다. 개별 작업 우선 대안은 기존 휴리스틱을 유지한다. 회사 운임/비용을 입력하지 않은 상태에서 비용을 0으로 가정하지 않으며 비용 최적화·2D 배치·적층·하중 분포·지지점·라싱·선사 승인은 이 모델 범위 밖이다.

구현 참고: [Google CP-SAT 상태 정의](https://developers.google.com/optimization/cp/cp_solver), [공식 시간 제한 설정](https://developers.google.com/optimization/cp/cp_tasks). 코드 복사 없이 공식 Python API를 사용하며 OR-Tools 패키지 라이선스는 Apache 2.0이다.
