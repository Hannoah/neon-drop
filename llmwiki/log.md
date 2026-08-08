# Operation Log

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

## 2026-08-08

- Guideline 코어 업그레이드(Wave A)를 문서화하고 Playwright 수용 테스트를 보강했다.
- Next 5, 소프트 드롭 홀드, Settings 리바인드·타이밍 유지, 포커스 트랩/Escape, 레거시 리더보드 wipe, `?test=1` 게이트를 회귀에 포함했다.
- README에 Guideline 조작, Settings, Next 5, T-Spin/PC, 리더보드 generation, Pulse Amp positive attack, DAS/ARR·소프트 드롭 홀드를 반영했다.
- `npm test`: Node 유닛 테스트 101개 통과, Playwright 브라우저 회귀 전체 통과.
- final-review P1/P2: `applyLiveSettings`가 활성 락을 초기화하지 않도록 수정, `assignBinding`이 충돌 키를 스왑하도록 수정, Playwright·유닛 회귀 추가.
- 상세 내용: [[guideline-core-2026-08-08]]
