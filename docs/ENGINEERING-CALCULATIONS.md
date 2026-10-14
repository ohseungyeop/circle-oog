# 공학 계산 내부 모델과 검토 결정

모델 버전은 `OOG-STATIC2-DIRECT-SLIDING-1.0`이다. 이 문서는 프로그램이 실제로 계산하는 범위와 입력 책임을 설명한다. 내부 계산 보고서의 `APPROVED_INTERNAL`은 이 제한된 모델에 대한 내부 검토 결정이며 운송 적합성, 실제 선사 승인, CTU Code 전체 적합 인증을 의미하지 않는다. 모든 저장 CLP는 계속 `PRE_PLAN`이다.

## 공식 자료와 출처

2026-10-14에 [IMO CTU Code 소개](https://www.imo.org/en/ourwork/safety/pages/ctu-code.aspx)와 [ILO가 게시한 IMO ILO UNECE CTU Code 공식 PDF](https://www.ilo.org/sites/default/files/wcmsp5/groups/public/@ed_dialogue/@sector/documents/publication/wcms_492710.pdf)를 확인했다. UNECE의 [공식 안내](https://unece.org/transport/intermodal-transport/imoilounece-code-practice-packing-cargo-transport-units-ctu-code)도 같은 2014 공동 Code를 안내한다.

PDF의 Annex 7 §4.4.1, 인쇄 107쪽(PDF 114페이지)은 외력 `F=m*g*c`와 `g=9.81 m/s²`를 제시한다. 운송 모드와 경로에 맞는 가속계수 선택이 필요하며 가장 불리한 구간도 고려해야 한다. §4.4.2는 마찰, securing strength, 각도 등 입력을 요구한다. §4.4.5는 계산 방법의 목적·운송 모드 적합성 검토를 요구한다. 이 근거는 입력과 힘의 평형을 검토해야 한다는 원칙의 출처이며 아래 프로그램 모델을 공인 계산법으로 승인하는 근거가 아니다.

## 입력과 확인 상태

값의 크기로 CoG, 지지점, 마찰계수, 가속계수, 한도, 라싱 유효 용량을 추정하지 않는다. 수치가 없으면 해당 계산을 `INCOMPLETE`로 남긴다. `sourceMode=CONFIRMED/ESTIMATED`는 CoG를 포함한 이번 계산 입력 전체의 사용자 확인 구분이다. `inputEvidence`에 측정·도면·확인자료 식별 근거를 남긴다. CoG 좌표 원점은 저장 화물의 포장 외형 시작점이며 x/y/z는 길이/폭/높이 방향 mm다. 사용자 확인 표시는 자료의 진위나 운송 경로 적합성이 자동 검증됐다는 뜻이 아니다.

각 support에 X 좌표 mm, 유효 압축 접촉 면적 mm², 허용 평균 면압 MPa, 허용 반력 kN을 입력한다. 한도는 실 장비·접촉재료·구조 담당자의 자료에 근거해 사용자가 선언한다. 장비 payload에서 면압이나 지지점 허용 반력을 자동으로 만들지 않는다.

라싱 입력은 확인 방향, 수평 가속계수 `ch`, 법선력 계수 `cn`, 마찰계수 `mu`, 개별 라싱 유효 용량 `Ceff` kN, 수직각 `alpha`, 평면각 `beta`, 수량 `n`과 근거다. 가속도는 g배수다. alpha는 수평면에서 위쪽으로, beta는 선택한 저항 방향에서 측정한다. 모든 해당 라싱은 선택 방향에 실제로 저항하는 동질적인 직접 라싱이어야 한다. 경로와 자료를 검토한 사용자가 계수를 입력하며 선사별 계수·안전계수는 기본값으로 제공하지 않는다.

## 정적 두 지지점과 접촉 평균 면압

강체 화물 한 개, 두 지지점의 단순 1차원 정적 중력 평형 모델이다. X좌표가 `xA < xB`일 때:

```
W_kN = mass_kg * 9.81 / 1000
RB_kN = W_kN * (xG - xA) / (xB - xA)
RA_kN = W_kN - RB_kN
pressure_MPa = reaction_kN * 1000 / effective_contact_area_mm2
```

이 반력 식은 힘 합계 0과 A점 모멘트 합계 0에서 직접 유도한 정역학 모델이다. 평균 면압은 N/mm²=MPa 단위 변환이다. 결과에는 힘·모멘트 잔차를 남긴다. CoG가 지지점 구간 밖이면 한쪽 반력이 음수가 될 수 있으며 `UPLIFT_OR_UNSTABLE`로 표시한다. 음수 반력을 압축 면압으로 표시하지 않는다. 각 반력과 평균 면압은 사용자가 선언한 한도와 별개로 비교한다. 유효 접촉 면적이 없는 경우 값이나 한도를 대체하지 않는다.

분포 압력의 피크, 접촉 편심, 패드·deck 구조 강도, 굽힘·처짐, 동적 반력, 세 개 이상 지지점 하중 분배, 횡방향 안정성은 이 모델의 범위 밖이다. CoG y/z는 보존하지만 1차원 반력 식에는 사용하지 않는다.

## 단일 방향 직접 라싱 미끄럼 필요조건

다음은 force projection과 사용자 입력으로 구성한 프로그램 내부 모델이며 CTU Code Annex 13 등의 모든 평가식을 구현한 것이 아니다.

```
F_kN = mass_kg * 9.81 / 1000 * ch
N_kN = mass_kg * 9.81 / 1000 * cn
baseline_friction_kN = mu * N_kN
D_kN = max(0, F_kN - baseline_friction_kN)
R_kN = n * Ceff_kN * cos(alpha) * cos(beta)
margin_kN = R_kN - D_kN
```

`cn`은 사용자가 선언한 법선력/중력 비율이다. CTU Code의 특정 운송 수직계수와 자동으로 동일시하지 않는다. `Ceff`에는 라싱 재료, 연결부, 화물·CTU 고정점 중 최약부, derating 및 필요한 안전계수를 반영한 사용자 확인 유효 용량을 넣는다. breaking strength나 MSL을 그대로 유효 용량으로 자동 변환하지 않는다. 동질 라싱의 균등 하중 분담과 한 방향 저항을 가정한다. 라싱 수직성분의 추가 마찰과 벽·blocking의 힘은 인정하지 않는다. 각도가 90°이면 해당 방향 투영 저항은 0이다.

이 계산은 반대 방향과 다른 운송 구간, 전도 모멘트, pretension·tie-down, 복합 라싱의 탄성·하중 분담, 구조 접합점 파괴를 검토하지 않는다. 마찰만 충분하다는 숫자가 충격·진동 이동 방지 조치나 다른 securing 검토를 면제하지 않는다. `WITHIN_DECLARED_LIMITS`는 이 입력과 이 산식의 필요조건 범위가 맞는다는 뜻이다.

## 내부 검토 결정과 보존

계산과 결정은 별도 불변 레코드로 저장한다. 작성자는 독립 검토자의 내부 승인을 대신할 수 없다. `ENGINEER/ADMIN/SUPER_ADMIN`과 해당 PLANNING 권한을 요구한다. 결정은 근거와 검토 자료 식별 정보를 필수로 남기며 `APPROVED_INTERNAL`, `REJECTED`, `REQUEST_REVIEW`를 버전 순으로 추가한다. 같은 계산에 동시 결정이 들어오면 현재 버전 충돌을 검사한다.

내부 승인은 입력이 CONFIRMED이고 모든 필수값·한도가 존재하며 정적 반력·평균 면압·직접 라싱 필요조건 모두 한도 내일 때만 가능하다. 계산 질량이 저장 계획의 선택 화물 개당 G/W와 다르면 `MASS_MISMATCH_REQUIRES_NEW_PLAN`과 경고를 표시하고 내부 승인을 차단한다. 올바른 확인 질량으로 화물을 등록한 새 계획과 새 계산이 필요하다. 승인 시점에는 원본 계획의 입력과 결과가 계산 당시 snapshot과 같은지도 재확인한다. 자기 계산, 추정값, 부족 입력, 음수 반력, 한도 초과 보고서는 승인할 수 없다. 새 확인 자료를 사용하려면 새 계산을 만들며 기존 snapshot은 변경하지 않는다. 내부 승인 여부와 관계없이 `carrierApproved=false`, `planStatus=PRE_PLAN`을 유지한다. 실제 현장 확인·구조 및 전체 운송 공학 검토·선사 승인 절차는 별도다.
