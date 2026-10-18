'use strict';
/* ============================================================
   parse.js  (pure functions, no DOM)

   1. Date helpers on plain "YYYY-MM-DD" strings.
   2. parseQuickAdd(text)  turns  "Send invoice friday !high #finance"
      into { title, dueDate, priority, labels, repeat }.
   3. nextDue(due, repeat) computes the next date of a repeating task.

   Loaded by the app as the global `TMParse` and by test/parse.test.js via require().
   ============================================================ */
(function (root) {
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = fromYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const addMonth = s => {
    const d = fromYmd(s), y = d.getFullYear(), m = d.getMonth() + 1;
    return ymd(new Date(y + Math.floor(m / 12), m % 12, Math.min(d.getDate(), daysInMonth(y + Math.floor(m / 12), m % 12))));
  };

  const WEEKDAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const dow = s => fromYmd(s).getDay();

  /** The next given weekday strictly after `today` (so "friday" on a Friday means next week). */
  const nextWeekday = (today, target) => addDays(today, ((target - dow(today) + 7) % 7) || 7);

  /** Next date of a repeating task. Always lands after `today`, even if the task was overdue. */
  function nextDue(due, repeat, today) {
    const advance = s => {
      if (repeat === 'daily') return addDays(s, 1);
      if (repeat === 'weekly') return addDays(s, 7);
      if (repeat === 'monthly') return addMonth(s);
      if (repeat === 'weekdays') { let n = addDays(s, 1); while (dow(n) === 0 || dow(n) === 6) n = addDays(n, 1); return n; }
      return addDays(s, 1);
    };
    let n = advance(due || today), guard = 0;
    while (n <= today && guard++ < 800) n = advance(n);
    return n;
  }

  const DAY_RE = '(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)';
  const MON_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  const PREFIX = '(?:\\b(?:by|on|due|before)\\s+)?';

  /**
   * Understands (anywhere in the text, case-insensitive):
   *   dates     today, tomorrow, tmr, friday, next friday, next week, in 3 days, in 2 weeks, 25 oct, oct 25, 2026-10-25
   *   priority  !high !h !1   !medium !m !2   !low !l !3
   *   labels    #finance #erp-module
   *   repeat    daily, weekdays, weekly, monthly, "every day", "every week", "every monday"
   * Words it recognises are removed from the title.
   */
  function parseQuickAdd(text, now = new Date()) {
    const original = String(text || '').trim();
    const today = ymd(now);
    let s = ' ' + original + ' ';
    const hits = [];
    let dueDate = null, priority = null, repeat = null;
    const labels = [];
    const take = (re, fn) => {
      const m = re.exec(s);
      if (!m) return false;
      const before = s[m.index - 1], after = s[m.index + m[0].length];
      if (before === '-' || after === '-') return false;   // "monday-room" or "mon-fri" are not dates
      if (fn(m) === false) return false;          // matched text but not a real value (e.g. "31 feb"): leave it in the title
      s = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length);
      return true;
    };

    // repeat ("every monday" also sets the date)
    take(new RegExp(`\\bevery\\s+${DAY_RE}\\b`, 'i'), m => {
      repeat = 'weekly'; dueDate = nextWeekday(today, WEEKDAYS[m[1].slice(0, 3).toLowerCase()]);
      hits.push({ type: 'repeat', text: m[0].trim() });
    });
    if (!repeat) {
      take(/\bevery\s+(day|weekday|week|month)\b/i, m => { repeat = { day: 'daily', weekday: 'weekdays', week: 'weekly', month: 'monthly' }[m[1].toLowerCase()]; hits.push({ type: 'repeat', text: m[0].trim() }); });
    }
    if (!repeat) {
      take(/\b(daily|weekdays|weekly|monthly)\b/i, m => { repeat = m[1].toLowerCase(); hits.push({ type: 'repeat', text: m[0] }); });
    }

    // labels
    for (;;) {
      const done = take(/(^|\s)#([\p{L}\p{N}_-]{1,24})(?=\s|$)/u, m => { const l = m[2].toLowerCase(); if (!labels.includes(l)) labels.push(l); hits.push({ type: 'label', text: '#' + m[2] }); });
      if (!done) break;
    }

    // priority
    take(/(^|\s)!(high|h|1|medium|med|m|2|low|l|3)(?=\s|$)/i, m => {
      const v = m[2].toLowerCase();
      priority = (v === 'high' || v === 'h' || v === '1') ? 'high' : (v === 'low' || v === 'l' || v === '3') ? 'low' : 'medium';
      hits.push({ type: 'priority', text: '!' + m[2] });
    });

    // dates (first match wins)
    if (!dueDate) {
      const tries = [
        [/\b(\d{4}-\d{2}-\d{2})\b/, m => m[1]],
        [new RegExp(`${PREFIX}\\bin\\s+(\\d{1,3})\\s*(days?|d|weeks?|w)\\b`, 'i'), m => addDays(today, parseInt(m[1], 10) * (/^w/i.test(m[2]) ? 7 : 1))],
        [new RegExp(`${PREFIX}\\bnext\\s+week\\b`, 'i'), () => nextWeekday(today, 1)],
        [new RegExp(`${PREFIX}\\b(?:today|tonight)\\b`, 'i'), () => today],
        [new RegExp(`${PREFIX}\\b(?:tomorrow|tmrw|tmr)\\b`, 'i'), () => addDays(today, 1)],
        [new RegExp(`${PREFIX}\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON_RE}\\b`, 'i'), m => monthDay(m[2], m[1], now, today)],
        [new RegExp(`${PREFIX}\\b${MON_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'), m => monthDay(m[1], m[2], now, today)],
        [new RegExp(`${PREFIX}\\b(?:next\\s+)?${DAY_RE}\\b`, 'i'), m => nextWeekday(today, WEEKDAYS[m[1].slice(0, 3).toLowerCase()])]
      ];
      for (const [re, fn] of tries) {
        if (take(re, m => { const v = fn(m); if (!v) return false; dueDate = v; hits.push({ type: 'date', text: m[0].trim() }); })) break;
      }
    }
    if (repeat && !dueDate) {            // "daily" with no date starts today (weekdays: next working day)
      dueDate = today;
      if (repeat === 'weekdays') while (dow(dueDate) === 0 || dow(dueDate) === 6) dueDate = addDays(dueDate, 1);
    }

    let title = s.replace(/\s+/g, ' ').replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, '').trim();
    if (!title) return { title: original, dueDate: null, priority: null, labels: [], repeat: null, hits: [] };
    return { title, dueDate, priority, labels, repeat, hits };
  }

  /** "25 oct" / "oct 25" -> this year, or next year if that day has already passed. Rejects impossible dates. */
  function monthDay(mon, day, now, today) {
    const m = MONTHS[mon.slice(0, 3).toLowerCase()], d = parseInt(day, 10);
    if (m === undefined || d < 1 || d > 31) return null;
    let y = now.getFullYear();
    if (d > daysInMonth(y, m)) return null;
    let s = ymd(new Date(y, m, d));
    if (s < today) { y++; if (d > daysInMonth(y, m)) return null; s = ymd(new Date(y, m, d)); }
    return s;
  }

  const api = { ymd, fromYmd, addDays, addMonth, nextWeekday, nextDue, parseQuickAdd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TMParse = api;
})(typeof window !== 'undefined' ? window : globalThis);
