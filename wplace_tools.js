// ==UserScript==
// @name         wplace remap hotkeys + paint button
// @namespace    http://tampermonkey.net/
// @version      2025-09-12
// @description  Remap Color Picker to W, Add Paint button hotkey (Q), Close Paint hotkey (E).
// @author       kyoutae1234
// @match        https://wplace.live/
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function () {
  const PAINT_HOTKEY = { code: 'KeyQ', alt: false, ctrl: false, shift: false };
  const CLOSE_HOTKEY = { code: 'KeyW', alt: false, ctrl: false, shift: false };
  const TEXT = 'Paint';
  const KEYMAP = { 'KeyR': 'KeyI' };
  const CLOSE_PATH_D = 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z';

  const isTypingTarget = el =>
    el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

  const matchesHotkey = (e, hk) =>
    e.code === hk.code && e.altKey === !!hk.alt && e.ctrlKey === !!hk.ctrl && e.shiftKey === !!hk.shift;

  const isVisible = el => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  function findPaintButton() {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();
    for (const el of document.querySelectorAll('button,[role="button"]')) {
      if (isVisible(el) && norm(el.textContent).includes(TEXT)) {
      return el;
      }
    }
    return null;
  }

  function findCloseButton() {
    let path = document.querySelector(`svg path[d="${CLOSE_PATH_D}"]`);
    if (!path) return null;
    const btn = path.closest('button,[role="button"]');
    if (!btn) return null;
    if (!isVisible(btn) || btn.disabled) return null;
    return btn;
  }

  function clickAtCenter(el) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const base = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy };
    el.dispatchEvent(new PointerEvent('pointerdown', { ...base, pointerId: 1, isPrimary: true, pointerType: 'mouse', buttons: 1 }));
    el.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1 }));
    el.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0 }));
    el.click();
    el.dispatchEvent(new PointerEvent('pointerup', { ...base, pointerId: 1, isPrimary: true, pointerType: 'mouse', buttons: 0 }));
  }

  const codeToChar = (code, shift) => code.startsWith('Key')
    ? (shift ? code.slice(3) : code.slice(3).toLowerCase())
    : code;

  function dispatchKeyEverywhere(originalEvent, type, mappedCode) {
    const isChar = mappedCode.startsWith('Key');
    const key = isChar ? codeToChar(mappedCode, originalEvent.shiftKey) : mappedCode;
    const opts = {
      key, code: mappedCode, location: 0,
      ctrlKey: originalEvent.ctrlKey, altKey: originalEvent.altKey,
      shiftKey: originalEvent.shiftKey, metaKey: originalEvent.metaKey,
      repeat: originalEvent.repeat, bubbles: true, cancelable: true, composed: true
    };
    const ev = new KeyboardEvent(type, opts);
    const legacy = isChar ? key.toUpperCase().charCodeAt(0) : 0;
    try {
      Object.defineProperty(ev, 'keyCode', { get: () => legacy });
      Object.defineProperty(ev, 'which', { get: () => legacy });
      Object.defineProperty(ev, 'isTrusted', { get: () => false });
    } catch { }

    const targets = new Set([originalEvent.target, document.activeElement, document, window]);
    for (const t of targets) t && t.dispatchEvent(ev);
  }

  function redirectHandler(e) {
    if (!e.isTrusted) return;
    if (e.isComposing) return;
    if (isTypingTarget(e.target)) return;

    const mapped = KEYMAP[e.code];
    if (!mapped) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();

    const types = e.type === 'keydown' && mapped.startsWith('Key')
      ? ['keydown', 'keypress']
      : [e.type];

    for (const t of types) dispatchKeyEverywhere(e, t, mapped);
  }

  window.addEventListener('keydown', redirectHandler, true);
  window.addEventListener('keypress', redirectHandler, true);
  window.addEventListener('keyup', redirectHandler, true);

  window.addEventListener('keydown', (e) => {
    if (!e.isTrusted) return;
    if (!matchesHotkey(e, PAINT_HOTKEY)) return;
    if (isTypingTarget(e.target)) return;

    const btn = findPaintButton();
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    clickAtCenter(btn);
  }, true);

  window.addEventListener('keydown', (e) => {
    if (!e.isTrusted) return;
    if (!matchesHotkey(e, CLOSE_HOTKEY)) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    const btn = findCloseButton();
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    clickAtCenter(btn);
  }, true);
})();