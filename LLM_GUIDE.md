# LLM Integration Guide

## Overview

Obsidian to Anki now supports AI-powered flashcard generation using Large Language Models (LLMs). This feature allows you to:

- **Automatically generate flashcards** from your markdown notes
- **Generate answers** for your questions using context
- **Improve existing cards** with AI suggestions
- **Use multiple LLM providers** with automatic fallback

## Supported LLM Providers

### Local Providers (Free, Private)
- **Ollama** - Easy to setup, supports many models
- **LM Studio** - User-friendly GUI, cross-platform
- **Any OpenAI-compatible API** - Custom local servers

### Cloud Providers (Paid, requires API key)
- **OpenRouter** - Access to multiple models (Claude, GPT, etc.)
- **OpenAI** - GPT-3.5, GPT-4
- **Any OpenAI-compatible service**

## Quick Start

### For Obsidian Plugin Users

1. **Install a local LLM** (recommended: Ollama)
   ```bash
   # macOS/Linux
   curl https://ollama.ai/install.sh | sh

   # Windows: Download from https://ollama.ai
   ```

2. **Download a model**
   ```bash
   ollama pull llama2
   # or
   ollama pull mistral
   ```

3. **Configure the plugin**
   - Open Obsidian Settings
   - Go to "Obsidian to Anki" → "LLM Settings"
   - Enable LLM features
   - Configure provider:
     - Provider: `ollama`
     - Endpoint: `http://localhost:11434/v1/chat/completions`
     - Model: `llama2`
     - Leave API Key empty for local providers

4. **Test the connection**
   - Click "Test Connection" button
   - Should see "✓ Connected"

5. **Generate cards**
   - Open a note
   - Run command "Generate Cards with AI"
   - Review and approve generated cards

### For Python Script Users

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure LLM settings** in `obsidian_to_anki_config.ini`:
   ```ini
   [LLM]
   Enabled = True
   Primary Provider = ollama
   Primary Endpoint = http://localhost:11434/v1/chat/completions
   Primary Model = llama2
   Primary API Key =
   ```

3. **Generate cards**
   ```bash
   python obsidian_to_anki.py --llm-generate your_note.md
   ```

## Configuration

### LLM Settings

#### Obsidian Plugin

Settings can be configured in: `Settings → Obsidian to Anki → LLM Settings`

| Setting | Description | Default |
|---------|-------------|---------|
| **Enabled** | Enable/disable LLM features | `false` |
| **Default Provider** | Which provider to use first | `ollama` |
| **Temperature** | Creativity level (0-1) | `0.7` |
| **Max Tokens** | Maximum response length | `2000` |
| **Auto Generate** | Auto-generate cards on file save | `false` |
| **Show Preview** | Show preview before adding cards | `true` |
| **Batch Size** | Cards per batch | `10` |

#### Python Script

Configure in `obsidian_to_anki_config.ini`:

```ini
[LLM]
# Enable LLM features
Enabled = True

# Primary provider
Primary Provider = ollama
Primary Endpoint = http://localhost:11434/v1/chat/completions
Primary Model = llama2
Primary API Key =

# Fallback provider (optional)
Fallback Provider = openrouter
Fallback Endpoint = https://openrouter.ai/api/v1/chat/completions
Fallback Model = anthropic/claude-3-haiku
Fallback API Key = sk-or-v1-...

# Parameters
Temperature = 0.7
Max Tokens = 2000
Timeout = 60

# Features
Auto Generate Cards = False
Auto Generate Answers = True
Show Preview = True
Batch Size = 10
```

## Provider Setup Guides

### Ollama (Recommended for Beginners)

**Pros:** Free, private, easy to setup
**Cons:** Requires local hardware, slower than cloud

1. **Install Ollama**
   ```bash
   curl https://ollama.ai/install.sh | sh
   ```

2. **Download a model**
   ```bash
   # Small, fast model
   ollama pull mistral

   # Or larger, better quality
   ollama pull llama2
   ```

3. **Verify it's running**
   ```bash
   ollama list
   ```

4. **Configure**
   - Endpoint: `http://localhost:11434/v1/chat/completions`
   - Model: `mistral` or `llama2`
   - API Key: (leave empty)

### LM Studio

**Pros:** GUI, cross-platform, free
**Cons:** Requires download, manual setup

1. Download from https://lmstudio.ai
2. Install and open LM Studio
3. Download a model from the "Discover" tab
4. Go to "Local Server" tab
5. Select your model and click "Start Server"
6. Note the server address (usually `http://localhost:1234`)

**Configure:**
- Endpoint: `http://localhost:1234/v1/chat/completions`
- Model: (your downloaded model name)
- API Key: (leave empty)

### OpenRouter (Cloud)

**Pros:** Access to best models (Claude, GPT-4), fast
**Cons:** Costs money, internet required

1. Sign up at https://openrouter.ai
2. Get API key from dashboard
3. Add credits to account

**Configure:**
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Model: `anthropic/claude-3-haiku` (or others)
- API Key: `sk-or-v1-...`

**Recommended models:**
- `anthropic/claude-3-haiku` - Fast, cheap, quality
- `openai/gpt-3.5-turbo` - Balanced
- `anthropic/claude-3-sonnet` - High quality

### OpenAI (Cloud)

**Pros:** Well-tested, reliable
**Cons:** Expensive, internet required

1. Sign up at https://platform.openai.com
2. Create API key
3. Add payment method

**Configure:**
- Endpoint: `https://api.openai.com/v1/chat/completions`
- Model: `gpt-3.5-turbo` or `gpt-4`
- API Key: `sk-...`

## Usage Examples

### Generate Cards from Content

**Markdown Input:**
```markdown
# Python Programming

Python is a high-level programming language.

Key features:
- Easy to read syntax
- Dynamically typed
- Large standard library

## Variables
Variables in Python don't need type declarations.
Example: `x = 10`
```

**Generated Cards:**
```
Card 1:
Q: What is Python?
A: Python is a high-level programming language known for its easy-to-read syntax.

Card 2:
Q: What are three key features of Python?
A: 1) Easy to read syntax 2) Dynamically typed 3) Large standard library

Card 3:
Q: Do variables in Python need type declarations?
A: No, variables in Python don't need type declarations. Example: x = 10
```

### Generate Answer for Question

**Input:**
```markdown
Question: What is the difference between a list and a tuple in Python?
Context: Python has several data structures including lists, tuples, and dictionaries.
```

**Generated Answer:**
```
Lists and tuples in Python are both ordered sequences, but have key differences:

1. Mutability: Lists are mutable (can be modified after creation),
   while tuples are immutable (cannot be changed).

2. Syntax: Lists use square brackets [], tuples use parentheses ()

3. Performance: Tuples are slightly faster than lists due to immutability

4. Use cases: Use lists when you need to modify data,
   tuples for fixed collections or as dictionary keys.

Example:
- List: my_list = [1, 2, 3]; my_list[0] = 10  # OK
- Tuple: my_tuple = (1, 2, 3); my_tuple[0] = 10  # Error
```

## Advanced Features

### Custom Prompts

You can customize the prompts used for card generation:

1. Open Settings → LLM → Prompts
2. Select a prompt template (e.g., "Card Generation")
3. Modify the system or user prompt
4. Variables available: `{{content}}`, `{{context}}`, etc.

**Example custom prompt:**
```
Generate flashcards focusing on practical examples and code snippets.
Use the format:
- Front: Practical question
- Back: Answer with code example
```

### Batch Processing

Process multiple files at once:

**Obsidian:**
- Command: "Generate Cards for Folder"
- Select folder
- Review all generated cards

**Python:**
```bash
python obsidian_to_anki.py --llm-generate --batch /path/to/notes/
```

### Fallback Chain

Configure multiple providers for reliability:

```ini
Primary Provider = ollama
Fallback Provider = openrouter
```

If Ollama fails or is unavailable, it will automatically try OpenRouter.

## Troubleshooting

### "Provider not available"

**Check:**
1. Is Ollama/LM Studio running?
   ```bash
   # For Ollama
   ollama list
   ```

2. Is the endpoint correct?
   - Ollama: `http://localhost:11434/v1/chat/completions`
   - LM Studio: Check the Local Server tab for URL

3. Test connection manually:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### "Failed to parse response"

**Solutions:**
1. Try a different model (some models are better at following JSON format)
2. Increase `Max Tokens` setting
3. Check if response is being cut off

### Cards are low quality

**Solutions:**
1. Use a better model:
   - Local: Try `mistral` or `llama2:13b`
   - Cloud: Try Claude or GPT-4

2. Customize prompts to be more specific

3. Provide more context in your notes

4. Adjust temperature:
   - Lower (0.3-0.5) for more factual cards
   - Higher (0.7-0.9) for more creative cards

### Slow generation

**Solutions:**
1. Use a smaller model locally
2. Switch to cloud provider (faster)
3. Reduce `Max Tokens`
4. Reduce `Batch Size`

### High costs (cloud providers)

**Solutions:**
1. Use cheaper models:
   - OpenRouter: `anthropic/claude-3-haiku`
   - OpenAI: `gpt-3.5-turbo`

2. Switch to local LLM (free)

3. Reduce `Max Tokens`

4. Enable caching (WIP)

## Best Practices

### For Best Card Quality

1. **Write structured notes**
   - Use clear headings
   - Organize with bullet points
   - Include examples

2. **Provide context**
   - Keep related information together
   - Use descriptive headings

3. **Review and edit**
   - Always review AI-generated cards
   - Edit for clarity and accuracy
   - Add tags appropriately

### For Privacy

1. **Use local LLMs** for sensitive content
2. **Check provider privacy policies** before using cloud
3. **Don't include personal information** in test prompts

### For Cost Efficiency

1. **Start with local LLMs** (free)
2. **Use cloud only when needed** (better quality)
3. **Set reasonable token limits**
4. **Enable preview** to avoid generating unwanted cards

## FAQ

**Q: Do I need an internet connection?**
A: No, if you use local LLMs like Ollama or LM Studio.

**Q: Which LLM provider is best?**
A: For beginners: Ollama (free, easy). For quality: Claude or GPT-4.

**Q: How much does it cost?**
A: Local providers are free. Cloud providers vary:
- OpenRouter: ~$0.001-0.01 per card
- OpenAI: ~$0.002-0.05 per card

**Q: Can I use my own custom LLM?**
A: Yes, as long as it supports OpenAI-compatible API.

**Q: Is my data sent to the cloud?**
A: Only if you use cloud providers. Local LLMs keep everything on your machine.

**Q: Can I contribute custom prompts?**
A: Yes! See CONTRIBUTING.md

## API Reference

See `.docs/Design.md` for detailed API documentation.

## Support

- GitHub Issues: https://github.com/Pseudonium/Obsidian_to_Anki/issues
- Documentation: https://github.com/Pseudonium/Obsidian_to_Anki/wiki
- 한국어 가이드: `.docs/README_ko.md`
