# 새 미니게임 추가 방법

1. `template/` 폴더를 새 게임 id로 복사합니다.
2. `game.js`의 기본 정보와 `card` 정보를 수정합니다.
3. `create()` 안에서 게임별 상태와 `init`, `update`, `render`, `destroy`를 구현합니다.
4. 키보드와 터치가 같은 `onAction` 흐름을 사용하도록 연결합니다.
5. 점수는 `onScore`, 종료는 `onEnd`, 효과음은 `sound.play()`로 알립니다.
6. `src/games/index.js`에서 모듈을 import하고 `createGameRegistry()` 배열에 추가합니다.
7. `npm test`, `npm run build`, `npm run test:e2e`로 회귀를 확인합니다.

## 게임 모듈 규칙

- 게임 상태는 `create()` 내부에서 관리합니다.
- 화면 업데이트는 `update(deltaTime)`, 그리기는 `render()`가 담당합니다.
- Canvas 크기는 논리 좌표 `720 × 360`을 기준으로 사용합니다.
- 이벤트, 타이머, 오디오 등 게임이 직접 만든 리소스는 `destroy()`에서 정리합니다.
- 다른 게임 모듈의 내부 코드를 직접 import하지 않습니다.
- 공통 기능이 필요하면 먼저 `src/core/` 또는 `src/games/shared/`에 둘 가치가 있는지 검토합니다.
