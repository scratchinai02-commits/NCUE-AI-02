/**
 * 停用右鍵選單與開發者工具快捷鍵（F12 等）。
 *
 * 注意：這只能阻擋一般使用者隨手查看原始碼，無法真正保護程式碼——
 * 從瀏覽器選單仍可開啟開發者工具，GitHub repo 若為公開也看得到完整原始碼。
 * 不需要時把 ENABLE_PROTECTION 改成 false 即可。
 */
export const ENABLE_PROTECTION = true;

/** 這些地方保留右鍵，讓使用者可以貼上、修改提示詞 */
const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

function isBlockedShortcut(e: KeyboardEvent): boolean {
  if (e.key === 'F12') return true;
  const code = e.code; // 用實體按鍵判斷，Mac 的 Option 組合鍵才不會因字元改變而漏掉
  const mod = e.ctrlKey || e.metaKey;
  // Windows / Linux：Ctrl+Shift+I（開發者工具）J（主控台）C（檢查元素）K（Firefox 主控台）
  if (mod && e.shiftKey && ['KeyI', 'KeyJ', 'KeyC', 'KeyK'].includes(code)) return true;
  // macOS：⌘⌥I / J / C / U
  if (e.metaKey && e.altKey && ['KeyI', 'KeyJ', 'KeyC', 'KeyU'].includes(code)) return true;
  // 檢視原始碼：Ctrl+U / ⌘U
  if (mod && !e.shiftKey && !e.altKey && code === 'KeyU') return true;
  return false;
}

let toastTimer: number | undefined;
function toast(message: string) {
  let el = document.getElementById('protect-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'protect-toast';
    el.setAttribute('role', 'status');
    el.style.cssText =
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;padding:8px 14px;border-radius:10px;' +
      'background:rgba(15,23,42,.92);color:#fff;font-size:13px;pointer-events:none;transition:opacity .2s;opacity:0';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.opacity = '1';
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (el) el.style.opacity = '0';
  }, 1800);
}

export function enableProtection() {
  if (!ENABLE_PROTECTION) return;

  document.addEventListener(
    'contextmenu',
    (e) => {
      const target = e.target as Element | null;
      if (target?.closest?.(EDITABLE)) return;
      e.preventDefault();
      toast('本網站已停用右鍵選單；需要的內容請用頁面上的「複製」按鈕。');
    },
    { capture: true },
  );

  window.addEventListener(
    'keydown',
    (e) => {
      if (!isBlockedShortcut(e)) return;
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true },
  );
}
