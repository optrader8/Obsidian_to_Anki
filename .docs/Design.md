# Obsidian to Anki - 설계 문서

## 1. 시스템 아키텍처

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     Obsidian Plugin UI                       │
│  (TypeScript/JavaScript - Obsidian API)                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Core Processing Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ File Manager │  │ Note Parser  │  │ Card Builder │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              LLM Integration Layer (NEW)             │   │
│  │  ┌────────────┐  ┌───────────┐  ┌────────────┐     │   │
│  │  │ LLM Router │  │ Provider  │  │  Prompt    │     │   │
│  │  │            │  │ Manager   │  │  Manager   │     │   │
│  │  └────────────┘  └───────────┘  └────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
│ AnkiConnect  │    │  Local LLM  │    │  Cloud LLM  │
│   API        │    │  (Ollama,   │    │ (OpenRouter,│
│              │    │   LM Studio)│    │  OpenAI)    │
└──────────────┘    └─────────────┘    └─────────────┘
```

### 1.2 새로운 컴포넌트

#### 1.2.1 LLM Integration Layer
새로운 LLM 통합 레이어는 기존 시스템과 독립적으로 동작하며, 선택적으로 활성화 가능.

## 2. 모듈 설계

### 2.1 LLM Provider Manager

#### 2.1.1 인터페이스 설계

```typescript
// src/llm/interfaces/llm-provider.interface.ts

export interface LLMConfig {
  provider: string;          // 'openai', 'ollama', 'openrouter', etc.
  apiKey?: string;           // API key (cloud providers)
  endpoint: string;          // API endpoint URL
  model: string;             // Model name
  temperature?: number;      // Default: 0.7
  maxTokens?: number;        // Default: 2000
  timeout?: number;          // Request timeout in ms
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export interface ILLMProvider {
  initialize(config: LLMConfig): Promise<void>;
  generateCompletion(messages: LLMMessage[]): Promise<LLMResponse>;
  isAvailable(): Promise<boolean>;
  getName(): string;
}
```

#### 2.1.2 Provider 구현

```typescript
// src/llm/providers/openai-compatible-provider.ts

export class OpenAICompatibleProvider implements ILLMProvider {
  private config: LLMConfig;

  async initialize(config: LLMConfig): Promise<void> {
    this.config = config;
    // Validate config
    await this.isAvailable();
  }

  async generateCompletion(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey || ''}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test API connectivity
      const testResponse = await fetch(this.config.endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey || ''}`,
        },
      });
      return testResponse.ok || testResponse.status === 404; // Some APIs don't support GET
    } catch (error) {
      return false;
    }
  }

  getName(): string {
    return this.config.provider;
  }

  private parseResponse(data: any): LLMResponse {
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
      finishReason: data.choices[0].finish_reason,
    };
  }
}
```

### 2.2 LLM Router

```typescript
// src/llm/llm-router.ts

export class LLMRouter {
  private providers: Map<string, ILLMProvider>;
  private defaultProvider: string;
  private fallbackProviders: string[];

  constructor() {
    this.providers = new Map();
    this.fallbackProviders = [];
  }

  registerProvider(name: string, provider: ILLMProvider): void {
    this.providers.set(name, provider);
  }

  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not registered`);
    }
    this.defaultProvider = name;
  }

  setFallbackChain(providers: string[]): void {
    this.fallbackProviders = providers;
  }

  async generate(
    messages: LLMMessage[],
    preferredProvider?: string
  ): Promise<LLMResponse> {
    const providerChain = this.buildProviderChain(preferredProvider);

    for (const providerName of providerChain) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;

        return await provider.generateCompletion(messages);
      } catch (error) {
        console.error(`Provider ${providerName} failed:`, error);
        // Try next provider in chain
      }
    }

    throw new Error('All LLM providers failed');
  }

  private buildProviderChain(preferredProvider?: string): string[] {
    const chain: string[] = [];

    if (preferredProvider && this.providers.has(preferredProvider)) {
      chain.push(preferredProvider);
    }

    if (this.defaultProvider && !chain.includes(this.defaultProvider)) {
      chain.push(this.defaultProvider);
    }

    for (const fallback of this.fallbackProviders) {
      if (!chain.includes(fallback)) {
        chain.push(fallback);
      }
    }

    return chain;
  }
}
```

### 2.3 Prompt Manager

```typescript
// src/llm/prompt-manager.ts

export interface PromptTemplate {
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
}

export class PromptManager {
  private templates: Map<string, PromptTemplate>;

  constructor() {
    this.templates = new Map();
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    // Card generation prompt
    this.registerTemplate({
      name: 'generate_cards',
      description: 'Generate flashcards from markdown content',
      systemPrompt: `You are a helpful assistant that creates high-quality flashcards from markdown content.
Your task is to analyze the given content and generate flashcards that help with learning and retention.

Guidelines:
- Create clear, concise questions
- Provide accurate and complete answers
- Use appropriate card types (Basic, Cloze, Q&A)
- Focus on key concepts and important information
- Avoid overly complex or ambiguous questions`,
      userPromptTemplate: `Please analyze the following markdown content and generate flashcards:

Content:
\`\`\`markdown
{{content}}
\`\`\`

Generate flashcards in the following JSON format:
\`\`\`json
[
  {
    "type": "basic" | "cloze" | "qa",
    "front": "Question or prompt",
    "back": "Answer or explanation",
    "tags": ["tag1", "tag2"]
  }
]
\`\`\``,
      variables: ['content']
    });

    // Answer generation prompt
    this.registerTemplate({
      name: 'generate_answer',
      description: 'Generate answer for a given question',
      systemPrompt: `You are a knowledgeable tutor that provides clear, accurate answers to questions.
Your answers should be:
- Accurate and factually correct
- Clear and easy to understand
- Appropriately detailed based on context
- Well-structured with examples when helpful`,
      userPromptTemplate: `Question: {{question}}

Context (if available):
{{context}}

Please provide a comprehensive answer to the question above.`,
      variables: ['question', 'context']
    });

    // Card improvement prompt
    this.registerTemplate({
      name: 'improve_card',
      description: 'Improve existing flashcard',
      systemPrompt: `You are an expert in creating effective flashcards for learning.
Analyze the given flashcard and suggest improvements for:
- Clarity and conciseness
- Accuracy
- Learning effectiveness
- Better formatting`,
      userPromptTemplate: `Current flashcard:
Front: {{front}}
Back: {{back}}

Please provide an improved version of this flashcard.`,
      variables: ['front', 'back']
    });
  }

  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }

  getTemplate(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  renderPrompt(
    templateName: string,
    variables: Record<string, string>
  ): LLMMessage[] {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    // Validate variables
    for (const varName of template.variables) {
      if (!(varName in variables)) {
        throw new Error(`Missing variable: ${varName}`);
      }
    }

    // Render user prompt
    let userPrompt = template.userPromptTemplate;
    for (const [key, value] of Object.entries(variables)) {
      userPrompt = userPrompt.replace(
        new RegExp(`{{${key}}}`, 'g'),
        value
      );
    }

    return [
      { role: 'system', content: template.systemPrompt },
      { role: 'user', content: userPrompt }
    ];
  }
}
```

### 2.4 Smart Card Generator

```typescript
// src/llm/card-generator.ts

export interface GeneratedCard {
  type: string;
  front: string;
  back: string;
  tags?: string[];
  confidence?: number;
}

export class SmartCardGenerator {
  private llmRouter: LLMRouter;
  private promptManager: PromptManager;

  constructor(llmRouter: LLMRouter, promptManager: PromptManager) {
    this.llmRouter = llmRouter;
    this.promptManager = promptManager;
  }

  async generateCards(
    content: string,
    options?: {
      maxCards?: number;
      preferredTypes?: string[];
      context?: string;
    }
  ): Promise<GeneratedCard[]> {
    const messages = this.promptManager.renderPrompt('generate_cards', {
      content: content
    });

    const response = await this.llmRouter.generate(messages);
    return this.parseCardResponse(response.content);
  }

  async generateAnswer(
    question: string,
    context?: string
  ): Promise<string> {
    const messages = this.promptManager.renderPrompt('generate_answer', {
      question: question,
      context: context || 'No additional context provided.'
    });

    const response = await this.llmRouter.generate(messages);
    return response.content.trim();
  }

  async improveCard(
    front: string,
    back: string
  ): Promise<{ front: string; back: string }> {
    const messages = this.promptManager.renderPrompt('improve_card', {
      front: front,
      back: back
    });

    const response = await this.llmRouter.generate(messages);
    return this.parseImprovedCard(response.content);
  }

  private parseCardResponse(response: string): GeneratedCard[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try parsing the entire response as JSON
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse card response:', error);
      throw new Error('Invalid card generation response');
    }
  }

  private parseImprovedCard(response: string): { front: string; back: string } {
    // Parse improved card from response
    // This is a simplified version
    const lines = response.split('\n');
    let front = '';
    let back = '';
    let currentSection = '';

    for (const line of lines) {
      if (line.includes('Front:')) {
        currentSection = 'front';
      } else if (line.includes('Back:')) {
        currentSection = 'back';
      } else if (currentSection === 'front') {
        front += line + '\n';
      } else if (currentSection === 'back') {
        back += line + '\n';
      }
    }

    return {
      front: front.trim(),
      back: back.trim()
    };
  }
}
```

### 2.5 Content Analyzer

```typescript
// src/llm/content-analyzer.ts

export interface ContentSection {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'quote';
  content: string;
  level?: number;
  cardPotential: number; // 0-1 score
}

export class ContentAnalyzer {
  analyzeMarkdown(markdown: string): ContentSection[] {
    const sections: ContentSection[] = [];
    const lines = markdown.split('\n');

    let currentSection: ContentSection | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('#')) {
        if (currentSection) sections.push(currentSection);
        currentSection = {
          type: 'heading',
          content: trimmed,
          level: this.getHeadingLevel(trimmed),
          cardPotential: 0.7
        };
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        if (currentSection?.type !== 'list') {
          if (currentSection) sections.push(currentSection);
          currentSection = {
            type: 'list',
            content: trimmed,
            cardPotential: 0.8
          };
        } else {
          currentSection.content += '\n' + trimmed;
        }
      } else if (trimmed.startsWith('>')) {
        if (currentSection?.type !== 'quote') {
          if (currentSection) sections.push(currentSection);
          currentSection = {
            type: 'quote',
            content: trimmed,
            cardPotential: 0.6
          };
        } else {
          currentSection.content += '\n' + trimmed;
        }
      } else if (trimmed) {
        if (currentSection?.type !== 'paragraph') {
          if (currentSection) sections.push(currentSection);
          currentSection = {
            type: 'paragraph',
            content: trimmed,
            cardPotential: 0.5
          };
        } else {
          currentSection.content += ' ' + trimmed;
        }
      }
    }

    if (currentSection) sections.push(currentSection);

    return sections;
  }

  private getHeadingLevel(heading: string): number {
    const match = heading.match(/^#+/);
    return match ? match[0].length : 0;
  }

  selectCandidateSections(
    sections: ContentSection[],
    threshold: number = 0.6
  ): ContentSection[] {
    return sections.filter(section => section.cardPotential >= threshold);
  }
}
```

## 3. Python 스크립트 통합

### 3.1 Python LLM 모듈

```python
# llm_integration.py

import json
import requests
from typing import List, Dict, Optional
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    """Base class for LLM providers"""

    @abstractmethod
    def initialize(self, config: Dict) -> None:
        pass

    @abstractmethod
    def generate_completion(self, messages: List[Dict]) -> Dict:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

class OpenAICompatibleProvider(LLMProvider):
    """OpenAI-compatible API provider"""

    def __init__(self):
        self.config = None

    def initialize(self, config: Dict) -> None:
        self.config = config
        required = ['endpoint', 'model']
        for key in required:
            if key not in config:
                raise ValueError(f"Missing required config: {key}")

    def generate_completion(self, messages: List[Dict]) -> Dict:
        headers = {
            'Content-Type': 'application/json',
        }

        if self.config.get('api_key'):
            headers['Authorization'] = f"Bearer {self.config['api_key']}"

        payload = {
            'model': self.config['model'],
            'messages': messages,
            'temperature': self.config.get('temperature', 0.7),
            'max_tokens': self.config.get('max_tokens', 2000),
        }

        response = requests.post(
            self.config['endpoint'],
            headers=headers,
            json=payload,
            timeout=self.config.get('timeout', 60)
        )

        response.raise_for_status()
        data = response.json()

        return {
            'content': data['choices'][0]['message']['content'],
            'usage': data.get('usage', {}),
            'model': data['model'],
            'finish_reason': data['choices'][0]['finish_reason']
        }

    def is_available(self) -> bool:
        try:
            response = requests.get(
                self.config['endpoint'].rsplit('/', 1)[0],
                timeout=5
            )
            return response.status_code in [200, 404]
        except:
            return False

class SmartCardGenerator:
    """Generate flashcards using LLM"""

    def __init__(self, provider: LLMProvider):
        self.provider = provider

    def generate_cards(self, content: str, context: Optional[str] = None) -> List[Dict]:
        prompt = self._build_card_generation_prompt(content, context)

        messages = [
            {
                'role': 'system',
                'content': 'You are a helpful assistant that creates high-quality flashcards.'
            },
            {
                'role': 'user',
                'content': prompt
            }
        ]

        response = self.provider.generate_completion(messages)
        return self._parse_cards(response['content'])

    def generate_answer(self, question: str, context: Optional[str] = None) -> str:
        messages = [
            {
                'role': 'system',
                'content': 'You are a knowledgeable tutor providing clear answers.'
            },
            {
                'role': 'user',
                'content': f"Question: {question}\n\nContext: {context or 'None'}"
            }
        ]

        response = self.provider.generate_completion(messages)
        return response['content'].strip()

    def _build_card_generation_prompt(self, content: str, context: Optional[str]) -> str:
        return f"""Analyze this markdown content and generate flashcards:

{content}

Generate flashcards in JSON format:
[
  {{
    "type": "basic",
    "front": "Question",
    "back": "Answer",
    "tags": ["tag1"]
  }}
]
"""

    def _parse_cards(self, response: str) -> List[Dict]:
        import re
        # Extract JSON from response
        json_match = re.search(r'```json\n(.*?)\n```', response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))

        try:
            return json.loads(response)
        except:
            raise ValueError("Failed to parse card response")
```

### 3.2 설정 파일 확장

```ini
# obsidian_to_anki_config.ini

[LLM]
# Enable LLM features
Enabled = True

# Primary provider configuration
Primary Provider = ollama
Primary Endpoint = http://localhost:11434/v1/chat/completions
Primary Model = llama2
Primary API Key =

# Fallback provider (optional)
Fallback Provider = openrouter
Fallback Endpoint = https://openrouter.ai/api/v1/chat/completions
Fallback Model = anthropic/claude-3-haiku
Fallback API Key =

# LLM parameters
Temperature = 0.7
Max Tokens = 2000
Timeout = 60

# Feature flags
Auto Generate Cards = False
Auto Generate Answers = True
Show Preview = True
Batch Size = 10
```

## 4. 데이터 흐름

### 4.1 자동 카드 생성 흐름

```
1. User triggers card generation
   ↓
2. File Manager reads markdown file
   ↓
3. Content Analyzer extracts sections
   ↓
4. For each high-potential section:
   ↓
5. Smart Card Generator calls LLM Router
   ↓
6. LLM Router tries providers in order
   ↓
7. Prompt Manager renders template
   ↓
8. Provider makes API call
   ↓
9. Response parsed into GeneratedCard[]
   ↓
10. User reviews cards (if preview enabled)
   ↓
11. Approved cards sent to AnkiConnect
```

### 4.2 해답 생성 흐름

```
1. User has question without answer
   ↓
2. Question + file context extracted
   ↓
3. Smart Card Generator.generateAnswer()
   ↓
4. LLM generates answer
   ↓
5. Answer displayed for review
   ↓
6. User approves/edits answer
   ↓
7. Card created with answer
```

## 5. 설정 관리

### 5.1 플러그인 설정 UI

```typescript
// src/settings-llm.ts

export interface LLMSettings {
  enabled: boolean;
  providers: LLMProviderConfig[];
  defaultProvider: string;
  fallbackChain: string[];
  autoGenerate: boolean;
  showPreview: boolean;
  batchSize: number;
  customPrompts: Record<string, PromptTemplate>;
}

export interface LLMProviderConfig {
  name: string;
  type: 'openai' | 'ollama' | 'openrouter' | 'custom';
  endpoint: string;
  apiKey?: string;
  model: string;
  enabled: boolean;
}
```

### 5.2 보안 고려사항

- API 키는 Obsidian의 secure storage에 저장
- 환경 변수로부터 API 키 로드 지원
- 로그에 API 키 노출 방지
- HTTPS 엔드포인트 권장

## 6. 에러 처리

### 6.1 에러 타입

```typescript
export enum LLMErrorType {
  PROVIDER_UNAVAILABLE = 'provider_unavailable',
  API_ERROR = 'api_error',
  TIMEOUT = 'timeout',
  PARSE_ERROR = 'parse_error',
  RATE_LIMIT = 'rate_limit',
  INVALID_CONFIG = 'invalid_config'
}

export class LLMError extends Error {
  type: LLMErrorType;
  provider?: string;
  retryable: boolean;

  constructor(message: string, type: LLMErrorType, retryable: boolean = false) {
    super(message);
    this.type = type;
    this.retryable = retryable;
  }
}
```

### 6.2 재시도 전략

- 네트워크 에러: 최대 3회 재시도 (exponential backoff)
- Rate limit: 백오프 후 재시도
- Provider 실패: 다음 provider로 폴백
- Parse 에러: 에러 로그 후 사용자에게 알림

## 7. 테스트 전략

### 7.1 단위 테스트
- 각 Provider 클래스
- LLM Router fallback 로직
- Prompt 렌더링
- Content Analyzer

### 7.2 통합 테스트
- End-to-end 카드 생성
- 실제 LLM API 호출 (mocked)
- AnkiConnect 통합

### 7.3 사용자 테스트
- 다양한 markdown 형식
- 여러 LLM provider
- 에러 상황 처리

## 8. 성능 최적화

### 8.1 캐싱
- LLM 응답 캐싱 (파일 해시 기반)
- Provider availability 캐싱

### 8.2 배치 처리
- 여러 카드 생성 요청을 배치로 처리
- 병렬 LLM API 호출

### 8.3 토큰 최적화
- 불필요한 컨텍스트 제거
- 프롬프트 길이 최적화

## 9. 확장성

### 9.1 새 Provider 추가
1. `ILLMProvider` 인터페이스 구현
2. Router에 등록
3. 설정 UI에 추가

### 9.2 커스텀 프롬프트
- 사용자가 프롬프트 템플릿 추가/수정 가능
- 변수 시스템 사용
- 노트 타입별 프롬프트 지원

## 10. 마이그레이션 계획

### Phase 1: 기반 구축
- LLM Provider 인터페이스 구현
- 기본 OpenAI 호환 provider 구현
- 설정 시스템 확장

### Phase 2: 코어 기능
- Smart Card Generator 구현
- Content Analyzer 구현
- 기본 UI 통합

### Phase 3: 고급 기능
- 복수 provider 지원
- 프롬프트 커스터마이징
- 배치 처리

### Phase 4: 최적화
- 성능 튜닝
- 캐싱 시스템
- 에러 처리 개선

## 11. 보안 및 프라이버시

### 11.1 데이터 처리
- 사용자 선택: 로컬 LLM vs 클라우드
- 민감 정보 필터링 옵션
- 데이터 전송 최소화

### 11.2 API 키 관리
- 암호화된 저장소
- 환경 변수 지원
- .gitignore 자동 설정
