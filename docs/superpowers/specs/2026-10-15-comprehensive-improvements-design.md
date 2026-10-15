# 2026-10-15 종합 개선 설계 (Comprehensive Improvements Design)

## 배경 및 목표

사용자 피드백에 따라 Neon Drop의 4가지 주요 영역을 종합적으로 개선한다:
1. **비주얼 & 사운드 연출 강화 (Juice & Sensory Polish)**: 라인 클리어 파티클 시스템 구현, Tetris/T-Spin/Perfect Clear 특수 연출, Web Audio SFX 및 팡파르 확장.
2. **조작 및 편의 기능 (QoL & Controls)**: 일시정지 및 게임 오버 화면에서 원클릭 재시작(Restart / Play Again), 단축키 `R` 빠른 재시작 지원.
3. **게임플레이 모드 확장 (Gameplay Modes)**: 2분 타임어택 `Ultra` 모드 추가 (120초 카운트다운 타이머, 점수 경쟁, 리더보드 연동, i18n).
4. **코드 아키텍처 리팩토링 (Safe Modularization)**: 파티클 물리/렌더링 시스템(`particles.js`), 모달/포커스 트랩 유틸리티(`modal.js`)를 분리하여 `tetris.js`의 복잡도를 낮추고 기존 테스트 계약을 100% 보존.

---

## 1. 비주얼 & 사운드 연출 강화

### 1.1 네온 파티클 시스템 (`src/js/particles.js`)
- **Particle**: 위치(`x`, `y`), 속도(`vx`, `vy`), 색상(`color`), 크기(`size`), 수명(`life`, `maxLife`), 감쇠 및 중력.
- **Shockwave Ring**: 특수 클리어 시 방사형으로 확산되는 네온 링 이펙트.
- **메서드**:
  - `spawnLineClear(y, minoValues, cols)`: 클리어되는 라인의 각 미노 위치에서 색상에 맞는 스파크 파티클 방출.
  - `spawnSpecialBurst(x, y, color, count)`: Tetris, T-Spin, Perfect Clear 발생 시 방사형 네온 버스트 및 충격파 링 생성.
  - `update(deltaSeconds)`: 물리 및 수명 갱신, 풀 정리 (최대 120개 파티클로 모바일 성능 보장).
  - `draw(ctx)`: 보드 캔버스 논리 좌표계에 맞추어 알파 페이드 및 블렌딩 렌더링.

### 1.2 Web Audio SFX 보강 (`src/js/audio.js`)
- `levelUp`: 레벨 상승 시 짧은 상승 팡파르.
- `restart`: 게임 재시작 시 경쾌한 신스 비프.
- 기존 사운드 시스템과의 100% 하위 호환 유지.

---

## 2. 조작 및 편의 기능 (QoL)

### 2.1 UI 재시작 버튼
- **일시정지 화면 (`#pause-screen`)**:
  - `#pause-restart-btn` 추가: "Restart" / "재시작"
  - 클릭 시 즉시 현재 모드로 새 게임 시작.
- **게임 오버 화면 (`#game-over-screen`)**:
  - `#play-again-btn` 추가: "Play Again" / "다시 하기"
  - 모달 닫기 및 즉시 새 게임 시작.

### 2.2 빠른 재시작 단축키
- 일시정지(`isPaused`) 또는 게임 오버(`isGameOver`) 상태에서 `KeyR` 키 입력 시 즉시 현재 모드 재시작.

---

## 3. 게임플레이 모드 확장: Ultra (2분 타임어택)

### 3.1 규칙 및 타이밍
- **제한 시간**: 120,000ms (2분).
- **타이머 HUD**: 일반 모드의 경과 시간 대신 `02:00`부터 `00:00`까지 카운트다운 표시.
- **종료 조건**: 시간 만료 시 "Time's Up!" / "시간 종료!"와 함께 게임 종료 및 최종 점수 모달 표시.
- **리더보드**: `tetrisLeaderboard`의 `ultra` 보드에 최고 점수 랭킹 저장.

### 3.2 UI 및 다국어 (i18n)
- `#game-mode` 셀렉터 및 메뉴 `.mode-options`에 Ultra 카드 추가.
- `src/js/i18n.js`에 관련 모든 영문/한국어 번역 키 등록.

---

## 4. 코드 아키텍처 리팩토링

### 4.1 모듈 분리
- `src/js/particles.js`: 파티클 및 충격파 연출 전담 모듈.
- `src/js/modal.js`: `openModal`, `closeModal`, `trapFocus`, `restorePreviousFocus` 등 접근성 모달 헬퍼 분리.
- `tetris.js`는 `particles.js`, `modal.js`를 import하여 사용.

### 4.2 테스트 계약 보존
- `window` 객체에 노출되는 `liveState`, `exposed` 및 `?test=1` 게이트 그대로 유지.
- 147개 유닛 테스트 및 32개 Playwright 브라우저 회귀 테스트 전원 통과 보장.
