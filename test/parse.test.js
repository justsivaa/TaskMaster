'use strict';
const assert = require('assert');
const { parseQuickAdd: P, nextDue, addDays, addMonth } = require('../src/renderer/js/parse');

// "today" is fixed: Friday 16 Oct 2026
const NOW = new Date(2026, 9, 16, 10, 0, 0);
const p = t => P(t, NOW);

// dates
assert.strictEqual(p('Call vendor tomorrow').dueDate, '2026-10-17');
assert.strictEqual(p('Call vendor tomorrow').title, 'Call vendor');
assert.strictEqual(p('Send report today').dueDate, '2026-10-16');
assert.strictEqual(p('Review contract friday').dueDate, '2026-10-23', 'friday on a Friday means next week');
assert.strictEqual(p('Review contract by monday').dueDate, '2026-10-19');
assert.strictEqual(p('Review contract by monday').title, 'Review contract');
assert.strictEqual(p('Plan sprint next week').dueDate, '2026-10-19');
assert.strictEqual(p('Pay rent in 3 days').dueDate, '2026-10-19');
assert.strictEqual(p('Pay rent in 2 weeks').dueDate, '2026-10-30');
assert.strictEqual(p('Demo on 25 oct').dueDate, '2026-10-25');
assert.strictEqual(p('Demo oct 25').dueDate, '2026-10-25');
assert.strictEqual(p('Tax 5 jan').dueDate, '2027-01-05', 'a date already passed rolls to next year');
assert.strictEqual(p('Ship it 2026-12-01').dueDate, '2026-12-01');
assert.strictEqual(p('Ship it 2026-12-01').title, 'Ship it');
assert.strictEqual(p('Fix bug 31 feb').dueDate, null, 'impossible dates are not dates');
assert.strictEqual(p('Fix bug 31 feb').title, 'Fix bug 31 feb');

// priority and labels
const a = p('Update load logic !high #erp #Finance tomorrow');
assert.deepStrictEqual([a.title, a.priority, a.labels, a.dueDate], ['Update load logic', 'high', ['erp', 'finance'], '2026-10-17']);
assert.strictEqual(p('x !h').priority, 'high'); assert.strictEqual(p('x !2').priority, 'medium'); assert.strictEqual(p('x !low').priority, 'low');
assert.strictEqual(p('Fix C# parser').labels.length, 0, '"C#" is not a label');
assert.strictEqual(p('Wow! great').priority, null);

// repeat
assert.strictEqual(p('Standup every weekday').repeat, 'weekdays');
assert.strictEqual(p('Standup every weekday').dueDate, '2026-10-16', 'starts today when today is a weekday');
assert.strictEqual(p('Backup daily').repeat, 'daily');
assert.strictEqual(p('Report every monday').repeat, 'weekly');
assert.strictEqual(p('Report every monday').dueDate, '2026-10-19');
assert.strictEqual(p('Report every monday').title, 'Report');
assert.strictEqual(p('Pay rent monthly #home').repeat, 'monthly');

// nothing recognised / title would be empty
assert.deepStrictEqual([p('tomorrow').title, p('tomorrow').dueDate], ['tomorrow', null]);
assert.strictEqual(p('   ').title, '');
assert.strictEqual(p('Plain task').dueDate, null);
assert.strictEqual(p('Meeting at monday-room').dueDate, null, 'monday-room is not a weekday word');

// repeating dates
assert.strictEqual(nextDue('2026-10-16', 'daily', '2026-10-16'), '2026-10-17');
assert.strictEqual(nextDue('2026-10-16', 'weekly', '2026-10-16'), '2026-10-23');
assert.strictEqual(nextDue('2026-10-16', 'weekdays', '2026-10-16'), '2026-10-19', 'Friday -> Monday');
assert.strictEqual(nextDue('2026-10-01', 'daily', '2026-10-16'), '2026-10-17', 'overdue repeats never land in the past');
assert.strictEqual(nextDue('2026-10-05', 'weekly', '2026-10-16'), '2026-10-19');
assert.strictEqual(nextDue('2026-10-31', 'monthly', '2026-10-31'), '2026-11-30', 'month end is clamped');
assert.strictEqual(nextDue('2026-01-31', 'monthly', '2026-01-31'), '2026-02-28');
assert.strictEqual(nextDue(null, 'daily', '2026-10-16'), '2026-10-17');
assert.strictEqual(addDays('2026-12-31', 1), '2027-01-01');
assert.strictEqual(addMonth('2026-12-15'), '2027-01-15');

console.log('parse tests passed');
