# Neon Drop

브라우저에서 실행하는 Vanilla JavaScript Tetris입니다. Guideline급 조작(SRS, DAS/ARR, 락 딜레이, 홀드 소프트 드롭), Next 5, T-Spin/Perfect Clear 점수, 설정 화면을 지원합니다.

UI는 **Concrete Arcade** 방향입니다: Syne + IBM Plex Sans, 토큰(`#121212` / `#1a1a1a` / `#2e2e2e` / `#f2f2f2` / `#8a8a8a` / accent `#ff6a3d`), Board Center 레이아웃(보드 히어로·Hold/Next 좌·스코어 우), Title Screen 메뉴, 글로우 없는 직각 크롬. 스타일은 `src/css/shell.css`.

## 실행과 테스트

```bash
npm start             # http://127.0.0.1:8000
npm test              # 유닛 + Playwright 회귀 테스트
npm run test:unit     # 유닛 테스트만 실행
```

Playwright 회귀는 `index.html?test=1`로 페이지를 열어 게임 훅을 사용합니다. 일반 플레이 URL에는 `window` 테스트 API가 노출되지 않습니다.

## 게임 모드

- Marathon: Level 15 클리어 · 시간 그레이드(S–D) · PB 페이스 고스트 · EDGE/STORM 페이즈
- Sprint / Daily: 40라인 레이스(Daily는 UTC 시드 고정) · 그레이드 · 로컬 PB · Daily는 UTC 스트릭
- Arcade: Cheese (가비지가 보드에서 사라질 때까지) · Invisible · 20G (프레임마다 바닥까지 낙하)
- Versus AI: 오프라인 AI와 Garbage를 주고받는 대전
- Tutorial: 라인 클리어 → Double → Hold 짧은 온보딩 (첫 실행 때 메뉴에서 안내)
- Neon Circuit: 진행도와 업그레이드가 저장되는 5스테이지 캠페인 (로게라이크)
- Cosmetics: 그레이드/업적 언락 프레임·클리어 이펙트 (`neonDropMeta`) — 언락 시 토스트

Neon Circuit의 경로는 다음과 같습니다.

| 스테이지 | 목표 | 변형 규칙 |
| --- | --- | --- |
| BYTE · Boot Sequence | 8라인 제거 | 기본 낙하 속도 |
| RUSH · Velocity Gate | 2분 30초 안에 15라인 제거 | 더 빠른 레벨별 낙하 가속 |
| GLITCH · Interference Zone | 18라인 제거 | 30초마다 Garbage 1줄 |
| MIRROR · Mirror Match | 라이벌 격파 | 플레이어 피스 고정마다 AI 1턴 |
| OVERLORD · Crown Protocol | 라이벌 격파 | 피스 고정마다 AI 2턴, 45초마다 Garbage 1줄 |

결과 화면의 `Retry Stage`는 진행도를 바꾸지 않고 현재 스테이지를 처음부터 다시 시작합니다. 첫 4개 스테이지는 최초 클리어 때만 업그레이드 하나를 선택합니다.

- Pulse Amp: 스택마다 점수 +20%, **positive attack**(공격량 `attack > 0`)마다 AI에게 보내는 Garbage +1줄
- Cryo Field: 스택마다 낙하 간격 +10%(최대 +30%)
- Firewall: 스택마다 Garbage 적용 1회 차단

캠페인의 해금 스테이지, 별, 최고 기록, 업그레이드와 미선택 보상은 `localStorage`의 `neonDropScenario`에 저장됩니다. `New Campaign`은 이 캠페인 데이터만 초기화하며 빠른 게임 설정과 리더보드는 유지합니다.

## 조작 (Guideline)

기본 바인딩(Classic 프리셋)은 다음과 같습니다.

- `←` / `→`: 이동 (DAS 후 ARR 자동 반복; ARR `0`은 DAS 이후 벽에 붙을 때까지 즉시 이동)
- `↓`: 소프트 드롭 **홀드** — 키를 누르고 있는 동안 낙하가 가속되고 칸마다 소프트 드롭 점수(+1)
- `↑`: 시계 방향 회전 (SRS 월킥)
- `A`: 180 회전 (실패 시 90도에 머물지 않음)
- `Space`: 하드 드롭 (칸마다 +2점 후 즉시 고정)
- `C`: Hold
- `P` 또는 `Esc`: 일시정지, `Q`: 메인 메뉴로 종료

Guideline 프리셋은 회전에 `Z`/`X`(및 `↑` CW)를 쓰고 180은 역시 `A`입니다. 저장된 설정에서 180이 비어 있고 `A`가 비어 있으면 자동으로 `A`를 채웁니다. 터치의 좌·우·소프트 드롭은 같은 DAS/ARR·홀드 로직을 쓰고, **180** 버튼이 있습니다. 일시정지 화면에 현재 바인딩 치트시트가 뜹니다.

## Settings

시작 메뉴와 일시정지 화면의 **Settings**에서 다음을 바꿀 수 있습니다.

- Classic / Guideline 컨트롤 프리셋
- 키 리바인드 (액션별 키 캡처; 충돌 시 기존 바인딩과 교체)
- DAS (50–400ms), ARR (0–100ms), Lock delay (100–1000ms)
- BGM / SFX 토글 (헤더 Sound 메뉴 대신 Settings에 통합)

값은 `neonDropPreferences`(version 2)에 저장되며 새로고침 후에도 유지됩니다. Settings는 포커스 트랩이 적용되고 `Esc`로 닫힙니다.

## Next 5 · 점수

- 좌측 **NEXT** 레일은 다음 피스 5개를 미리 보여 줍니다 (7-bag 큐). Hold는 그 위이며, 꺼낼 때 스폰 방향으로 리셋됩니다.
- T-Spin Mini/Full과 Perfect Clear 보너스를 Guideline 스타일로 계산합니다.
  - 예: soft drop +1/칸, hard drop +2/칸, PC 보너스 라인 수별 800–2000×레벨
  - T-Spin Mini Single은 점수는 주되 가비지는 보내지 않습니다. Full Single은 2줄입니다.
  - 라인을 못 지운 락(0라인 T-Spin 포함)은 콤보를 끊습니다. B2B는 0라인 T-Spin에서 유지됩니다.
  - B2B는 Tetris(4라인) 또는 라인을 지운 T-Spin에서 이어집니다.
- 이벤트 문구 예: `T-SPIN SINGLE`, `TETRIS`, `PERFECT CLEAR`

## 리더보드 세대

점수표는 `tetrisLeaderboard`에 `{ generation: 3, boards: { marathon: [...], sprint: [...] } }` 형태로 모드별로 저장됩니다. **generation이 다르거나 예전 배열/단일 scores 형식**의 데이터는 로드 시 비워집니다. 새 기록만 현재 모드 보드에 쌓입니다.

## 구조

게임 로직은 ES 모듈로 분리되어 있으며, `tetris.js`가 브라우저 진입점 역할을 합니다.

```
src/js/
├── constants.js     # 상수 (피스 타입, 색상, 점수 테이블)
├── board.js         # 보드/피스 유틸 (충돌, 병합, 7-bag 헬퍼)
├── queue.js         # Next 5 피스 큐
├── srs.js           # SRS 회전·월킥·180
├── juice.js         # 언락 카피·조작 범례·클리어 팬페어
├── gravity.js       # 낙하 스텝 / 20G
├── lock.js          # 락 딜레이 상태
├── input.js         # DAS/ARR·소프트 드롭 홀드
├── settings.js      # 설정 v2 정규화·프리셋·리바인드
├── scoring.js       # T-Spin/PC·드롭·Garbage·B2B
├── ai.js            # AI 상대 휴리스틱
├── audio.js         # Web Audio BGM/SFX
├── renderer.js      # Canvas (보드, Next 5, Hold, 상대 보드)
├── leaderboard.js   # generation 마커 리더보드
└── scenario.js      # 캠페인 스테이지·진행도·업그레이드
```

`tetris.js`는 DOM, 게임 루프, 입력을 담당합니다. 자동화 테스트용 훅은 `?test=1`일 때만 `window`에 노출됩니다.

## 보안 주의

`.env` 파일은 `.gitignore`에 등록되어 있으며 저장소에 커밋되지 않습니다. GitHub 액세스 토큰 등의 비밀값을 저장소에 커밋하지 마세요.
