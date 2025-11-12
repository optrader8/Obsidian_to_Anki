# Obsidian to Anki - 구현 작업 목록

## 작업 우선순위

- **P0**: 필수 기능 (MVP)
- **P1**: 중요 기능
- **P2**: 부가 기능
- **P3**: 향후 개선

---

## Phase 1: 기반 구축 (Foundation)

### 1.1 프로젝트 구조 설정 [P0]

- [ ] **TASK-001**: LLM 관련 디렉토리 구조 생성
  - 생성: `src/llm/` 디렉토리
  - 생성: `src/llm/interfaces/` 디렉토리
  - 생성: `src/llm/providers/` 디렉토리
  - 예상 시간: 30분

- [ ] **TASK-002**: TypeScript 타입 정의 파일 생성
  - 파일: `src/llm/interfaces/llm-provider.interface.ts`
  - 파일: `src/llm/interfaces/llm-config.interface.ts`
  - 파일: `src/llm/interfaces/llm-response.interface.ts`
  - 예상 시간: 1시간

- [ ] **TASK-003**: Python LLM 모듈 구조 생성
  - 파일: `llm_integration.py`
  - 파일: `llm_providers.py`
  - 파일: `llm_prompts.py`
  - 예상 시간: 1시간

### 1.2 의존성 추가 [P0]

- [ ] **TASK-004**: TypeScript/JavaScript 의존성
  - `package.json`에 필요한 패키지 추가
  - HTTP 클라이언트 (이미 있을 수 있음)
  - 예상 시간: 30분

- [ ] **TASK-005**: Python 의존성
  - `requirements.txt` 업데이트
  - `requests` 라이브러리 (HTTP 클라이언트)
  - `python-dotenv` (환경 변수 관리)
  - 예상 시간: 30분

### 1.3 설정 시스템 확장 [P0]

- [ ] **TASK-006**: 플러그인 설정 인터페이스 확장
  - 파일: `src/interfaces/settings-interface.ts`
  - `LLMSettings` 인터페이스 추가
  - 예상 시간: 1시간

- [ ] **TASK-007**: Python 설정 파일 파서 확장
  - `obsidian_to_anki_config.ini`에 `[LLM]` 섹션 추가
  - 설정 파싱 로직 업데이트
  - 예상 시간: 1시간

---

## Phase 2: LLM Provider 구현

### 2.1 기본 Provider 인터페이스 [P0]

- [ ] **TASK-101**: LLM Provider 인터페이스 구현 (TypeScript)
  - 파일: `src/llm/interfaces/llm-provider.interface.ts`
  - `ILLMProvider` 인터페이스 정의
  - 예상 시간: 1시간

- [ ] **TASK-102**: LLM Provider 기본 클래스 구현 (Python)
  - 파일: `llm_providers.py`
  - `LLMProvider` 추상 클래스
  - 예상 시간: 1시간

### 2.2 OpenAI 호환 Provider [P0]

- [ ] **TASK-103**: OpenAI Compatible Provider (TypeScript)
  - 파일: `src/llm/providers/openai-compatible-provider.ts`
  - API 호출 로직
  - 응답 파싱
  - 에러 처리
  - 예상 시간: 3시간
  - 테스트: Ollama, LM Studio로 테스트

- [ ] **TASK-104**: OpenAI Compatible Provider (Python)
  - 파일: `llm_providers.py`
  - `OpenAICompatibleProvider` 클래스
  - 예상 시간: 2시간

### 2.3 특정 Provider 구현 [P1]

- [ ] **TASK-105**: Ollama Provider 최적화 (TypeScript)
  - 파일: `src/llm/providers/ollama-provider.ts`
  - Ollama 특화 기능 (모델 목록 조회 등)
  - 예상 시간: 2시간

- [ ] **TASK-106**: OpenRouter Provider (TypeScript)
  - 파일: `src/llm/providers/openrouter-provider.ts`
  - OpenRouter 특화 설정
  - 예상 시간: 2시간

### 2.4 Provider 테스트 [P0]

- [ ] **TASK-107**: Provider 단위 테스트 작성
  - 파일: `tests/llm/test-providers.ts`
  - Mock API 응답
  - 에러 시나리오 테스트
  - 예상 시간: 3시간

---

## Phase 3: LLM Router 구현

### 3.1 Router 핵심 기능 [P0]

- [ ] **TASK-201**: LLM Router 구현 (TypeScript)
  - 파일: `src/llm/llm-router.ts`
  - Provider 등록 및 관리
  - Fallback 체인 구현
  - 예상 시간: 3시간

- [ ] **TASK-202**: LLM Router 구현 (Python)
  - 파일: `llm_integration.py`
  - `LLMRouter` 클래스
  - 예상 시간: 2시간

### 3.2 에러 처리 및 재시도 [P0]

- [ ] **TASK-203**: 에러 타입 정의
  - 파일: `src/llm/llm-error.ts`
  - `LLMError` 클래스
  - 에러 타입 enum
  - 예상 시간: 1시간

- [ ] **TASK-204**: 재시도 로직 구현
  - Exponential backoff
  - Provider fallback
  - 예상 시간: 2시간

### 3.3 Router 테스트 [P1]

- [ ] **TASK-205**: Router 통합 테스트
  - 파일: `tests/llm/test-router.ts`
  - Fallback 시나리오 테스트
  - 예상 시간: 2시간

---

## Phase 4: Prompt Management

### 4.1 Prompt Manager [P0]

- [ ] **TASK-301**: Prompt Manager 구현 (TypeScript)
  - 파일: `src/llm/prompt-manager.ts`
  - 템플릿 관리
  - 변수 치환
  - 예상 시간: 3시간

- [ ] **TASK-302**: 기본 프롬프트 템플릿 작성
  - 카드 생성 프롬프트
  - 해답 생성 프롬프트
  - 카드 개선 프롬프트
  - 예상 시간: 4시간
  - 주의: 프롬프트 품질이 결과에 큰 영향

- [ ] **TASK-303**: Prompt Manager 구현 (Python)
  - 파일: `llm_prompts.py`
  - `PromptManager` 클래스
  - 예상 시간: 2시간

### 4.2 커스텀 프롬프트 [P2]

- [ ] **TASK-304**: 사용자 정의 프롬프트 UI
  - 설정 UI에 프롬프트 편집기 추가
  - 예상 시간: 3시간

- [ ] **TASK-305**: 프롬프트 템플릿 저장/로드
  - JSON 파일로 저장
  - 예상 시간: 2시간

---

## Phase 5: Content Analyzer

### 5.1 마크다운 분석 [P0]

- [ ] **TASK-401**: Content Analyzer 구현 (TypeScript)
  - 파일: `src/llm/content-analyzer.ts`
  - 마크다운 구조 파싱
  - 카드 생성 가능성 점수 계산
  - 예상 시간: 4시간

- [ ] **TASK-402**: 섹션 추출 로직
  - Heading, List, Paragraph 등 타입별 처리
  - 예상 시간: 2시간

- [ ] **TASK-403**: Content Analyzer 구현 (Python)
  - 파일: `content_analyzer.py`
  - 예상 시간: 3시간

### 5.2 Analyzer 테스트 [P1]

- [ ] **TASK-404**: Content Analyzer 테스트
  - 다양한 마크다운 형식 테스트
  - 예상 시간: 2시간

---

## Phase 6: Smart Card Generator

### 6.1 카드 생성 핵심 기능 [P0]

- [ ] **TASK-501**: Smart Card Generator 구현 (TypeScript)
  - 파일: `src/llm/card-generator.ts`
  - 카드 생성 로직
  - 응답 파싱
  - 예상 시간: 4시간

- [ ] **TASK-502**: 카드 타입별 생성 로직
  - Basic 카드
  - Cloze 카드
  - Q&A 카드
  - 예상 시간: 3시간

- [ ] **TASK-503**: Smart Card Generator 구현 (Python)
  - 파일: `llm_card_generator.py`
  - 예상 시간: 3시간

### 6.2 해답 생성 [P1]

- [ ] **TASK-504**: 해답 생성 기능
  - `generateAnswer()` 메서드
  - 컨텍스트 통합
  - 예상 시간: 2시간

### 6.3 카드 개선 [P2]

- [ ] **TASK-505**: 카드 개선 기능
  - 기존 카드 분석
  - 개선 제안 생성
  - 예상 시간: 2시간

---

## Phase 7: UI 통합 (Obsidian Plugin)

### 7.1 설정 UI [P0]

- [ ] **TASK-601**: LLM 설정 탭 추가
  - 파일: `src/settings.ts` 확장
  - Provider 설정 UI
  - API 키 입력
  - 모델 선택
  - 예상 시간: 4시간

- [ ] **TASK-602**: Provider 연결 테스트 버튼
  - "Test Connection" 버튼
  - 연결 상태 표시
  - 예상 시간: 2시간

### 7.2 카드 생성 UI [P0]

- [ ] **TASK-603**: 스마트 생성 버튼 추가
  - Ribbon 아이콘에 메뉴 항목 추가
  - "Generate Cards with AI" 옵션
  - 예상 시간: 2시간

- [ ] **TASK-604**: 진행 상황 표시
  - Progress bar
  - 현재 처리 중인 파일 표시
  - 예상 시간: 2시간

### 7.3 프리뷰 UI [P1]

- [ ] **TASK-605**: 카드 프리뷰 모달
  - 파일: `src/llm/preview-modal.ts`
  - 생성된 카드 미리보기
  - 편집 기능
  - 승인/거부 버튼
  - 예상 시간: 5시간

- [ ] **TASK-606**: 배치 프리뷰
  - 여러 카드 한번에 표시
  - 선택적 승인
  - 예상 시간: 3시간

### 7.4 컨텍스트 메뉴 [P2]

- [ ] **TASK-607**: 우클릭 메뉴에 옵션 추가
  - "Generate cards for this section"
  - "Improve this card"
  - 예상 시간: 2시간

---

## Phase 8: 기존 시스템 통합

### 8.1 File Manager 통합 [P0]

- [ ] **TASK-701**: File Manager에 LLM 옵션 추가
  - 파일: `src/files-manager.ts`
  - LLM 기반 생성 플래그
  - 예상 시간: 2시간

- [ ] **TASK-702**: 자동 감지 모드
  - 기존 마크업 + LLM 생성 혼합
  - 예상 시간: 3시간

### 8.2 Note Parser 통합 [P0]

- [ ] **TASK-703**: Note Parser 확장
  - 파일: `src/note.ts`
  - LLM 생성 카드 처리
  - 예상 시간: 2시간

### 8.3 AnkiConnect 통합 [P0]

- [ ] **TASK-704**: 생성된 카드 Anki로 전송
  - 기존 `anki.ts` 활용
  - 예상 시간: 1시간

---

## Phase 9: Python 스크립트 통합

### 9.1 CLI 확장 [P0]

- [ ] **TASK-801**: 명령줄 옵션 추가
  - `--llm-generate`: LLM 카드 생성 활성화
  - `--llm-provider`: Provider 지정
  - 예상 시간: 2시간

- [ ] **TASK-802**: 설정 파일 파싱
  - INI 파일에서 LLM 설정 읽기
  - 예상 시간: 1시간

### 9.2 배치 처리 [P1]

- [ ] **TASK-803**: 배치 모드 구현
  - 전체 디렉토리 처리
  - 진행 상황 로깅
  - 예상 시간: 3시간

---

## Phase 10: 테스트 및 검증

### 10.1 통합 테스트 [P0]

- [ ] **TASK-901**: End-to-end 테스트
  - 파일 읽기 → LLM 생성 → Anki 전송
  - 예상 시간: 4시간

- [ ] **TASK-902**: 다양한 LLM Provider 테스트
  - Ollama
  - LM Studio
  - OpenRouter
  - OpenAI
  - 예상 시간: 4시간

### 10.2 에러 시나리오 테스트 [P1]

- [ ] **TASK-903**: 네트워크 오류 테스트
  - API 타임아웃
  - 연결 실패
  - 예상 시간: 2시간

- [ ] **TASK-904**: LLM 응답 오류 테스트
  - 잘못된 형식
  - 빈 응답
  - 예상 시간: 2시간

### 10.3 성능 테스트 [P1]

- [ ] **TASK-905**: 대용량 파일 테스트
  - 100개 이상의 마크다운 파일
  - 예상 시간: 2시간

- [ ] **TASK-906**: 응답 시간 측정
  - 카드 생성 시간
  - API 호출 시간
  - 예상 시간: 2시간

---

## Phase 11: 문서화

### 11.1 사용자 문서 [P0]

- [ ] **TASK-1001**: 한국어 사용 가이드
  - 파일: `.docs/README_ko.md` (이미 생성 예정)
  - LLM 설정 방법
  - 사용 예제
  - 예상 시간: 3시간

- [ ] **TASK-1002**: 영어 사용 가이드
  - 파일: `docs/LLM_GUIDE.md`
  - 예상 시간: 3시간

### 11.2 개발자 문서 [P1]

- [ ] **TASK-1003**: API 문서
  - LLM Provider API
  - 예상 시간: 2시간

- [ ] **TASK-1004**: 아키텍처 다이어그램
  - 시스템 구조도
  - 데이터 흐름도
  - 예상 시간: 2시간

### 11.3 예제 및 튜토리얼 [P2]

- [ ] **TASK-1005**: 예제 파일 생성
  - 샘플 마크다운 파일
  - 예제 설정 파일
  - 예상 시간: 2시간

- [ ] **TASK-1006**: 비디오 튜토리얼 스크립트
  - 예상 시간: 2시간

---

## Phase 12: 최적화 및 개선

### 12.1 성능 최적화 [P1]

- [ ] **TASK-1101**: 응답 캐싱
  - 파일 해시 기반 캐시
  - 예상 시간: 3시간

- [ ] **TASK-1102**: 병렬 처리
  - 동시에 여러 파일 처리
  - 예상 시간: 3시간

### 12.2 프롬프트 최적화 [P1]

- [ ] **TASK-1103**: 프롬프트 A/B 테스트
  - 다양한 프롬프트 비교
  - 예상 시간: 4시간

- [ ] **TASK-1104**: 토큰 사용량 최적화
  - 불필요한 내용 제거
  - 예상 시간: 2시간

### 12.3 사용자 경험 개선 [P2]

- [ ] **TASK-1105**: 온보딩 경험
  - 첫 사용자를 위한 가이드
  - 예상 시간: 3시간

- [ ] **TASK-1106**: 에러 메시지 개선
  - 사용자 친화적인 메시지
  - 해결 방법 제시
  - 예상 시간: 2시간

---

## Phase 13: 배포 준비

### 13.1 빌드 및 패키징 [P0]

- [ ] **TASK-1201**: TypeScript 빌드 설정
  - 새 파일들 포함
  - 예상 시간: 1시간

- [ ] **TASK-1202**: Python 패키징
  - 의존성 확인
  - 예상 시간: 1시간

### 13.2 버전 관리 [P0]

- [ ] **TASK-1203**: 버전 번호 업데이트
  - `manifest.json`
  - `package.json`
  - 예상 시간: 30분

- [ ] **TASK-1204**: CHANGELOG 작성
  - 새 기능 목록
  - Breaking changes
  - 예상 시간: 1시간

### 13.3 릴리스 노트 [P0]

- [ ] **TASK-1205**: 릴리스 노트 작성
  - 주요 기능 설명
  - 마이그레이션 가이드
  - 예상 시간: 2시간

---

## 추가 작업 (Optional / Future)

### 고급 기능 [P3]

- [ ] **TASK-2001**: 다국어 지원
  - 프롬프트 번역
  - UI 다국어
  - 예상 시간: 8시간

- [ ] **TASK-2002**: 학습 기반 개선
  - 사용자 피드백 수집
  - 카드 품질 학습
  - 예상 시간: 12시간

- [ ] **TASK-2003**: 이미지 OCR 통합
  - 이미지에서 텍스트 추출
  - LLM으로 카드 생성
  - 예상 시간: 8시간

- [ ] **TASK-2004**: 음성 입력
  - STT 통합
  - 음성으로 카드 생성
  - 예상 시간: 10시간

### 통합 및 연동 [P3]

- [ ] **TASK-2005**: RemNote 형식 지원 강화
  - 예상 시간: 4시간

- [ ] **TASK-2006**: Notion 연동
  - Notion 데이터베이스에서 가져오기
  - 예상 시간: 10시간

---

## 작업 일정 추정

### MVP (최소 기능 제품)
**Phase 1-8**: 약 8-10주
- 핵심 LLM 통합
- 기본 UI
- 테스트

### Full Release
**Phase 1-12**: 약 14-16주
- 모든 P0, P1 작업
- 최적화
- 문서화

### Extended Features
**Phase 13 + Additional**: 추가 4-8주
- P2, P3 작업
- 고급 기능

---

## 리스크 및 의존성

### 리스크
1. **LLM API 불안정성**: Provider fallback으로 완화
2. **프롬프트 품질**: 반복적인 테스트 및 개선 필요
3. **토큰 비용**: 로컬 LLM 사용 권장
4. **기존 기능 호환성**: 철저한 회귀 테스트

### 의존성
- TASK-001 ~ TASK-003: 모든 후속 작업의 기반
- TASK-101 ~ TASK-107: Router와 Manager의 기반
- TASK-601 ~ TASK-606: 사용자 테스트를 위해 필요

---

## 테스크 체크리스트 진행 방법

각 작업 완료 시:
1. [ ] 를 [x]로 변경
2. 코드 리뷰 수행
3. 단위 테스트 작성 및 통과
4. 문서 업데이트
5. Git 커밋

---

## 작업 담당 제안

- **Phase 1-3**: Backend 개발자
- **Phase 4-6**: AI/ML 엔지니어
- **Phase 7**: Frontend/UI 개발자
- **Phase 8-9**: 통합 엔지니어
- **Phase 10**: QA 엔지니어
- **Phase 11**: Technical Writer
- **Phase 12**: Performance Engineer

---

## 다음 단계

1. Phase 1 작업 시작 (TASK-001)
2. 개발 환경 설정
3. Git 브랜치 생성 (`feature/llm-integration`)
4. 주간 진행 상황 리뷰 설정
