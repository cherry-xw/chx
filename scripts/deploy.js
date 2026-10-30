#!/usr/bin/env node
/**
 * 构建并推送后端发布包到服务器（SSH + rsync）
 *
 * 用法：npm run deploy
 *
 * 流程：
 *   1. 读取 .env（不存在则提示复制 .env.example 并填写）
 *   2. 校验 DEPLOY_HOST 为公网地址（拦截本机/局域网地址）
 *   3. 自动递增 package.json 小版本号（patch：X.Y.Z -> X.Y.(Z+1)）
 *   4. 本地执行 npm run build 生成 dist/
 *   5. 确保远端目录 DEPLOY_REMOTE_DIR 存在
 *   6. rsync 将 dist/ 同步到服务器 DEPLOY_REMOTE_DIR（排除服务端 .env、data/、*.db*、node_modules/）
 *   7. 请求线上 /api/version 自动校验版本与上线状态
 */
const { lookup } = require('dns').promises;
const { isIP } = require('net');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const PKG_FILE = path.join(ROOT, 'package.json');
const REQUIRED = ['DEPLOY_HOST', 'DEPLOY_USER', 'DEPLOY_REMOTE_DIR'];

/**
 * 递增 SemVer 末位修订号（patch）：X.Y.Z -> X.Y.(Z+1)
 * 若当前版本为空或 0.0.0，则先对齐到 1.0.0 再递增为 1.0.1
 */
function bumpPatchVersion(versionStr) {
  const normalized = !versionStr || versionStr === '0.0.0' ? '1.0.0' : String(versionStr).trim();
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(normalized);
  if (!match) {
    throw new Error(`[deploy] 无法解析版本号 "${versionStr}"，期望格式为 X.Y.Z`);
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]) + 1;
  return `${major}.${minor}.${patch}`;
}

/**
 * 读取并递增指定 package.json 的 version 字段，写回文件并返回 { previousVersion, nextVersion }
 */
function bumpPackageVersion(pkgPath = PKG_FILE) {
  const raw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  const previousVersion = pkg.version || '1.0.0';
  const nextVersion = bumpPatchVersion(previousVersion);
  pkg.version = nextVersion;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return { previousVersion, nextVersion };
}

function loadEnv(file) {
  if (!fs.existsSync(file)) {
    console.error(`[deploy] 缺少配置文件：${file}`);
    console.error('[deploy] 请先执行：cp .env.example .env，然后填写服务器信息');
    process.exit(1);
  }
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(file);
    } catch (err) {
      console.error(`[deploy] 读取 ${file} 失败：${err.message}`);
      process.exit(1);
    }
  }
}

function run(cmd, args, opts = {}) {
  console.log(`[deploy] $ ${[cmd, ...args].join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.error) {
    console.error(`[deploy] 执行失败：${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) {
    process.exit(res.status !== null ? res.status : 1);
  }
}

const PRIVATE_CHECKERS = [
  { name: '回环地址', check: ip => ip === '::1' || ip.startsWith('127.') },
  { name: 'A 类私有网段 10.0.0.0/8', check: ip => ip.startsWith('10.') },
  { name: 'B 类私有网段 172.16.0.0/12', check: ip => /^172\.(1[6-9]|2\d|3[01])\./.test(ip) },
  { name: 'C 类私有网段 192.168.0.0/16', check: ip => ip.startsWith('192.168.') },
  { name: '链路本地 169.254.0.0/16', check: ip => ip.startsWith('169.254.') }
];

async function assertPublicHost(host) {
  let addresses;
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      const records = await lookup(host, { all: true });
      addresses = records.map(r => r.address);
    } catch {
      console.error(`[deploy] 安全校验：无法解析 DEPLOY_HOST（${host}），已中止，请检查 DNS 或改用 IP`);
      process.exit(1);
    }
  }
  if (addresses.length === 0) {
    console.error(`[deploy] 安全校验：DEPLOY_HOST（${host}）未解析到任何地址，已中止`);
    process.exit(1);
  }
  const hits = addresses
    .map(ip => {
      const hit = PRIVATE_CHECKERS.find(({ check }) => check(ip));
      return { ip, name: hit ? hit.name : null };
    })
    .filter(x => x.name);

  if (hits.length > 0) {
    const detail = hits.map(h => `${h.ip}[${h.name}]`).join(', ');
    console.error(`[deploy] 安全拦截：目标 ${host}（${detail}）属于本机/局域网地址，禁止部署到本机或局域网。`);
    process.exit(1);
  }
}

async function main() {
  loadEnv(ENV_FILE);

  for (const key of REQUIRED) {
    if (!process.env[key]) {
      console.error(`[deploy] .env 缺少必填项 ${key}`);
      process.exit(1);
    }
  }

  const host = process.env.DEPLOY_HOST;
  const user = process.env.DEPLOY_USER;
  const port = process.env.DEPLOY_PORT || '22';
  const password = process.env.DEPLOY_PASSWORD || '';
  const remoteDir = process.env.DEPLOY_REMOTE_DIR.endsWith('/')
    ? process.env.DEPLOY_REMOTE_DIR
    : `${process.env.DEPLOY_REMOTE_DIR}/`;

  await assertPublicHost(host);

  // 1. 自动递增 package.json 小版本号（patch）
  const { previousVersion, nextVersion } = bumpPackageVersion(PKG_FILE);
  console.log(`[deploy] 版本号已自动提升：v${previousVersion} -> v${nextVersion}`);

  // 2. 本地构建后端发布包
  run('npm', ['run', 'build'], { cwd: ROOT });

  const sshArgs = ['-p', port, '-o', 'StrictHostKeyChecking=accept-new'];
  const useSshpass = Boolean(password);

  if (useSshpass) {
    const sshpassCheck = spawnSync('sshpass', ['-V'], { stdio: 'ignore' });
    if (sshpassCheck.status !== 0) {
      console.error('[deploy] .env 配置了 DEPLOY_PASSWORD，但本机未安装 sshpass：');
      console.error('  macOS：brew install sshpass（需 brew tap esolitos/ipa）');
      console.error('  Ubuntu/Debian：sudo apt install sshpass');
      process.exit(1);
    }
  }

  // 2. 确保远端存放目录存在
  const mkdirArgs = [...sshArgs, `${user}@${host}`, `mkdir -p '${remoteDir}'`];
  if (useSshpass) {
    run('sshpass', ['-p', password, 'ssh', ...mkdirArgs]);
  } else {
    run('ssh', mkdirArgs);
  }

  // 3. rsync 同步 dist/ 到服务器（保护服务端 .env、data/、*.db*、node_modules/）
  const rsyncArgs = [
    '-az',
    '--delete',
    '--exclude=.env',
    '--exclude=data/',
    '--exclude=*.db',
    '--exclude=*.db-wal',
    '--exclude=*.db-shm',
    '--exclude=node_modules/',
    '-e',
    `ssh ${sshArgs.join(' ')}`,
    path.join(ROOT, 'dist/'),
    `${user}@${host}:${remoteDir}`
  ];

  if (useSshpass) {
    run('sshpass', ['-p', password, 'rsync', ...rsyncArgs]);
  } else {
    run('rsync', rsyncArgs);
  }

  console.log(`\n[deploy] 后端发布包已推送至：${user}@${host}:${remoteDir}`);

  // 5. 请求线上 /api/version 自动校验版本与上线状态
  await verifyOnlineVersion({ host, targetVersion: nextVersion });
}

async function verifyOnlineVersion({ host, targetVersion, maxAttempts = 6, intervalMs = 2000 }) {
  const verifyUrl = process.env.DEPLOY_VERIFY_URL || `https://${host}/api/version`;
  console.log(`[deploy] 正在请求验证线上版本：${verifyUrl}（期望版本：v${targetVersion}）...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(verifyUrl, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.status && json.data && json.data.version === targetVersion) {
          console.log(`[deploy] ✅ 线上版本自动校验通过（第 ${attempt} 次尝试）：${verifyUrl} 返回 v${json.data.version}，服务正常在线`);
          return;
        } else {
          const currentVersion = json?.data?.version || '未知';
          console.log(`[deploy] [尝试 ${attempt}/${maxAttempts}] 线上版本暂未同步（当前: v${currentVersion}，期望: v${targetVersion}），等待服务重载...`);
        }
      } else {
        console.log(`[deploy] [尝试 ${attempt}/${maxAttempts}] 接口返回 HTTP ${res.status}，等待服务重载...`);
      }
    } catch (err) {
      console.log(`[deploy] [尝试 ${attempt}/${maxAttempts}] 请求暂未连通（${err.message}），等待服务重载...`);
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  console.error(`\n[deploy] ❌ 线上版本校验未通过：重试 ${maxAttempts} 次后，${verifyUrl} 未能返回期望版本 v${targetVersion}`);
  console.error('[deploy] 请检查服务器上的 PM2 进程状态（pm2 status / pm2 logs chery）。');
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  bumpPatchVersion,
  bumpPackageVersion
};
