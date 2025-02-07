import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    tsDecorators: true,          // TypeScript 데코레이터 지원 (옵션)
    jsxImportSource: "@emotion/react", // Emotion 스타일링 최적화
  }), nodePolyfills()],
  server: {
    port: 3000,  // 원하는 포트로 변경
    strictPort: true,  // 사용 중이면 실행 실패 (다른 포트로 변경 X)
    host: true,  // 네트워크에서도 접근 가능
    open: true  // 브라우저 자동 실행
  },
  resolve: {
    alias: {
      util: 'util/',  // util을 폴리필로 대체
      stream: 'stream-browserify',  // stream을 폴리필로 대체
      crypto: 'crypto-browserify'  // crypto를 폴리필로 대체
    }
  },
  define: {
    'process.env': {}  // 빈 객체로 정의하여 process 관련 오류 방지
  }
});
