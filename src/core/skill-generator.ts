import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileExists } from '../utils/shell.js';
import { logger } from '../utils/logger.js';
import { SKILL_NAME, TOOL_PATHS, PHASES, PHASE_ALIAS_TOOLS } from './constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'templates');

export interface GenerateOptions {
  cwd: string;
  tools: string[];
  global?: boolean;
}

export function generateSkills(options: GenerateOptions): void {
  const { cwd, tools, global = false } = options;
  const baseDir = global ? os.homedir() : cwd;

  for (const tool of tools) {
    const toolPaths = TOOL_PATHS[tool];
    if (!toolPaths) {
      logger.warn(`Unknown tool: ${tool}, skipping`);
      continue;
    }

    const skillsDir = path.join(baseDir, toolPaths.skillsDir, SKILL_NAME);
    const displayPath = global
      ? path.join('~', toolPaths.skillsDir, SKILL_NAME)
      : path.relative(cwd, skillsDir);

    logger.step(`Generating ${tool} skills to ${displayPath}/`);

    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }

    copyTemplateFile(skillsDir, 'SKILL.md');

    const referencesDir = path.join(skillsDir, 'references');
    if (!fs.existsSync(referencesDir)) {
      fs.mkdirSync(referencesDir, { recursive: true });
    }

    for (const phase of PHASES) {
      copyTemplateFile(referencesDir, `${phase.name}.md`, 'references');
    }

    if (PHASE_ALIAS_TOOLS.has(tool)) {
      generatePhaseAliasSkills({
        baseDir,
        skillsDir: toolPaths.skillsDir,
        cwd,
        global,
      });
    }

    logger.success(`${tool} skills generated`);
  }
}

function copyTemplateFile(targetDir: string, filename: string, templateSubdir?: string): void {
  const templatePath = templateSubdir
    ? path.join(TEMPLATES_DIR, templateSubdir, filename)
    : path.join(TEMPLATES_DIR, filename);

  let content: string;
  if (fileExists(templatePath)) {
    content = fs.readFileSync(templatePath, 'utf-8');
  } else {
    content = `# ${filename}\n\nTODO: implement\n`;
    logger.warn(`  template missing: ${filename}`);
  }

  fs.writeFileSync(path.join(targetDir, filename), content);
  const displayName = templateSubdir ? `${templateSubdir}/${filename}` : filename;
  logger.step(`  ${displayName}`);
}

function generatePhaseAliasSkills(options: {
  baseDir: string;
  skillsDir: string;
  cwd: string;
  global: boolean;
}): void {
  const { baseDir, skillsDir, cwd, global } = options;

  for (const phase of PHASES) {
    writeAlias(baseDir, skillsDir, cwd, global, phase.slash, phase.name, phase.description, phase.triggers);

    const secondary = `${SKILL_NAME}-${phase.name}`;
    if (secondary !== phase.slash) {
      writeAlias(baseDir, skillsDir, cwd, global, secondary, phase.name, phase.description, phase.triggers);
    }
  }
}

function writeAlias(
  baseDir: string,
  skillsDir: string,
  cwd: string,
  global: boolean,
  aliasName: string,
  phase: string,
  description: string,
  triggers: string,
): void {
  const aliasDir = path.join(baseDir, skillsDir, aliasName);
  const displayPath = global
    ? path.join('~', skillsDir, aliasName, 'SKILL.md')
    : path.relative(cwd, path.join(aliasDir, 'SKILL.md'));

  if (!fs.existsSync(aliasDir)) {
    fs.mkdirSync(aliasDir, { recursive: true });
  }

  fs.writeFileSync(path.join(aliasDir, 'SKILL.md'), getPhaseAliasTemplate(aliasName, phase, description, triggers));
  logger.step(`  ${displayPath}`);
}

function getPhaseAliasTemplate(
  aliasName: string,
  phase: string,
  description: string,
  triggers: string,
): string {
  return `---
name: ${aliasName}
description: "LLMFlow ${phase}: ${description}. Visibility alias for ${SKILL_NAME} ${phase}. 触发词：${triggers}."
disable-model-invocation: true
---

# ${aliasName}

这是 \`/${aliasName}\` / \`${SKILL_NAME} ${phase}\` 的补全可见别名。

执行时必须按以下方式处理：

1. 将本次调用视为用户调用了 \`/${SKILL_NAME} ${phase} $ARGUMENTS\`（等价 \`/${aliasName}\`）
2. 读取同级 skills 目录中的 \`${SKILL_NAME}/SKILL.md\`
3. 读取 \`${SKILL_NAME}/references/${phase}.md\`
4. 严格遵守主 llmflow 工作流契约与当前阶段规范
5. 如果 \`$ARGUMENTS\` 中有额外需求或上下文，将它作为 ${phase} 阶段输入
`;
}
