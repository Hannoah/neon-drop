# 2026-10-15 종합 개선 계획 (Comprehensive Improvements Plan)

## 태스크 목록

1. **파티클 시스템 모듈 생성 (`src/js/particles.js`) 및 단위 테스트 작성**
   - 파티클/링 생성, 물리 업데이트, 캔버스 렌더링 로직 구현.
   - `test/unit/particles.test.mjs` 작성 및 테스트 확인.

2. **접근성 모달 모듈 분리 (`src/js/modal.js`) 및 단위 테스트 작성**
   - `openModal`, `closeModal`, `trapFocus`, `restorePreviousFocus` 함수 모듈화.
   - `test/unit/modal.test.mjs` 작성 및 테스트 확인.

3. **오디오 SFX 확장 (`src/js/audio.js`)**
   - `levelUp`, `restart` 사운드 추가.
   - `test/unit/audio.test.mjs` 검증.

4. **UI 및 i18n 확장 (`index.html`, `src/js/i18n.js`)**
   - 일시정지 화면 `#pause-restart-btn` 추가.
   - 게임 오버 화면 `#play-again-btn` 추가.
   - Ultra 모드 셀렉트 옵션 및 모드 카드 추가.
   - 한국어 번역 키(`Restart`, `Play Again`, `Ultra`, `Ultra · 2 Min`, `2-min score attack`, `Time Up!`) 추가.
   - `test/unit/i18n.test.mjs` 통과 확인.

5. **`renderer.js` 및 `tetris.js` 통합**
   - `renderer.js`에 파티클 렌더링 훅 연결.
   - `tetris.js`에 모달 헬퍼, 파티클 시스템, Ultra 모드 타이머/루프, 재시작 키보드/버튼 이벤트 핸들러 통합.

6. **전체 테스트 및 회귀 검증**
   - `npm run test:unit` 전체 통과 확인.
   - `node test-tetris.cjs` 전체 통과 확인.
   - LLMWiki 갱신 및 배포 준비.
