# Neon Drop

브라우저에서 실행하는 Vanilla JavaScript Tetris입니다.

## 실행과 테스트

```bash
npm start             # http://127.0.0.1:8000
npm test              # 유닛 + Playwright 회귀 테스트
npm run test:unit     # 유닛 테스트만 실행
```

## 게임 모드

- Marathon: 일반 레벨업 게임
- Sprint: 40라인을 최대한 빠르게 삭제
- Versus AI: 오프라인 AI와 Garbage를 주고받는 대전
- Neon Circuit: 진행도와 업그레이드가 저장되는 5스테이지 캠페인

Neon Circuit의 경로는 다음과 같습니다.

| 스테이지 | 목표 | 변형 규칙 |
| --- | --- | --- |
| BYTE · Boot Sequence | 8라인 제거 | 기본 낙하 속도 |
| RUSH · Velocity Gate | 2분 30초 안에 15라인 제거 | 더 빠른 레벨별 낙하 가속 |
| GLITCH · Interference Zone | 18라인 제거 | 30초마다 Garbage 1줄 |
| MIRROR · Mirror Match | 라이벌 격파 | 플레이어 피스 고정마다 AI 1턴 |
| OVERLORD · Crown Protocol | 라이벌 격파 | 피스 고정마다 AI 2턴, 45초마다 Garbage 1줄 |

결과 화면의 `Retry Stage`는 진행도를 바꾸지 않고 현재 스테이지를 처음부터 다시 시작합니다. 첫 4개 스테이지는 최초 클리어 때만 업그레이드 하나를 선택합니다.

- Pulse Amp: 스택마다 점수 +20%, AI에게 보내는 공격 +1줄
- Cryo Field: 스택마다 낙하 간격 +10%(최대 +30%)
- Firewall: 스택마다 Garbage 적용 1회 차단

캠페인의 해금 스테이지, 별, 최고 기록, 업그레이드와 미선택 보상은 `localStorage`의 `neonDropScenario`에 저장됩니다. `New Campaign`은 이 캠페인 데이터만 초기화하며 빠른 게임 설정과 리더보드는 유지합니다.

## 조작

- `←`/`→`: 이동, `↓`: 소프트 드롭, `↑`: 회전
- `Space`: 하드 드롭, `C`: Hold
- `P` 또는 `Esc`: 일시정지, `Q`: 메인 메뉴로 종료
- 터치 기기에서는 같은 동작의 화면 버튼을 사용합니다.

메뉴의 `Exit Game`은 확인 후 창 닫기를 시도합니다. 브라우저가 닫기를 허용하지 않으면 종료 안내 화면으로 전환됩니다.

## 구조

게임 상태와 입력은 `tetris.js`, 보드·점수·AI·오디오·렌더링·캠페인 규칙은 `src/js/`의 ES 모듈에 있습니다. 블록은 7-bag 방식으로 공급됩니다.
