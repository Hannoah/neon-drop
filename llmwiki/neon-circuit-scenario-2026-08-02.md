---
title: Neon Circuit 시나리오 캠페인
date: 2026-08-02
status: implemented
tags: gameplay, campaign, persistence, accessibility, testing
---

# Neon Circuit 시나리오 캠페인

기존 빠른 게임과 같은 엔진을 사용하는 5스테이지 캠페인을 구현했다. 승인된 메뉴 구조에 따라 시작 화면의 `Continue Campaign` 카드에서 맵, 브리핑, 결과, 보상 화면으로 이동하며 Marathon, Sprint, Versus AI 선택은 그대로 유지한다. `Exit Game`은 창 닫기를 먼저 시도하고 허용되지 않으면 앱 안의 종료 안내를 표시한다.

## 스테이지와 보상

| 라이벌 | 목표와 변형 규칙 |
| --- | --- |
| BYTE | 8라인, 기본 낙하 속도 |
| RUSH | 2분 30초 안에 15라인, 빠른 낙하 가속 |
| GLITCH | 18라인, 30초마다 Garbage 1줄 |
| MIRROR | 라이벌 격파, 피스 고정마다 AI 1턴 |
| OVERLORD | 라이벌 격파, 피스 고정마다 AI 2턴과 45초 간섭 |

첫 4개 스테이지의 최초 클리어마다 Pulse Amp, Cryo Field, Firewall 중 하나를 선택한다. Pulse는 스택마다 점수 20%와 AI에게 보내는 공격 1줄을 더하고, Cryo는 낙하 간격을 스택마다 10%(최대 30%) 늘리며, Firewall은 스택마다 Garbage 적용 한 번을 막는다. 재도전은 현재 스테이지의 보드·타이머·업그레이드 충전을 초기화하지만 저장 진행도는 바꾸지 않는다.

## 상태와 엔진 경계

- `neonDropScenario`에 버전, 해금 스테이지, 스테이지별 별·최고 시간, 업그레이드 스택, 미선택 보상, 캠페인 완료 여부를 저장한다.
- `New Campaign`은 이 키만 초기화하며 `neonDropPreferences`와 `tetrisLeaderboard`는 보존한다.
- 클리어와 보상 선택은 후보 상태를 만든 뒤 저장이 성공한 경우에만 메모리 상태를 교체한다. 저장 실패 시 해금·별·보상을 지급하지 않고 재시도 가능한 오류를 표시해 보상 파밍과 메모리/저장소 불일치를 막는다.
- `hasScenarioOpponent()`, `opponentPlayActive()`, `playerGarbageActive()`가 모드 경계를 공유한다. 캠페인 상대도 기존 AI 수 탐색, 보드 렌더링, 점수·Garbage 큐, 경기 이벤트와 승패 처리를 재사용한다.

## TDD와 리뷰 수정

- 결과 키는 `"1"`부터 `"5"`까지의 정규 문자열만 복원하도록 정규화했다.
- 캠페인 카드의 Enter가 빠른 게임을 시작하지 않게 했고, 메뉴 키보드 이동만으로 BGM이 재개되지 않게 했다.
- 세로·coarse-pointer 맵은 모달 내부에서 스크롤하며 모든 버튼에 도달할 수 있게 했다.
- 간섭 타이머는 실제 초과분을 다음 주기에 반영하고, 큰 프레임 간격에도 한 번만 큐에 넣어 cadence를 보존한다.
- 플레이어 피스 고정 경로에서 MIRROR 1턴, OVERLORD 2턴이 실제로 실행되는 통합 회귀를 추가했다.
- 최초 클리어만 보상을 만들고 저장 오류 때 상태를 커밋하지 않아 반복 클리어 보상 파밍과 저장 실패 손실을 막았다.

## 최종 검증

- `npm test`: Node 유닛 테스트 56개 통과, 브라우저 회귀 테스트 전체 통과, page error 0개
- 1280×720 캠페인 맵: 문서 1280×720, 맵 684×468.35 (`x=298`, `y=125.82`), 5개 노드 `y=206.73`, 모든 액션이 화면 안에 위치
- 1280×720 OVERLORD: Arena HUD 928×584 (`x=176`, `y=68`), AI·플레이어 보드 각각 244×404, 목표 문구 한 줄, 문서 스크롤 없음
- 시각 확인: `output/playwright/neon-circuit-map.png`, `output/playwright/neon-circuit-boss.png`에서 잘림 없이 계층과 레이블을 읽을 수 있고 양쪽 보드 크기가 같음
