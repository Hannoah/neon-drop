---
title: Neon Drop Theater Ink UI 개편
date: 2026-08-09
status: implemented
tags: ui, theater, ink, testing
---

# Neon Drop Theater Ink UI 개편

시작 메뉴·인게임 HUD·일시정지·설정을 Ink Contrast + Theater Focus로 전면 재구성했다. Guideline 엔진 규칙은 변경하지 않았다.

## 구현

- DM Sans와 토큰 `--bg #0e1014`, `--panel #161a22`, `--border #2a2f3a`, `--text #f5f7fa`, `--muted #8b93a7`, `--accent #5eead4`를 적용했다.
- 시작 화면: 브랜드 히어로, 태그라인, 보드 실루엣, Play CTA, 모드 토글, Circuit·Settings 보조, Leaderboard·Exit 삼차.
- 인게임: Hold/Next 좌측, 보드 중앙, 점수·메타 우측. 솔로에서 빈 spacer 열 제거.
- 헤더 Ranks/Sound/Help details 제거. Pause 버튼 추가. BGM/SFX는 Settings로 이동.
- `#scenario-continue-btn` 등 게임/테스트 ID는 유지했다.

## 검증

- `npm test`: Node 유닛 테스트 102개 통과, Playwright 브라우저 회귀 전체 통과 (`All Neon Drop tests passed.`).

## 관련 문서

- 설계: `docs/superpowers/specs/2026-08-09-theater-ink-ui-design.md`
- 계획: `docs/superpowers/plans/2026-08-09-theater-ink-ui.md`
