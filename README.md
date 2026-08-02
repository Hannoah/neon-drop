# Tetris

브라우저에서 실행하는 Vanilla JavaScript Tetris입니다.

## 실행

프로젝트 디렉터리에서 정적 서버를 실행합니다.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://127.0.0.1:8000/`을 엽니다.

## 게임 모드

- Marathon: 일반 레벨업 게임
- Sprint: 40라인을 최대한 빠르게 삭제하는 모드
- 2P · Versus AI: 오프라인 AI와 Garbage를 주고받는 2인 대전 모드

블록은 7-bag 방식으로 공급되며, Tetris·T-spin·Combo·Back-to-back 점수를 Stats에서 확인할 수 있습니다.
Versus에서는 줄 삭제 공격과 승패 이벤트를 사용해 나중에 라이벌·토너먼트 스토리를 확장할 수 있습니다.

## 아키텍처

게임 로직은 ES 모듈로 분리되어 있으며, `tetris.js`가 브라우저 진입점 역할을 합니다.

```
src/js/
├── constants.js     # 상수 (피스 타입, 색상, 점수 테이블)
├── board.js         # 보드/피스 유틸 (충돌, 회전, 병합, 7-bag)
├── scoring.js       # 점수·garbage 어택·B2B/콤보 계산
├── ai.js            # AI 상대 휴리스틱 및 최적 수 탐색
├── audio.js         # Web Audio API 기반 BGM/SFX
├── renderer.js      # Canvas 렌더링 (보드, Next, Hold, 상대 보드)
└── leaderboard.js   # localStorage 리더보드 읽기/쓰기/렌더
```

`tetris.js`는 DOM 참조, 게임 상태, 게임 루프, 입력 처리를 담당하며,
Playwright E2E 테스트 호환성을 위해 테스트가 필요한 상태/함수를 `window`에 live getter/setter로 노출합니다.

## 테스트

유닛 테스트(Node 내장 test runner)와 Playwright E2E 회귀 테스트를 함께 실행합니다.

```bash
npm test            # 유닛 + Playwright 모두 실행
npm run test:unit   # 유닛 테스트만 실행 (test/unit/*.test.mjs)
```

## 보안 주의

`.env` 파일은 `.gitignore`에 등록되어 있으며 저장소에 커밋되지 않습니다.
GitHub 액세스 토큰 등의 비밀값은 저장소에 커밋하지 마세요.
