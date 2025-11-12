"""
LLM Integration Module for Obsidian to Anki
Provides LLM-powered flashcard generation and answer generation
"""

import json
import requests
import time
from typing import List, Dict, Optional, Any
from abc import ABC, abstractmethod
from enum import Enum


class LLMErrorType(Enum):
    """Types of LLM errors"""
    PROVIDER_UNAVAILABLE = "provider_unavailable"
    API_ERROR = "api_error"
    TIMEOUT = "timeout"
    PARSE_ERROR = "parse_error"
    RATE_LIMIT = "rate_limit"
    INVALID_CONFIG = "invalid_config"
    NETWORK_ERROR = "network_error"
    AUTHENTICATION_ERROR = "authentication_error"


class LLMError(Exception):
    """LLM Error class"""
    def __init__(self, message: str, error_type: LLMErrorType,
                 retryable: bool = False, provider: Optional[str] = None):
        super().__init__(message)
        self.error_type = error_type
        self.retryable = retryable
        self.provider = provider


class LLMProvider(ABC):
    """Base class for LLM providers"""

    @abstractmethod
    def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize the provider with configuration"""
        pass

    @abstractmethod
    def generate_completion(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Generate completion from messages"""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available"""
        pass

    @abstractmethod
    def get_name(self) -> str:
        """Get provider name"""
        pass


class OpenAICompatibleProvider(LLMProvider):
    """OpenAI-compatible API provider (supports Ollama, LM Studio, OpenRouter, OpenAI)"""

    def __init__(self):
        self.config = None

    def initialize(self, config: Dict[str, Any]) -> None:
        """Initialize provider with config"""
        self.config = config

        required = ['endpoint', 'model']
        for key in required:
            if key not in config:
                raise LLMError(
                    f"Missing required config: {key}",
                    LLMErrorType.INVALID_CONFIG,
                    False,
                    config.get('provider', 'unknown')
                )

    def generate_completion(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Generate completion using OpenAI-compatible API"""
        if not self.config:
            raise LLMError(
                "Provider not initialized",
                LLMErrorType.INVALID_CONFIG,
                False
            )

        headers = {
            'Content-Type': 'application/json',
        }

        # Add API key if provided
        if self.config.get('api_key'):
            headers['Authorization'] = f"Bearer {self.config['api_key']}"

        payload = {
            'model': self.config['model'],
            'messages': messages,
            'temperature': self.config.get('temperature', 0.7),
            'max_tokens': self.config.get('max_tokens', 2000),
        }

        timeout = self.config.get('timeout', 60)

        try:
            response = requests.post(
                self.config['endpoint'],
                headers=headers,
                json=payload,
                timeout=timeout
            )

            # Handle error status codes
            if response.status_code == 401 or response.status_code == 403:
                raise LLMError(
                    f"Authentication failed: {response.status_code}",
                    LLMErrorType.AUTHENTICATION_ERROR,
                    False,
                    self.config.get('provider')
                )
            elif response.status_code == 429:
                raise LLMError(
                    "Rate limit exceeded",
                    LLMErrorType.RATE_LIMIT,
                    True,
                    self.config.get('provider')
                )
            elif response.status_code >= 500:
                raise LLMError(
                    f"Server error: {response.status_code}",
                    LLMErrorType.API_ERROR,
                    True,
                    self.config.get('provider')
                )
            elif response.status_code != 200:
                raise LLMError(
                    f"API error: {response.status_code} - {response.text}",
                    LLMErrorType.API_ERROR,
                    False,
                    self.config.get('provider')
                )

            data = response.json()
            return self._parse_response(data)

        except requests.exceptions.Timeout:
            raise LLMError(
                "Request timeout",
                LLMErrorType.TIMEOUT,
                True,
                self.config.get('provider')
            )
        except requests.exceptions.RequestException as e:
            raise LLMError(
                f"Network error: {str(e)}",
                LLMErrorType.NETWORK_ERROR,
                True,
                self.config.get('provider')
            )

    def is_available(self) -> bool:
        """Check if provider is available"""
        if not self.config or 'endpoint' not in self.config:
            return False

        try:
            # Try to reach the endpoint
            test_endpoint = self.config['endpoint'].replace('/chat/completions', '/models')

            headers = {}
            if self.config.get('api_key'):
                headers['Authorization'] = f"Bearer {self.config['api_key']}"

            response = requests.get(test_endpoint, headers=headers, timeout=5)
            return response.status_code in [200, 404, 405]

        except Exception:
            return False

    def get_name(self) -> str:
        """Get provider name"""
        return self.config.get('provider', 'openai-compatible') if self.config else 'unknown'

    def _parse_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse API response"""
        try:
            if 'choices' not in data or not data['choices']:
                raise ValueError("Invalid response format: missing choices")

            choice = data['choices'][0]
            if 'message' not in choice:
                raise ValueError("Invalid response format: missing message")

            return {
                'content': choice['message']['content'],
                'usage': {
                    'prompt_tokens': data.get('usage', {}).get('prompt_tokens', 0),
                    'completion_tokens': data.get('usage', {}).get('completion_tokens', 0),
                    'total_tokens': data.get('usage', {}).get('total_tokens', 0),
                },
                'model': data.get('model', self.config['model']),
                'finish_reason': choice.get('finish_reason', 'stop')
            }

        except (KeyError, ValueError, IndexError) as e:
            raise LLMError(
                f"Failed to parse response: {str(e)}",
                LLMErrorType.PARSE_ERROR,
                False,
                self.config.get('provider')
            )


class LLMRouter:
    """Routes requests to appropriate LLM providers with fallback"""

    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {}
        self.default_provider: Optional[str] = None
        self.fallback_providers: List[str] = []
        self.retry_attempts = 3
        self.retry_delay = 1.0  # seconds

    def register_provider(self, name: str, provider: LLMProvider) -> None:
        """Register a new provider"""
        self.providers[name] = provider
        print(f"LLM Provider registered: {name}")

    def set_default_provider(self, name: str) -> None:
        """Set default provider"""
        if name not in self.providers:
            raise LLMError(
                f"Provider {name} not registered",
                LLMErrorType.INVALID_CONFIG,
                False
            )
        self.default_provider = name

    def set_fallback_chain(self, providers: List[str]) -> None:
        """Set fallback provider chain"""
        for provider in providers:
            if provider not in self.providers:
                raise LLMError(
                    f"Provider {provider} not registered",
                    LLMErrorType.INVALID_CONFIG,
                    False
                )
        self.fallback_providers = providers

    def set_retry_config(self, attempts: int, delay: float) -> None:
        """Set retry configuration"""
        self.retry_attempts = attempts
        self.retry_delay = delay

    def generate(self, messages: List[Dict[str, str]],
                 preferred_provider: Optional[str] = None) -> Dict[str, Any]:
        """Generate completion using provider chain"""
        provider_chain = self._build_provider_chain(preferred_provider)

        if not provider_chain:
            raise LLMError(
                "No LLM providers available",
                LLMErrorType.PROVIDER_UNAVAILABLE,
                False
            )

        last_error = None

        # Try each provider in the chain
        for provider_name in provider_chain:
            provider = self.providers.get(provider_name)
            if not provider:
                continue

            print(f"Trying LLM provider: {provider_name}")

            try:
                # Check availability
                if not provider.is_available():
                    print(f"Provider {provider_name} is not available, skipping")
                    last_error = LLMError(
                        f"Provider {provider_name} is not available",
                        LLMErrorType.PROVIDER_UNAVAILABLE,
                        True,
                        provider_name
                    )
                    continue

                # Try to generate with retries
                response = self._generate_with_retry(provider, messages)
                print(f"Successfully generated completion with {provider_name}")
                return response

            except LLMError as e:
                last_error = e
                print(f"Provider {provider_name} failed: {str(e)}")

                if not e.retryable:
                    continue

            except Exception as e:
                last_error = LLMError(
                    f"Unexpected error with provider {provider_name}: {str(e)}",
                    LLMErrorType.API_ERROR,
                    False,
                    provider_name
                )
                print(f"Unexpected error with {provider_name}: {str(e)}")
                continue

        # All providers failed
        if last_error:
            raise last_error
        else:
            raise LLMError(
                "All LLM providers failed",
                LLMErrorType.PROVIDER_UNAVAILABLE,
                False
            )

    def _generate_with_retry(self, provider: LLMProvider,
                            messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Generate with retry logic"""
        last_error = None

        for attempt in range(self.retry_attempts):
            try:
                return provider.generate_completion(messages)
            except LLMError as e:
                last_error = e

                if not e.retryable:
                    raise e

                if attempt < self.retry_attempts - 1:
                    delay = self.retry_delay * (2 ** attempt)  # Exponential backoff
                    print(f"Retrying in {delay}s (attempt {attempt + 1}/{self.retry_attempts})...")
                    time.sleep(delay)

        raise last_error

    def _build_provider_chain(self, preferred_provider: Optional[str]) -> List[str]:
        """Build provider chain based on preferences"""
        chain = []

        if preferred_provider and preferred_provider in self.providers:
            chain.append(preferred_provider)

        if self.default_provider and self.default_provider not in chain:
            chain.append(self.default_provider)

        for fallback in self.fallback_providers:
            if fallback not in chain:
                chain.append(fallback)

        return chain

    def get_registered_providers(self) -> List[str]:
        """Get list of registered providers"""
        return list(self.providers.keys())


class SmartCardGenerator:
    """Generate flashcards using LLM"""

    def __init__(self, router: LLMRouter):
        self.router = router

    def generate_cards(self, content: str, context: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate flashcards from content"""
        prompt = self._build_card_generation_prompt(content, context)

        messages = [
            {
                'role': 'system',
                'content': 'You are a helpful assistant that creates high-quality flashcards from markdown content. Generate clear, concise questions with accurate answers. Respond ONLY with valid JSON.'
            },
            {
                'role': 'user',
                'content': prompt
            }
        ]

        response = self.router.generate(messages)
        return self._parse_cards(response['content'])

    def generate_answer(self, question: str, context: Optional[str] = None) -> str:
        """Generate answer for a question"""
        messages = [
            {
                'role': 'system',
                'content': 'You are a knowledgeable tutor providing clear, accurate answers.'
            },
            {
                'role': 'user',
                'content': f"Question: {question}\n\nContext: {context or 'None'}\n\nProvide a comprehensive answer:"
            }
        ]

        response = self.router.generate(messages)
        return response['content'].strip()

    def _build_card_generation_prompt(self, content: str, context: Optional[str]) -> str:
        """Build prompt for card generation"""
        return f"""Analyze this markdown content and generate flashcards:

{content}

Generate flashcards in JSON format (respond ONLY with the JSON array):
[
  {{
    "type": "basic",
    "front": "Question",
    "back": "Answer",
    "tags": ["tag1"]
  }}
]
"""

    def _parse_cards(self, response: str) -> List[Dict[str, Any]]:
        """Parse card response"""
        import re

        try:
            # Extract JSON from markdown code block if present
            json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = response

            cards = json.loads(json_str)

            if not isinstance(cards, list):
                raise ValueError("Response is not a list")

            return cards

        except (json.JSONDecodeError, ValueError) as e:
            raise LLMError(
                f"Failed to parse card response: {str(e)}",
                LLMErrorType.PARSE_ERROR,
                False
            )


def create_llm_system(config: Dict[str, Any]) -> tuple:
    """Create and configure LLM system from config

    Returns: (router, card_generator)
    """
    router = LLMRouter()

    # Configure primary provider
    if config.get('primary_provider'):
        primary_config = {
            'provider': config['primary_provider'],
            'endpoint': config.get('primary_endpoint'),
            'model': config.get('primary_model'),
            'api_key': config.get('primary_api_key'),
            'temperature': config.get('temperature', 0.7),
            'max_tokens': config.get('max_tokens', 2000),
            'timeout': config.get('timeout', 60)
        }

        primary_provider = OpenAICompatibleProvider()
        primary_provider.initialize(primary_config)
        router.register_provider(config['primary_provider'], primary_provider)
        router.set_default_provider(config['primary_provider'])

    # Configure fallback provider if specified
    if config.get('fallback_provider'):
        fallback_config = {
            'provider': config['fallback_provider'],
            'endpoint': config.get('fallback_endpoint'),
            'model': config.get('fallback_model'),
            'api_key': config.get('fallback_api_key'),
            'temperature': config.get('temperature', 0.7),
            'max_tokens': config.get('max_tokens', 2000),
            'timeout': config.get('timeout', 60)
        }

        fallback_provider = OpenAICompatibleProvider()
        fallback_provider.initialize(fallback_config)
        router.register_provider(config['fallback_provider'], fallback_provider)
        router.set_fallback_chain([config['fallback_provider']])

    # Create card generator
    card_generator = SmartCardGenerator(router)

    return router, card_generator
