# 배포 안내

## 로컬 검증

```bash
npm ci
npm test
npm run test:e2e
npm run build
npm run test:pwa
npm run check:bundle
```

## GitHub Pages

`main` 브랜치에 푸시하면 `.github/workflows/deploy-pages.yml`이 테스트와 Vite 빌드를 실행한 뒤 `dist`를 배포한다. 사이트는 `/dolldom-arcade/` 하위 경로를 사용하므로 `vite.config.js`의 `base`를 유지한다.

## 릴리스

검증된 커밋에 `vX.Y.Z` 형식의 태그를 푸시하면 `.github/workflows/release.yml`이 GitHub Release와 자동 릴리스 노트를 만든다. 버전 변경 시 `package.json`, 화면 버전, 서비스 워커 캐시 이름, `CHANGELOG.md`를 함께 갱신한다.

## Codex Sites

`.openai/hosting.json`은 기존 백업 사이트 연결 정보다. 사용자가 백업 배포를 명시적으로 요청한 경우에만 기존 프로젝트의 새 버전으로 배포한다.
