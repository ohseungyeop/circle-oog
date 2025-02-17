module.exports = {
    apps: [
      // 로컬 개발 서버 설정
      {
        name: 'vos-oog-frontend-local',
        script: 'npm',
        args: 'run dev',  // 로컬 개발 환경에서 Vite 개발 서버 실행
        env: {
          NODE_ENV: 'local',  // 로컬 환경 설정
          VITE_BACKEND_URL: 'http://localhost:3000',  // 로컬 API URL
        }
      },
      // 운영 서버 설정
      {
        name: 'vos-oog-frontend',
        script: 'npm',
        args: 'run build && npm run preview',  // 빌드 후 프로덕션 서버 실행
        env_production: {
          NODE_ENV: 'production',  // 프로덕션 환경 설정
          VITE_BACKEND_URL: 'http://172.20.12.6:3300',  // 프로덕션 API URL
        }
      }
    ]
};
