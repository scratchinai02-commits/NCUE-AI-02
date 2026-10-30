import React, { forwardRef, useMemo } from 'react';
import { parseBlocks, parseInline, type Block, type Inline, type ListNode } from '../lib/markdown';

/**
 * AI 生成成果的排版元件（不使用 dangerouslySetInnerHTML）。
 * 解析規則在 lib/markdown.ts，與 Word 匯出共用。
 */

function renderInline(nodes: Inline[], key: string): React.ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}-${i}`;
    switch (n.type) {
      case 'text':
        return n.text;
      case 'strong':
        return <strong key={k}>{renderInline(n.children, k)}</strong>;
      case 'em':
        return <em key={k}>{renderInline(n.children, k)}</em>;
      case 'del':
        return <del key={k}>{renderInline(n.children, k)}</del>;
      case 'code':
        return <code key={k}>{n.text}</code>;
      case 'br':
        return <br key={k} />;
      case 'link':
        return n.href ? (
          <a key={k} href={n.href} target="_blank" rel="noopener noreferrer">
            {renderInline(n.children, k)}
          </a>
        ) : (
          <span key={k}>{renderInline(n.children, k)}</span>
        );
    }
  });
}

const inline = (text: string, key: string) => renderInline(parseInline(text), key);

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
