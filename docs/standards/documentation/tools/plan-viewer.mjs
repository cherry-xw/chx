#!/usr/bin/env node
/**
 * Plan Viewer — 独立开发工具（与主项目代码、依赖、构建体系零关联）
 *
 * 读取 docs/plan 下的计划文档，提供：
 *   GET /                页面（产物模式：内嵌压缩资源；源码模式：public/ 目录）
 *   GET /api/plan        结构化计划数据（每次请求实时读盘，刷新即最新）
 *   GET /api/file?p=     读取 docs/plan 下单个 Markdown 文件原文
 *
 * 用法：
 *   node server.mjs [--port=4173] [--plan-dir=<docs/plan 目录>]
 *
 * docs/plan 定位优先级：--plan-dir 参数 > 环境变量 PLAN_DIR > 从脚本位置向上逐级查找。
 *
 * 依赖：仅 Node 内置模块，node >= 20，无需安装任何包。
 */

import http from 'node:http';
import * as auditFs from 'node:fs';
import auditPath from 'node:path';
const { auditPlans } = (() => {
/* Shared, dependency-free Markdown subset for the viewer and lint. */
function unquote(line) {
  return line.replace(/^\s*(?:>\s*)+/, '');
}

function withoutFencedCode(md) {
  let fence = null;
  return String(md).split(/\r?\n/).map((line) => {
    const match = unquote(line).match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (match && match[1][0] === fence[0] && match[1].length >= fence.length && !match[2].trim()) fence = null;
      return '';
    }
    if (match) {
      fence = match[1];
      return '';
    }
    return line;
  }).join('\n');
}

function splitTableRow(line) {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\' && body[i + 1] === '|') { cur += '|'; i++; }
    else if (body[i] === '|') { cells.push(cur.trim()); cur = ''; }
    else cur += body[i];
  }
  cells.push(cur.trim());
  return cells;
}

function findTables(md) {
  const lines = withoutFencedCode(md).split('\n').map(unquote);
  const tables = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].includes('|') || !/^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) || !lines[i + 1].includes('-')) continue;
    const rows = [];
    let j = i + 2;
    while (j < lines.length && lines[j].includes('|') && lines[j].trim()) rows.push(splitTableRow(lines[j++]));
    tables.push({ columns: splitTableRow(lines[i]), rows });
    i = j - 1;
  }
  return tables;
}

const REFERENCE = /^\s{0,3}\[([^\]]+)\]:\s*(<[^>\n]+>|\S+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*$/;
const labelKey = (label) => label.trim().replace(/\s+/g, ' ').toLowerCase();
const destination = (href) => href.replace(/^<|>$/g, '').replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1');

function isReferenceDefinition(line) {
  return REFERENCE.test(unquote(line));
}

function collectReferences(md) {
  const refs = new Map();
  for (const line of withoutFencedCode(md).split('\n')) {
    const match = unquote(line).match(REFERENCE);
    if (match && !refs.has(labelKey(match[1]))) refs.set(labelKey(match[1]), destination(match[2]));
  }
  return refs;
}

/** Offsets allow HTML rendering without interpreting generated markup again.
 * Explicit unresolved references retain href=null so lint can reject them. */
function extractLinks(text, refs = new Map()) {
  if (isReferenceDefinition(text)) return [];
  const out = [];
  const code = [...text.matchAll(/(`+).*?\1/g)].map((m) => [m.index, m.index + m[0].length]);
  const re = /(?<!!)\[([^\]\n]+)\](?:\(\s*(<[^>\n]+>|(?:\\.|[^\s()\\]|\([^()\n]*\))+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)|\[([^\]\n]*)\])?/g;
  for (const match of text.matchAll(re)) {
    if (code.some(([start, end]) => match.index >= start && match.index < end)) continue;
    const href = match[2] ? destination(match[2]) : refs.get(labelKey(match[3] || match[1]));
    if (href === undefined && match[3] === undefined) continue;
    out.push({ text: match[1], href: href ?? null, start: match.index, end: match.index + match[0].length });
  }
  return out;
}

function stripMd(text) {
  return String(text).replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*`_]/g, '').trim();
}

function metadataValue(md, label) {
  for (const line of withoutFencedCode(md).split('\n')) {
    const plain = stripMd(unquote(line));
    const match = plain.match(/^([^：:]+)[：:]\s*(.*)$/);
    if (match && match[1].trim() === label) return match[2].trim() || null;
  }
  return null;
}

function createHeadingSlugger() {
  const used = new Set();
  return (text) => {
    const base = String(text).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]*>/g, '').replace(/[*`]/g, '').trim().toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').replace(/\s/g, '-');
    let slug = base;
    for (let suffix = 1; used.has(slug); suffix++) slug = `${base}-${suffix}`;
    used.add(slug);
    return slug;
  };
}

/** Shared, read-only plan consistency checks. No business completion inference. */




const PLAN_STATUSES = ['规划中', '执行中', '待综合验证', '待用户审批'];
const TASK_STATUSES = ['未开始', '进行中', '阻塞', '已完成'];
const posix = (p) => p.replace(/\\/g, '/');
const statusWord = (s) => stripMd(s || '').split(/[。;；,，(（]/)[0].trim();
const inside = (root, target) => target === root || target.startsWith(root + auditPath.sep);

function auditPlans({ planDir, repoRoot } = {}) {
  const root = auditPath.resolve(planDir || 'docs/plan');
  const project = auditPath.resolve(repoRoot || (auditPath.basename(root) === 'plan' && auditPath.basename(auditPath.dirname(root)) === 'docs' ? auditPath.join(root, '../..') : root));
  const issues = [], plans = [], cache = new Map();
  const relative = (file) => posix(auditPath.relative(root, file));
  const add = (code, severity, plan, file, line, message, expected, actual, action) => {
    issues.push({ code, severity, plan, path: relative(file), line: line || 1, message, expected: String(expected), actual: String(actual), action });
  };
  const kind = (p) => { try { const s = auditFs.lstatSync(p); return s.isSymbolicLink() ? 'link' : s.isDirectory() ? 'directory' : s.isFile() ? 'file' : 'other'; } catch { return null; } };
  const safe = (p, boundary = project) => {
    try { return inside(auditFs.realpathSync(boundary), auditFs.realpathSync(p)); } catch { return false; }
  };
  const read = (p) => {
    if (cache.has(p)) return cache.get(p);
    if (kind(p) !== 'file' || !safe(p) || auditFs.statSync(p).size > 2 * 1024 * 1024) return null;
    const content = auditFs.readFileSync(p, 'utf8'); cache.set(p, content); return content;
  };
  const locate = (md, text) => Math.max(1, md.split('\n').findIndex((line) => line.includes(text)) + 1);
  const indexFile = auditPath.join(root, 'README.md');
  const index = read(indexFile);
  if (index === null) add('INDEX_MISSING', 'error', null, indexFile, 1, '计划总入口不可读取', '实际 README 文件（不超过 2 MiB）', kind(indexFile) || '不存在', '建立可读取的计划总入口。');
  const tables = findTables(index || '').filter((t) => t.columns.some((c) => stripMd(c) === '任务'));
  if (index !== null && !tables.length) add('INDEX_TABLE', 'error', null, indexFile, 1, '总入口没有任务表格', '含任务、状态列的表格', '未找到', '使用连续任务表格；空任务表允许存在。');
  const entries = [];
  for (const table of tables) {
    const columns = table.columns.map(stripMd), taskCol = columns.indexOf('任务'), stateCol = columns.indexOf('状态');
    if (stateCol < 0) add('INDEX_COLUMNS', 'error', null, indexFile, 1, '任务表格缺少状态列', '状态列', '无', '补充状态列并与各任务 README 一致。');
    for (const row of table.rows) {
      const cell = row[taskCol] || '', links = extractLinks(cell, collectReferences(index || ''));
      const line = locate(index || '', cell);
      let target = null;
      try {
        if (links.length === 1 && links[0].href && !/^(?:[a-z][\w+.-]*:|\/|#)/i.test(links[0].href)) target = auditPath.resolve(root, decodeURIComponent(links[0].href.split('#')[0]));
      } catch { /* Report invalid encoded links below. */ }
      if (!target || auditPath.dirname(auditPath.dirname(target)) !== root || auditPath.basename(target) !== 'README.md') {
        add('INDEX_TARGET', 'error', null, indexFile, line, '任务登记链接无效', '<任务目录>/README.md', cell || '空', '每行只链接一个直属任务 README，不使用目录链接或越界路径。'); continue;
      }
      const dir = auditPath.basename(auditPath.dirname(target));
      entries.push({ dir, name: links[0].text, indexStatus: statusWord(row[stateCol]), scope: row[columns.indexOf('范围')] || '', line });
    }
  }
  // Links outside parsed tables must not disappear behind a successful lint result.
  const indexedCells = new Set(tables.flatMap((t) => t.rows.map((r) => r.join('|'))));
  const rawLines = withoutFencedCode(index || '').split('\n');
  rawLines.forEach((line, i) => {
    if (!line.includes('|')) return;
    const links = extractLinks(line, collectReferences(index || '')).filter((l) => l.href && /(?:^|\/)README\.md(?:#|$)/i.test(l.href));
    if (!links.length) return;
    const normalized = splitTableRow(line).join('|');
    if (!indexedCells.has(normalized)) add('INDEX_ROW', 'error', null, indexFile, i + 1, '任务行不属于有效表格', '连续表格中的任务行', line.trim(), '删除表格内部空行，或为另一张表补齐表头。');
  });
  const diskDirs = [];
  if (kind(root) === 'directory') for (const entry of auditFs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === 'README.md') continue;
    if (entry.isDirectory()) diskDirs.push(entry.name);
    else add('ROOT_FILE', 'error', null, auditPath.join(root, entry.name), 1, '计划根存在未归位文件或链接', '仅 README 与任务目录', entry.name, '确认用途后移入任务或临时目录，符号链接不作为计划入口。');
  }
  const dirs = [...new Set([...entries.map((e) => e.dir), ...diskDirs])].sort();
  for (const dir of dirs) {
    const taskDir = auditPath.join(root, dir), readmeFile = auditPath.join(taskDir, 'README.md');
    const matches = entries.filter((e) => e.dir === dir), entry = matches[0];
    const md = kind(taskDir) === 'directory' ? read(readmeFile) : null, taskStatus = statusWord(metadataValue(md || '', '状态'));
    const plan = { dir, name: entry?.name || (md?.match(/^#\s+(.+)/m)?.[1] || dir), indexStatus: entry?.indexStatus || null, readmeStatus: taskStatus || null, scope: entry?.scope || '', registered: matches.length > 0, exists: md !== null, files: [], counts: { ledgerFiles: 0, taskFiles: 0, documents: 0, reachableDocuments: 0 } };
    plans.push(plan);
    if (!matches.length) add('PLAN_UNREGISTERED', 'error', dir, readmeFile, 1, '磁盘任务未登记', '总入口登记 1 次', '0 次', '在总入口登记真实状态，不能删除任务来隐藏遗漏。');
    if (matches.length > 1) add('PLAN_DUPLICATE', 'error', dir, indexFile, entry.line, '同一任务重复登记', '1 次', `${matches.length} 次`, '合并为一条任务记录。');
    if (md === null) { add('PLAN_MISSING', 'error', dir, readmeFile, 1, '任务 README 不存在或不可读取', '可读取的真实文件', kind(readmeFile) || '不存在', '恢复任务入口或确认任务已结束后同步登记；不自动删除。'); continue; }
    if (!PLAN_STATUSES.includes(taskStatus)) add('PLAN_STATUS', 'error', dir, readmeFile, locate(md, '状态'), '任务状态无效', PLAN_STATUSES.join(' / '), taskStatus || '未声明', '核对当前阶段并使用统一状态。');
    if (entry && entry.indexStatus !== taskStatus) add('STATUS_MISMATCH', 'error', dir, indexFile, entry.line, '入口与任务状态不同', `任务 README：${taskStatus || '未声明'}`, `总入口：${entry.indexStatus || '未声明'}`, '核实真实进度后同时更新入口与任务 README。');
    if (!metadataValue(md, '文档创建时间')) add('CREATED_MISSING', 'warning', dir, readmeFile, 1, '缺少创建时间', '原始时间或历史未知说明', '未声明', '按计划规范补录，不能使用本次时间冒充。');
    const checkpoints = withoutFencedCode(md).split('\n').filter((l) => /^#{2,6}\s+.*恢复(?:检查)?点/.test(l));
    if (checkpoints.length !== 1) add('RECOVERY_POINT', 'warning', dir, readmeFile, 1, '当前恢复检查点需要核对', '唯一当前恢复检查点', `${checkpoints.length} 个`, '合并为一个当前入口，替换过期下一步和授权说明。');
    const files = [];
    const walk = (folder) => {
      for (const e of auditFs.readdirSync(folder, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        if (e.name === 'out' && auditPath.basename(folder) === 'verify') {
          if (!e.isDirectory()) add('OUTPUT_DIRECTORY', 'error', dir, auditPath.join(folder, e.name), 1, '验证产物位置不是实际目录', 'verify/out 真实目录', e.isSymbolicLink() ? '符号链接' : '文件', '确认归属后恢复真实产物目录，不使用文件或链接隐藏资料。');
          continue;
        }
        const full = auditPath.join(folder, e.name);
        if (e.isSymbolicLink()) { add('SYMLINK', 'error', dir, full, 1, '计划资料使用符号链接', '计划内真实文件', '符号链接', '使用真实资料或明确链接，不读取符号链接目标。'); continue; }
        if (e.isDirectory()) walk(full);
        else if (e.isFile()) files.push(full);
      }
    };
    walk(taskDir);
    const docs = files.filter((f) => f.endsWith('.md'));
    plan.counts.documents = docs.length;
    const taskFiles = docs.filter((f) => {
      if (f === readmeFile || auditPath.dirname(f) !== taskDir) return false;
      const header = (read(f) || '').split(/^## /m)[0];
      return metadataValue(header, '文档类型') === '小任务' || (metadataValue(header, '文档类型') !== '参考资料' && TASK_STATUSES.includes(statusWord(metadataValue(header, '状态'))));
    });
    plan.counts.taskFiles = taskFiles.length;
    for (const file of files) {
      const rel = posix(auditPath.relative(taskDir, file));
      if (/\.(?:log|tmp|bak|cache|pyc)$|(?:^|\/)\.DS_Store$/i.test(rel)) add('ARTIFACT_LOCATION', 'error', dir, file, 1, '运行产物未归位', 'verify/out 或任务临时目录', rel, '确认本任务归属后移动或清理，不以 Git 忽略代替清理。');
      if (/\.(?:mjs|cjs|js|ts|py|sh|ps1)$/i.test(rel) && !rel.startsWith('verify/')) add('SCRIPT_LOCATION', 'error', dir, file, 1, '临时脚本不在验证目录', 'verify/', rel, '可交接脚本移至 verify；长期代码迁入正式位置并更新引用。');
    }
    const graph = new Map();
    for (const file of docs) {
      const content = read(file);
      if (content === null) { add('DOCUMENT_READ', 'error', dir, file, 1, '文档不可读取', '不超过 2 MiB 的真实文件', '读取受限', '精简文档或恢复合法路径。'); continue; }
      const refs = collectReferences(content), edges = [];
      const citations = new Set([...content.matchAll(/^\s*(?:[-*]\s+)?\[([^\]]+)\]\s+(?:\[|https?:\/\/)/gm)].map((m) => m[1]));
      withoutFencedCode(content).split('\n').forEach((line, i) => {
        for (const link of extractLinks(line, refs)) {
          if (!link.href && citations.has(link.text)) continue;
          if (!link.href) { add('LINK_UNDEFINED', 'error', dir, file, i + 1, '引用链接未定义', '有效引用定义', link.text, '补充引用或改为有效链接。'); continue; }
          if (/^[a-z][\w+.-]*:/i.test(link.href) || link.href.startsWith('//')) continue;
          let target, anchor;
          try { const [part, hash] = link.href.split('#'); target = part ? auditPath.resolve(auditPath.dirname(file), decodeURIComponent(part)) : file; anchor = hash ? decodeURIComponent(hash) : ''; } catch { target = null; }
          if (!target || !inside(project, target) || /(?:^|[\\/])(?:node_modules|\.git)(?:[\\/]|$)/.test(target)) { add('LINK_BOUNDARY', 'error', dir, file, i + 1, '本地引用越出可检查边界', '项目内明确资料', link.href, '使用项目内正式入口；第三方资料使用官方链接。'); continue; }
          if (!kind(target)) { add('LINK_MISSING', 'error', dir, file, i + 1, '引用目标不存在', link.href, '缺失', '更新到实际入口，或明确取消不再存在的引用。'); continue; }
          if (!safe(target)) { add('LINK_BOUNDARY', 'error', dir, file, i + 1, '引用目标通过链接越界', '项目内真实资料', link.href, '改用项目内真实入口。'); continue; }
          if (inside(taskDir, target) && target.endsWith('.md')) edges.push(target);
          if (anchor && target.endsWith('.md')) {
            const targetMd = read(target);
            if (targetMd !== null) {
              const slug = createHeadingSlugger(), anchors = new Set();
              for (const l of withoutFencedCode(targetMd).split('\n')) { const match = l.match(/^#{1,6}\s+(.+?)\s*#*\s*$/); if (match) anchors.add(slug(match[1])); }
              for (const m of targetMd.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) anchors.add(m[1]);
              if (!anchors.has(anchor)) add('LINK_ANCHOR', 'error', dir, file, i + 1, '引用章节不存在', `${relative(target)}#${anchor}`, '无此章节', '更新到当前章节，不使用旧阶段锚点。');
            }
          }
        }
      });
      graph.set(file, edges);
    }
    const reachable = new Set(), visit = (f) => { if (reachable.has(f)) return; reachable.add(f); for (const next of graph.get(f) || []) visit(next); };
    visit(readmeFile); plan.counts.reachableDocuments = docs.filter((f) => reachable.has(f)).length;
    for (const file of docs) {
      plan.files.push({ file: posix(auditPath.relative(taskDir, file)), reachable: reachable.has(file), task: taskFiles.includes(file) });
      if (!reachable.has(file)) add('DOCUMENT_UNREFERENCED', 'warning', dir, file, 1, '文档无法从任务入口到达', '有效入口或确认删除', '无入链', '核对用途，补入适当入口或清理本任务无用资料。');
    }
    const ledger = findTables(md).find((t) => t.columns.some((c) => stripMd(c) === '状态') && t.columns.some((c) => /任务|小任务|工作|部分|目标|交付/.test(stripMd(c))));
    if (!ledger && metadataValue(md, '计划形式') !== '单页') add('LEDGER_MISSING', 'warning', dir, readmeFile, 1, '没有可识别的小任务台账', '任务台账或单页计划标记', '无', '依据实际工作补齐台账；简单恢复任务可声明计划形式为单页。');
    if (ledger) {
      const cols = ledger.columns.map(stripMd), stateCol = cols.indexOf('状态'), idCol = cols.indexOf('ID'), depCol = cols.indexOf('依赖 ID');
      const refs = collectReferences(md), linkedTasks = new Set(), ids = new Map();
      for (const row of ledger.rows) {
        const rowState = statusWord(row[stateCol]), line = locate(md, row[stateCol] || '|');
        if (!TASK_STATUSES.includes(rowState)) add('TASK_STATUS', 'error', dir, readmeFile, line, '小任务台账状态无效', TASK_STATUSES.join(' / '), rowState, '保持完成事实准确，使用统一的小任务状态。');
        const links = row.flatMap((cell) => extractLinks(cell, refs)).filter((l) => l.href && !/^(?:[a-z][\w+.-]*:|\/|#)/i.test(l.href));
        const localTasks = [];
        for (const l of links) {
          let f; try { f = auditPath.resolve(taskDir, decodeURIComponent(l.href.split('#')[0])); } catch { continue; }
          if (auditPath.dirname(f) !== taskDir || f === readmeFile || !f.endsWith('.md')) continue;
          localTasks.push(f); linkedTasks.add(f);
          const child = read(f);
          if (child !== null) {
            const childState = statusWord(metadataValue(child, '状态'));
            if (childState && childState !== rowState) add('TASK_STATUS_MISMATCH', 'error', dir, f, locate(child, '状态'), '台账与小任务状态不同', `台账：${rowState}`, `文件：${childState}`, '核对实际进度，状态以总任务台账为维护位置。');
          }
          if (rowState === '已完成' && !/综合验证|用户验收/.test(row.join(' '))) add('COMPLETED_FILE', 'error', dir, f, 1, '完成项仍链接实施文件', '迁出有用事实后移除链接并删除', '仍有实施文档链接', '核对完成条件，迁出当前依赖事实后清理，不能误删设计资料。');
        }
        if (['进行中', '阻塞'].includes(rowState) && !localTasks.length && metadataValue(md, '计划形式') !== '单页') add('TASK_FILE_MISSING', 'error', dir, readmeFile, line, '正在执行的小任务没有文档入口', '当前小任务文件链接', '无', '补入实际执行文档；轻量任务可明确使用单页计划。');
        if (idCol >= 0) {
          const id = stripMd(row[idCol] || '');
          if (!id || ids.has(id)) add('TASK_ID', 'error', dir, readmeFile, line, '任务 ID 缺失或重复', '非空唯一 ID', id || '空', '为每项指定稳定且唯一的 ID。');
          ids.set(id, depCol < 0 ? [] : stripMd(row[depCol] || '').split(/[,，、\s]+/).filter((v) => v && v !== '无' && v !== '-'));
        }
      }
      plan.counts.ledgerFiles = linkedTasks.size;
      for (const f of taskFiles) if (!linkedTasks.has(f)) add('TASK_UNREGISTERED', 'error', dir, f, 1, '带状态的小任务未登记到台账', '台账链接', '未登记', '核对用途并登记；设计参考资料不应冒充执行任务。');
      const progress = metadataValue(md, '进度')?.match(/^(\d+)\s*\/\s*(\d+)/);
      const done = ledger.rows.filter((r) => statusWord(r[stateCol]) === '已完成').length;
      if (progress && (+progress[1] !== done || +progress[2] !== ledger.rows.length)) add('PROGRESS_MISMATCH', 'error', dir, readmeFile, locate(md, '进度'), '声明进度与台账统计不同', `${done}/${ledger.rows.length}`, `${progress[1]}/${progress[2]}`, '移除手写进度并从台账统计，或核对真实状态后同步。');
      const visiting = new Set(), visited = new Set();
      const dfs = (id) => {
        if (visiting.has(id)) { add('DEPENDENCY_CYCLE', 'error', dir, readmeFile, 1, '任务依赖形成循环', '可执行的依赖顺序', id, '拆开循环或明确独立的共同前置任务。'); return; }
        if (visited.has(id)) return;
        visiting.add(id);
        for (const dep of ids.get(id) || []) { if (!ids.has(dep)) add('DEPENDENCY_MISSING', 'error', dir, readmeFile, 1, '依赖 ID 不存在', '台账内已有 ID', `${id} → ${dep}`, '更新依赖 ID；跨任务依赖使用正式链接和所需结果。'); else dfs(dep); }
        visiting.delete(id); visited.add(id);
      };
      for (const id of ids.keys()) dfs(id);
      if (taskStatus === '待用户审批' && ledger.rows.some((r) => statusWord(r[stateCol]) !== '已完成')) add('APPROVAL_UNFINISHED', 'error', dir, readmeFile, 1, '待审批计划仍有未完成事项', '全部台账已完成', '存在未完成项', '完成必要工作或退回真实阶段，不能只改状态绕过。');
    }
    if (taskStatus === '待用户审批') {
      const resultTables = docs.flatMap((file) => findTables(read(file) || '').filter((t) => t.columns.some((c) => stripMd(c) === '结论')).map((table) => ({ file, table })));
      if (!resultTables.length) add('APPROVAL_EVIDENCE', 'error', dir, readmeFile, 1, '待审批计划缺少可审阅验收材料', '含结论列的当前验证清单', '未找到', '保留验收文件至批准和删除；不把口头摘要冒充验证记录。');
      for (const { file, table } of resultTables) {
        const col = table.columns.map(stripMd).indexOf('结论');
        for (const row of table.rows) {
          const result = stripMd(row[col] || '');
          if (!['通过', '不适用'].includes(result)) add('APPROVAL_RESULT', 'error', dir, file, locate(read(file), row[0]), '待审批计划仍有未通过的验证', '通过或经用户确认的不适用', result || '空', '补齐真实验证，必要时退回综合验证或执行阶段。');
          if (result === '不适用') add('APPROVAL_EXCLUSION', 'warning', dir, file, locate(read(file), row[0]), '不适用范围需要确认', '用户明确同意的范围排除', row.join(' / '), '人工核对范围排除依据，脚本不推断用户批准。');
        }
      }
    }
  }
  for (const plan of plans) plan.issues = issues.filter((i) => i.plan === plan.dir);
  return { summary: { registered: entries.length, directories: diskDirs.length, documents: plans.reduce((n, p) => n + p.counts.documents, 0), errors: issues.filter((i) => i.severity === 'error').length, warnings: issues.filter((i) => i.severity === 'warning').length }, plans, issues };
}

return { auditPlans };
})();
import path from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, stat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
const { findTables, extractLinks, stripMd, collectReferences, metadataValue, withoutFencedCode } = (() => {
/* Shared, dependency-free Markdown subset for the viewer and lint. */
function unquote(line) {
  return line.replace(/^\s*(?:>\s*)+/, '');
}

function withoutFencedCode(md) {
  let fence = null;
  return String(md).split(/\r?\n/).map((line) => {
    const match = unquote(line).match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (match && match[1][0] === fence[0] && match[1].length >= fence.length && !match[2].trim()) fence = null;
      return '';
    }
    if (match) {
      fence = match[1];
      return '';
    }
    return line;
  }).join('\n');
}

function splitTableRow(line) {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let cur = '';
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\' && body[i + 1] === '|') { cur += '|'; i++; }
    else if (body[i] === '|') { cells.push(cur.trim()); cur = ''; }
    else cur += body[i];
  }
  cells.push(cur.trim());
  return cells;
}

function findTables(md) {
  const lines = withoutFencedCode(md).split('\n').map(unquote);
  const tables = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].includes('|') || !/^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) || !lines[i + 1].includes('-')) continue;
    const rows = [];
    let j = i + 2;
    while (j < lines.length && lines[j].includes('|') && lines[j].trim()) rows.push(splitTableRow(lines[j++]));
    tables.push({ columns: splitTableRow(lines[i]), rows });
    i = j - 1;
  }
  return tables;
}

const REFERENCE = /^\s{0,3}\[([^\]]+)\]:\s*(<[^>\n]+>|\S+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*$/;
const labelKey = (label) => label.trim().replace(/\s+/g, ' ').toLowerCase();
const destination = (href) => href.replace(/^<|>$/g, '').replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1');

function isReferenceDefinition(line) {
  return REFERENCE.test(unquote(line));
}

function collectReferences(md) {
  const refs = new Map();
  for (const line of withoutFencedCode(md).split('\n')) {
    const match = unquote(line).match(REFERENCE);
    if (match && !refs.has(labelKey(match[1]))) refs.set(labelKey(match[1]), destination(match[2]));
  }
  return refs;
}

/** Offsets allow HTML rendering without interpreting generated markup again.
 * Explicit unresolved references retain href=null so lint can reject them. */
function extractLinks(text, refs = new Map()) {
  if (isReferenceDefinition(text)) return [];
  const out = [];
  const code = [...text.matchAll(/(`+).*?\1/g)].map((m) => [m.index, m.index + m[0].length]);
  const re = /(?<!!)\[([^\]\n]+)\](?:\(\s*(<[^>\n]+>|(?:\\.|[^\s()\\]|\([^()\n]*\))+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)|\[([^\]\n]*)\])?/g;
  for (const match of text.matchAll(re)) {
    if (code.some(([start, end]) => match.index >= start && match.index < end)) continue;
    const href = match[2] ? destination(match[2]) : refs.get(labelKey(match[3] || match[1]));
    if (href === undefined && match[3] === undefined) continue;
    out.push({ text: match[1], href: href ?? null, start: match.index, end: match.index + match[0].length });
  }
  return out;
}

function stripMd(text) {
  return String(text).replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*`_]/g, '').trim();
}

function metadataValue(md, label) {
  for (const line of withoutFencedCode(md).split('\n')) {
    const plain = stripMd(unquote(line));
    const match = plain.match(/^([^：:]+)[：:]\s*(.*)$/);
    if (match && match[1].trim() === label) return match[2].trim() || null;
  }
  return null;
}

function createHeadingSlugger() {
  const used = new Set();
  return (text) => {
    const base = String(text).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]*>/g, '').replace(/[*`]/g, '').trim().toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').replace(/\s/g, '-');
    let slug = base;
    for (let suffix = 1; used.has(slug); suffix++) slug = `${base}-${suffix}`;
    used.add(slug);
    return slug;
  };
}

return { findTables, extractLinks, stripMd, collectReferences, metadataValue, withoutFencedCode };
})();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_READ_BYTES = 2 * 1024 * 1024;

/* ---------------- 内嵌 Web 资源 ----------------
 * 构建时由 build.mjs 将 public/ 压缩(gzip+base64)注入下方占位符，生成单文件产物 plan-viewer.mjs；
 * 占位符未替换（源码开发模式）时自动回退从 public/ 目录读取。 */

const EMBEDDED_WEB = {
  '/': { type: 'text/html; charset=utf-8', data: 'H4sIAAAAAAACA21TTW8TMRC991cYn0ktbhzsvXBHnLg7a6drcHZXaydROAVBRSBqA7TkUlJIUREqkESKSkKTgMRPQevN5lR+AnI2X0icPB9vZt4bjfENFri6GnLg6aJ0drB9gKT+HoGPvNydu9DZAQB7nDJrAICLXFPgejRSXBNY0oXcbQjQdtKnRU5gWfBKGEQaAjfwNfc1gRXBtEcYLwuX5xbOTSB8oQWVOeVSycmtTSsttOTOPUl9cF/wCo/AryFIux1Tf53+nKajC4wySAaXwn8IIi4JVLoqufI41xB4ES8QiBahXVepZXuMVoJwPmDVZQsb4xFwJVWKQB2EeRrBLAcAZqK8SuUj6jPo/Hl31ABbBDFiovw/vCrlocMCV6HQordFWFFmUjPNV7PDnjl7Eo+OZsefFtH6MGn1553LefvMHAzS3tg0W8nbWtLqJ61nSefD1rhMD4+W3tZoSatBSW9UUCUYB4IRaA0rcE1y5XuCMe47GC2w68oiFf6ikIYhdP6ZEVAm/D3omBfv0+k0Hn39XfuYscPIlq1IbvgWgkBvVm096MwaX2afG9kyzPDc7A/tGuLRYTwazzvfZyfd5PSpGV+h+Ec7vWzF06PZYDw/+Wb2B+njY4tN3vSTg27SPk+uXoL1vq8nddO8SHvj68lzjLLJSxrKjUSogb1/AosBK0kOgYpcAhENw90HCjoYZaDsbLJrwSj7LH8BvQhDiD0DAAA=' },
  '/app.js': { type: 'text/javascript; charset=utf-8', data: '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' },
  '/style.css': { type: 'text/css; charset=utf-8', data: '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' },
  '/markdown.js': { type: 'text/javascript; charset=utf-8', data: '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' },
  '/navigation.js': { type: 'text/javascript; charset=utf-8', data: 'H4sIAAAAAAACA41W32/bNhB+919xQQKIihUp2aM9zSiSDN2wrkHWPsUuTEsniw1NqiTlJLP1vw8kJVlZnXV+MIjj3ce7734pOYe7WiEoWRsEKnJQ+K1GbS44K9CwDUKJvEKlpyAk3Hz8AFLBSsknjQpyrFDkKLKXGM6TET5XUhkoapEZJgVUUrPn3yUTZEU1RqCQh7AbAbACSPKFzCYP9OLvhf2b5+P4YnE+2c+TMGGxQW2IVQ9BoamVAFFzPh0BZFJoA7I2kMLDwkoKqYB4cUWVAVnA8mxnX4T9HoKgSc52CnmzjBVWnGZIkvk8WUcQJEEY64ozQ+zRu+adO3FI+71HTNMUgjgI7eOGiRqnveLg3ip4hBZD1ibmKNam/C4K+7PXlaxI6AUNINfopbUuHbK7akbQmdvLr5ZP6+901IyOU37DlKAbJAXj6H1q7a1gEHGsOcuQXEZwcRX+ADiXWb1BYd4rLEhWK4XC/Mo4RlAqLH6Y1od5Mp8v+tQ6mzdyS21qrULMRI7PHwsSnAaOCY4GDFVrNBFQkZVSWalRLy3v/g5SyDGTOX6+/+1abiopUBhCDfwMlzBzyDDxD/TxUxO2afC4kEJvEAQwOYY4QKAGxnDlIRrIqMlK2L2KzmXRx6dQS77FHNLO4dmgU14lcMBzGLXaIUxgIJ+2vJ/0sPs9nCTzeJOfHRrJX73FeM5swK9e7k0OWn5EpAP/bdnf3767+XAbb/LAUnWaWLKSeeLFx71wPM9geZpUnIrkbIfiO3JzpsJmCROrZav2uFYP2Synhyr3jo6BtLmcwXLmj+lRFH/nnwve6iuqNN5bYFJSXfp697w8VNSUlrQIvtWoXiCFIFhACk7TzaDTwaSZBQNO+2oT+ASf7//4C6nKyjuq6EYThxbGazQk8IpB6EfaAWDjai2FzofYCUjy5XSeEEvv3g2BeULicXiWhF25OLVuXrkO6tjbwSMT+cQjP1wtIod9tAO8yk+LsGtHaHyhw797oAMNmNhSzvKgQw2CztaeO/vByOssuwB91dk6m0FQyg3agvsPWGhcPpPzc7jd2uwIumVr6pLaWlGDGlbSlKDrLEOti5q7VVhQxjEHyXNU3V7URzddppAa/LOHJp5aO7C2qLRVSeGym2F2jSjJOapB1fpUrHDNOmvHY686i+lKKtOti+FVWz/v7P11L32laUuFCdu+43HrUXfbE63ZWlA+GQDHXhQB09d+5EyAhJD+0oKlaR9e026xyKZv2EJUv4jswBSXNL8+jC+3oyIwLHu0U71Ak5UuIHfyPBwGfD9A7Xx+osx0BmSZ0Iq5STGrjne564NmGQ0C9a+2QULT8uUfWcn8pX9FoY6/apvWw+Y/aa17akh4ZM13ozmWjyGYUsknl6pbpaQi9o0Y7dG29fL9p093YL9VdKwNNbVulu17LazVH64Ygkq9+mr5Xy55L1Ap/3HRjP4BnvSbQwQKAAA=' },
};

const EMBEDDED = !Object.values(EMBEDDED_WEB).some((a) => a.data.includes('__PLAN_VIEWER_ASSET_'));

const decodedCache = new Map();
function embeddedAsset(route) {
  if (!decodedCache.has(route)) {
    decodedCache.set(route, gunzipSync(Buffer.from(EMBEDDED_WEB[route].data, 'base64')));
  }
  return decodedCache.get(route);
}

/* ---------------- 命令行参数与目录定位 ---------------- */

const args = process.argv.slice(2);

function optValue(name) {
  const prefix = `${name}=`;
  const inline = args.find((a) => a.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : null;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Plan Viewer — docs/plan 计划追踪页面（仅开发环境使用）

用法:
  node ${path.basename(process.argv[1] || 'server.mjs')} [选项]

选项:
  --port=<n>          服务端口（默认 4173，或环境变量 PLAN_VIEWER_PORT）
  --plan-dir=<dir>    docs/plan 数据目录
  -h, --help          显示本帮助

docs/plan 定位优先级: --plan-dir > 环境变量 PLAN_DIR > 从脚本位置向上逐级查找

环境依赖: Node.js >= 20（仅内置模块，无需 npm install），跨平台，仅访问 localhost

页面: 启动后访问 http://127.0.0.1:<port>；刷新页面即读取最新文档。`);
  process.exit(0);
}

/** 通用定位 docs/plan：参数 > 环境变量 > 向上逐级查找 */
function resolvePlanDir() {
  const explicit = optValue('--plan-dir') || process.env.PLAN_DIR || '';
  if (explicit) {
    const abs = path.resolve(explicit);
    if (!existsSync(abs)) {
      console.error(`指定的数据目录不存在：${abs}`);
      process.exit(1);
    }
    return abs;
  }
  let dir = __dirname;
  for (;;) {
    const candidate = path.join(dir, 'docs', 'plan');
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  console.error('未找到 docs/plan 数据目录。请用 --plan-dir=<dir> 或环境变量 PLAN_DIR 指定。');
  process.exit(1);
}

const PLAN_DIR = resolvePlanDir();

const PORT = Number(optValue('--port') ?? process.env.PLAN_VIEWER_PORT ?? 4173);
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  console.error('端口必须是 0 至 65535 的整数');
  process.exit(1);
}

/* ---------------- 路径工具 ---------------- */

/** rel（posix 相对路径）解析后是否仍位于 PLAN_DIR 内 */
function isInsidePlan(rel) {
  if (typeof rel !== 'string' || rel === '') return false;
  const abs = path.resolve(PLAN_DIR, rel);
  return abs === PLAN_DIR || abs.startsWith(PLAN_DIR + path.sep);
}

function toPosix(p) {
  return String(p).replace(/\\/g, '/');
}

/* ---------------- Markdown 解析 ---------------- */

/** 台账状态词 → 归一化分组 */
const TASK_STATUS = { 已完成: 'done', 进行中: 'doing', 未开始: 'todo', 阻塞: 'other' };

function normalizeTaskStatus(raw) {
  const status = stripMd(raw || '').split(/[。;；,，]/)[0].trim();
  return TASK_STATUS[status] || 'other';
}

function isRelMd(href) {
  return typeof href === 'string' && /\.md($|#)/i.test(href) && !/^[a-z][a-z\d+.-]*:/i.test(href) && !href.startsWith('#') && !href.startsWith('/');
}

/* ---------------- 各类文档解析 ---------------- */

/** 提取指定章节标题后的第一段非空文本（用于卡片摘要） */
function extractSectionIntro(md, title) {
  const lines = md.split(/\r?\n/);
  const re = new RegExp(`^#{1,6}\\s+.*${title}`);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return null;
  const buf = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      if (buf.length) break;
      continue;
    }
    if (/^#{1,6}\s/.test(line) || line.startsWith('|') || /^\s*```/.test(line)) break;
    buf.push(stripMd(line));
  }
  if (!buf.length) return null;
  const text = buf.join(' ');
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

/** 收集 README 中引用的相对 .md 文件（去重，保留首次出现顺序） */
function collectMdLinks(md, dir, refs) {
  const lines = withoutFencedCode(md).split('\n');
  const seen = new Map();
  for (const line of lines) {
    for (const link of extractLinks(line, refs)) {
      if (!isRelMd(link.href)) continue;
      let file;
      try { file = toPosix(decodeURIComponent(link.href.split('#')[0])); }
      catch { continue; }
      if (!file || seen.has(file)) continue;
      seen.set(file, { name: link.text, file, inside: isInsidePlan(path.join(dir, file)) });
    }
  }
  return [...seen.values()];
}

/** 文档正文首个一级标题，供侧栏目录树第二行展示；无标题或读取失败返回 null */
function firstHeading(md) {
  for (const line of withoutFencedCode(md).split('\n')) {
    const m = line.match(/^#\s+(.*)$/);
    if (!m) continue;
    const text = stripMd(m[1].replace(/\s+#+\s*$/, '')).trim();
    if (text) return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  }
  return null;
}

/** 解析单个计划 README：状态行 / 进度行 / 台账表 / checkbox / 文件引用 */
function parsePlanReadme(md, dir) {
  const refs = collectReferences(md);
  const readmeStatus = metadataValue(md, '状态')?.split(/[。;；,，]/)[0].trim() || null;
  const progressMatch = metadataValue(md, '进度')?.match(/^(\d+)\s*\/\s*(\d+)/);

  // 台账：第一个含「状态」列且至少有 1 行数据的表格
  let ledger = null;
  for (const table of findTables(md)) {
    const statusCol = table.columns.findIndex((c) => stripMd(c).includes('状态'));
    if (statusCol < 0 || table.rows.length === 0) continue;
    const rows = table.rows.map((cells) => {
      const links = extractLinks(cells.join(' '), refs).filter((l) => isRelMd(l.href));
      const statusCell = stripMd(cells[statusCol] || '');
      const nameCell = cells.find((c, i) => i !== statusCol && stripMd(c)) || '';
      return {
        name: stripMd(nameCell),
        status: statusCell,
        group: normalizeTaskStatus(statusCell),
        cells,
        files: links.map((l) => ({ text: l.text, file: toPosix(l.href).split('#')[0] })),
      };
    });
    ledger = { columns: table.columns.map(stripMd), statusCol, rows };
    break;
  }

  const prose = withoutFencedCode(md);
  const cbDone = (prose.match(/^\s*[-*] \[[xX]\]/gm) || []).length;
  const cbTotal = (prose.match(/^\s*[-*] \[[xX ]\]/gm) || []).length;

  // 进度口径优先级：台账统计 > 声明进度行 > checkbox 统计
  let progress = null;
  if (ledger) {
    const counts = { done: 0, doing: 0, todo: 0, other: 0 };
    for (const row of ledger.rows) counts[row.group] += 1;
    const todo = ledger.rows.length - counts.done - counts.doing - counts.other;
    progress = {
      done: counts.done,
      doing: counts.doing,
      todo: Math.max(0, todo),
      other: counts.other,
      total: ledger.rows.length,
      source: '台账统计',
    };
  } else if (progressMatch && Number.isSafeInteger(Number(progressMatch[2])) && Number(progressMatch[1]) <= Number(progressMatch[2])) {
    progress = { done: Number(progressMatch[1]), total: Number(progressMatch[2]), source: '声明进度' };
  } else if (cbTotal > 0) {
    progress = { done: cbDone, todo: cbTotal - cbDone, total: cbTotal, source: '清单勾选' };
  }

  return {
    readmeStatus,
    progress,
    ledger,
    goal: extractSectionIntro(md, '目标'),
    files: collectMdLinks(md, dir, refs),
    checklist: { done: cbDone, total: cbTotal },
  };
}

/* ---------------- API 数据构建 ---------------- */

async function readPlanFile(rel) {
  if (!isInsidePlan(rel)) return null;
  try {
    const realRoot = await realpath(PLAN_DIR);
    const realFile = await realpath(path.resolve(PLAN_DIR, rel));
    if (!(realFile === realRoot || realFile.startsWith(realRoot + path.sep))) return null;
    const content = await readFile(realFile, 'utf8');
    return content.length <= MAX_READ_BYTES ? content : content.slice(0, MAX_READ_BYTES);
  } catch {
    return null;
  }
}

async function buildPlanData() {
  const audit = auditPlans({ planDir: PLAN_DIR });
  const plans = [];
  for (const entry of audit.plans) {
    const md = entry.exists ? await readPlanFile(`${entry.dir}/README.md`) : null;
    if (md == null) {
      plans.push({ ...entry, status: entry.indexStatus || '目录缺失' });
      continue;
    }
    const parsed = parsePlanReadme(md, entry.dir);
    const files = entry.files.filter((f) => f.file !== 'README.md').map((f) => ({ ...f, inside: true, name: f.file }));
    plans.push({ ...entry, ...parsed, files, status: entry.readmeStatus || entry.indexStatus, markdown: md });
  }
  // 侧栏目录树第二行：逐个读取计划内关联文档的一级标题（文件数少，本地实时读盘）
  for (const plan of plans) {
    for (const file of plan.files || []) {
      if (!file.inside) continue;
      const doc = await readPlanFile(path.join(plan.dir, file.file));
      file.title = doc ? firstHeading(doc) : null;
    }
  }
  const summary = {};
  for (const plan of plans) {
    const key = plan.exists ? plan.status || '未知' : '目录缺失';
    summary[key] = (summary[key] || 0) + 1;
  }
  return { generatedAt: new Date().toISOString(), planDir: toPosix(PLAN_DIR), summary, plans, audit: { summary: audit.summary, issues: audit.issues } };
}

/* ---------------- HTTP 服务 ---------------- */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function sendError(res, code, message) {
  sendJson(res, code, { error: message });
}

async function serveStatic(res, urlPath) {
  // 产物模式：内嵌压缩资源
  if (EMBEDDED) {
    let route = urlPath === '/' ? '/' : `/${urlPath.replace(/^\/+/, '')}`;
    if (route === '/index.html') route = '/';
    const asset = EMBEDDED_WEB[route];
    if (!asset) return sendError(res, 404, 'Not Found');
    res.writeHead(200, { 'Content-Type': asset.type, 'Cache-Control': 'no-store' });
    return res.end(embeddedAsset(route));
  }
  // 源码开发模式：从 public/ 目录读取
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const abs = path.resolve(PUBLIC_DIR, rel);
  if (!(abs === PUBLIC_DIR || abs.startsWith(PUBLIC_DIR + path.sep))) {
    return sendError(res, 403, 'Forbidden');
  }
  try {
    const info = await stat(abs);
    if (!info.isFile()) return sendError(res, 404, 'Not Found');
  } catch {
    return sendError(res, 404, 'Not Found');
  }
  const content = await readFile(abs);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(content);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/api/plan') {
      return sendJson(res, 200, await buildPlanData());
    }
    if (url.pathname === '/api/file') {
      // searchParams.get 已做 URL 解码，无需再次 decodeURIComponent
      const p = toPosix(url.searchParams.get('p') || '');
      if (!isInsidePlan(p) || !/\.md$/i.test(p)) {
        return sendError(res, 400, '仅支持读取 docs/plan 内的 .md 文件');
      }
      const md = await readPlanFile(p);
      if (md == null) return sendError(res, 404, `文件不存在：${p}`);
      return sendJson(res, 200, { path: p, markdown: md });
    }
    if (url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true });
    }
    return await serveStatic(res, url.pathname);
  } catch (err) {
    return sendError(res, 500, String((err && err.message) || err));
  }
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`启动失败：端口 ${PORT} 已被占用（可能有残留的 Plan Viewer 进程）。`);
    console.error(`  可先执行 pnpm kill:ports，或换端口启动：pnpm plan -- --port=${PORT + 1}`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Plan Viewer 已启动（仅开发环境使用）');
  console.log(`  模式:   ${EMBEDDED ? '单文件产物（内嵌压缩页面）' : '源码模式（读取 public/）'}`);
  console.log(`  地址:   http://127.0.0.1:${server.address().port}`);
  console.log(`  数据源: ${PLAN_DIR}`);
  console.log('  说明:   刷新页面即读取最新文档；Ctrl+C 停止');
});
