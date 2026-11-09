import { uniquePhrases, makeBag, filterRecords, examLabel, sourceLabel } from './core.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const STORAGE_KEY = 'pilzuk.bookmarks.v1';
let records = [], current = null, bag = [], filter = 'all', activeView = 'draw', turns = 0, visibleCount = 30;
let toastTimer, searchTimer;
let drawing = false, drawSession = 0;
const drawAnimations = new Set();
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let saved = new Set();
let storageWorks = true;
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (Array.isArray(stored)) saved = new Set(stored.filter(id => typeof id === 'string'));
} catch { storageWorks = false; }

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3000);
}

function updateSaveButtons() {
  $('#saved-count').textContent = saved.size;
  if (current) {
    const on = saved.has(current.id);
    $('#save-quote').setAttribute('aria-pressed', on);
    $('#save-quote').setAttribute('aria-label', on ? '이 문장 책갈피에서 빼기' : '이 문장 책갈피에 담기');
  }
  $$('.row-save').forEach(button => {
    const on = saved.has(button.dataset.id);
    button.setAttribute('aria-pressed', on);
    button.setAttribute('aria-label', on ? '이 문장 책갈피에서 빼기' : '이 문장 책갈피에 담기');
  });
}

function toggleSaved(id) {
  const wasSaved = saved.has(id);
  if (wasSaved) saved.delete(id); else saved.add(id);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved])); storageWorks = true; }
  catch { storageWorks = false; }
  updateSaveButtons();
  if (activeView === 'saved') renderSaved();
  toast(!storageWorks ? '브라우저 저장이 제한되어 이번 방문 동안만 보관됩니다.' : wasSaved ? '책갈피에서 삭제했습니다.' : '책갈피에 저장했습니다.');
}

function updateQuote(record) {
  current = record;
  $('#quote-text').textContent = record.text;
  $('#quote-attribution').textContent = sourceLabel(record);
  $('#quote-exam').textContent = examLabel(record);
  $('#quote-exam').setAttribute('aria-label', `${examLabel(record)} · 출처 자세히 보기`);
  $('#quote-number').textContent = `제 ${String(records.indexOf(record) + 1).padStart(3, '0')} 번`;
  updateSaveButtons();
  const url = new URL(location.href);
  url.searchParams.set('q', record.id);
  history.replaceState(null, '', url);
}

function setDrawing(value) {
  drawing = value;
  $('#quote-card').setAttribute('aria-busy', value);
  $('#draw-button').setAttribute('aria-disabled', value);
  $('#draw-label').textContent = value ? '뽑는 중' : '문구 뽑기';
  ['save-quote', 'copy-quote', 'share-quote', 'quote-exam'].forEach(id => $(`#${id}`).disabled = value);
  $$('[data-filter]').forEach(button => button.setAttribute('aria-disabled', value));
}

function clearDrawAnimations() {
  drawAnimations.forEach(animation => animation.cancel());
  drawAnimations.clear();
  $('#quote-card').dataset.phase = 'idle';
}

function cancelDraw() {
  if (!drawing) return;
  drawSession++;
  clearDrawAnimations();
  setDrawing(false);
}

function paperMotion(element, frames, options) {
  if (motionPreference.matches || !element.animate) return Promise.resolve();
  const animation = element.animate(frames, { fill: 'both', ...options });
  drawAnimations.add(animation);
  // Cancellation occurs when the reader navigates away during a draw.
  return animation.finished.catch(() => {});
}

motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) drawAnimations.forEach(animation => animation.finish());
});

async function draw() {
  if (drawing) return;
  const pool = filter === 'csat' ? records.filter(record => record.examType === 'suneung') : records;
  if (!pool.length) return;
  if (!bag.length) bag = makeBag(pool, current?.text);
  // Opening a record from the archive must not cause an immediate repeat.
  if (bag.length > 1 && bag.at(-1).text === current?.text) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
  let record = bag.pop();
  if (record.text === current?.text && pool.length > 1) { bag = makeBag(pool, current.text); record = bag.pop(); }
  const session = ++drawSession;
  const card = $('#quote-card');
  setDrawing(true);
  try {
    card.dataset.phase = 'outgoing';
    await paperMotion(card, [
      { opacity: 1, transform: 'translateY(0) rotate(0)' },
      { opacity: .7, transform: 'translateY(-13px) rotate(-1deg)', offset: .45 },
      { opacity: 0, transform: 'translateY(-32px) rotate(-2deg)' }
    ], { duration: 240, easing: 'ease-in' });
    if (session !== drawSession) return;

    // Change the record only after the old sheet has left the stack.
    updateQuote(record);
    turns++;
    $('#draw-count').textContent = `${uniquePhrases(pool).length}개 문구 · ${turns}회 뽑음`;
    card.dataset.phase = 'incoming';
    await Promise.all([
      paperMotion(card, [
        { opacity: 0, transform: 'translateY(38px) rotate(1.8deg) scale(.985)' },
        { opacity: 1, offset: .3 },
        { transform: 'translateY(-3px) rotate(-.2deg) scale(1)', offset: .8 },
        { opacity: 1, transform: 'translateY(0) rotate(0) scale(1)' }
      ], { duration: 580, easing: 'cubic-bezier(.2,.7,.2,1)' }),
      paperMotion($('#quote-content'), [
        { opacity: 0, transform: 'translateY(9px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 390, delay: 160, easing: 'ease-out' }),
      paperMotion($('.impression'), [
        { opacity: 0, transform: 'scale(1.65) rotate(-13deg)' },
        { opacity: .95, transform: 'scale(.94) rotate(-7deg)', offset: .65 },
        { opacity: .8, transform: 'scale(1) rotate(-7deg)' }
      ], { duration: 220, delay: 430, easing: 'ease-out' })
    ]);
  } finally {
    if (session === drawSession) {
      clearDrawAnimations();
      setDrawing(false);
    }
  }
}

function showView(view, focus = true) {
  cancelDraw();
  activeView = view;
  $$('.view').forEach(section => section.hidden = section.id !== `${view}-view`);
  $$('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
    button.setAttribute('aria-pressed', button.dataset.view === view);
  });
  if (view === 'archive') renderArchive();
  if (view === 'saved') renderSaved();
  document.title = `${view === 'draw' ? '필적확인문구 뽑기' : view === 'archive' ? '문장 모음' : '책갈피'} | 필적`;
  if (focus) { $(`#${view}-view h1`).focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderRows(container, rows) {
  container.replaceChildren();
  const fragment = document.createDocumentFragment();
  rows.forEach(record => {
    const row = element('article', 'sentence-row');
    const date = element('div', 'row-date', `${record.year}. ${String(record.month).padStart(2, '0')}`);
    date.append(element('small', '', record.examType === 'suneung' ? `${record.academicYear}학년도 수능` : record.examType === 'evaluation' ? '평가원 모의평가' : record.examName));
    const open = element('button', 'row-open');
    open.append(element('p', 'row-quote', record.text), element('p', 'row-attribution', sourceLabel(record)));
    open.setAttribute('aria-label', `${record.text} · 문장 펼쳐보기`);
    open.addEventListener('click', () => { updateQuote(record); showView('draw'); });
    const save = element('button', 'icon-button row-save');
    save.dataset.id = record.id;
    save.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-bookmark"/></svg>';
    save.addEventListener('click', () => toggleSaved(record.id));
    row.append(date, open, save);
    fragment.append(row);
  });
  container.append(fragment);
  updateSaveButtons();
}

function renderArchive() {
  const filtered = filterRecords(records, { query: $('#search').value, year: $('#year-filter').value, type: $('#exam-filter').value }).sort((a, b) => b.year - a.year || b.month - a.month);
  $('#archive-count').textContent = `${filtered.length}개의 시험 기록`;
  renderRows($('#archive-list'), filtered.slice(0, visibleCount));
  if (!filtered.length) {
    const empty = element('div', 'empty-state');
    empty.append(element('h2', '', '검색 결과가 없습니다.'), element('p', '', '다른 단어나 연도로 다시 찾아보세요.'));
    $('#archive-list').append(empty);
  }
  $('#load-more').hidden = filtered.length <= visibleCount;
  $('#load-more').textContent = `문장 더 펼쳐보기 (${Math.min(visibleCount, filtered.length)} / ${filtered.length}) ↓`;
}

function renderSaved() {
  const bookmarked = [...saved].reverse().map(id => records.find(record => record.id === id)).filter(Boolean);
  renderRows($('#saved-list'), bookmarked);
  $('#saved-empty').hidden = bookmarked.length > 0;
  $('#saved-list').hidden = bookmarked.length === 0;
}

function showSource() {
  if (!current) return;
  const container = $('#source-content');
  container.replaceChildren(element('blockquote', 'source-quote', current.text), element('p', 'source-author', sourceLabel(current)));
  const instances = records.filter(record => record.text === current.text);
  instances.forEach(record => {
    const block = element('div', 'source-record');
    block.append(element('p', '', examLabel(record)));
    record.notes.forEach(note => block.append(element('p', 'source-record-note', note)));
    const link = element('a', 'source-link', '목록에서 출처 확인 ↗');
    link.href = record.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    block.append(link);
    container.append(block);
  });
  $('#source-dialog').showModal();
}

async function copy(text, message) {
  try { await navigator.clipboard.writeText(text); toast(message); }
  catch {
    // A selectable dialog keeps copying possible on insecure or restricted browsers.
    const dialog = document.createElement('dialog');
    dialog.className = 'copy-dialog';
    dialog.setAttribute('aria-labelledby', 'copy-title');
    const title = element('h2', '', '문장을 가져가세요.'); title.id = 'copy-title';
    const label = element('label', '', '아래 내용을 선택해 복사해주세요.'); label.htmlFor = 'copy-text';
    const textarea = element('textarea'); textarea.id = 'copy-text'; textarea.value = text; textarea.readOnly = true;
    const close = element('button', 'outline-button', '닫기'); close.addEventListener('click', () => dialog.close());
    dialog.append(title, label, textarea, close); document.body.append(dialog);
    dialog.addEventListener('close', () => dialog.remove(), { once: true }); dialog.showModal(); textarea.focus(); textarea.select();
  }
}

async function load() {
  try {
    const response = await fetch('./quotes.json');
    if (!response.ok) throw new Error('Data unavailable');
    records = await response.json();
    if (!Array.isArray(records) || !records.length) throw new Error('No records');
    saved = new Set([...saved].filter(id => records.some(record => record.id === id)));
    const requestedId = new URL(location.href).searchParams.get('q');
    // Start with an actual random phrase; links always restore the selected record.
    bag = makeBag(records);
    const initial = records.find(record => record.id === requestedId) || bag.pop();
    bag = bag.filter(record => record.text !== initial.text);
    updateQuote(initial);
    $('#quote-card').setAttribute('aria-busy', 'false');
    ['save-quote', 'draw-button', 'copy-quote', 'share-quote', 'quote-exam'].forEach(id => $(`#${id}`).disabled = false);
    $('#coverage').textContent = `2005 — 2026 · ${uniquePhrases(records).length}개의 문장`;
    $('#draw-count').textContent = `${uniquePhrases(records).length}개 문구 · 2005–2026`;
    $('#data-note').textContent = `2005–2026년 공개 목록의 ${records.length}개 시험 기록, 서로 다른 문구 ${uniquePhrases(records).length}개를 담았습니다. 2026년 11월 9일 기준이며, 아직 공개되지 않은 2026년 본수능 문구는 포함하지 않았습니다. 모든 기록을 공식 시험지와 개별 대조한 것은 아닙니다.`;
    [...new Set(records.map(record => record.year))].sort((a,b) => b-a).forEach(year => { const option = element('option', '', `${year}년`); option.value = year; $('#year-filter').append(option); });
    if (requestedId && !records.some(record => record.id === requestedId)) toast('이 링크의 문장을 찾지 못해 새로운 문장을 꺼냈어요.');
    if (activeView !== 'draw') showView(activeView, false);
  } catch {
    $('#quote-card').setAttribute('aria-busy', 'false');
    $('#quote-text').textContent = '문장을 꺼내오지 못했어요.';
    $('#quote-attribution').textContent = '연결을 확인하고 잠시 뒤 다시 열어주세요.';
    const retry = element('button', 'retry-button', '다시 불러오기');
    retry.addEventListener('click', () => { retry.remove(); load(); });
    $('#quote-content').append(retry);
  }
}

$$('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  if (drawing || filter === button.dataset.filter) return;
  filter = button.dataset.filter; bag = [];
  $$('[data-filter]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', item === button); });
  draw();
}));
$('#draw-button').addEventListener('click', draw);
$('#save-quote').addEventListener('click', () => current && toggleSaved(current.id));
$('#copy-quote').addEventListener('click', () => current && copy(`${current.text}\n\n— ${sourceLabel(current)}\n${examLabel(current)}\n필적 · 필적확인문구 뽑기`, '문장과 출처를 함께 복사했습니다.'));
$('#share-quote').addEventListener('click', () => current && copy(location.href, '이 문장으로 이어지는 링크를 복사했어요.'));
$('#quote-exam').addEventListener('click', showSource);
$('#about-button').addEventListener('click', () => $('#about-dialog').showModal());
$$('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  const box = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
}));
$('#search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { visibleCount = 30; renderArchive(); }, 180); });
['year-filter', 'exam-filter'].forEach(id => $(`#${id}`).addEventListener('change', () => { visibleCount = 30; renderArchive(); }));
$('#load-more').addEventListener('click', () => { visibleCount += 30; renderArchive(); });
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  try { const next = JSON.parse(event.newValue || '[]'); if (Array.isArray(next)) saved = new Set(next.filter(id => records.some(record => record.id === id))); } catch { return; }
  updateSaveButtons(); if (activeView === 'saved') renderSaved();
});
load();
