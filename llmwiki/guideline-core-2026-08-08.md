---
title: Guideline 코어 업그레이드
date: 2026-08-08
status: implemented
tags: gameplay, settings, scoring, testing, accessibility
---

# Guideline 코어 업그레이드

Wave A Guideline 코어를 반영했다. 모든 모드가 SRS 회전, DAS/ARR, 락 딜레이, 홀드 소프트 드롭, Next 5 미리보기, T-Spin/Perfect Clear 점수 규칙을 공유하며, 설정 화면에서 프리셋·리바인드·타이밍을 바꿀 수 있다.

## 엔진과 모듈

- `queue.js`: 7-bag 기반 Next 5 미리보기
- `srs.js`: 월킥 포함 SRS 회전
- `lock.js`: 락 딜레이와 리셋
- `input.js`: 좌우 DAS/ARR, 소프트 드롭 홀드
- `settings.js`: preferences v2, Classic/Guideline 프리셋, 바인딩 충돌 교체
- `scoring.js` / `constants.js`: T-Spin Mini/Full, Perfect Clear, soft/hard drop 점수, B2B
- `leaderboard.js`: `LEADERBOARD_GENERATION = 2` — 예전 배열·다른 generation 기록은 로드 시 초기화
- `renderer.js`: Next 5 스택 렌더, 라인 플래시 splice 안전 처리
- `tetris.js`: 모듈 배선, Settings 포커스 트랩, `?test=1`일 때만 Playwright 훅 노출

## 설정과 접근성

- 시작 메뉴·일시정지에서 Settings를 연다.
- DAS 50–400ms, ARR 0–100ms(0은 infinite ARR), Lock 100–1000ms.
- 모달 포커스 트랩과 Escape 닫기를 적용한다. 배경 클릭으로는 닫지 않는다.
- Pulse Amp 문구는 positive attack(`attack > 0`)에만 보내는 Garbage +1줄로 README와 구현을 맞췄다.

## 검증

- Playwright: Next 5 데이터/캔버스, 소프트 드롭 홀드 점수 경로, 설정 리바인드·타이밍 리로드 유지, 포커스 트랩/Escape, 레거시 리더보드 wipe, `?test=1` 게이트, 기존 Marathon/Sprint/Versus/Circuit 스모크
- 최종 검증: `npm test` — Node 유닛 101개 통과, Playwright 브라우저 회귀 전체 통과

## 관련 문서

- 설계: `docs/superpowers/specs/2026-08-08-guideline-core-upgrade-design.md`
- 계획: `docs/superpowers/plans/2026-08-08-guideline-core-upgrade.md`
