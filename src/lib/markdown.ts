/**
 * 輕量 Markdown 解析（畫面排版與 Word 匯出共用）。
 * 支援：標題、段落、粗體／斜體／刪除線／行內程式碼、連結、巢狀清單、表格（含對齊）、
 * 引用、程式碼區塊、分隔線、<br>。原始 HTML 一律視為純文字。
 */

export type Align = 'left' | 'center' | 'right' | undefined;
export type ListNode = { ordered: boolean; start: number; indent: number; items: { lines: string[]; sub: ListNode[] }[] };
export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'para'; lines: string[] }
  | { type: 'list'; list: ListNode }
  | { type: 'table'; header: string[]; align: Align[]; rows: string[][] }
  | { type: 'code'; text: string }
  | { type: 'quote'; blocks: Block[] }
  | { type: 'hr' };

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong' | 'em' | 'del'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string | null; children: Inline[] }
  | { type: 'br' };

const RE_HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const RE_FENCE = /^\s{0,3}(```|~~~)/;
const RE_LIST = /^(\s*)([-*+•]|\d{1,3}[.)])\s+(.*)$/;
const RE_QUOTE = /^\s{0,3}>\s?(.*)$/;
const RE_TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const indentOf = (s: string) => s.replace(/\t/g, '    ').match(/^ */)![0].length;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

function isTableStart(lines: string[], i: number) {
  return lines[i].includes('|') && i + 1 < lines.length && RE_TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('-');
}

function isBlockStart(lines: string[], i: number) {
  const l = lines[i];
  return RE_HEADING.test(l) || RE_HR.test(l) || RE_FENCE.test(l) || RE_LIST.test(l) || RE_QUOTE.test(l) || isTableStart(lines, i);
}

function parseList(lines: string[], start: number): [ListNode, number] {
  const first = lines[start].match(RE_LIST)!;
  const root: ListNode = {
    ordered: /\d/.test(first[2]),
    start: parseInt(first[2], 10) || 1,
    indent: indentOf(first[1]),
    items: [],
  };
  const stack: ListNode[] = [root];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      // 空行：若下一行仍是清單或縮排內容則繼續，否則結束
      const next = lines[i + 1];
      if (next !== undefined && (RE_LIST.test(next) || (indentOf(next) > root.indent && next.trim()))) {
        i++;
        continue;
      }
      break;
    }
    const m = line.match(RE_LIST);
    if (m && !RE_HR.test(line)) {
      const ind = indentOf(m[1]);
      if (ind < root.indent) break;
      while (stack.length > 1 && ind < stack[stack.length - 1].indent) stack.pop();
      let top = stack[stack.length - 1];
      if (ind > top.indent + 1 && top.items.length) {
        const sub: ListNode = { ordered: /\d/.test(m[2]), start: parseInt(m[2], 10) || 1, indent: ind, items: [] };
        top.items[top.items.length - 1].sub.push(sub);
        stack.push(sub);
        top = sub;
      }
      top.items.push({ lines: [m[3]], sub: [] });
      i++;
      continue;
    }
    // 縮排的延續行
    if (indentOf(line) > root.indent && !isBlockStart(lines, i)) {
      const top = stack[stack.length - 1];
      top.items[top.items.length - 1]?.lines.push(line.trim());
      i++;
      continue;
    }
    break;
  }
  return [root, i];
}

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (RE_FENCE.test(line)) {
      const fence = line.trim().slice(0, 3);
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) buf.push(lines[i++]);
      i++; // 跳過結尾 fence
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }
    const h = line.match(RE_HEADING);
    if (h) {
      blocks.push({ type: 'heading', level: h[1].length, text: h[2] });
      i++;
      continue;
    }
    if (RE_HR.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }
    if (isTableStart(lines, i)) {
      const header = splitRow(line);
      const align: Align[] = splitRow(lines[i + 1]).map((c) =>
        c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : undefined,
      );
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(splitRow(lines[i++]));
      blocks.push({ type: 'table', header, align, rows });
      continue;
    }
    if (RE_QUOTE.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && RE_QUOTE.test(lines[i])) buf.push(lines[i++].match(RE_QUOTE)![1]);
      blocks.push({ type: 'quote', blocks: parseBlocks(buf.join('\n')) });
      continue;
    }
    if (RE_LIST.test(line)) {
      const [list, next] = parseList(lines, i);
      blocks.push({ type: 'list', list });
      i = next;
      continue;
    }
    const buf: string[] = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) buf.push(lines[i++].trim());
    blocks.push({ type: 'para', lines: buf });
  }
  return blocks;
}

const RE_INLINE =
  /(\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|~~([^~\n]+?)~~|`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|<br\s*\/?>|\*([^*\s][^*\n]*?)\*)/gi;

/** 只允許 http/https/mailto 連結，其餘（如 javascript:）一律當純文字 */
export function safeHref(url: string): string | null {
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : null;
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = new RegExp(RE_INLINE.source, 'gi');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    if (m[2] !== undefined || m[3] !== undefined) out.push({ type: 'strong', children: parseInline(m[2] ?? m[3]) });
    else if (m[4] !== undefined) out.push({ type: 'del', children: parseInline(m[4]) });
    else if (m[5] !== undefined) out.push({ type: 'code', text: m[5] });
    else if (m[6] !== undefined) out.push({ type: 'link', href: safeHref(m[7]), children: parseInline(m[6]) });
    else if (/^<br/i.test(m[0])) out.push({ type: 'br' });
    else if (m[8] !== undefined) out.push({ type: 'em', children: parseInline(m[8]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}
