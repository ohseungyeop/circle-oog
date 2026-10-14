# 공개 선사 자료와 장비 타입 적용 범위

확인일: 2026-10-14. 공개 자료는 사전 검토 근거이며 개별 장비 승인서가 아니다.

- Hapag-Lloyd [중량 분포 지침](https://www.hapag-lloyd.com/content/dam/website/downloads/pdf/Weight_distribution_guideline_03.pdf), PDF 4쪽: FR의 실제 지지 길이와 두 외측 주보로 전달되는 하중을 구분한다. 20/40FR 8개 표 열을 읽기 전용 검토 API에 연결했다. 49t 열은 도해/표 수치 차이와 표제/최종 행 차이가 있어 자동 적합 판정을 차단한다. 표 사이 길이는 아래쪽 발표 행을 사용하는 자체 보수 정책이며 선사 보간 공식이 아니다. 표 밖 외삽은 하지 않는다.
- Maersk [라싱 가이드](https://www.maersk.com/~/media_sc9/maersk/solutions/transportation-services/ocean-transport/special-cargo/out-of-gauge-cargo/files/maersk-lashing-guide.pdf): 실측 무게중심, 장비 상태와 하중 전달, 결속재의 유효 용량 확인에 사용한다. 예시 용량을 모든 장비 기본값으로 복사하지 않는다.
- CMA CGM [OOG/FR 가이드](https://www.cma-cgm.com/assets/public/pdf/Customer%20Guideline%20-%20OOG-BREAK%20BULK-%20FLAT%20RACK-02092022.pdf): 2022년 문서의 운용 조건이다. 전체 선대의 현재 물리 한계로 일반화하지 않는다.

## 타입 구분

| 계열 | 계산 범위 |
|---|---|
| Dry / High Cube | 등록된 실제 치수·중량·규칙으로 후보 및 배치 계산 |
| Open Top | 등록 제원과 개방 높이 규칙으로 계산. 문/상부 개구부 통과는 별도 확인 |
| Flat Rack | 후보·배치 및 제한 공학 계산. 공개 하중표는 해당 장비 적용 확인 후 참고 |
| Platform / 접은 FR | 등록 제원에 대한 기하 배치 지원. 접힌 상태의 실제 운송 허용하중 확인 필요 |
| Multi-FR / Breakbulk | 예비 공학 검토. 선박·장비 조합 승인 필요 |
| Reefer / Tank / 기타 전용 | 온도·탱크·위험물 등 전용 운용 모델 미구현 |

기본 DB 장비는 20GP, 40HC, 40OT, 20FR, 40FR의 5종이다. 분석과 두 최적화 방식에서 고정 5종 제한을 제거했지만 추가 장비를 가상 제원으로 DB에 등록하지 않았다. 신규 코드의 자동 후보 계산은 제원과 규칙이 함께 제공될 때 동작한다. 장비 관리 화면에서 플랫폼 관리자가 신규 타입·모델 제원과 기본 규칙을 확인 근거와 함께 등록할 수 있다. 개구부 검토는 선언한 실제 유효 개구부의 정방향/수평90도 단면 검사까지만 제공한다.

`GET .../engineering/calculations/expanded/references`는 출처·하중표·계열별 지원 범위를 반환한다. `POST .../expanded/load-distribution`은 읽기 전용 사전 점검이며 저장·승인·계획 자동 변경을 하지 않는다. 실제 명판, 지지 길이, 주보 전달, 해당 하중표 적용 확인이 없으면 자료 부족으로 반환한다.

로컬 Excel 조사 결과는 local-engineering-inventory.json에 기록했다. 일부 셀 표제 조사이므로 도면/내장 개체를 포함한 전체 자료의 실측값 부재를 증명하지 않는다. 남은 E01의 실제 장비·화물 자료는 공개 일반 문서만으로 확정하지 않는다.
