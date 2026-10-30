#!/usr/bin/env node
/**
 * 构建后端生产发布包到 dist/
 *
 * 用法：npm run build
 *
 * 产物内容（dist/）：
 *   - 运行时目录：bin/、db/、routes/、utils/
 *   - 运行时入口与配置：app.js、config.js、.env.example
 *   - 依赖清单：裁剪掉开发期依赖后的 package.json 与 package-lock.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');

const RUNTIME_DIRS = ['bin', 'db', 'routes', 'utils'];
const RUNTIME_FILES = ['app.js', 'config.js', 'ecosystem.config.js', '.env.example'];
const DEV_ONLY_DEPS = new Set(['nodemon']);

function buildProductionPackageJson(pkgPath) {
  const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const dependencies = {};

  for (const [name, version] of Object.entries(raw.dependencies || {})) {
    if (!DEV_ONLY_DEPS.has(name)) {
      dependencies[name] = version;
    }
  }

  return {
    name: raw.name,
    version: raw.version,
    private: raw.private !== false,
    scripts: {
      start: 'node ./bin/www',
      dispose: 'pm2 startOrRestart ecosystem.config.js'
    },
    dependencies
  };
}

function build() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  for (const dir of RUNTIME_DIRS) {
    const src = path.join(ROOT, dir);
    const dest = path.join(DIST_DIR, dir);
    if (!fs.existsSync(src)) {
      throw new Error(`[build] 缺少运行时目录：${src}`);
    }
    fs.cpSync(src, dest, { recursive: true });
  }

  for (const file of RUNTIME_FILES) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      fs.cpSync(src, path.join(DIST_DIR, file));
    }
  }

  const wwwPath = path.join(DIST_DIR, 'bin', 'www');
  if (fs.existsSync(wwwPath)) {
    fs.chmodSync(wwwPath, 0o755);
  }

  const prodPkg = buildProductionPackageJson(path.join(ROOT, 'package.json'));
  fs.writeFileSync(
    path.join(DIST_DIR, 'package.json'),
    `${JSON.stringify(prodPkg, null, 2)}\n`,
    'utf8'
  );

  console.log(`[build] 后端发布包已生成：${DIST_DIR}`);
}

try {
  build();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
