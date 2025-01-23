# 프로젝트 이름
VOS-OOG (ValueOnSys Out of Gauge Project)

## 소개
OOG CARGO (Out of Gauge Cargo)란 

기준 부피를 벗어난 대형 화물이나 수하물로, 특수 컨테이너인 플랫렉(Flat Rack)과 오픈탑(Open Top)에 적입한 화물을 가리킨다.

OOG(Out of Gauge)는 정해진 틀이나 계량치를 벗어난다는 뜻으로 기준 부피를 벗어난 대형 화물이나 수하물을 뜻한다.
즉, 크기나 중량 면에서 일반 GP(Gerneral Purpose) 컨테이너에 적입할 수 없는 화물을 특수 컨테이너인 플랫렉(flat rack)과 오픈탑(open top)에 적입한 것이다.

OOG 화물이 적재되는 플랫랙 컨테이너(flat rack container)는 보통 컨테이너에 비하여 바닥 강도가 강하고 화물을 고박할 수 있는 설비를 갖춘 개방형 컨테이너이며, 오픈탑 컨테이너(open top container)는 말 그대로 천장 부분이 개방된 컨테이너를 말한다.

## 설치 방법
```
md vos-oog
cd vos-oog
#npm install -g pnpm
#pnpm init
#pnpm add @mui/x-data-grid
#pnpm add @mui/material @emotion/react @emotion/styled
#pnpm add @mui/styled-engine-sc styled-components

npm uninstall -g create-react-app
npm install -g create-react-app
npx create-react-app frontend
cd frontend
npm install web-vitals
npm add @mui/x-data-grid
npm add @mui/material @emotion/react @emotion/styled
npm add @mui/styled-engine-sc styled-components
npm install @mui/x-data-grid
npm i @mui/x-data-grid-generator --legacy-peer-deps
npm i @mui/icons-material --legacy-peer-deps
```

## 사용 방법
// ...existing code...

## 기여 방법
// ...existing code...

## 라이선스
// ...existing code...

## 파일 구조
```
vos-oog/
│
├── frontend/             # React 프론트엔드
│   ├── public/           # 정적 파일
│   ├── src/              # 소스 코드
│   │   ├── components/   # React 컴포넌트
│   │   ├── pages/        # 페이지 컴포넌트
│   │   ├── hooks/        # 커스텀 훅
│   │   ├── App.js        # 메인 앱 컴포넌트
│   │   └── index.js      # 엔트리 포인트
│   └── package.json      # React 관련 의존성
│
├── backend/             # Node.js 백엔드
│   ├── controllers/      # 라우터 및 컨트롤러
│   ├── models/           # 데이터베이스 모델
│   ├── routes/           # API 라우트
│   ├── services/         # 서비스 계층 (비즈니스 로직)
│   ├── app.js            # Express 앱 설정
│   ├── server.js         # 서버 시작 파일
│   └── package.json      # Node.js 관련 의존성
│
├── node_modules/         # 프로젝트의 공통 의존성
├── .gitattributes        # gitattributes 파일
├── .gitignore            # gitignore 파일
├── pnpm-lock.yaml        # pnpm 락 파일
└── package.json          # 루트 레벨 package.json (공통 의존성)
```
