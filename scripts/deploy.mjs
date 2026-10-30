#!/usr/bin/env node
/**
 * 一键部署前端到服务器（SSH + rsync）
 *
 * 用法：npm run deploy
 *
 * 流程：
 *   1. 读取 .env（不存在则提示复制 .env.example 并填写）
 *   2. 校验 DEPLOY_HOST 为公网地址（拦截本机/局域网地址）
 *   3. 自动递增 package.json 小版本号（patch：X.Y.Z -> X.Y.(Z+1)）
 *   4. 本地执行 npm run build（类型检查 + 生产构建）
 *   5. rsync 将 dist/ 同步到服务器 DEPLOY_REMOTE_DIR（--delete 全量镜像）
 *
 * 认证方式：
 *   - .env 填了 DEPLOY_PASSWORD：使用 sshpass 密码登录（本机需安装 sshpass）
 *   - 未填：使用默认 SSH 密钥 / ssh-agent 认证（推荐）
 */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = path.join(ROOT, '.env')
const PKG_FILE = path.join(ROOT, 'package.json')

/** 必填配置项 */
const REQUIRED = ['DEPLOY_HOST', 'DEPLOY_USER', 'DEPLOY_REMOTE_DIR']

/**
 * 递增 SemVer 末位修订号（patch）：X.Y.Z -> X.Y.(Z+1)
 * 若当前版本为空或 0.0.0，则先对齐到 1.0.0 再递增为 1.0.1
 */
export function bumpPatchVersion(versionStr) {
  const normalized = !versionStr || versionStr === '0.0.0' ? '1.0.0' : String(versionStr).trim()
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(normalized)
  if (!match) {
    throw new Error(`[deploy] 无法解析版本号 "${versionStr}"，期望格式为 X.Y.Z`)
  }
  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3]) + 1
  return `${major}.${minor}.${patch}`
}

/**
 * 读取并递增指定 package.json 的 version 字段，写回文件并返回 { previousVersion, nextVersion }
 */
export function bumpPackageVersion(pkgPath = PKG_FILE) {
  const raw = readFileSync(pkgPath, 'utf8')
  const pkg = JSON.parse(raw)
  const previousVersion = pkg.version || '1.0.0'
  const nextVersion = bumpPatchVersion(previousVersion)
  pkg.version = nextVersion
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
  return { previousVersion, nextVersion }
}

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

async function main() {
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

  // 1. 自动递增 package.json 小版本号（patch）
  const { previousVersion, nextVersion } = bumpPackageVersion(PKG_FILE)
  console.log(`[deploy] 版本号已自动提升：v${previousVersion} -> v${nextVersion}`)

  // 2. 本地构建（类型检查 + 生产构建）
  run('npm', ['run', 'build'], { cwd: ROOT })

  // 3. rsync 同步 dist/ 到服务器
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

  console.log(`[deploy] ✅ 部署完成（v${nextVersion}）：${user}@${host}:${remoteDir}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
