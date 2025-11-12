# Obsidian to Anki - 한국어 가이드

## 목차

1. [소개](#소개)
2. [기본 사용법](#기본-사용법)
3. [새로운 AI 기능](#새로운-ai-기능)
4. [설치 및 설정](#설치-및-설정)
5. [LLM 설정 가이드](#llm-설정-가이드)
6. [고급 사용법](#고급-사용법)
7. [문제 해결](#문제-해결)
8. [FAQ](#faq)

---

## 소개

### Obsidian to Anki란?

Obsidian의 마크다운 파일에서 Anki 플래시카드를 자동으로 생성하는 도구입니다.
두 가지 방식으로 사용할 수 있습니다:

- **Obsidian 플러그인**: Obsidian 내에서 직접 실행
- **Python 스크립트**: 명령줄에서 독립적으로 실행

### 주요 기능

#### 기존 기능
- ✅ 다양한 플래시카드 스타일 지원 (Basic, Cloze, Q&A 등)
- ✅ 마크다운, 수식, 이미지, 오디오 지원
- ✅ 커스텀 노트 타입 및 정규식
- ✅ 자동 파일 스캔 및 업데이트
- ✅ 태그 및 덱(Deck) 관리

#### 새로운 AI 기능 ⭐
- 🤖 **AI 기반 카드 자동 생성**: 마크다운 내용을 분석하여 자동으로 플래시카드 생성
- 💡 **스마트 해답 생성**: 질문에 대한 답변을 AI가 생성
- 🔄 **카드 품질 개선**: 기존 카드를 AI가 분석하여 개선 제안
- 🌐 **다양한 LLM 지원**: Ollama, LM Studio, OpenRouter, OpenAI 등

---

## 기본 사용법

### Obsidian 플러그인 사용

#### 1. 기본 설치

1. Obsidian을 실행합니다
2. 설정(⚙️) → 커뮤니티 플러그인 → 탐색
3. "Obsidian to Anki" 검색 및 설치
4. 플러그인 활성화

#### 2. Anki 설정

1. Anki를 실행합니다
2. 도구 → 부가기능 → AnkiConnect 설치
3. 도구 → 부가기능 → AnkiConnect → 설정
4. 다음 설정을 입력합니다:

```json
{
    "apiKey": null,
    "apiLogPath": null,
    "webBindAddress": "127.0.0.1",
    "webBindPort": 8765,
    "webCorsOrigin": "http://localhost",
    "webCorsOriginList": [
        "http://localhost",
        "app://obsidian.md"
    ]
}
```

5. Anki를 재시작합니다

#### 3. 기본 카드 작성

마크다운 파일에 다음과 같이 작성합니다:

```markdown
START
Basic
질문은 무엇인가요?
Back: 답변은 이것입니다.
END
```

Obsidian에서 Anki 아이콘을 클릭하면 카드가 Anki에 추가됩니다.

### Python 스크립트 사용

#### 1. 설치

```bash
# Python 3.8 이상 필요
pip install -r requirements.txt
```

#### 2. 설정 파일 생성

첫 실행 시 `obsidian_to_anki_config.ini` 파일이 자동 생성됩니다:

```bash
python obsidian_to_anki.py
```

#### 3. 설정 파일 수정

`obsidian_to_anki_config.ini`를 열어 필요한 설정을 변경합니다:

```ini
[Defaults]
Deck = Default
Tag = Obsidian_to_Anki
```

#### 4. 실행

```bash
python obsidian_to_anki.py your_note.md
```

---

## 새로운 AI 기능

### AI 기반 카드 자동 생성

#### 개요

AI(LLM)를 사용하여 마크다운 파일의 내용을 분석하고 자동으로 플래시카드를 생성합니다.

#### 사용 방법

1. **Obsidian 플러그인**:
   - 파일을 열고 명령 팔레트(Ctrl/Cmd + P)를 실행
   - "Generate Cards with AI" 선택
   - 생성된 카드를 미리보고 승인

2. **Python 스크립트**:
   ```bash
   python obsidian_to_anki.py --llm-generate your_note.md
   ```

#### 예제

**입력 (마크다운)**:
```markdown
# 프로그래밍 언어

## Python
Python은 간결하고 읽기 쉬운 문법을 가진 프로그래밍 언어입니다.
주요 특징:
- 인터프리터 언어
- 동적 타이핑
- 풍부한 라이브러리

## JavaScript
JavaScript는 웹 개발에서 가장 많이 사용되는 언어입니다.
```

**AI 생성 카드**:
```
카드 1:
Q: Python의 주요 특징 3가지는 무엇인가요?
A: 1) 인터프리터 언어 2) 동적 타이핑 3) 풍부한 라이브러리

카드 2:
Q: JavaScript는 주로 어디에 사용되나요?
A: 웹 개발에서 가장 많이 사용됩니다.
```

### 스마트 해답 생성

#### 개요

질문만 작성하면 AI가 답변을 자동으로 생성합니다.

#### 사용 방법

```markdown
START
Basic
Q: 머신러닝과 딥러닝의 차이는?
Back: [AI_GENERATE]
END
```

AI가 파일의 컨텍스트를 참고하여 답변을 생성합니다.

### 카드 품질 개선

#### 개요

기존 카드를 AI가 분석하여 더 나은 버전을 제안합니다.

#### 사용 방법

1. 카드를 선택
2. 명령 팔레트에서 "Improve Card with AI" 실행
3. 개선된 버전 확인 및 적용

---

## 설치 및 설정

### 시스템 요구사항

- **Obsidian**: 최신 버전 권장
- **Anki**: 2.1.x 이상
- **Python**: 3.8 이상 (Python 스크립트 사용 시)
- **AnkiConnect**: Anki 부가기능

### AI 기능 사용을 위한 추가 요구사항

- **로컬 LLM**: Ollama, LM Studio 등 (권장)
- **또는 클라우드 LLM**: OpenRouter, OpenAI API 키

---

## LLM 설정 가이드

### Option 1: Ollama (권장 - 로컬, 무료)

#### 1. Ollama 설치

```bash
# macOS/Linux
curl https://ollama.ai/install.sh | sh

# Windows
# https://ollama.ai 에서 다운로드
```

#### 2. 모델 다운로드

```bash
ollama pull llama2
# 또는
ollama pull mistral
```

#### 3. 플러그인 설정

Obsidian → 설정 → Obsidian to Anki → LLM 설정:

```
Provider: Ollama
Endpoint: http://localhost:11434/v1/chat/completions
Model: llama2
API Key: (비워두기)
```

#### 4. 연결 테스트

"Test Connection" 버튼 클릭 → "✓ Connected" 확인

### Option 2: LM Studio (로컬, 무료, GUI)

#### 1. LM Studio 설치

https://lmstudio.ai 에서 다운로드 및 설치

#### 2. 모델 다운로드

1. LM Studio 실행
2. "Download" 탭에서 모델 검색 (예: "Mistral")
3. 모델 다운로드

#### 3. 로컬 서버 시작

1. "Local Server" 탭
2. 모델 선택
3. "Start Server" 클릭
4. 서버 주소 확인 (보통 `http://localhost:1234`)

#### 4. 플러그인 설정

```
Provider: LM Studio
Endpoint: http://localhost:1234/v1/chat/completions
Model: (다운로드한 모델 이름)
API Key: (비워두기)
```

### Option 3: OpenRouter (클라우드, 유료)

#### 1. API 키 발급

1. https://openrouter.ai 가입
2. API Keys 메뉴에서 새 키 생성
3. 크레딧 충전

#### 2. 플러그인 설정

```
Provider: OpenRouter
Endpoint: https://openrouter.ai/api/v1/chat/completions
Model: anthropic/claude-3-haiku (또는 다른 모델)
API Key: sk-or-v1-... (발급받은 키)
```

#### 3. 모델 선택 팁

- **Claude 3 Haiku**: 빠르고 저렴, 품질 우수
- **GPT-3.5 Turbo**: 저렴하고 무난
- **GPT-4**: 최고 품질, 비쌈

### Option 4: OpenAI (클라우드, 유료)

#### 1. API 키 발급

1. https://platform.openai.com 가입
2. API Keys 메뉴에서 새 키 생성

#### 2. 플러그인 설정

```
Provider: OpenAI
Endpoint: https://api.openai.com/v1/chat/completions
Model: gpt-3.5-turbo
API Key: sk-... (발급받은 키)
```

### 비용 비교

| Provider | 비용 | 속도 | 품질 | 프라이버시 |
|----------|------|------|------|------------|
| Ollama | 무료 | 중간 | 중간 | 최상 |
| LM Studio | 무료 | 중간 | 중간 | 최상 |
| OpenRouter | 유료 | 빠름 | 높음 | 중간 |
| OpenAI | 유료 | 빠름 | 최고 | 중간 |

**권장**: 처음 사용자는 **Ollama** 또는 **LM Studio**로 시작

---

## 고급 사용법

### 다양한 카드 스타일

#### 1. Basic 카드

```markdown
START
Basic
앞면 내용
Back: 뒷면 내용
END
```

#### 2. Cloze 카드

```markdown
START
Cloze
{{c1::Python}}은 {{c2::인터프리터}} 언어입니다.
END
```

#### 3. Q&A 스타일

```markdown
Q: 질문 내용?
A: 답변 내용
```

### 태그 및 덱 관리

#### 파일별 태그 설정

```markdown
FILE TAGS: programming, python, basics
```

#### 파일별 덱 설정

```markdown
TARGET DECK: Programming::Python
```

#### 카드별 태그

```markdown
START
Basic
#important #exam
질문 내용?
Back: 답변 내용
END
```

### 자동 스캔 설정

#### 특정 폴더만 스캔

Obsidian → 설정 → Obsidian to Anki → Scan Directory:
```
/Notes/Study
```

#### 파일/폴더 제외

Ignore 설정:
```
**/*.excalidraw.md
Template/**
**/private/**
```

### 프롬프트 커스터마이징

#### 1. 기본 프롬프트 확인

설정 → LLM → Prompts → "Card Generation" 선택

#### 2. 프롬프트 수정

```
당신은 학습용 플래시카드를 만드는 전문가입니다.
다음 내용을 분석하여 효과적인 플래시카드를 생성하세요.

규칙:
- 명확하고 간결한 질문
- 정확한 답변
- 중요한 개념에 집중
- 한국어로 작성

내용:
{{content}}

JSON 형식으로 출력:
[{"type": "basic", "front": "질문", "back": "답변", "tags": ["태그"]}]
```

### 배치 처리

#### Vault 전체 처리

```bash
python obsidian_to_anki.py --llm-generate --batch /path/to/vault
```

#### 진행 상황 확인

로그 파일 확인:
```bash
tail -f obsidian_to_anki.log
```

---

## 문제 해결

### 일반적인 문제

#### 1. Anki에 연결할 수 없음

**증상**: "Failed to connect to Anki"

**해결방법**:
- Anki가 실행 중인지 확인
- AnkiConnect가 설치되어 있는지 확인
- AnkiConnect 설정 확인 (CORS 설정)
- Anki 재시작

#### 2. LLM에 연결할 수 없음

**증상**: "LLM Provider unavailable"

**해결방법**:
- **Ollama**: `ollama list`로 모델 확인, 서버 실행 확인
- **LM Studio**: Local Server 탭에서 서버 실행 확인
- **클라우드**: API 키 확인, 크레딧 잔액 확인
- 엔드포인트 URL 확인

#### 3. 카드가 생성되지 않음

**증상**: 카드가 Anki에 나타나지 않음

**해결방법**:
- START/END 마커 확인
- 덱 이름 확인
- Anki 동기화
- 로그 파일 확인

#### 4. AI 생성 카드 품질이 낮음

**해결방법**:
- 더 나은 모델 사용 (예: GPT-4, Claude)
- 프롬프트 개선
- 더 많은 컨텍스트 제공
- Temperature 값 조정 (0.5-0.7 권장)

### 로그 확인

#### Obsidian 플러그인

개발자 도구 열기 (Ctrl/Cmd + Shift + I) → Console 탭

#### Python 스크립트

```bash
# 상세 로그 모드
python obsidian_to_anki.py --verbose your_note.md

# 로그 파일 확인
cat obsidian_to_anki.log
```

### 성능 최적화

#### 느린 카드 생성

**원인**:
- LLM 응답 시간
- 네트워크 지연

**해결방법**:
- 로컬 LLM 사용 (Ollama, LM Studio)
- 배치 크기 조정
- 캐싱 활성화

#### 토큰 비용 절감

**방법**:
- 로컬 LLM 사용 (무료)
- 더 작은 모델 사용 (GPT-3.5 대신 Haiku)
- 프롬프트 간소화
- 캐싱 활성화

---

## FAQ

### 기본 사용

#### Q: Python을 모르는데 사용할 수 있나요?
A: 네! Obsidian 플러그인으로 사용하면 Python 지식 없이 사용 가능합니다.

#### Q: Anki가 꼭 필요한가요?
A: 네, 이 도구는 Anki에 카드를 추가하는 도구입니다.

#### Q: 이미 작성한 노트에도 적용할 수 있나요?
A: 네, 기존 마크다운 파일에 카드 마커를 추가하거나 AI로 자동 생성할 수 있습니다.

### AI 기능

#### Q: AI 기능을 사용하려면 비용이 드나요?
A: Ollama나 LM Studio 같은 로컬 LLM을 사용하면 완전 무료입니다. 클라우드 LLM은 사용량에 따라 비용이 발생합니다.

#### Q: 어떤 LLM이 가장 좋나요?
A: 초보자는 Ollama(무료)를, 최고 품질이 필요하면 Claude 3 또는 GPT-4를 권장합니다.

#### Q: AI가 생성한 카드를 검토해야 하나요?
A: 네, 항상 검토 후 승인하는 것을 권장합니다. 설정에서 프리뷰 기능을 활성화하세요.

#### Q: AI가 한국어를 지원하나요?
A: 대부분의 최신 LLM은 한국어를 잘 지원합니다. 프롬프트에 "한국어로 작성" 같은 지시를 추가하면 더 좋습니다.

#### Q: 개인정보가 걱정됩니다
A: 로컬 LLM(Ollama, LM Studio)을 사용하면 데이터가 외부로 전송되지 않습니다.

### 고급 사용

#### Q: 여러 LLM을 동시에 사용할 수 있나요?
A: 네, 기본 provider와 fallback provider를 설정할 수 있습니다.

#### Q: 프롬프트를 어떻게 수정하나요?
A: 설정 → LLM → Prompts에서 수정 가능합니다.

#### Q: 특정 노트 타입에만 AI를 적용할 수 있나요?
A: 네, 설정에서 노트 타입별로 AI 사용 여부를 지정할 수 있습니다.

### 문제 해결

#### Q: 카드 생성이 너무 느려요
A: 로컬 LLM으로 전환하거나 배치 크기를 줄여보세요.

#### Q: API 키를 안전하게 보관하려면?
A: 설정 파일 대신 환경 변수를 사용하세요:
```bash
export OPENAI_API_KEY="your-key"
export OPENROUTER_API_KEY="your-key"
```

#### Q: 생성된 카드를 삭제하려면?
A: Anki에서 직접 삭제하거나, 마크다운 파일에서 DELETE 마커를 추가하세요.

---

## 추가 자료

### 공식 문서
- [프로젝트 Wiki](https://github.com/Pseudonium/Obsidian_to_Anki/wiki)
- [Trello 로드맵](https://trello.com/b/6MXEizGg/obsidiantoanki)

### 관련 도구
- [Obsidian](https://obsidian.md/)
- [Anki](https://apps.ankiweb.net/)
- [AnkiConnect](https://git.foosoft.net/alex/anki-connect)
- [Ollama](https://ollama.ai)
- [LM Studio](https://lmstudio.ai)

### 커뮤니티
- GitHub Issues: 버그 리포트 및 기능 제안
- Obsidian Forum: 사용자 토론
- Anki Forum: Anki 관련 도움

---

## 라이선스

MIT License

---

## 기여하기

프로젝트에 기여하고 싶으신가요?

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 지원하기

이 프로젝트가 유용하다면:
- ⭐ GitHub에서 Star 주기
- 🐛 버그 리포트
- 💡 기능 제안
- 📝 문서 개선
- ☕ [Ko-fi](https://ko-fi.com/K3K52X4L6)에서 커피 사주기

---

## 업데이트 로그

### v4.0.0 (계획)
- ✨ AI 기반 카드 자동 생성
- 💡 스마트 해답 생성
- 🔄 카드 품질 개선
- 🌐 다중 LLM Provider 지원

### v3.6.0 (현재)
- 파일 및 폴더 무시 기능 추가
- 성능 개선
- 버그 수정

---

## 문의

문제가 있거나 질문이 있으신가요?

- 📧 GitHub Issues: [새 이슈 열기](https://github.com/Pseudonium/Obsidian_to_Anki/issues)
- 💬 Discussions: 일반적인 질문 및 토론

---

**Happy Learning! 🎓**

이 가이드가 도움이 되셨기를 바랍니다. 효과적인 학습을 위해 Obsidian과 Anki를 활용하세요!
