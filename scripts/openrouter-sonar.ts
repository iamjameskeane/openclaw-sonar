#!/usr/bin/env bun
import { Command } from 'commander';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};

type SearchResponse = {
  model?: string;
  answer?: string;
  citations?: string[];
  raw?: any;
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const DEFAULT_MODEL = process.env.OPENROUTER_SONAR_MODEL || 'sonar';
const DEFAULT_REFERER = process.env.OPENROUTER_REFERER || 'https://github.com/openclaw/openclaw';
const DEFAULT_TITLE = process.env.OPENROUTER_TITLE || 'OpenClaw Sonar CLI';
const MODEL_MAP: Record<string, string> = {
  'sonar': 'perplexity/sonar',
  'sonar-pro': 'perplexity/sonar-pro',
  'sonar-pro-search': 'perplexity/sonar-pro-search',
  'sonar-reasoning': 'perplexity/sonar-reasoning',
  'sonar-reasoning-pro': 'perplexity/sonar-reasoning-pro',
  'sonar-deep-research': 'perplexity/sonar-deep-research',
};

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error('Missing OPENROUTER_API_KEY in environment.');
    process.exit(1);
  }
  return key;
}

function cleanText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part) return String((part as any).text || '');
      return JSON.stringify(part);
    }).join('\n');
  }
  if (value == null) return '';
  return JSON.stringify(value, null, 2);
}

function normalizeModel(model: string): string {
  const trimmed = (model || '').trim();
  if (!trimmed) return MODEL_MAP[DEFAULT_MODEL] || 'perplexity/sonar';
  if (trimmed.includes('/')) return trimmed;
  return MODEL_MAP[trimmed] || `perplexity/${trimmed}`;
}

function shortModelName(model: string): string {
  return model.replace(/^perplexity\//, '').trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

async function callOpenRouter(messages: ChatMessage[], model: string): Promise<any> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': DEFAULT_REFERER,
      'X-OpenRouter-Title': DEFAULT_TITLE,
    },
    body: JSON.stringify({
      model: normalizeModel(model),
      messages,
      plugins: [{ id: 'web' }],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${body}`);
  }

  return await response.json();
}

async function fetchSonarModels(): Promise<string[]> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return Object.keys(MODEL_MAP);
  }

  const json = await response.json();
  const models = unique((json?.data || [])
    .map((m: any) => String(m?.id || ''))
    .filter((id: string) => id.startsWith('perplexity/sonar'))
    .map(shortModelName)
    .sort());

  return models.length ? models : Object.keys(MODEL_MAP);
}

function parseSearchResponse(json: any): SearchResponse {
  const message = json?.choices?.[0]?.message;
  const citations = message?.citations || json?.citations || [];
  return {
    model: shortModelName(String(json?.model || '')),
    answer: cleanText(message?.content ?? ''),
    citations: Array.isArray(citations) ? citations.map(String) : [],
    raw: json,
  };
}

function renderText(resp: SearchResponse) {
  if (resp.model) console.log(`[${resp.model}]\n`);
  if (resp.answer) console.log(resp.answer.trim());
  if (resp.citations && resp.citations.length) {
    console.log('\nSources:');
    resp.citations.forEach((c, i) => console.log(`${i + 1}. ${c}`));
  }
}

async function runQuery(query: string, model: string, output: string, system?: string) {
  const messages: ChatMessage[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: query });
  const raw = await callOpenRouter(messages, model);
  const parsed = parseSearchResponse(raw);
  if (output === 'json') console.log(JSON.stringify(parsed, null, 2));
  else renderText(parsed);
}

const program = new Command();
program
  .name('sonar')
  .description('OpenRouter Sonar CLI with web search enabled.')
  .argument('[query...]', 'query to search')
  .option('-m, --model <model>', 'Sonar model', DEFAULT_MODEL)
  .option('-o, --output <format>', 'text|json', 'text')
  .option('-s, --system <prompt>', 'optional system prompt')
  .action(async (queryParts, opts) => {
    const query = Array.isArray(queryParts) ? queryParts.join(' ').trim() : '';
    if (!query) {
      program.outputHelp();
      return;
    }
    await runQuery(query, opts.model, opts.output, opts.system);
  });

program
  .command('models')
  .description('List available Sonar models.')
  .action(async () => {
    const models = await fetchSonarModels();
    for (const model of models) {
      const suffix = model === DEFAULT_MODEL ? ' (default)' : '';
      console.log(`${model}${suffix}`);
    }
  });

for (const [name, model, system] of [
  ['pro', 'sonar-pro', undefined],
  ['pro-search', 'sonar-pro-search', undefined],
  ['deep', 'sonar-deep-research', 'You are a research assistant. Search the web, synthesize findings clearly, and cite sources.'],
  ['reason', 'sonar-reasoning', undefined],
  ['reason-pro', 'sonar-reasoning-pro', undefined],
] as const) {
  program
    .command(name)
    .description(`Run a query with ${model}.`)
    .argument('<query...>', 'query to search')
    .option('-o, --output <format>', 'text|json', 'text')
    .option('-s, --system <prompt>', 'optional system prompt')
    .action(async (queryParts, opts) => {
      const query = Array.isArray(queryParts) ? queryParts.join(' ').trim() : '';
      await runQuery(query, model, opts.output, opts.system || system);
    });
}

program
  .command('research')
  .description('Run a broader research prompt.')
  .argument('<input...>', 'research prompt')
  .option('-m, --model <model>', 'Sonar model', 'sonar-deep-research')
  .option('-o, --output <format>', 'text|json', 'text')
  .action(async (inputParts, opts) => {
    const input = Array.isArray(inputParts) ? inputParts.join(' ').trim() : '';
    await runQuery(
      input,
      opts.model,
      opts.output,
      'You are a research assistant. Search the web, synthesize findings clearly, and cite sources.'
    );
  });

program
  .command('extract')
  .description('Extract and summarize a URL.')
  .argument('<url>', 'URL to extract')
  .option('-p, --prompt <prompt>', 'extraction prompt', 'Extract the main content of this page and summarize the key points.')
  .option('-m, --model <model>', 'Sonar model', DEFAULT_MODEL)
  .option('-o, --output <format>', 'text|json', 'text')
  .action(async (url, opts) => {
    await runQuery(`${opts.prompt}\n\nURL: ${url}`, opts.model, opts.output);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
