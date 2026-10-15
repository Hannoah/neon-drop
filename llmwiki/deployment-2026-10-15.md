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
- 구현 커밋: `4fe0ac0` — 극강 아케이드 주스, 레이저 드롭 빔, 보드 위험/서지 펄스 아우라, 콤보 피치 상승, 울트라 모드, 모듈화.
- 배포 브랜치: `gh-pages`, 배포 커밋 `f6c4d44`.
- GitHub Pages가 `gh-pages`의 `/`를 게시하며 `.nojekyll`로 정적 파일을 제공한다.

## 배포 파일

검증한 소스 커밋에서 `git archive HEAD index.html tetris.js src favicon.svg`로 실행 파일을 추출하고 `.nojekyll`을 추가했다. 별도 worktree에서 `gh-pages` 브랜치에 배포 커밋을 생성·푸시했으며, 소스 작업 브랜치(`feature/theater-ink-ui`)도 origin에 푸시했다.

배포물에는 위 실행 파일(`index.html`, `tetris.js`, `favicon.svg`, `src/`)만 포함한다. `.env`, 테스트, 작업 기록과 개발 의존성은 포함하지 않는다.

## 검증

- 배포 직전 `npm test`: 유닛 154개와 브라우저 회귀 35개 스위트 전체 통과.
- GitHub Actions 실행 `38747914549`의 build·report-build-status·deploy 전체 성공.
- 사이트 `https://hannoah.github.io/neon-drop/` 및 `src/js/particles.js` HTTP 200 확인.
- 모바일/데스크톱 뷰포트 및 번역/오디오/파티클 시스템 무결성 확인.
