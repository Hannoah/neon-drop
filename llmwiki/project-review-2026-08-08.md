---
title: Neon Drop 프로젝트 리뷰 (2026-08-08)
date: 2026-08-08
status: reviewed
tags: review, architecture, security, accessibility, testing
---

# Neon Drop 프로젝트 리뷰 (2026-08-08)

이전 [[neon-drop-reliability-2026-08-01]] 이후 Neon Circuit 캠페인까지 포함한 전체 재리뷰다. 코드 수정은 하지 않았고, 결함 후보를 라인 단위로 교차 검증했다.

## 총평

순수 모듈 분리, 캠페인 진행도 정규화, Playwright 회귀, 8/1 접근성·설정 저장 수정은 유지되고 있다. 우선순위는 프로덕션 `window` 테스트 API 노출과 로컬 `.env` 토큰 위생, 이어서 hazard 타이밍·flash 렌더·모달 focus trap이다.

## Findings

### P1

- `tetris.js`가 Playwright용 상태·함수·시나리오 쓰기 API를 조건 없이 `window`에 노출한다.
- 워크스페이스 `.env`에 `GITHUB_TOKEN`이 있다. gitignore되어 추적되지는 않지만 로테이션을 권장한다. 토큰 값은 기록하지 않는다.

### P2

- 시나리오 hazard 타이머가 큰 `deltaTime` 이후 음수 부채를 쌓아 garbage가 연발될 수 있다 (`tetris.js` `updateScenarioState`).
- `renderer.js`가 `flashingLines.forEach` 중 `splice`하여 멀티라인 flash 항목을 건너뛸 수 있다.
- 모달에 `role="dialog"` / `inert`는 있으나 focus trap과 Escape dismiss가 없다.

### P3

- `tetris.js`(~1399 LOC)가 오케스트레이션·UI·모드·캠페인을 한곳에 둔다. `leaderboard.js`와 오케스트레이션 유닛 테스트가 없다.
- README의 Pulse Amp 표현이 설계 문서의 “positive attack일 때만 +1”보다 넓게 읽힌다. 구현은 설계와 일치한다.

## 검증

- `npm run test:unit` → 57 pass, 0 fail
- `.env`는 `.gitignore`에 의해 무시되며 git 추적 대상이 아님을 확인
- 핵심 결함 후보 라인 교차 검증

## 권장 다음 작업

1. 토큰 로테이션, 테스트 API를 `?test=1` 또는 빌드 타임 strip으로 가드
2. hazard 타이머 클램프, flashingLines 안전 제거, 모달 focus trap
3. 오케스트레이션 레이어 분리와 leaderboard 유닛 테스트, `package.json` name 정리
