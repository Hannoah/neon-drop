# Korean Support Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the translation foundation and review. Integrate dependent game changes sequentially in this workspace, preserving the existing uncommitted fixes.

**Goal:** 한국어·영어 전환과 저장을 지원하고 표시 코드를 분리한다.

**Architecture:** `i18n.js`는 영어 원문 키와 한국어 사전, 언어 선택, 매개변수 치환을 담당한다. `ui.js`는 명시적인 DOM 번역 키 적용과 언어 전환 시 갱신을 담당한다. 게임 데이터와 규칙은 기존 모듈에 유지한다.

**Tech Stack:** Vanilla ES modules, Node test runner, Playwright. 새 의존성 없음.

### Task 1: 번역 기반과 정적 UI

- [x] `test/unit/i18n.test.mjs`에서 `resolveLanguage(undefined, ['ko-KR']) === 'ko'`, 저장 영어 우선, 미지원 언어 영어 대체, `t('LEVEL {level}', {level: 3}, 'ko') === '레벨 3'`를 검증한다. 구현 전에 실행해 실패를 확인한다.
- [x] `src/js/i18n.js`에 `resolveLanguage(saved, languages)`, `setLanguage(language)`, `getLanguage()`, `t(source, params, language)`를 구현한다. 번역 키는 영어 원문이며 한국어 사전과 placeholder 집합을 검사한다.
- [x] `index.html`의 정적 문구에 `data-i18n`을 붙이고 자식 노드를 보존한다. 접근성·placeholder 속성도 별도 번역 키로 표시한다. 설정에 `#settings-language` 선택을 추가한다.
- [x] `src/js/ui.js`에서 `applyTranslations(root)`와 `setText(element, source, params)`를 구현한다. 입력값·사용자 닉네임에는 번역을 적용하지 않는다.
- [x] `node --test test/unit/i18n.test.mjs` 통과 확인.

### Task 2: 설정·동적 화면·리팩터링

- [x] `test/unit/settings.test.mjs`에 저장 언어와 미지원 언어 복원 검증을 추가하고 실패를 확인한다.
- [x] `settings.js`에서 `language`를 정규화하고 프리셋 변경 시 보존한다. `tetris.js`의 설정 복원·적용 경로에서 언어를 설정하고 `#settings-language` 변경을 저장한다.
- [x] `tetris.js`의 화면 문자열을 `t`/`setText`로 표시한다. 캠페인 문구 생성은 UI 모듈로 이동한다. 내부 `lastEventMessage`와 게임 종료 판정용 제목은 영어 값을 보존하고 표시 단계에서 번역한다.
- [x] `juice.js`의 시간·등급·해금·조작 안내와 `leaderboard.js`의 빈 목록을 번역한다. 유닛 테스트는 기존 영어 기본값과 명시적 한국어를 검증한다.
- [x] `shell.css`에 한국어 폰트 대체·줄바꿈과 언어 선택 스타일만 추가한다.
- [x] `node --test test/unit/*.test.mjs` 통과 확인.

### Task 3: 브라우저 검증과 문서

- [x] 기존 영어 회귀 페이지는 `locale: 'en-US'`로 실행한다. 별도 한국어 테스트는 `locale: 'ko-KR'`로 시작한다.
- [x] 한국어 첫 실행, 한국어 설정·캠페인·게임·결과, 영어 전환과 재실행 복원, 저장 실패 시 세션 전환을 검증한다.
- [x] 한국어 메뉴·설정의 데스크톱 및 모바일 스크린샷을 확인하고 잘림을 수정한다.
- [x] `npm test`, 변경 JS의 `node --check`, `git diff --check` 실행. 독립 리뷰의 재현 가능한 결함을 수정한다.
- [x] README와 LLMWiki에 지원 언어·리팩터링 범위·실제 검증 결과를 기록한다. 커밋·푸시는 수행하지 않는다.
