export const PKG_NAME = '@thundersoft/llmflow';
export const PKG_BIN = 'llmflow';
export const SKILL_NAME = 'llmflow';
export const COMMAND_PREFIX = '/llmflow';

export const STATE_DIR = '.llmflow';
export const STATE_FILE = 'state.json';
export const CONFIG_FILE = 'config.json';

export const PHASES = [
  {
    name: 'ingest',
    slash: 'llm-ingest',
    description: 'Ingest a raw source into the wiki',
    triggers: 'ingest、摄入、处理这个、llm-ingest、/llm-ingest',
  },
  {
    name: 'query',
    slash: 'llm-query',
    description: 'Query the knowledge base and persist answers',
    triggers: '根据我的知识库、查询、提问、llm-query、/llm-query',
  },
  {
    name: 'lint',
    slash: 'llm-lint',
    description: 'Run wiki health checks',
    triggers: 'lint、检查、健康检查、llm-lint、/llm-lint',
  },
  {
    name: 'reflect',
    slash: 'llm-reflect',
    description: 'Cross-source synthesis and gap analysis',
    triggers: 'reflect、综合分析、发现规律、llm-reflect、/llm-reflect',
  },
  {
    name: 'merge',
    slash: 'llm-merge',
    description: 'Merge duplicate concept/entity pages',
    triggers: 'merge、去重、llm-merge、/llm-merge',
  },
  {
    name: 'add-question',
    slash: 'llm-add-question',
    description: 'Record an open question',
    triggers: '我想搞清楚、add question、记录一个问题、llm-add-question、/llm-add-question',
  },
] as const;

export type PhaseName = (typeof PHASES)[number]['name'];

export const PHASE_ALIAS_TOOLS = new Set(['claude', 'codex', 'cursor']);

export const TOOL_PATHS: Record<string, { skillsDir: string }> = {
  claude: { skillsDir: '.claude/skills' },
  codex: { skillsDir: '.codex/skills' },
  cursor: { skillsDir: '.cursor/skills' },
  opencode: { skillsDir: '.opencode/commands' },
};

export const DEFAULT_CONFIG = {
  version: '0.1.0',
  paths: {
    raw: 'raw',
    wiki: 'wiki',
    scripts: 'scripts',
    state: STATE_DIR,
  },
};

/** Empty dirs created on init (no placeholder files like .gitkeep) */
export const SCAFFOLD_EMPTY_DIRS = [
  'raw/articles',
  'raw/clippings',
  'raw/images',
  'raw/pdfs',
  'raw/notes',
  'raw/personal',
  'wiki/sources',
  'wiki/concepts',
  'wiki/entities',
  'wiki/synthesis',
  'wiki/outputs',
] as const;

/** Files refreshable by `update` (always) */
export const UPDATE_ALWAYS = [
  'scripts/lint.mjs',
  'wiki/templates/concept-template.md',
  'wiki/templates/entity-template.md',
  'wiki/templates/source-template.md',
  'wiki/templates/synthesis-template.md',
  'wiki/templates/personal-writing-template.md',
] as const;

/** Extra files refreshable by `update --scaffold` */
export const UPDATE_SCAFFOLD = [
  'CLAUDE.md',
  'README.md',
  'docs/qmd-setup.md',
  'docs/obsidian.md',
] as const;
