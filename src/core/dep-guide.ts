import { logger } from '../utils/logger.js';
import { packageRoot } from './paths.js';

export type DepKind = 'node' | 'qmd' | 'bun' | 'models' | 'collection' | 'embed';

const SEP = '────────────────────────────────────────';

function box(title: string, lines: string[]): void {
  logger.blank();
  logger.error(title);
  logger.info(SEP);
  for (const line of lines) logger.info(line);
  logger.info(SEP);
  logger.blank();
}

/** Print recovery steps: install missing piece, then re-run the failed command. */
export function printDepRecovery(
  kind: DepKind,
  opts?: { detail?: string; retryCommand?: string },
): void {
  const retry = opts?.retryCommand || 'llmflow init';
  const rootHint = `进入本仓库根目录：${packageRoot()}`;
  const detail = opts?.detail ? [`原因摘要：${opts.detail}`, ''] : [];

  switch (kind) {
    case 'node':
      box('依赖失败：Node.js 不可用或版本过低', [
        ...detail,
        '需要：Node.js ≥ 22',
        '单独安装：',
        '  1) 打开 https://nodejs.org/ 安装 LTS（≥22）',
        '  2) 新开终端执行：node -v',
        '  3) 回到 llm-flow 仓库：npm install && npm run build && npm link',
        `然后重新执行：${retry}`,
      ]);
      break;
    case 'qmd':
      box('依赖失败：qmd 未就绪（离线包缺失或无法启动）', [
        ...detail,
        rootHint,
        '单独修复（任选其一）：',
        '  A) 离线包：确认 vendor/qmd/node_modules/@tobilu/qmd 存在',
        '     若缺失且可联网：npm run vendor:fetch',
        '  B) 在线兜底：npm install -g @tobilu/qmd@2.5.3',
        '     然后确认：qmd --version',
        '  C) 重新安装本工作流：npm install && npm run build && npm link',
        `修复后重新执行：${retry}`,
      ]);
      break;
    case 'bun':
      box('依赖失败：bun 未就绪（vendor/bun 缺失）', [
        ...detail,
        rootHint,
        '单独修复：',
        '  1) 可联网时：npm run vendor:fetch-bun',
        '  2) 或从 https://bun.sh 安装后，将 bun 放到 PATH',
        '  3) 确认：bun --version',
        `修复后重新执行：${retry}`,
        '说明：当前 qmd 2.x 主要用 Node；bun 缺失时 BM25 仍可用，语义相关步骤可能受影响。',
      ]);
      break;
    case 'models':
      box('依赖失败：embedding 模型未就绪（vendor/models 无 .gguf）', [
        ...detail,
        rootHint,
        '单独修复：',
        '  1) 若本机曾下载过模型：npm run vendor:fetch-models',
        '     （从 ~/.cache/qmd/models 拷贝到 vendor/models）',
        '  2) 若缓存也没有：先联网执行一次 qmd embed，再跑步骤 1',
        '  3) 或将官方 GGUF 文件手动放入 vendor/models/',
        '  4) 可选：仅用全文检索可跳过模型 → llmflow init --skip-embed',
        `修复后重新执行：${retry}`,
      ]);
      break;
    case 'collection':
      box('依赖失败：qmd collection 注册未成功', [
        ...detail,
        '单独修复：',
        '  1) 确认已在知识库项目根目录（含 wiki/）',
        '  2) 确认 qmd 可用：qmd --version',
        '  3) 手动执行：',
        '       qmd collection add wiki/ --name wiki --mask "**/*.md"',
        '     或：qmd collection add wiki/ --name wiki',
        '  4) 查看：qmd collection list',
        `修复后重新执行：${retry}`,
      ]);
      break;
    case 'embed':
      box('依赖失败：qmd embed 未成功', [
        ...detail,
        '单独修复：',
        '  1) 确认模型已在缓存：查看 ~/.cache/qmd/models 是否有 .gguf',
        '     若无：在 llm-flow 仓库执行 npm run vendor:fetch-models',
        '     或把 vendor/models/*.gguf 拷到 ~/.cache/qmd/models',
        '  2) 在知识库项目根目录手动执行：qmd embed',
        '  3) 若只需 BM25、暂不需要向量：llmflow init --skip-embed',
        `修复后重新执行：${retry}`,
      ]);
      break;
  }
}

export function printRetryFooter(command: string): void {
  logger.info(`修复完成后，请重新执行：${command}`);
}
