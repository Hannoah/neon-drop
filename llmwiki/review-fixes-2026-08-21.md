---
title: 2026-08-21 리뷰 결함 수정
date: 2026-08-21
status: implemented
tags: gameplay, scoring, leaderboard, testing
---

# 2026-08-21 리뷰 결함 수정

2026-08-21 정적 리뷰에서 확인한 플레이 버그와 규칙 편차를 수정했다. `tetris.js` 전체 분리는 회귀 범위가 커서 이번 작업에서 제외했다.

## 수정

- 20G: `gravity.js`가 interval ≤ 1ms를 instant gravity로 보고, 한 프레임에 바닥까지 낙하한다.
- 0라인 T-Spin: `comboAfterLock`이 라인 없는 락마다 콤보를 0으로 만든다. B2B는 그대로 유지.
- T-Spin Mini 가비지: `MINI_GARBAGE_SCORES` ([0, 0, 1, 2]). Mini Single은 0줄, Full Single은 2줄.
- 톱아웃 메타: `showHighScoreModal` / 시나리오 종료에서 `noteRunEnd`+`writeMeta`. 클리어 경로와 게임이 이중 카운트되지 않는다.
- Pause: 라인 클리어 플래시(`pendingClear`) 중에도 일시정지 가능.
- rotate180: `tryRotate180`이 원자적으로 180 회전한다. 실패 시 90도에 머물지 않는다.
- Hold: 스폰 매트릭스와 `initialRotationFor`로 리셋한다.
- Cheese: 가비지 셀(값 8)이 없어지면 클리어. 30라인 레이스가 아니다.
- ARR 0: DAS 이후 emit이 false를 반환할 때까지 한 틱에 벽에 붙는다.
- 리더보드 generation 3: 모드별 `boards`. gen 2 `scores` 배열은 로드 시 비운다.

## 검증

- `npm test`: 유닛 122개 통과, Playwright 회귀(testReviewFixes 포함) 전체 통과

## 관련

- 리뷰 캔버스: 2026-08-21 bugs-improvements
