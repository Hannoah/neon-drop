---
title: 2026-08-22 아케이드 셀 패스
date: 2026-08-22
status: implemented
tags: ux, juice, onboarding, settings, retention
---

# 2026-08-22 아케이드 셀 패스

브라우저 테트리스를 첫 실행부터 보상까지 팔릴 제품처럼 다듬었다. Concrete Arcade 톤은 유지했다.

## 편의

- Classic / Guideline 모두 180을 `A`에 기본 바인딩. 저장된 설정에서 180이 비어 있고 `A`가 비어 있으면 채운다. `A`가 이미 다른 액션이면 건드리지 않는다.
- 일시정지 화면에 현재 바인딩 치트시트.
- 터치 **180** 버튼.
- Play 버튼이 선택된 모드 이름을 보여 준다.

## 도파민

- Tetris / T-Spin / Perfect / 콤보 팬페어 SFX와 보드 위 큰 카피.
- 하드 드롭 thud.
- 코스메틱 언락 토스트 (`Gold Frame`처럼 사람이 읽는 이름).
- 결과 화면 그레이드 카피가 `Grade S · ★★★ · NEW PB` 형식.

## 니즈 / 리텐션

- 튜토리얼을 안 끝낸 플레이어에게 첫 실행 안내.
- Daily UTC 스트릭과 다음 시드까지 남은 시간.
- 모드 카드 설명을 다시 보이게 함.

## 검증

- `npm test`: 유닛(juice/settings/meta/audio/package 포함) + Playwright `testArcadeFeel` 포함 회귀
