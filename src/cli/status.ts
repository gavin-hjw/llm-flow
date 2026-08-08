import { Command } from 'commander';
import path from 'path';
import {
  checkDependencies,
  readState,
  checkScaffoldIntegrity,
} from '../core/dependency-check.js';
import { TOOL_PATHS, SKILL_NAME } from '../core/constants.js';
import { bunVersion } from '../core/qmd.js';
import { listVendorGgufModels } from '../core/paths.js';
import { printDepRecovery } from '../core/dep-guide.js';
import { logger } from '../utils/logger.js';
import { fileExists } from '../utils/shell.js';

export const statusCommand = new Command('status')
  .description('Show llmflow dependency status, state, and scaffold integrity')
  .action(() => {
    const cwd = process.cwd();

    logger.blank();
    logger.info('llmflow status');
    logger.blank();

    const deps = checkDependencies();
    let missing = 0;

    logger.step('Dependencies:');
    const nodeMajor = Number(process.versions.node.split('.')[0]);
    if (nodeMajor < 22) {
      logger.warn(`Node ${process.versions.node} — need ≥22`);
      printDepRecovery('node', { retryCommand: 'llmflow status' });
      missing++;
    } else {
      logger.success(`Node ${deps.node.version}`);
    }

    if (deps.qmd.installed) {
      logger.success(`qmd ${deps.qmd.version} (${deps.qmd.source})`);
    } else {
      logger.warn('qmd — not found');
      printDepRecovery('qmd', { retryCommand: 'llmflow status' });
      missing++;
    }

    const bunVer = bunVersion();
    if (bunVer) {
      logger.success(`bun ${bunVer} (vendor)`);
    } else {
      logger.warn('bun — vendor missing');
      printDepRecovery('bun', { retryCommand: 'llmflow status' });
      missing++;
    }

    const models = listVendorGgufModels();
    if (models.length) {
      logger.success(`offline models: ${models.length} gguf in vendor/models`);
    } else {
      logger.warn('offline models — vendor/models empty');
      printDepRecovery('models', { retryCommand: 'llmflow status' });
      missing++;
    }

    logger.blank();
    logger.step('Project:');

    const state = readState(cwd);
    if (!state) {
      logger.warn('Not initialized — run llmflow init');
    } else {
      logger.success(`Initialized (${state.tools.join(', ')})`);
      logger.info(`  Created at: ${state.createdAt}`);
      logger.info(`  Updated at: ${state.updatedAt}`);
      logger.info(`  Version: ${state.version}`);
      logger.info(`  qmd recorded: ${state.qmd}`);

      logger.blank();
      logger.step('Scaffold integrity:');
      for (const item of checkScaffoldIntegrity(cwd)) {
        item.ok ? logger.success(`  ${item.path}`) : logger.warn(`  ${item.path} — missing`);
      }

      logger.blank();
      logger.step('Skills:');
      for (const tool of state.tools) {
        const toolPaths = TOOL_PATHS[tool];
        if (!toolPaths) {
          logger.warn(`  ${tool}: unknown tool`);
          continue;
        }
        const skillPath = path.join(cwd, toolPaths.skillsDir, SKILL_NAME, 'SKILL.md');
        fileExists(skillPath)
          ? logger.success(`  ${tool}: ${path.join(toolPaths.skillsDir, SKILL_NAME, 'SKILL.md')}`)
          : logger.warn(`  ${tool}: missing ${path.join(toolPaths.skillsDir, SKILL_NAME, 'SKILL.md')}`);
      }
    }

    if (missing) {
      logger.blank();
      logger.warn(`共 ${missing} 项依赖未就绪。请按上方指引单独安装后，重新执行：llmflow status / llmflow init`);
      process.exitCode = 1;
    }

    logger.blank();
  });
