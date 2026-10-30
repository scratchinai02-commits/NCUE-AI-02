import React, { forwardRef, useMemo } from 'react';

/**
 * 輕量 Markdown 排版元件（無外部套件、不使用 dangerouslySetInnerHTML）。
 * 支援：標題、段落、粗體／斜體／刪除線／行內程式碼、連結（僅 http/https/mailto）、
 * 巢狀清單、表格（含對齊）、引用、程式碼區塊、分隔線、<br>。
 * AI 輸出中的原始 HTML 一律當作純文字顯示，避免 XSS。
 */

type Align = 'left' | 'center' | 'right' | undefined;
type ListNode = { ordered: boolean; start: number; indent: number; items: { lines: string[]; sub: ListNode[] }[] };
type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'para'; lines: string[] }
  | { type: 'list'; list: ListNode }
  | { type: 'table'; header: string[]; align: Align[]; rows: string[][] }
  | { type: 'code'; text: string }
  | { type: 'quote'; blocks: Block[] }
  | { type: 'hr' };

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

function parseBlocks(src: string): Block[] {
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

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------
const RE_INLINE =
  /(\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|~~([^~\n]+?)~~|`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|<br\s*\/?>|\*([^*\s][^*\n]*?)\*)/gi;

function safeHref(url: string): string | null {
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : null;
}

function inline(text: string, key = 'i'): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let n = 0;
  RE_INLINE.lastIndex = 0;
  const re = new RegExp(RE_INLINE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[2] !== undefined || m[3] !== undefined) out.push(<strong key={k}>{inline(m[2] ?? m[3], k)}</strong>);
    else if (m[4] !== undefined) out.push(<del key={k}>{inline(m[4], k)}</del>);
    else if (m[5] !== undefined) out.push(<code key={k}>{m[5]}</code>);
    else if (m[6] !== undefined) {
      const href = safeHref(m[7]);
      out.push(
        href ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer">
            {inline(m[6], k)}
          </a>
        ) : (
          <span key={k}>{m[6]}</span>
        ),
      );
    } else if (/^<br/i.test(m[0])) out.push(<br key={k} />);
    else if (m[8] !== undefined) out.push(<em key={k}>{inline(m[8], k)}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function withBreaks(lines: string[], key: string) {
  return lines.flatMap((l, idx) => (idx ? [<br key={`${key}-br${idx}`} />, ...inline(l, `${key}-${idx}`)] : inline(l, `${key}-${idx}`)));
}

const cellStyle: React.CSSProperties = { border: '1px solid #cbd5e1', padding: '6px 10px', verticalAlign: 'top' };

function renderList(list: ListNode, key: string): React.ReactNode {
  const items = list.items.map((it, idx) => (
    <li key={`${key}-${idx}`}>
      {withBreaks(it.lines, `${key}-${idx}`)}
      {it.sub.map((s, j) => renderList(s, `${key}-${idx}-s${j}`))}
    </li>
  ));
  return list.ordered ? (
    <ol key={key} start={list.start !== 1 ? list.start : undefined}>
      {items}
    </ol>
  ) : (
    <ul key={key}>{items}</ul>
  );
}

function renderBlocks(blocks: Block[], prefix = 'b'): React.ReactNode[] {
  return blocks.map((b, idx) => {
    const key = `${prefix}${idx}`;
    switch (b.type) {
      case 'heading': {
        const Tag = `h${Math.min(b.level + 1, 6)}` as 'h2'; // 讓 # 對應 h2，避免與頁面標題衝突
        return <Tag key={key}>{inline(b.text, key)}</Tag>;
      }
      case 'para':
        return <p key={key}>{withBreaks(b.lines, key)}</p>;
      case 'hr':
        return <hr key={key} />;
      case 'code':
        return (
          <pre key={key}>
            <code>{b.text}</code>
          </pre>
        );
      case 'quote':
        return <blockquote key={key}>{renderBlocks(b.blocks, `${key}q`)}</blockquote>;
      case 'list':
        return renderList(b.list, key);
      case 'table':
        return (
          <div key={key} className="md-table-wrap">
            <table style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {b.header.map((c, j) => (
                    <th key={j} style={{ ...cellStyle, background: '#eef2ff', textAlign: b.align[j] || 'left' }}>
                      {inline(c, `${key}h${j}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, ri) => (
                  <tr key={ri}>
                    {b.header.map((_, j) => (
                      <td key={j} style={{ ...cellStyle, textAlign: b.align[j] || 'left' }}>
                        {inline(r[j] ?? '', `${key}r${ri}c${j}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  });
}

export const Markdown = forwardRef<HTMLDivElement, { text: string; className?: string }>(({ text, className }, ref) => {
  const nodes = useMemo(() => renderBlocks(parseBlocks(text)), [text]);
  return (
    <div ref={ref} className={`md-body ${className || ''}`}>
      {nodes}
    </div>
  );
});
Markdown.displayName = 'Markdown';
