import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const isProduction = mode === 'production';

    return {
        plugins: [
            react({
                tsDecorators: true, // TypeScript 데코레이터 지원 (옵션)
                jsxImportSource: '@emotion/react', // Emotion 스타일링 최적화
            }),
            nodePolyfills({
                globals: {
                    Buffer: true, // can also be 'build', 'dev', 'runtime', or false
                    process: true,
                },
            }),
        ],
        server: {
            port: 3000, // 원하는 포트로 변경
            strictPort: true, // 사용 중이면 실행 실패 (다른 포트로 변경 X)
            host: true, // 네트워크에서도 접근 가능
            open: true, // 브라우저 자동 실행
        },
        resolve: {
            alias: {
                util: 'util/', // util을 폴리필로 대체
                stream: 'stream-browserify', // stream을 폴리필로 대체
                crypto: 'crypto-browserify', // crypto를 폴리필로 대체
            },
        },
        define: {
            'process.env': {}, // 빈 객체로 정의하여 process 관련 오류 방지
        },
        build: {
            outDir: path.resolve(__dirname, 'dist'), // 'dist' 폴더에 빌드 결과물 저장
            emptyOutDir: true, // 빌드 전에 기존 파일 삭제
            // 프로덕션 환경에서 빌드 최적화 추가
            minify: isProduction ? 'esbuild' : false,
            sourcemap: !isProduction, // 프로덕션에서는 소스맵 비활성화
            rollupOptions: {
                // Rollup 옵션 설정
                output: {
                    entryFileNames: `assets/[name]-[hash].js`, // 엔트리 파일 이름 설정
                    chunkFileNames: `assets/[name]-[hash].js`, // 청크 파일 이름 설정
                    assetFileNames: `assets/[name]-[hash].[ext]`, // 애셋 파일 이름 설정
                },
            },
        },
    };
});
