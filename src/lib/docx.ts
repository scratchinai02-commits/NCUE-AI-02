/**
 * 將 AI 生成的 Markdown 轉成真正的 Word（.docx）檔，無外部套件。
 * Word、Google 文件、Pages、LibreOffice 都能開啟；標題、表格、清單、粗體都保留。
 */
import { parseBlocks, parseInline, type Block, type Inline, type ListNode } from './markdown';
import { zip } from './zip';

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const esc = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

type Fmt = { b?: boolean; i?: boolean; strike?: boolean; code?: boolean; link?: boolean };

class DocBuilder {
  rels: string[] = [];
  private relId = 10;

  link(href: string) {
    const id = `rIdL${this.relId++}`;
    this.rels.push(
      `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(href)}" TargetMode="External"/>`,
    );
    return id;
  }

  run(text: string, f: Fmt = {}) {
    if (!text) return '';
    const pr = [
      f.code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>' : '',
      f.b ? '<w:b/><w:bCs/>' : '',
      f.i ? '<w:i/><w:iCs/>' : '',
      f.strike ? '<w:strike/>' : '',
      f.link ? '<w:color w:val="1D4ED8"/><w:u w:val="single"/>' : '',
      f.code ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' : '',
    ].join('');
    return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  }

  inline(nodes: Inline[], f: Fmt = {}): string {
    return nodes
      .map((n) => {
        switch (n.type) {
          case 'text':
            return this.run(n.text, f);
          case 'strong':
            return this.inline(n.children, { ...f, b: true });
          case 'em':
            return this.inline(n.children, { ...f, i: true });
          case 'del':
            return this.inline(n.children, { ...f, strike: true });
          case 'code':
            return this.run(n.text, { ...f, code: true });
          case 'br':
            return '<w:r><w:br/></w:r>';
          case 'link':
            return n.href
              ? `<w:hyperlink r:id="${this.link(n.href)}">${this.inline(n.children, { ...f, link: true })}</w:hyperlink>`
              : this.inline(n.children, f);
        }
      })
      .join('');
  }

  lines(lines: string[], f: Fmt = {}) {
    return lines.map((l) => this.inline(parseInline(l), f)).join('<w:r><w:br/></w:r>');
  }

  para(content: string, pPr = '') {
    return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${content}</w:p>`;
  }

  list(list: ListNode, depth: number, extraPPr: string): string {
    const left = 420 * (depth + 1);
    return list.items
      .map((it, idx) => {
        const marker = list.ordered ? `${list.start + idx}.` : depth % 2 ? '◦' : '•';
        const body = this.run(`${marker}\t`) + this.lines(it.lines);
        // pPr 子元素順序須符合 OOXML：pBdr → shd → tabs → spacing → ind
        const pPr = `${extraPPr}<w:tabs><w:tab w:val="left" w:pos="${left}"/></w:tabs><w:spacing w:after="60"/><w:ind w:left="${left}" w:hanging="360"/>`;
        return this.para(body, pPr) + it.sub.map((s) => this.list(s, depth + 1, extraPPr)).join('');
      })
      .join('');
  }

  table(b: Extract<Block, { type: 'table' }>) {
    const cols = Math.max(1, b.header.length);
    const w = Math.floor(9638 / cols);
    const border = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>`;
    const cell = (text: string, j: number, head: boolean) => {
      const jc = b.align[j] === 'center' ? 'center' : b.align[j] === 'right' ? 'right' : 'left';
      return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF2FF"/>' : ''}</w:tcPr>${this.para(
        this.inline(parseInline(text), head ? { b: true } : {}),
        `<w:spacing w:before="40" w:after="40"/><w:jc w:val="${jc}"/>`,
      )}</w:tc>`;
    };
    const row = (cells: string[], head: boolean) =>
      `<w:tr>${head ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${b.header.map((_, j) => cell(cells[j] ?? '', j, head)).join('')}</w:tr>`;
    return (
      `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
        .map(border)
        .join('')}</w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
      `<w:tblGrid>${b.header.map(() => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>` +
      row(b.header, true) +
      b.rows.map((r) => row(r, false)).join('') +
      `</w:tbl>` +
      this.para('', '<w:spacing w:after="0"/>')
    );
  }

  blocks(blocks: Block[], quote = false): string {
    const q = quote
      ? '<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="93C5FD"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/>'
      : '';
    const qInd = quote ? '<w:ind w:left="240"/>' : '';
    return blocks
      .map((b) => {
        switch (b.type) {
          case 'heading':
            return this.para(this.inline(parseInline(b.text)), `<w:pStyle w:val="Heading${Math.min(b.level, 4)}"/>`);
          case 'para':
            return this.para(this.lines(b.lines), q + qInd);
          case 'hr':
            return this.para('', '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>');
          case 'code':
            return b.text
              .split('\n')
              .map((l) =>
                this.para(this.run(l || ' ', { code: true }), '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:spacing w:after="0"/>'),
              )
              .join('');
          case 'quote':
            return this.blocks(b.blocks, true);
          case 'list':
            return this.list(b.list, 0, q);
          case 'table':
            return this.table(b);
        }
      })
      .join('');
  }
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft JhengHei" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style>
${[1, 2, 3, 4]
  .map(
    (n) =>
      `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${
        n === 1 ? 360 : 240
      }" w:after="120"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="${n <= 2 ? '1E3A8A' : '0F172A'}"/><w:sz w:val="${
        [32, 28, 24, 22][n - 1]
      }"/><w:szCs w:val="${[32, 28, 24, 22][n - 1]}"/></w:rPr></w:style>`,
  )
  .join('\n')}
</w:styles>`;

/** 產生 .docx 檔案內容（位元組） */
export function markdownToDocxBytes(markdown: string, title: string, subtitle = ''): Uint8Array {
  const d = new DocBuilder();
  const body =
    d.para(d.run(title), '<w:pStyle w:val="Title"/>') +
    (subtitle ? d.para(d.run(subtitle, {}), '<w:spacing w:after="240"/>') : '') +
    d.blocks(parseBlocks(markdown));

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;

  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  return zip([
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`,
    },
    {
      name: 'docProps/core.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(title)}</dc:title><dc:creator>NCUE 未來教師 AI 力</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`,
    },
    { name: 'word/styles.xml', data: STYLES },
    {
      name: 'word/_rels/document.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
${d.rels.join('\n')}
</Relationships>`,
    },
    { name: 'word/document.xml', data: document },
  ]);
}

export function markdownToDocx(markdown: string, title: string, subtitle = ''): Blob {
  const bytes = markdownToDocxBytes(markdown, title, subtitle);
  return new Blob([bytes.buffer as ArrayBuffer], { type: DOCX_MIME });
}
