#!/usr/bin/env node
/**
 * 构建并推送后端发布包到服务器（SSH + rsync）
 *
 * 用法：npm run deploy
 *
 * 流程：
 *   1. 读取 .env（不存在则提示复制 .env.example 并填写）
 *   2. 校验 DEPLOY_HOST 为公网地址（拦截本机/局域网地址）
 *   3. 本地执行 npm run build 生成 dist/
 *   4. 确保远端目录 DEPLOY_REMOTE_DIR 存在
 *   5. rsync 将 dist/ 同步到服务器 DEPLOY_REMOTE_DIR（排除服务端 .env、data/、*.db*、node_modules/）
 *   6. 打印服务器端手动启动指引（不在脚本内自动启动服务）
 */
const { lookup } = require('dns').promises;
const { isIP } = require('net');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const REQUIRED = ['DEPLOY_HOST', 'DEPLOY_USER', 'DEPLOY_REMOTE_DIR'];

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

  // 1. 本地构建后端发布包
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
  console.log('[deploy] 请登录服务器在目标目录下执行以下命令启动或重启服务：');
  console.log(`  cd ${remoteDir}`);
  console.log('  npm install --omit=dev --registry=https://registry.npmmirror.com  # 首次部署或依赖变更时执行');
  console.log('  cp -n .env.example .env                                           # 首次部署时初始化并修改环境变量');
  console.log('  npm run dispose                                                   # 启动 PM2 并开启代码监听（已启动后再次推送会自动重启）');
}

main();
