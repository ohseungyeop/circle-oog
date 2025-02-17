interface ImportMetaEnv {
    readonly VITE_BACKEND_URL: string;  // ✅ 사용 중인 환경 변수 추가
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
