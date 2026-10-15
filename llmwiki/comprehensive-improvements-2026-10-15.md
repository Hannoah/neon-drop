---
title: 2026-10-15 종합 개선 (비주얼/SFX, QoL 재시작, Ultra 모드, 모듈화)
date: 2026-10-15
status: implemented
tags: visual, particles, audio, qol, modes, modularization, testing
---

# 종합 개선 (비주얼/SFX, QoL 재시작, Ultra 모드, 모듈화)

사용자 요청에 따라 Neon Drop의 4대 핵심 영역을 종합 개선했다.

## 구현 내용

1. **비주얼 & 사운드 연출 강화 (Juice & Sensory Polish)**
   - `src/js/particles.js`: 네온 라인 클리어 스파크 및 특수 클리어 충격파 링 파티클 시스템 구현.
   - `arenaSweep` 시 소거되는 라인의 각 미노 색상에 맞춘 스파크 방출.
   - Tetris(4라인), T-Spin, Perfect Clear 시 방사형 네온 버스트 및 확산 충격파 링 렌더링.
   - `src/js/audio.js`: 레벨업 팡파르(`levelUp`) 및 재시작 비프(`restart`) SFX 추가.

2. **극강의 아케이드 게임성 & UI 임팩트 (Extreme Visual Juice & Impact)**
   - **하드 드롭 레이저 빔 기둥 (`spawnDropBeams`)**: 피스가 급강하할 때 낙하 궤적 열(column)을 따라 잔상 레이저 광선 렌더링.
   - **지면 착지 스파크 (`spawnGroundImpact`)**: 피스가 바닥에 꽂힐 때 위쪽으로 튀는 지면 충격 불꽃 연출.
   - **보드 위험 & 서지 펄스 네온 아우라 (`.is-danger`, `.is-surge`)**: 블록이 5층 이상 위험 고도에 도달하면 보드 캔버스 테두리가 위협적인 붉은색 네온 펄스로 호흡, 콤보 2 이상/B2B/고 플로우 상태에서는 전율하는 사이언/앰버 번개 아우라 발동.
   - **고스트 피스 호흡 애니메이션**: 착지 예상 고스트 미노가 사인파 주기에 맞춰 부드럽게 네온 빛을 발산하며 생동감 부여.
   - **액션 팝업 네온 임팩트 (`#clear-reward`, `clearRewardPop`)**: `TETRIS`, `T-SPIN`, `PERFECT`, `COMBO xN` 달성 시 화면 중앙에서 네온 글로우와 함께 폭발적인 스케일 팝업 연출.
   - **콤보 사운드 피치 연속 상승 & 하드 드롭 서브베이스**: 연속 콤보 달성 시 A4~E6 펜타토닉 음계로 사운드 주파수가 고조되는 음악적 쾌감 및 하드 드롭 시 75Hz 서브베이스 펀치 임팩트 추가.

3. **조작 및 편의 기능 (QoL & Controls)**
   - 일시정지 화면(`#pause-screen`)에 `Restart` (`#pause-restart-btn`) 버튼 추가.
   - 게임 오버 화면(`#game-over-screen`)에 `Play Again` (`#play-again-btn`) 버튼 추가.
   - 일시정지 중 또는 게임 오버 화면에서 `KeyR` 단축키 입력 시 즉시 현재 모드로 새 게임 시작.

4. **게임플레이 모드 확장: Ultra (2분 타임어택)**
   - 120초(2분) 제한 시간 점수 경쟁 모드 `ultra` 추가.
   - 타이머 카운트다운(`02:00` → `00:00`) 및 남은 시간 표시.
   - 120초 만료 시 "시간 초과!(Time Up!)"와 함께 게임 완료 및 리더보드/PB 기록.
   - 모드 셀렉터 및 카드 UI, 다국어 번역(`src/js/i18n.js`) 추가.

5. **코드 아키텍처 리팩토링 (Safe Modularization)**
   - `src/js/modal.js`: 접근성 모달 관리자(`openModal`, `closeModal`, `restorePreviousFocus`) 및 포커스 트랩(`trapFocus`) 모듈 분리.
   - `src/js/particles.js`: 파티클 물리 갱신 및 캔버스 렌더링 독립 모듈화.
   - `tetris.js`의 복잡도를 분산하고 기존 `liveState`/`exposed` 전역 테스트 훅 계약 100% 보존.

## 검증 결과

- `npm run test:unit`: 154개 유닛 테스트 전원 통과 (파티클 드롭빔/착지스파크 테스트 포함).
- `node test-tetris.cjs`: Playwright 브라우저 회귀 테스트(신규 `testComprehensiveImprovements`, `testExtremeArcadeJuiceAndImpact` 포함 총 35개 스위트) 전원 통과.
- `node --check` 모든 JS 파일 문법 무결성 검증.
- `i18n.test.mjs`를 통한 HTML/JS 번역 키 누락 없음 검증.
