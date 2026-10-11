#!/usr/bin/env node
/**
 * chx monorepo 初始化脚本
 *
 * 作用：clone 仓库（monorepo 分支）后执行一条指令，即可：
 *   1. 用 git worktree 把 frontend / backend 分支挂载到 workspace/ 下
 *   2. 安装全部子项目依赖（pnpm workspace 统一安装）
 *
 * 用法：
 *   git clone git@github.com:cherry-xw/chx.git
 *   cd chx
 *   pnpm setup        # 或 npm run setup
 *
 * 说明：workspace/ 目录已被 .gitignore 忽略，子项目代码由各自分支管理。
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const workspaceDir = join(root, 'workspace');

const SUB_PROJECTS = [
  { branch: 'frontend', dir: 'frontend' },
  { branch: 'backend', dir: 'backend' },
];

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
}

/** 检查分支是否已通过 worktree 挂载 */
function worktreeExists(dir) {
  try {
    const out = execSync('git worktree list --porcelain', { cwd: root, encoding: 'utf8' });
    return out.includes(`worktree ${workspaceDir}/${dir}`);
  } catch {
    return false;
  }
}

/** 拉取并挂载一个子项目分支 */
function mountSubProject({ branch, dir }) {
  const target = join(workspaceDir, dir);
  if (worktreeExists(dir)) {
    console.log(`✅ ${branch} 已挂载到 workspace/${dir}，跳过`);
    return;
  }
  if (existsSync(target)) {
    console.log(`⚠️  workspace/${dir} 目录已存在但未挂载为 worktree，请手动确认后删除再重试`);
    process.exit(1);
  }
  mkdirSync(workspaceDir, { recursive: true });
  run(`git worktree add ${target} ${branch}`);
  console.log(`✅ ${branch} 已挂载到 workspace/${dir}`);
}

async function main() {
  console.log('=== chx monorepo setup ===\n');

  for (const p of SUB_PROJECTS) {
    mountSubProject(p);
  }

  console.log('\n=== 安装依赖 ===');
  run('pnpm install');

  console.log('\n✅ 初始化完成');
  console.log('\n常用命令：');
  console.log('  前端开发   pnpm dev            # 进入 workspace/frontend 开发');
  console.log('  后端开发   pnpm dev:backend    # 进入 workspace/backend 开发');
  console.log('  前端构建   pnpm build');
  console.log('  前端测试   pnpm test');
}

main().catch((err) => {
  console.error('\n❌ 初始化失败：', err.message);
  process.exit(1);
});
