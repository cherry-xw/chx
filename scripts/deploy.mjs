#!/usr/bin/env node
/**
 * 一键部署前端到服务器（SSH + rsync）
 *
 * 用法：npm run deploy
 *
 * 流程：
 *   1. 读取 .env（不存在则提示复制 .env.example 并填写）
 *   2. 本地执行 npm run build（类型检查 + 生产构建）
 *   3. rsync 将 dist/ 同步到服务器 DEPLOY_REMOTE_DIR（--delete 全量镜像）
 *
 * 认证方式：
 *   - .env 填了 DEPLOY_PASSWORD：使用 sshpass 密码登录（本机需安装 sshpass）
 *   - 未填：使用默认 SSH 密钥 / ssh-agent 认证（推荐）
 */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = path.join(ROOT, '.env')

/** 必填配置项 */
const REQUIRED = ['DEPLOY_HOST', 'DEPLOY_USER', 'DEPLOY_REMOTE_DIR']

function loadEnv(file) {
  if (!existsSync(file)) {
    console.error(`[deploy] 缺少配置文件：${file}`)
    console.error('[deploy] 请先执行：cp .env.example .env，然后填写服务器信息')
    process.exit(1)
  }
  try {
    process.loadEnvFile(file)
  } catch (err) {
    console.error(`[deploy] 读取 ${file} 失败：${err.message}`)
    process.exit(1)
  }
}

/** 执行命令，失败即退出 */
function run(cmd, args, opts = {}) {
  console.log(`[deploy] $ ${[cmd, ...args].join(' ')}`)
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (res.error) {
    console.error(`[deploy] 执行失败：${res.error.message}`)
    process.exit(1)
  }
  if (res.status !== 0) {
    process.exit(res.status ?? 1)
  }
}

/** 私有/本机地址判定：仅允许公网部署目标 */
const PRIVATE_CHECKERS = [
  { name: '回环地址', check: (ip) => ip === '::1' || ip.startsWith('127.') },
  { name: 'A 类私有网段 10.0.0.0/8', check: (ip) => ip.startsWith('10.') },
  { name: 'B 类私有网段 172.16.0.0/12', check: (ip) => /^172\.(1[6-9]|2\d|3[01])\./.test(ip) },
  { name: 'C 类私有网段 192.168.0.0/16', check: (ip) => ip.startsWith('192.168.') },
  { name: '链路本地 169.254.0.0/16', check: (ip) => ip.startsWith('169.254.') }
]

/**
 * 部署目标安全校验：拒绝本机/局域网地址，防止覆盖本地独立服务。
 * 本项目只部署到公网 3W 服务器（www.xcherry.top）；本地 10.2.3.6:80
 * 是独立项目的专门页面，与本项目互不相关，绝不能作为 rsync --delete 目标。
 */
async function assertPublicHost(host) {
  let addresses
  if (isIP(host)) {
    addresses = [host]
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((r) => r.address)
    } catch {
      console.error(`[deploy] 安全校验：无法解析 DEPLOY_HOST（${host}），已中止，请检查 DNS 或改用 IP`)
      process.exit(1)
    }
  }
  if (addresses.length === 0) {
    console.error(`[deploy] 安全校验：DEPLOY_HOST（${host}）未解析到任何地址，已中止`)
    process.exit(1)
  }
  const hits = addresses
    .map((ip) => ({ ip, name: PRIVATE_CHECKERS.find(({ check }) => check(ip))?.name }))
    .filter((x) => x.name)
  if (hits.length > 0) {
    const detail = hits.map((h) => `${h.ip}[${h.name}]`).join(', ')
    console.error(`[deploy] 安全拦截：目标 ${host}（${detail}）属于本机/局域网地址，禁止部署到本机或局域网。`)
    console.error(
      '[deploy] 本项目只部署到公网服务器（www.xcherry.top）；本地 10.2.3.6:80 是独立项目的专门页面，与本项目无关，切勿覆盖。'
    )
    process.exit(1)
  }
}

loadEnv(ENV_FILE)

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[deploy] .env 缺少必填项 ${key}`)
    process.exit(1)
  }
}

const host = process.env.DEPLOY_HOST
const user = process.env.DEPLOY_USER
const port = process.env.DEPLOY_PORT || '22'
const password = process.env.DEPLOY_PASSWORD || ''
const remoteDir = process.env.DEPLOY_REMOTE_DIR

// 部署目标安全校验：只允许公网地址（拦截本机/局域网，防止覆盖本地独立项目页面）
await assertPublicHost(host)

// 1. 本地构建（类型检查 + 生产构建）
run('npm', ['run', 'build'], { cwd: ROOT })

// 2. rsync 同步 dist/ 到服务器
const sshArgs = ['-p', port, '-o', 'StrictHostKeyChecking=accept-new']
const rsyncArgs = [
  '-az',
  '--delete',
  '-e',
  `ssh ${sshArgs.join(' ')}`,
  path.join(ROOT, 'dist/'),
  `${user}@${host}:${remoteDir}`,
]

if (password) {
  const sshpassCheck = spawnSync('sshpass', ['-V'], { stdio: 'ignore' })
  if (sshpassCheck.status !== 0) {
    console.error('[deploy] .env 配置了 DEPLOY_PASSWORD，但本机未安装 sshpass：')
    console.error('  macOS：brew install sshpass（需 brew tap esolitos/ipa）')
    console.error('  Ubuntu/Debian：sudo apt install sshpass')
    process.exit(1)
  }
  run('sshpass', ['-p', password, 'rsync', ...rsyncArgs])
} else {
  run('rsync', rsyncArgs)
}

console.log(`[deploy] ✅ 部署完成：${user}@${host}:${remoteDir}`)
