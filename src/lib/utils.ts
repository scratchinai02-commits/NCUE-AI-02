/** 安全讀寫 localStorage（無痕模式、被封鎖時不會讓網站壞掉） */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** 複製純文字；Clipboard API 不可用時退回 execCommand。回傳是否成功。 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * 複製「保留格式」的內容（貼到 Word / Google 文件時保留標題、表格），
 * 同時附上純文字（Markdown）版本。不支援時退回純文字。
 */
export async function copyRich(html: string, plain: string): Promise<boolean> {
  try {
    if (navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      return true;
    }
  } catch {
    /* fall through */
  }
  return copyText(plain);
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 將排版後的 HTML 包成 Word 可直接開啟的 .doc 檔內容 */
export function toWordDocument(title: string, bodyHtml: string): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
body{font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif;font-size:12pt;line-height:1.6}
h1{font-size:18pt}h2{font-size:15pt}h3{font-size:13pt}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #888;padding:4pt 6pt;vertical-align:top}th{background:#e8eef7}
blockquote{border-left:3pt solid #9bb;margin-left:0;padding-left:8pt;color:#444}
code{font-family:Consolas,monospace;background:#f2f2f2}
</style></head><body>${bodyHtml}</body></html>`;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function safeFilename(s: string) {
  return s.replace(/[\\/:*?"<>|\s]+/g, '_');
}
