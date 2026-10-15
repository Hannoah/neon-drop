# Operation Log

## 2026-10-15

- 구현 커밋 `31a3dd3`을 origin 작업 브랜치에 푸시하고, 배포 커밋 `e235b8e`을 `gh-pages`에 게시했다.
- https://hannoah.github.io/neon-drop/ 배포 성공. 실제 사이트에서 HTTP 200, 한국어 UI, 언어 저장, 모바일 설정, 게임 시작·일시정지를 확인했다.
- 상세 내용: [[deployment-2026-10-15]]
- 한국어/영어 선택·저장·브라우저 언어 감지와 메뉴·게임·캠페인·결과·접근성 번역을 구현했다. 번역·캠페인 설명·이벤트 표시를 별도 모듈로 정리했다.
- 모바일 설정창 내부 가로 넘침을 재현하고 입력 스타일 적용 범위를 수정했다.
- 최종 `npm test`: 유닛 147개와 Playwright 회귀 전체 통과. 한국어 데스크톱·모바일 캡처와 독립 코드 리뷰를 완료했다.
- 상세 내용: [[korean-support-2026-10-15]]
- 프로젝트 리뷰 후 실제 게임 루프의 ARR 0 이동, 타이밍과 키 바인딩 복원, 0라인 T-Spin B2B 점수 오류를 수정했다.
- 실패하는 재현 테스트를 확인한 뒤 최소 수정했으며, `npm test`에서 유닛 138개와 Playwright 회귀 전체가 통과했다.
- 상세 내용: [[project-review-2026-10-15]]

## 2026-08-22

- 아케이드 셀 패스: 180 기본 바인딩(`A`), 언락 토스트, 첫 실행 튜토리얼 안내, Daily 스트릭, 클리어 팬페어, Pause 조작 치트시트, 터치 180.
- 상세 내용: [[arcade-sell-pass-2026-08-22]]

## 2026-08-21

- 2026-08-21 리뷰 결함을 수정했다: 20G 즉시 낙하, Mini 가비지, 0라인 콤보, 톱아웃 메타, 플래시 중 Pause, 원자적 180, Hold 스폰 리셋, Cheese 가비지 클리어, ARR 0 월슬라이드, 모드별 리더보드 generation 3.
- `tetris.js` god-file 분리는 범위에서 제외했다.
- 상세 내용: [[review-fixes-2026-08-21]]

## 2026-08-01

- Neon Drop 전체 프로젝트 리뷰를 수행했다.
- 키보드 모드 선택, 모달 접근성, 터치 기기 대응, 사용자 설정 저장 문제를 수정했다.
- 사용되지 않는 코드와 중복 API를 제거했다.
- Node 테스트 45개와 Playwright 브라우저 회귀 테스트를 통과했다.
- 애플리케이션 파일을 Git staging에 추가하고 빈 `AGENT.md`는 사용자 파일로 보존했다.
- `https://github.com/Hannoah/Neon-Drop.git` 게시를 요청받았으나 GitHub CLI와 `.env` 토큰이 모두 invalid 상태라 푸시하지 못했다.
- 위키를 분석해 5개 노드, 8개 관계, 1개 레이어의 지식 그래프를 생성했다.
- 상세 내용: [[neon-drop-reliability-2026-08-01]]
- Versus AI 화면을 Tactical Neon 스타일의 데스크톱 Arena HUD로 개편했다.
- 1280×720에서 AI·플레이어 보드, VS 압박 정보, 점수·미리보기 레일을 스크롤 없이 한 화면에 배치했다.
- AI와 플레이어의 대기 공격량을 숫자와 미터로 실시간 표시하고 회귀 테스트를 추가했다.
- 상세 내용: [[desktop-arena-hud-2026-08-01]]

## 2026-08-02

- 5스테이지 Neon Circuit 캠페인과 최초 클리어 업그레이드 보상을 구현했다.
- 캠페인 저장을 트랜잭션 방식으로 처리하고 정규화·입력·타이밍·AI 턴 회귀를 보강했다.
- 데스크톱 맵과 OVERLORD 경기 화면, 모바일 스크롤·접근성·reduced-motion 동작을 검증했다.
- `npm test`에서 Node 테스트 56개와 브라우저 회귀 테스트 전체가 통과했다.
- 상세 내용: [[neon-circuit-scenario-2026-08-02]]
- `AGENT.md`에 작업 시작 전 LLMWiki 맥락 확인과 작업 완료 후 변경·결정·검증 결과 기록 절차를 추가했다.

## 2026-08-09

- Theater Ink UI 개편: Ink Contrast 토큰·DM Sans, Theater Hold/Next 좌·점수 우 레이아웃, 시작 메뉴 재구성, 헤더 Pause, Settings 오디오 통합.
- Playwright 셀렉터를 Play/Circuit/Theater grid에 맞추고 README·위키를 갱신했다.
- `npm test`: 유닛 102개 + Playwright 회귀 전체 통과.
- 상세 내용: [[theater-ink-ui-2026-08-09]]

## 2026-08-08

- Neon Drop 전체 프로젝트 재리뷰를 수행했다 (코드 수정 없음).
- P1: 프로덕션 `window` 테스트 API 노출, 로컬 `.env`의 `GITHUB_TOKEN` 위생.
- P2: 시나리오 hazard 타이머 연발, `flashingLines` splice 스킵, 모달 focus trap 부재.
- P3: `tetris.js` god-file, README/Pulse Amp 표현 차이, 일부 유닛 테스트 갭.
- `npm run test:unit` 57 pass 확인.
- 상세 내용: [[project-review-2026-08-08]]
- Guideline 코어 업그레이드(Wave A)를 문서화하고 Playwright 수용 테스트를 보강했다.
- Next 5, 소프트 드롭 홀드, Settings 리바인드·타이밍 유지, 포커스 트랩/Escape, 레거시 리더보드 wipe, `?test=1` 게이트를 회귀에 포함했다.
- README에 Guideline 조작, Settings, Next 5, T-Spin/PC, 리더보드 generation, Pulse Amp positive attack, DAS/ARR·소프트 드롭 홀드를 반영했다.
- `npm test`: Node 유닛 테스트 101개 통과, Playwright 브라우저 회귀 전체 통과.
- final-review P1/P2: `applyLiveSettings`가 활성 락을 초기화하지 않도록 수정, `assignBinding`이 충돌 키를 스왑하도록 수정, Playwright·유닛 회귀 추가.
- 상세 내용: [[guideline-core-2026-08-08]]
