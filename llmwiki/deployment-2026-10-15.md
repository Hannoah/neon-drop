---
title: 2026-10-15 GitHub Pages 배포
date: 2026-10-15
status: deployed
tags: deployment, github-pages, testing
---

# GitHub Pages 배포

- 서비스 주소: https://hannoah.github.io/neon-drop/
- 소스 저장소: `Hannoah/neon-drop`
- 소스 브랜치: `feature/theater-ink-ui`
- 구현 커밋: `31a3dd3` — 한국어 지원, UI 표시 분리, 설정·ARR·B2B 수정.
- 배포 브랜치: `gh-pages`, 배포 커밋 `e235b8e`.
- GitHub Pages가 `gh-pages`의 `/`를 게시하며 `.nojekyll`로 정적 파일을 제공한다.

## 배포 파일

검증한 소스 커밋에서 `git archive HEAD index.html tetris.js src favicon.svg`로 실행 파일을 추출하고 `.nojekyll`을 추가했다. 별도 임시 Git 저장소에서 배포 브랜치를 생성·푸시했으며, 현재 소스 브랜치와 원격 main은 변경하지 않았다. 소스 작업 브랜치도 origin에 푸시했다.

배포물에는 위 실행 파일 24개만 포함한다. `.env`, 테스트, 작업 기록과 개발 의존성은 포함하지 않는다. 다음 배포에도 검증한 소스의 실행 파일을 `gh-pages`에 반영해야 한다. 소스 브랜치 푸시만으로 사이트가 갱신되지는 않는다.

## 검증

- 배포 직전 `npm test`: 유닛 147개와 브라우저 회귀 전체 통과.
- GitHub Actions 실행 `38737530629`의 build·report-build-status·deploy 성공.
- Pages API `status: built`와 사이트 HTTP 200 확인.
- 실제 서비스 주소에서 Chromium 모바일 크기(390×844), 한국어 브라우저로 확인:
  - 한국어 첫 화면, 언어 선택과 영어 전환.
  - 새로고침 후 저장 언어 유지.
  - 모바일 설정창 내부 가로 넘침 없음.
  - 게임 시작과 일시정지 정상 동작.
  - 번역 모듈과 CSS HTTP 200, 페이지 JavaScript 오류 없음.
  - 프로덕션 테스트 훅 미노출, `/.env` 요청 HTTP 404.
- 실제 모바일 기기, Safari·Firefox 검증은 수행하지 않았다.
