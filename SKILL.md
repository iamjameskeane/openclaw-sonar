---
name: openrouter-sonar
description: Local OpenRouter Sonar web search CLI using the user's OpenRouter API key. Use when you want OpenRouter-backed web search or cited research from a local command like `sonar "query" --model sonar-pro`, plus utilities like `sonar models`, `sonar research`, and `sonar extract`.
---

# OpenRouter Sonar

This skill provides a local `sonar` CLI backed by OpenRouter Sonar models with web search enabled.

## Commands

### Search

```bash
sonar "latest OpenRouter Sonar features"
sonar "best document AI underwriting startups" --model sonar-pro
sonar "credit underwriting agents" --model sonar-reasoning-pro
```

Default model:

- `sonar`

Supported short model names:

- `sonar`
- `sonar-pro`
- `sonar-pro-search`
- `sonar-reasoning`
- `sonar-reasoning-pro`
- `sonar-deep-research`

These map internally to:

- `perplexity/sonar`
- `perplexity/sonar-pro`
- `perplexity/sonar-pro-search`
- `perplexity/sonar-reasoning`
- `perplexity/sonar-reasoning-pro`
- `perplexity/sonar-deep-research`

### Models

```bash
sonar models
```

### Shortcuts

```bash
sonar pro "latest OpenRouter Sonar features"
sonar pro-search "best cited search workflow for agents"
sonar deep "compare OpenRouter Sonar vs Tavily for research"
sonar reason "reason through the strongest arguments for and against RAG here"
sonar reason-pro "compare three underwriting architectures and justify the best one"
```

### Research

```bash
sonar research "Compare Tavily, Exa, and Sonar for cited research workflows"
```

Default model for `research`:

- `sonar-deep-research`

### Extract

```bash
sonar extract "https://openrouter.ai/docs/api/reference/overview"
```

## Environment

Required:

- `OPENROUTER_API_KEY`

Optional:

- `OPENROUTER_SONAR_MODEL` using short form, for example `sonar` or `sonar-pro`
- `OPENROUTER_REFERER`
- `OPENROUTER_TITLE`

## Notes

- This is intentionally local, not MCP.
- It uses OpenRouter chat completions with web search enabled.
- Short model names are preferred, but full `perplexity/...` names still work.
