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
 *   node server.mjs [--host=<地址>] [--port=4173] [--plan-dir=<docs/plan 目录>]
 *
 * docs/plan 定位优先级：--plan-dir 参数 > 环境变量 PLAN_DIR > 从脚本位置向上逐级查找。
 *
 * 依赖：仅 Node 内置模块，node >= 20，无需安装任何包。
 */

import http from 'node:http';
import os from 'node:os';
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
  '/': { type: 'text/html; charset=utf-8', data: 'H4sIAAAAAAACA21UTW/UMBC991cYcyW1uHFwcuFe8Rdm49nG4LUj20lZThUXqkpVERI9ICooVSmq1I8LasW2QuKnoCZKT/wF5HX2A9RTPPa8N+/N2OEPhMn9uERS+JHKVnj4EAV6PaWviuTpGs1WCOEFgggLQvgIPZC8AOvQp7Tyw+QJJWz5UMMIU1pL3CiN9ZTkRnvUPqUbUvgiFVjLHJNp8IhILb0ElbgcFKaPF1ReeoVZXqAdr41fVo48U6DJr0vSnR00W++6nzfd1QlnMS1ClNQviEWVUufHCl2B6CkpLA5TyqZbq7lzfQnOZqb4wIhxTxH20JJcgXMp9aYcgKXxjBAuZD07GljQgi7r464EnQWVnE2XnAlZz7Ea6iXaRENNCVgJiYJBkBxt3R18v9v/Mq9ICIfewENGiQAPSY9OaWFGSLPbyaTZPmg3J93xFmdwL1I6V6H7H9/vZu3hZvvpqLk8a65fLzFwpqG+z3oggNxLo92y0OCZSJFSi0OLrkicB4+UWKMwTAR85WaWZY0pLY2SHmnWnh42H79155Nmdy924ffm176HC/pB5b3RJNzVlMagN9TXy+7e7LR7F9ENZzFlYWY+izh4tH20ZEzB2FR+MW5wUuDUUliEmzDLnMeFFALDqKe5c+QIZOwFlCXN/qlhQEi9TrNm+3N3c3N7dTo1G9RxFmAzkQu9Q2P84k6GiGbt+4t256zdP2p/vP1z/UGY3LGyfyDN7kl3PuEs4noSl1tZ+r59IyMqhZQ4m6eUQVmuPnc04ywmxdcRHwVn8b/wF1HZXl8oBAAA' },
  '/app.js': { type: 'text/javascript; charset=utf-8', data: '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' },
  '/style.css': { type: 'text/css; charset=utf-8', data: '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' },
  '/markdown.js': { type: 'text/javascript; charset=utf-8', data: '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' },
  '/navigation.js': { type: 'text/javascript; charset=utf-8', data: 'H4sIAAAAAAACA41WbW/bNhD+7l9xgQOIihUp2Ud7mlEkGbqhXYOs/RS7MC2dLDY0qZJUXhbrvw8kJVlJnXX+YAj38tzdc8cjkxO4rhWCkrVBoCIHhd9r1OaUswIN2yKUyCtUegZCwuWnjyAVrJV80KggxwpFjiJ7iuEkGeFjJZWBohaZYVJAJTV7/FMyQdZUYwQKeQjPIwBWAEm+kvn0lp7+s7R/i3wSny5PprtFEiYsNqgNseYhKDS1EiBqzmcjgEwKbUDWBlK4XVpJIRUQL66oMiALWB0/24iw20EQNMnxs0LerGKFFacZkmSxSDYRBEkQxrrizBD76VPzyR05pN3OI6ZpCkEchDa4YaLGWW840FsDj9BiyNrEHMXGlD9UYX9WXcmKhF7QAHKNXlrr0iE7VTOCzt0qv1k+bb6zUTM6TPklU4JukRSMo8+p9beCQcWx5ixDchbB6Xn4E+BcZvUWhXmvsCBZrRQK8zvjGEGpsPhpW28XyWKx7FvrfN7oLbWttQYxEzk+fipIMA4cExwNGKo2aCKgIiulslKjnlrevQ5SyDGTOX65+eNCbispUBhCDfwKZzB3yDD1Afr6qQnbNnhcSKF3CAKYHkIcIFADEzj3EA1k1GQlPL+oznXR16dQS36POaRdwvPBSXnRwAHPYdRahzCFgXzW8n7Uw+52cJQs4m1+vD9IXvUW4zmzBb+I3LvsrfyKSAf527G/uXp3+fEq3uaBpWqcWLKSReLFh7NwPM9hNU4qTkVy/IziB3JzpsJmBVNrZaf2sFUP2axm+yn3iU6AtL2cw2ruP9ODKF7nwwVvnSuqNN5YYFJSXfp597zcVtSUlrQIvteoniCFIFhCCs7S7aDxYNPMgwGn/bQJfIAvNx/+Rqqy8poqutXEoYXxBg0JvGEQ+pXWNb2L7FsxTpjWNeqgb/Mz3DGRTyFoFRFYD1tld4Cg2SezdXObQocaOwFJvo4XCbGt2rmFskhIPAmPk7DLwpl1u8+dxtfxncXt+bKLf+A0eZNfluEgM3do4PV52hcl7iln+YGq7HfnP1ifnedr2tzolnKLdnj/A9aS1YxGyckJXN3bTgt6zzbUDUjrRQ1qWEtTgq6zDLUuau6u1YIyjjlInqPq7lh98NbMFFKDf/XQxFNrl989Km1NUjjr9qG9kpTkHNXgBPhWrHHDOm/HY286j+laKtNdPUNVO4vvrP6il76wtKPChF0Fk0mbUaftidZsIyifDoBjL4qA6Qu/vqZAQkh/a8HStC+vaW/EyLZveBypfhLZnikuaX6xX4XuvovAsOzO3hAFmqx0Bbkvz8P+suiXsd31D5SZzoGsEloxt3Xm1eGN4c5Bs4oGhfqobZHQtHz5IGuZP/VRFOr4m7Zt3b8ijlrvnhoSHngydGs+lnchmFLJB9eqK6WkIjZGjPbTrojV+8+fr8G+e3SsDTW1blZtvBbW2g+vK4JKvXgB/a+UfBaolH+oNKN/Acp4+bhQCgAA' },
  '/filters.js': { type: 'text/javascript; charset=utf-8', data: 'H4sIAAAAAAACA51SwW7TQBC9+yuml3hdGRc4EpkcOCEVCYljlcPKniQrrXfN7roE0kgR4lAkoOoFCRDnckFwKUKA+jM0TXriF5B3bccpLYdeVjszu2/evHlbm/CQUwFnb47m+9/mB18X718sfnxZfP5wPnt5Pvu5PDn88+vV6ffXpycfl8dvz44Plkf783effs+ew+aW5yVSaANCqoxy9gxTiIHsUl5gAPFdeGQUE0OXgF4PfD+IjGIZCSIjt2VCOW7LJ6juUY0k6HoejnOpDAwKkRgmBQwYN6hKhprk5RnCBB4XqJ5CDL4fgjbUFLoMKOd+CNQYFPZrDAPKNcIUYphMA5h4ABVbxJQjxC3axGIGXQ9AoSmUANvNAwCIHAliCdixJjYPwAZAKgIbcUUBOh37N2oV3DWooS2vbgtjRbrTgQ3bJ2JaF6hhbw92+kHEUQzN6GqEDTdT88CooqlXqR0LK2iGoSOYMlXddCLzOjuUlPcjLTMkrUW2lHLJiImEFylqUnUOXLtp4DTTUhlCOA5MCIoNR2ZNOLeHXDGpmClXudL2sukVpkWChOhEKgzBFu3jB9SMooyO1yqRxl10uOVSUCmpfOjBbbgDt4IQbgYXlKl5kIrojVWmHKCZrOtNr3LofcuXONr/eLThU1nkmpZ06I0dVzI4Wa0b61Zrfrwgi7VkFVxmqf8bqraTA81QazpspM+pGdX3RKZNHsc5JgbTOqaJKShvRUyKfrWV65rPLegvILJni9EEAAA=' },
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
  --host=<地址>       监听地址（默认 127.0.0.1，或环境变量 PLAN_VIEWER_HOST；0.0.0.0 允许局域网访问）
  --port=<n>          服务端口（默认 4173，或环境变量 PLAN_VIEWER_PORT；0 表示随机空闲端口）
  --plan-dir=<dir>    docs/plan 数据目录
  -h, --help          显示本帮助

docs/plan 定位优先级: --plan-dir > 环境变量 PLAN_DIR > 从脚本位置向上逐级查找

环境依赖: Node.js >= 20（仅内置模块，无需 npm install），跨平台，仅访问 localhost

页面: 启动后访问 http://<host>:<port>（默认 http://127.0.0.1:4173）；刷新页面即读取最新文档。`);
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

const HOST = optValue('--host') || process.env.PLAN_VIEWER_HOST || '127.0.0.1';
const LAN_ACCESS = HOST === '0.0.0.0' || HOST === '::';

/** 列出本机非内部 IPv4 地址，供 0.0.0.0 监听时直接复制访问 */
function lanAddresses(port) {
  const entries = Object.values(os.networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal);
  const base = entries.map((n) => `http://${n.address}:${port}`);
  return base.length ? base : ['（未找到局域网 IPv4 地址）'];
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
  if (err && err.code === 'EADDRNOTAVAIL') {
    console.error(`启动失败：地址 ${HOST} 不可用（本机没有这个网络地址）。`);
    console.error(`  可用 --host=0.0.0.0 监听所有网卡，或不传 --host 保持默认 127.0.0.1。`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  const bound = server.address();
  const port = typeof bound === 'object' && bound ? bound.port : PORT;
  const rawHost = typeof bound === 'object' && bound ? bound.address : HOST;
  const displayHost = rawHost.includes(':') ? `[${rawHost}]` : rawHost;
  console.log('Plan Viewer 已启动（仅开发环境使用）');
  console.log(`  模式:   ${EMBEDDED ? '单文件产物（内嵌压缩页面）' : '源码模式（读取 public/）'}`);
  console.log(`  地址:   http://${displayHost}:${port}`);
  if (LAN_ACCESS) {
    for (const addr of lanAddresses(port)) console.log(`  局域网: ${addr}`);
    console.log('  注意:   服务对局域网开放，请确认所在网络安全。');
  }
  console.log(`  数据源: ${PLAN_DIR}`);
  console.log('  说明:   刷新页面即读取最新文档；Ctrl+C 停止');
});
