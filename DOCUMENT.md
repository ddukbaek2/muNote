# 개발

## 명령어

```bash
npm install
npm run dev       # 개발 서버 (http://localhost:5173)
npm run build     # 프로덕션 빌드 → dist/
npm run preview   # dist/ 정적 서빙 (http://localhost:4173)
```

## 정적 배포

`vite.config.js` 에 `base: "./"` 가 설정되어 있어 빌드 결과(`dist/`)는 어떤 정적 호스팅(서브경로 / `file://` / Capacitor `capacitor://`)에서도 그대로 동작합니다.
