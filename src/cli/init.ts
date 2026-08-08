import { Command } from 'commander';
import { checkDependencies, writeState, writeConfig } from '../core/dependency-check.js';
import { generateSkills } from '../core/skill-generator.js';
import { deployScaffold } from '../core/scaffold.js';
import { bunVersion, ensureWikiCollection, initEmbeddings } from '../core/qmd.js';
import { listVendorGgufModels } from '../core/paths.js';
import { printDepRecovery, printRetryFooter } from '../core/dep-guide.js';
import { logger } from '../utils/logger.js';

export const initCommand = new Command('init')
  .description('Initialize LLM Wiki scaffold, local qmd/bun/models, and slash-command skills')
  .option('-t, --tools <tools>', 'Target tools, comma-separated', 'cursor')
  .option('-g, --global', 'Install skills globally under home tool directories')
  .option('--skip-embed', 'Do not run qmd embed after syncing offline models')
  .action((options) => {
    const cwd = process.cwd();
    const tools = (options.tools as string).split(',').map((t: string) => t.trim());
    const installGlobally = Boolean(options.global);
    const runEmbed = !Boolean(options.skipEmbed);
    const retry = `llmflow init${options.tools && options.tools !== 'cursor' ? ` --tools ${options.tools}` : ''}${runEmbed ? '' : ' --skip-embed'}`;

    const issues: string[] = [];

    logger.blank();
    logger.info(`llmflow init — ${installGlobally ? 'global skill setup' : 'project setup'}`);
    logger.blank();

    logger.step('[1/4] Checking bundled dependencies ...');
    const nodeMajor = Number(process.versions.node.split('.')[0]);
    if (nodeMajor < 22) {
      printDepRecovery('node', {
        detail: `当前 Node ${process.version}，需要 ≥22`,
        retryCommand: retry,
      });
      issues.push('node');
    } else {
      logger.success(`Node ${process.versions.node}`);
    }

    const deps = checkDependencies();
    if (deps.qmd.installed) {
      logger.success(`qmd ${deps.qmd.version} (${deps.qmd.source || 'unknown'})`);
    } else {
      printDepRecovery('qmd', { retryCommand: retry });
      issues.push('qmd');
    }

    const bunVer = bunVersion();
    if (bunVer) {
      logger.success(`bun ${bunVer} (vendor)`);
    } else {
      printDepRecovery('bun', { retryCommand: retry });
      issues.push('bun');
    }

    const modelCount = listVendorGgufModels().length;
    if (modelCount > 0) {
      logger.success(`offline models: ${modelCount} gguf`);
    } else if (runEmbed) {
      printDepRecovery('models', { retryCommand: retry });
      issues.push('models');
    } else {
      logger.warn('vendor/models empty — OK with --skip-embed (BM25 only)');
    }

    if (!installGlobally) {
      logger.step('[2/4] Deploying wiki scaffold ...');
      deployScaffold(cwd);
      writeConfig(cwd);
    } else {
      logger.step('[2/4] Skipping scaffold and config for global install');
    }

    logger.step('[3/4] Generating llmflow skills ...');
    generateSkills({ cwd, tools, global: installGlobally });

    if (!installGlobally) {
      logger.step('[4/4] Initializing local qmd + offline models ...');
      let embedCompleted = false;
      if (!deps.qmd.installed) {
        logger.warn('已跳过 qmd collection / embed（qmd 未就绪）');
        printRetryFooter(retry);
      } else {
        const okCol = ensureWikiCollection(cwd);
        if (!okCol) {
          printDepRecovery('collection', { retryCommand: retry });
          issues.push('collection');
        }
        const emb = initEmbeddings(cwd, runEmbed);
        if (emb.modelsMissing && runEmbed) {
          issues.push('models');
        }
        if (emb.embedFailed) {
          printDepRecovery('embed', {
            detail: emb.embedDetail,
            retryCommand: retry,
          });
          issues.push('embed');
        }
        embedCompleted = emb.embedCompleted;
      }

      const now = new Date().toISOString();
      writeState(cwd, {
        createdAt: now,
        updatedAt: now,
        tools,
        version: '0.1.0',
        qmd: deps.qmd.installed,
        embedCompleted,
      });
    } else {
      logger.step('[4/4] Skipping qmd project init for global install');
    }

    logger.blank();
    if (issues.length) {
      logger.warn(`llmflow init 完成，但有 ${issues.length} 项依赖/步骤未成功：${issues.join(', ')}`);
      logger.info('请按上方「依赖失败」指引单独安装缺失组件后，重新执行：');
      logger.info(`  ${retry}`);
      logger.blank();
      process.exitCode = 1;
    } else {
      logger.success('llmflow initialized!');
      logger.blank();
      logger.info('Available slash commands:');
      logger.info('  /llmflow  /llm-ingest  /llm-query  /llm-lint');
      logger.info('  /llm-reflect  /llm-merge  /llm-add-question');
      logger.blank();
      logger.info('Lint: node scripts/lint.mjs');
      logger.info('Next: put sources in raw/, then run /llm-ingest');
      logger.blank();
    }
  });
