# LLM 카드 생성 고도화 계획

## 현재 시스템의 한계

### 1. 토큰 제한 문제
- 긴 문서를 한 번에 처리하려고 시도
- LLM의 컨텍스트 윈도우 제한 (2K-8K 토큰)
- 중간에 잘려서 중요한 내용 누락 가능

### 2. 단순한 처리 방식
- 단일 패스로 모든 카드 생성 시도
- 카드 품질 검증 없음
- 중요도/우선순위 고려 없음

### 3. 컨텍스트 손실
- 문서 전체의 맥락이 각 섹션에 전달되지 않음
- 섹션 간 연결성 파악 어려움

### 4. 품질 관리 부재
- 생성된 카드의 품질 검증 없음
- 중복 카드 탐지 없음
- 난이도 조절 없음

## 고도화 전략

### Phase 1: 스마트 청킹 시스템
**목표**: 긴 문서를 의미있는 단위로 분할

#### 1.1 계층적 청킹
```
문서 전체
├── 챕터 1
│   ├── 섹션 1.1
│   │   ├── 단락들
│   │   └── 코드/예제
│   └── 섹션 1.2
└── 챕터 2
    └── ...
```

#### 1.2 청킹 전략
- **Heading-based**: 제목 계층 구조 활용
- **Semantic**: 의미적 유사도 기반 그룹핑
- **Size-aware**: 토큰 제한 고려한 크기 조절
- **Context-preserving**: 각 청크에 상위 컨텍스트 포함

#### 1.3 청크 메타데이터
```typescript
interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    level: number;           // 계층 깊이
    parent?: string;         // 부모 청크 ID
    siblings: string[];      // 형제 청크 IDs
    tokenCount: number;      // 토큰 수
    importance: number;      // 중요도 점수 (0-1)
    keywords: string[];      // 핵심 키워드
    summary: string;         // 요약
  };
}
```

### Phase 2: Multi-Pass 카드 생성

#### Pass 1: 문서 분석 및 계획
**목표**: 전체 구조 파악 및 카드 생성 계획 수립

```
Input: 전체 문서
Process:
  1. 문서 구조 분석
  2. 주요 주제 추출
  3. 중요 섹션 식별
  4. 카드 생성 우선순위 결정
Output: 문서 개요 + 생성 계획
```

**프롬프트 예시**:
```
당신은 학습 자료 분석 전문가입니다.
다음 문서를 분석하여:
1. 주요 주제와 하위 주제 목록
2. 각 섹션의 중요도 (1-10)
3. 섹션 간 의존성
4. 권장 카드 수
5. 학습 난이도

문서:
{document_overview}

JSON 형식으로 응답하세요.
```

#### Pass 2: 청크별 카드 생성
**목표**: 각 청크에서 고품질 카드 생성

```
For each chunk:
  Input: 청크 내용 + 전체 컨텍스트
  Process:
    1. 청크 내 핵심 개념 추출
    2. 개념별 카드 타입 결정
    3. 카드 초안 생성
    4. 카드 간 중복 체크
  Output: 카드 리스트 + 메타데이터
```

**향상된 프롬프트**:
```
[Context]
문서 제목: {title}
현재 섹션: {section_path}
이전 섹션 요약: {prev_summary}

[Task]
다음 내용에서 플래시카드를 생성하세요:
{chunk_content}

[Guidelines]
1. 핵심 개념에 집중
2. 각 카드는 하나의 명확한 질문
3. 답변은 정확하고 완전해야 함
4. 카드 타입 선택:
   - Basic: 정의, 개념, 사실
   - Cloze: 문장 내 핵심 용어
   - Q&A: 설명이 필요한 질문

[Output Format]
{
  "cards": [
    {
      "type": "basic",
      "front": "...",
      "back": "...",
      "rationale": "이 카드를 만든 이유",
      "difficulty": 1-5,
      "prerequisites": ["관련 개념들"],
      "tags": ["tag1", "tag2"]
    }
  ],
  "summary": "이 섹션의 핵심 내용 요약"
}
```

#### Pass 3: 카드 검증 및 개선
**목표**: 생성된 모든 카드 검증 및 품질 향상

```
Input: 생성된 모든 카드
Process:
  1. 중복 카드 탐지 및 병합
  2. 명확성 검증
  3. 정확성 검증
  4. 난이도 균형 조정
  5. 태그 정규화
Output: 최종 카드 세트
```

**검증 프롬프트**:
```
다음 카드들을 검토하세요:
{generated_cards}

검증 항목:
1. 중복 또는 유사한 카드
2. 불명확한 질문
3. 불완전한 답변
4. 난이도 불균형
5. 누락된 중요 개념

개선 제안을 JSON으로 제공하세요.
```

### Phase 3: 점진적 처리 시스템

#### 3.1 스트리밍 처리
```typescript
async function* generateCardsProgressively(
  document: string
): AsyncGenerator<CardBatch> {
  // 1. 청킹
  const chunks = await chunkDocument(document);

  // 2. 각 청크 처리
  for (const chunk of chunks) {
    yield {
      status: 'analyzing',
      progress: chunk.index / chunks.length,
      message: `Analyzing ${chunk.metadata.heading}...`
    };

    const cards = await generateCardsForChunk(chunk);

    yield {
      status: 'generated',
      progress: chunk.index / chunks.length,
      cards: cards,
      chunk: chunk.metadata
    };
  }

  // 3. 검증
  yield {
    status: 'validating',
    progress: 0.95,
    message: 'Validating all cards...'
  };

  // 4. 완료
  yield {
    status: 'completed',
    progress: 1.0
  };
}
```

#### 3.2 진행 상황 UI
- 실시간 진행률 표시
- 현재 처리 중인 섹션 표시
- 생성된 카드 수 실시간 업데이트
- 취소/일시정지 옵션

### Phase 4: 컨텍스트 관리 시스템

#### 4.1 글로벌 컨텍스트
```typescript
interface DocumentContext {
  title: string;
  overview: string;          // 전체 문서 요약
  mainTopics: string[];      // 주요 주제들
  glossary: Map<string, string>;  // 용어 사전
  structure: TreeNode;       // 문서 구조 트리
}
```

#### 4.2 로컬 컨텍스트
```typescript
interface ChunkContext {
  global: DocumentContext;
  parent: {
    heading: string;
    summary: string;
  };
  previous: {
    heading: string;
    summary: string;
    keyPoints: string[];
  };
  current: DocumentChunk;
}
```

### Phase 5: 품질 관리 시스템

#### 5.1 카드 품질 메트릭
```typescript
interface CardQuality {
  clarity: number;        // 명확성 (0-1)
  accuracy: number;       // 정확성 (0-1)
  completeness: number;   // 완전성 (0-1)
  difficulty: number;     // 난이도 (1-5)
  uniqueness: number;     // 고유성 (0-1)
  overall: number;        // 종합 점수 (0-1)
}
```

#### 5.2 자동 품질 검사
- **명확성**: 질문이 모호하지 않은가?
- **정확성**: 답변이 정확한가?
- **완전성**: 답변이 충분한가?
- **중복성**: 다른 카드와 중복되지 않는가?
- **적절성**: 난이도가 적절한가?

#### 5.3 품질 임계값
```typescript
const QUALITY_THRESHOLDS = {
  minimum: 0.6,    // 이 이하는 자동 제거
  warning: 0.7,    // 경고 표시
  good: 0.8,       // 양호
  excellent: 0.9   // 우수
};
```

## 구현 우선순위

### P0 (즉시 구현)
1. ✅ DocumentChunker - 스마트 청킹
2. ✅ EnhancedPromptTemplates - 향상된 프롬프트
3. ✅ MultiPassGenerator - 다단계 생성
4. ✅ ProgressTracker - 진행 상황 추적

### P1 (다음 단계)
5. ✅ CardValidator - 카드 검증
6. ✅ ContextManager - 컨텍스트 관리
7. ✅ QualityScorer - 품질 점수 시스템

### P2 (향후)
8. DuplicateDetector - 중복 탐지
9. DifficultyBalancer - 난이도 균형
10. AdaptiveLearning - 사용자 피드백 학습

## 예상 효과

### 처리 능력
- **Before**: 2,000 토큰 문서만 처리 가능
- **After**: 100,000+ 토큰 문서 처리 가능

### 카드 품질
- **Before**: 단순 추출, 품질 보장 없음
- **After**: 검증된 고품질 카드, 중복 제거

### 사용자 경험
- **Before**: "생성 중..." 후 결과만 표시
- **After**: 실시간 진행률, 단계별 피드백

### 처리 시간
- **Before**: 긴 문서 실패 또는 품질 저하
- **After**: 시간은 더 걸리지만 안정적이고 고품질

## 기술 스택

### 새로운 컴포넌트
```
src/llm/
├── chunking/
│   ├── document-chunker.ts      ⭐ NEW
│   ├── semantic-chunker.ts      ⭐ NEW
│   └── chunk-optimizer.ts       ⭐ NEW
├── generation/
│   ├── multi-pass-generator.ts  ⭐ NEW
│   ├── context-manager.ts       ⭐ NEW
│   └── batch-processor.ts       ⭐ NEW
├── validation/
│   ├── card-validator.ts        ⭐ NEW
│   ├── quality-scorer.ts        ⭐ NEW
│   └── duplicate-detector.ts    ⭐ NEW
└── ui/
    ├── progress-modal.ts        ⭐ NEW
    └── quality-report.ts        ⭐ NEW
```

## 측정 지표

### 성능 지표
- 처리 속도: 토큰/초
- 청크 수: 문서당 평균
- 카드 생성률: 청크당 평균

### 품질 지표
- 평균 품질 점수
- 중복 카드 비율
- 사용자 승인율

### 사용자 만족도
- 생성 성공률
- 재생성 요청률
- 수동 편집률

## 다음 단계

1. ✅ DocumentChunker 구현
2. ✅ 향상된 프롬프트 작성
3. ✅ MultiPassGenerator 구현
4. ✅ Progress UI 구현
5. ✅ 통합 테스트
6. 🔄 사용자 피드백 수집
7. 🔄 반복 개선

이 계획을 통해 긴 문서도 안정적으로 처리하고, 고품질의 학습 카드를 생성할 수 있습니다.
