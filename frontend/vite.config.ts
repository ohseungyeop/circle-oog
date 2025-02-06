import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    tsDecorators: true,          // TypeScript 데코레이터 지원 (옵션)
    jsxImportSource: "@emotion/react", // Emotion 스타일링 최적화
  })],
  server: {
    port: 3000,  // 원하는 포트로 변경
    strictPort: true,  // 사용 중이면 실행 실패 (다른 포트로 변경 X)
    host: true,  // 네트워크에서도 접근 가능

    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3300',
    //     changeOrigin: true,
    //     secure: false,
    //     rewrite: (path) => path.replace(/^\/api/, ''),
    //   }
    // }
  }
});
