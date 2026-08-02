---
title: Neon Drop 데스크톱 Arena HUD 개편
date: 2026-08-01
status: implemented
tags: ui, versus, desktop, testing
---

# Neon Drop 데스크톱 Arena HUD 개편

Versus AI 화면을 1280×720 데스크톱에서 스크롤 없이 플레이할 수 있는 Tactical Neon 경기장형 HUD로 개편했다.

## 구현

- AI 보드, 중앙 VS 압박 정보, 플레이어 보드, 점수·Hold·Next 레일을 한 행에 배치했다.
- 하단에는 Lines, Combo, Back-to-Back, Event 상태를 고정 배치했다.
- AI와 플레이어 보드를 같은 크기로 유지하고 `AI RIVAL`, `YOU` 레이블로 구분했다.
- 대기 공격량을 `AI INCOMING`, `YOU INCOMING` 숫자와 비례 미터로 실시간 표시한다.
- Marathon과 Sprint에서는 상대 보드와 VS 상태를 숨기고 플레이어 중심 레이아웃을 사용한다.
- 기존 모바일 터치 컨트롤과 반응형 배치는 유지했다.

## 검증

- `npm test`: Node 테스트 45개와 브라우저 회귀 테스트 전체 통과
- 1280×720 실제 브라우저: 문서 크기 1280×720, Arena HUD 928×584, 스크롤 없음
- 캡처: `output/playwright/versus-arena-hud.png` (Git 제외)

## 관련 문서

- 설계: `docs/superpowers/specs/2026-08-01-versus-ui-redesign.md`
- 구현 계획: `docs/superpowers/plans/2026-08-01-desktop-arena-hud.md`
