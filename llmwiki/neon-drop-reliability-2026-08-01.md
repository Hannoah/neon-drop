---
title: Neon Drop 프로젝트 리뷰와 신뢰성 개선
date: 2026-08-01
status: implemented
tags: review, accessibility, persistence, testing, github
---

# Neon Drop 프로젝트 리뷰와 신뢰성 개선

Neon Drop 코드베이스를 전체 검토하고 실제 브라우저 재현을 통해 확인한 문제를 최소 변경으로 수정했다.

## 리뷰 결과

- Git이 설계 문서만 추적하고 애플리케이션 전체를 추적하지 않고 있었다.
- 모드 카드에 포커스를 둔 채 Enter를 누르면 선택한 모드가 아니라 Marathon이 시작됐다.
- 시작·일시정지·게임오버 오버레이에 dialog 의미, 초기 포커스, 배경 입력 차단이 없었다.
- 넓은 가로형 터치 기기는 터치 컨트롤 표시 조건에서 제외됐다.
- 선택한 모드와 BGM/SFX 설정이 새로고침 후 유지되지 않았다.
- `PIECE_NAMES`, 단일 garbage 함수, renderer shake API 일부가 사용되지 않았다.

## 구현

- Enter 이벤트가 포커스된 모드 카드를 먼저 선택한 뒤 게임을 시작하도록 수정했다.
- 기존 오버레이에 `role="dialog"`, `aria-modal`, 동적 `aria-labelledby`를 적용했다.
- 오버레이가 열리면 게임 영역에 네이티브 `inert`를 적용하고 화면별 기본 버튼으로 포커스를 이동한다.
- 반응형 미디어 쿼리에 `(pointer: coarse)`를 추가했다.
- `neonDropPreferences` JSON 하나에 모드와 BGM/SFX 설정을 저장한다.
- 저장소 접근과 JSON 파싱은 실패해도 게임을 막지 않도록 처리했다.
- 기존 leaderboard 저장 키는 호환성을 위해 유지했다.
- 사용되지 않는 코드 약 22줄을 삭제했다.

## 테스트

테스트를 먼저 추가해 다음 실패를 확인한 후 구현했다.

- Sprint 카드 Enter가 Marathon을 시작하는 회귀
- dialog 의미와 초기 포커스 부재
- coarse-pointer CSS 부재
- 모드와 사운드 설정 복원 부재
- 손상된 설정 JSON 처리

최종 `npm test` 결과:

- Node 테스트: 45개 통과, 실패 0개
- Playwright 브라우저 회귀 테스트: 전체 통과
- 브라우저 page error: 0개
- `git diff --cached --check`: 오류 없음

## Git 상태

- 설계 문서 커밋: `5bb7347 docs: design Neon Drop reliability fixes`
- 애플리케이션, 테스트, README, 패키지 파일은 staging 상태다.
- 구현 변경은 아직 별도 커밋하지 않았다.
- 루트의 빈 `AGENT.md`는 사용자 소유로 판단해 untracked 상태로 보존했다.

## GitHub 게시 상태

게시 대상은 `https://github.com/Hannoah/Neon-Drop.git`이다. GitHub CLI 기본 인증과 루트 `.env`의 토큰을 값 노출 없이 검증했으며 둘 다 `invalid`로 판정됐다. 새 인증이 제공되기 전까지 커밋과 원격 푸시는 보류한다.
