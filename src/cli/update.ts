import { Command } from 'commander';
import { readState, writeState, checkDependencies } from '../core/dependency-check.js';
import { generateSkills } from '../core/skill-generator.js';
import { refreshScaffoldFiles } from '../core/scaffold.js';
import { logger } from '../utils/logger.js';

export const updateCommand = new Command('update')
  .description('Regenerate llmflow skills and refresh scaffold files')
  .option('-s, --scaffold', 'Also refresh CLAUDE.md / docs / README')
  .action((options) => {
    const cwd = process.cwd();
    const state = readState(cwd);

    if (!state) {
      logger.error('Project not initialized — run llmflow init first');
      return;
    }

    logger.blank();
    logger.info('llmflow update — regenerating skills and refreshing files');
    logger.blank();

    generateSkills({ cwd, tools: state.tools });
    refreshScaffoldFiles(cwd, Boolean(options.scaffold));

    const deps = checkDependencies();
    writeState(cwd, {
      createdAt: state.createdAt,
      updatedAt: new Date().toISOString(),
      tools: state.tools,
      version: state.version,
      qmd: deps.qmd.installed,
      embedCompleted: Boolean(state.embedCompleted),
    });

    logger.blank();
    logger.success('Skills and scaffold files updated');
    logger.blank();
  });
