import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { uniquePhrases, makeBag, filterRecords, examLabel, sourceLabel } from '../dist/core.js';
const records = JSON.parse(await readFile(new URL('../dist/quotes.json', import.meta.url), 'utf8'));

test('the complete available list has unique IDs, attribution, and all 22 years', () => {
  assert.equal(records.length, 217);
  assert.equal(uniquePhrases(records).length, 211);
  assert.equal(new Set(records.map(r => r.id)).size, records.length);
  assert.equal(new Set(records.map(r => r.year)).size, 22);
  for (const r of records) {
    assert.ok(r.text.trim() && r.source.trim() && r.sourceUrl.startsWith('https://'));
    assert.ok(r.month >= 1 && r.month <= 12);
    assert.ok(['listed', 'estimated', 'unknown'].includes(r.sourceStatus));
    assert.ok(Array.isArray(r.notes));
  }
});

test('draw bag covers every distinct phrase exactly once and avoids cycle-boundary repeats', () => {
  for (let i = 0; i < 100; i++) {
    const bag = makeBag(records);
    assert.equal(bag.length, 211);
    assert.equal(new Set(bag.map(r => r.text)).size, 211);
    const last = bag[0].text;
    const next = makeBag(records, last);
    assert.notEqual(next.at(-1).text, last);
  }
});

test('CSAT filter includes 2026 academic year but no unpublished 2026 exam', () => {
  const csat = filterRecords(records, { type: 'csat' });
  assert.equal(csat.length, 21);
  assert.ok(csat.some(r => r.year === 2025 && r.academicYear === 2026));
  assert.ok(!csat.some(r => r.year === 2026));
  assert.equal(filterRecords(records, { year: '2026', type: 'csat' }).length, 0);
});

test('search handles author, title, phrase, whitespace, and year filtering', () => {
  assert.ok(filterRecords(records, { query: '윤동주' }).length > 0);
  assert.ok(filterRecords(records, { query: '서 시' }).some(r => r.title === '서시'));
  assert.ok(filterRecords(records, { year: '2026' }).every(r => r.year === 2026));
  assert.equal(filterRecords(records, { query: '없는문장xyz' }).length, 0);
});

test('source labels preserve unknown/estimated attribution and actual exam dates', () => {
  assert.equal(sourceLabel(records.find(r => r.sourceStatus === 'unknown')), '출전 미상');
  assert.match(sourceLabel(records.find(r => r.sourceStatus === 'estimated')), /출전 추정/);
  assert.match(examLabel(records.find(r => r.year === 2020 && r.examType === 'suneung')), /2020년 12월.*2021학년도/);
  assert.match(examLabel(records.find(r => r.year === 2012 && r.examType === 'sample')), /예비시행/);
  assert.match(examLabel(records.find(r => r.year === 2020 && r.examType === 'sample')), /공개.*예시문항/);
});
