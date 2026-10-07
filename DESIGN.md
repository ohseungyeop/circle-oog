# VOS-OOG 화면 설계 지침

`frontend/`의 화면을 만들거나 고칠 때 따르는 규칙이다. 코드 규칙은 `AGENTS.md`에 있다.

## 누가, 어디서 쓰는가

- 물류 담당자가 사무실 데스크톱 브라우저(폭 1280 이상)에서 쓴다. 모바일은 지원 범위가 아니다.
- 한 화면에서 엑셀 수백 행을 보고 고치는 **데이터 밀도 높은 업무 화면**이다. 꾸밈보다 표의 가로 공간과 읽기 속도가 우선이다.
- 흐름: 로그인(`/`) → 파일 목록·엑셀 그리드(`/mainPage`) → 계산 결과 → 컨테이너 배치 모달 → 라싱 모달.

## 현재 구조 (바꾸지 말고 따를 것)

| 영역 | 현재 방식 | 파일 |
|------|-----------|------|
| 컴포넌트 | MUI v7 (`@mui/material`, `@mui/icons-material`) | 전반 |
| 테마 | MUI 템플릿 기반 커스텀 테마. 현재는 로그인 화면만 `AppTheme`으로 감싼다. 메인 화면은 MUI 기본 테마 | `src/theme/` |
| 색 팔레트 | brand(파랑, hsl 210), gray, green, orange, red 각 50~900 단계 | `src/theme/themePrimitives.ts` |
| 글꼴 | `index.html`이 IBM Plex Sans를 내려받지만 적용한 곳은 없다. 메인은 `styles.css`의 시스템 글꼴, 로그인 테마는 `Inter, sans-serif` 선언(Inter 미로드) | `index.html`, `styles.css`, `themePrimitives.ts` |
| 컴포넌트 스타일 | CSS Module(`*.module.css`). 인라인 style 객체는 쓰지 않는다 (커밋 de9041d에서 분리함) | `components/*.module.css`, `pages/*.module.css` |
| 공통 스타일 | 스낵바 등 | `src/styles/common.module.css` |
| 일회성 스타일 | MUI `styled()` 또는 `sx` | `SignIn.tsx` 등 |
| 파일 목록 표 | MUI X DataGrid v8 (선택 모델은 `{ type, ids: Set }`) | `components/FileList.tsx` |
| 엑셀 편집 표 | 직접 만든 HTML `<table>` + CSS Module (sticky 헤더) | `components/ExcelDataGrid.tsx` |
| 세부 편집 | MUI `Dialog` 모달 | `ContainerTpszModal`, `UnitConverterModal`, `UserAdminDialog`, `LashingPage` |
| 알림 | 메인 화면은 직접 만든 스낵바(`commonStyles.snackbar*`), 라싱 모달은 MUI `Snackbar`+`Alert` | 두 방식이 공존. 새 화면은 같은 화면의 기존 방식을 따른다 |

`ag-grid-*`, `react-konva`, `styled-components`, `@google/model-viewer`(`public/images/*.gltf` 포함)가 `package.json`에 있으나 `src/`에서 쓰이지 않는다(타입 선언 `global.d.ts`만 남음). 새로 도입하지 않는다.

## 색과 상태

- 주 색은 `brand[400]`(`hsl(210, 98%, 48%)`), `theme-color`는 `#0270D7`. 보라·남색 계열 강조색이나 그라데이션은 새로 넣지 않는다. 기존 로그인 배경(`SignIn.tsx`)의 radial-gradient는 예외.
- 메인 화면 스낵바 상태색은 `common.module.css` 값을 유지한다: 오류 `#f44336`, 경고 `#ff9800`, 정보 `#2196f3`, 성공 `#4caf50`. 라싱 모달의 MUI `Alert`는 MUI 팔레트(`#d32f2f` 등)를 따르므로 두 값이 다르다.
- 표에서 기준 초과(over)는 빨강, 소계·합계 행은 배경을 달리해 구분한다(기존 `ExcelDataGrid` 규칙).
- 다크 모드는 로그인 화면(`AppTheme`)에만 있다. 메인 화면은 라이트 고정. 색을 직접 쓸 때는 해당 화면의 모드에서 대비가 4.5:1 이상인지 확인한다.

## 문구

- 한국어 존댓말, 짧고 구체적으로. 예: `엑셀 파일만 업로드 가능합니다`, `승인 대기 중입니다. 관리자에게 문의하세요`.
- 도메인 용어는 원문 유지: CBM, Flat Rack, Open Top, 40HQ, 20DR, CLP, Lashing. 표 헤더는 기존 영문 유지(`File name`, `File Date`).
- 오류 문구는 무엇이 잘못됐고 무엇을 하면 되는지를 한 문장으로. "오류가 발생했습니다"만 쓰지 않는다.
- 아부성·장식 문구, 이모지 남용 금지. 기존 `📂 File List` 같은 제목 이모지는 그대로 두되 새로 늘리지 않는다.

## 모든 데이터 화면에 반드시 있어야 하는 것

1. **로딩**: 요청 중에는 `CircularProgress` 또는 버튼 비활성화로 표시한다. 두 번 눌러 중복 요청이 가지 않게 한다.
2. **빈 상태**: 행이 0개일 때 "업로드한 파일이 없습니다" 같은 안내를 보인다. 빈 표만 두지 않는다.
3. **오류**: 요청 실패를 스낵바로 알리고, 콘솔에만 남기지 않는다.
4. **확인**: 삭제·덮어쓰기는 `Dialog`로 한 번 더 묻는다. 브라우저 `confirm()`/`alert()`는 쓰지 않는다.

## 접근성 최소선

- 모든 입력에는 보이는 라벨(`FormLabel`, `TextField label`)을 둔다.
- 아이콘만 있는 버튼에는 `aria-label`을 둔다.
- 키보드로 모달을 열고 닫고 표를 이동할 수 있어야 한다. 포커스 링을 `outline: none`으로 지우지 않는다.
- 이미지와 3D 뷰어에는 `alt` 또는 대체 텍스트를 둔다.
- 애니메이션을 넣으면 `prefers-reduced-motion`을 존중한다.

## 레이아웃과 CSS

- `body` 패딩 16px, 표는 가로 100%. 표 높이는 기존처럼 고정(700px) + 내부 스크롤.
- `z-index`는 MUI `theme.zIndex`(modal 1300, snackbar 1400)를 쓴다. 기존 `common.module.css`의 9999는 더 키우지 않는다.
- `!important` 금지. 우선순위 문제는 선택자나 `sx`로 푼다.
- 간격은 `theme.spacing()` 배수(8px 단위)만 쓴다. `mt: 37px` 같은 임의값 금지.
- 새 화면도 4칸 들여쓰기, 작은따옴표(`.prettierrc`). `theme/` 아래 MUI 템플릿 파일만 2칸이므로 그 파일을 고칠 때는 그대로 둔다.

## 피해야 할 "AI 기본값" 디자인

- 아이콘 카드 세 개 나열형 소개 섹션, 히어로 배너, 그라데이션 버튼
- Inter/Roboto로 글꼴 교체, 보라·남색 강조색, 카드마다 그림자 겹치기
- 기능은 없고 보기만 좋은 요소(장식용 차트, 가짜 통계)
- 행복 경로만 되는 화면. 실패·빈·느린 경우를 먼저 그린다

## 작업 마무리 점검

`AGENTS.md`의 검증 규칙대로 아래를 실제로 실행하고 결과를 본 뒤에 완료라고 말한다.

1. `cd frontend && npx tsc -p tsconfig.app.json --noEmit` 오류 0
2. `cd frontend && npx eslint src` 오류 0
3. 브라우저에서 폭 1280과 1920에서 확인. 로그인 화면은 라이트·다크 각각
4. 로딩·빈·오류 상태를 실제로 만들어 확인(네트워크를 끊거나 빈 파일을 올려서)
