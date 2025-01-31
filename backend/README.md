# 프로젝트 이름
VOS-OOG-Backend Project

## 설치 방법
```
cd backend
npm i
```

## 사용 방법
```
npm run local
npm run dev
npm run prd
```

## 파일 구조
```
/src
  ├── /routes
  │    ├── index.js             # 모든 라우트들이 등록되는 중앙 라우트 파일
  │    ├── pck.js               # PCK 관련 API 라우트
  │    ├── auth.js              # 로그인 및 인증 관련 라우트
  │    ├── helpers.js           # 공통 함수들 (예: 에러 처리, 타임스탬프 등)
  │    └── other_routes.js      # 다른 API 라우트 파일들
  ├── /controllers
  │    ├── pckController.js     # PCK 관련 로직 처리
  │    ├── authController.js    # 로그인 및 인증 로직 처리
  │    └── otherControllers.js  # 다른 로직 처리
  ├── /plugins
  │    └── jwt.js               # JWT 인증 플러그인 설정
  ├── /services
  │    ├── authService.js       # 인증 관련 서비스 로직
  │    └── pckService.js        # PCK 관련 서비스 로직
  ├── /models
  │    ├── pckModel.js          # PCK 모델 (DB와의 상호작용)
  │    └── userModel.js         # 사용자 모델 (인증에 사용될 수 있음)
  └── server.js                 # Fastify 서버 설정 및 시작 파일
```
