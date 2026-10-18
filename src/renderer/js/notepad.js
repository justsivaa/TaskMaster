'use strict';
/* ============================================================
   notepad.js  -  makes a <textarea class="notepad"> behave like a modern notepad, with no toolbar.
   Used by the task description and by every subtask's Details box (see popup.js).
   ============================================================ */

/* ---------- notepad-style textarea ----------
   No toolbar. Keyboard only:
   Tab / Shift+Tab   indent / outdent (the line, or every selected line)
   "* " at line start becomes a bullet; Enter on a "• ", "- ", "* " or "1." line carries the list on;
   Enter on an empty item ends the list (or steps out one level); Backspace right after a marker removes it. */
function attachNotepad(ta, { min = 120, max = 320 } = {}) {
  const IND = '  ';
  const LIST = /^(\s*)([•*+-]|\d+[.)])([ \t]+)/;
  const bounds = (v, pos) => {
    const s = pos === 0 ? 0 : v.lastIndexOf('\n', pos - 1) + 1;
    let e = v.indexOf('\n', pos); if (e < 0) e = v.length;
    return [s, e];
  };
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(Math.max(ta.scrollHeight + 2, min), max) + 'px'; };
  // execCommand keeps the browser's own undo/redo working
  const put = (a, b, text) => {
    ta.setSelectionRange(a, b);
    if (text) document.execCommand('insertText', false, text);
    else if (a !== b) document.execCommand('delete');
  };
  const numberFor = (v, ls, indent) => {
    const lines = v.slice(0, ls).split('\n'); lines.pop();
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = LIST.exec(lines[i]);
      if (!m) return 1;
      if (m[1].length > indent) continue;
      if (m[1].length < indent) return 1;
      const n = /^\d+/.exec(m[2]);
      return n ? parseInt(n[0], 10) + 1 : 1;
    }
    return 1;
  };
  const fixNumber = pos => {
    const v = ta.value, [ls, le] = bounds(v, pos);
    const m = /^(\s*)(\d+)([.)])([ \t]+)/.exec(v.slice(ls, le));
    if (!m) return;
    const n = String(numberFor(v, ls, m[1].length));
    if (n === m[2]) return;
    const caret = ta.selectionStart, a = ls + m[1].length;
    put(a, a + m[2].length, n);
    const c = caret + n.length - m[2].length;
    ta.setSelectionRange(c, c);
  };

  ta.addEventListener('keydown', e => {
    if (e.isComposing || e.ctrlKey || e.altKey || e.metaKey) return;
    const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;

    if (e.key === 'Tab') {
      e.preventDefault();
      const [ls] = bounds(v, a);
      const [, le] = bounds(v, (b > a && v[b - 1] === '\n') ? b - 1 : b);
      const block = v.slice(ls, le), multi = block.includes('\n');
      if (e.shiftKey) {
        let removedFirst = 0;
        const out = block.split('\n').map((l, i) => { const mm = /^( {1,2}|\t)/.exec(l); const r = mm ? mm[0].length : 0; if (i === 0) removedFirst = r; return l.slice(r); }).join('\n');
        if (out === block) return;
        put(ls, le, out);
        if (multi) ta.setSelectionRange(ls, ls + out.length);
        else { const c = Math.max(ls, a - removedFirst); ta.setSelectionRange(c, c); fixNumber(c); }
      } else if (multi || a !== b || LIST.test(v.slice(ls, bounds(v, a)[1]))) {
        const out = block.split('\n').map(l => IND + l).join('\n');
        put(ls, le, out);
        if (multi) ta.setSelectionRange(ls, ls + out.length);
        else { ta.setSelectionRange(a + IND.length, b + IND.length); fixNumber(a + IND.length); }
      } else put(a, b, IND);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && a === b) {
      const [ls, le] = bounds(v, a);
      const line = v.slice(ls, le), m = LIST.exec(line);
      if (!m || a < ls + m[0].length) return;
      e.preventDefault();
      if (!line.slice(m[0].length).trim()) {            // empty item: step out of the list
        if (m[1].length >= IND.length) {
          put(ls, le, line.slice(IND.length)); fixNumber(ls);
          const end = bounds(ta.value, ls)[1]; ta.setSelectionRange(end, end);
        } else put(ls, le, '');
      } else {
        const num = /^\d+/.exec(m[2]);
        const marker = num ? (parseInt(num[0], 10) + 1) + m[2].slice(num[0].length) : m[2];
        document.execCommand('insertText', false, '\n' + m[1] + marker + m[3]);
      }
      return;
    }

    if (e.key === 'Backspace' && a === b) {
      const [ls, le] = bounds(v, a);
      const m = LIST.exec(v.slice(ls, le));
      if (m && a === ls + m[0].length) {
        e.preventDefault();
        if (m[1].length >= IND.length) {
          put(ls, ls + IND.length, '');
          const c = a - IND.length; ta.setSelectionRange(c, c); fixNumber(c);
        } else put(ls + m[1].length, ls + m[0].length, '');
      }
    }
  });

  ta.addEventListener('input', e => {
    if (e.inputType === 'insertText' && e.data === ' ') {
      const a = ta.selectionStart, [ls] = bounds(ta.value, a);
      if (/^\s*\*\s$/.test(ta.value.slice(ls, a))) put(a - 2, a, '• ');
    }
    fit();
  });
  fit();
  return fit;
}
