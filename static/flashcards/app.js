/* 卡片盒 · 网页原型
   规则与 cards.py 一致：Card.check() 自评返 None，
   自动判的题型把 back 按竖线拆开、NFKC 归一化后逐项比。 */

(function () {
  'use strict';

  const KEY = 'pie.flashcards.v1';

  /* 20 张示例卡：四种题型、五个盒子都占上 */
  const SAMPLE = [
    { id: 'K001', type: 'en2cn', front: 'abandon', back: '放弃；抛弃', tags: ['unit3'], box: 1 },
    { id: 'K002', type: 'en2cn', front: 'abstract', back: '抽象的；摘要', tags: ['unit1'], box: 2 },
    { id: 'K003', type: 'cn2en', front: '坚持', back: 'persist|persevere', tags: ['unit3'], box: 1 },
    { id: 'K004', type: 'cn2en', front: '缓解；减轻', back: 'alleviate|ease', tags: ['unit4'], box: 3 },
    { id: 'K005', type: 'cloze', front: 'He ___ to finish the report by Friday.', back: 'managed', cn: '他在周五之前完成了那份报告。', tags: ['unit5'], box: 1 },
    { id: 'K006', type: 'cloze', front: 'The results are ___ with our hypothesis.', back: 'consistent', cn: '结果与我们的假设一致。', tags: ['unit6'], box: 2 },
    { id: 'K007', type: 'phrase', front: 'look forward to', back: '期待；盼望', tags: ['unit2'], box: 4 },
    { id: 'K008', type: 'phrase', front: 'in terms of', back: '就……而言', tags: ['unit2'], box: 3 },
    { id: 'K009', type: 'en2cn', front: 'comprehensive', back: '全面的；综合的', tags: ['unit1'], box: 2 },
    { id: 'K010', type: 'en2cn', front: 'deteriorate', back: '恶化；变坏', tags: ['unit4'], box: 1 },
    { id: 'K011', type: 'cn2en', front: '显著的', back: 'remarkable|notable', tags: ['unit5'], box: 3 },
    { id: 'K012', type: 'cloze', front: 'She was ___ of the danger ahead.', back: 'aware', cn: '她意识到前方的危险。', tags: ['unit5'], box: 2 },
    { id: 'K013', type: 'en2cn', front: 'inevitable', back: '不可避免的', tags: ['unit6'], box: 4 },
    { id: 'K014', type: 'cn2en', front: '分配；指派', back: 'assign', tags: ['unit3'], box: 1 },
    { id: 'K015', type: 'en2cn', front: 'sustain', back: '维持；支撑', tags: ['unit4'], box: 2 },
    { id: 'K016', type: 'cloze', front: 'The data ___ a clear upward trend.', back: 'reveals|shows', cn: '数据揭示出明显的上升趋势。', tags: ['unit7'], box: 1 },
    { id: 'K017', type: 'phrase', front: 'account for', back: '解释；占（比例）', tags: ['unit2'], box: 2 },
    { id: 'K018', type: 'en2cn', front: 'reluctant', back: '不情愿的', tags: ['unit6'], box: 5 },
    { id: 'K019', type: 'cn2en', front: '主张；声称', back: 'claim|assert', tags: ['unit7'], box: 3 },
    { id: 'K020', type: 'en2cn', front: 'subtle', back: '微妙的；细微的', tags: ['unit7'], box: 1 }
  ];

  const TYPE_LABEL = { en2cn: '英译汉 · 自评', cn2en: '汉译英 · 精确', cloze: '句子填空 · 精确', phrase: '词组 · 自评' };

  let cards = [];
  let session = null;
  let view = 'home';

  /* ---------------- 存储 ---------------- */

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) return false;
      const arr = JSON.parse(raw);
      cards = Array.isArray(arr) ? arr.map(normalizeCard) : [];
      return true;
    } catch (e) {
      cards = [];
      return false;
    }
  }

  function normalizeCard(c) {
    return {
      id: String(c.id || ''),
      type: TYPE_LABEL[c.type] ? c.type : 'en2cn',
      front: String(c.front || ''),
      back: String(c.back || ''),
      cn: c.cn ? String(c.cn) : '',
      tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
      box: Math.min(5, Math.max(1, Number(c.box) || 1)),
      ok: Number(c.ok) || 0,
      bad: Number(c.bad) || 0,
      last: Number(c.last) || 0
    };
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cards)); } catch (e) { /* 隐私模式下静默 */ }
  }

  /* ---------------- 工具 ---------------- */

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function norm(s) { return String(s || '').normalize('NFKC').trim().toLowerCase(); }

  function candidates(back) {
    return String(back || '').split('|').map(norm).filter(Boolean);
  }

  function readable(back) {
    return String(back || '').split('|').map((s) => s.trim()).filter(Boolean).join(' / ');
  }

  function byId(id) { return cards.find((c) => c.id === id) || null; }

  function isSelfCheck(card) { return card.type === 'en2cn' || card.type === 'phrase'; }

  function judge(card, raw) {
    if (isSelfCheck(card)) return null;
    return candidates(card.back).includes(norm(raw));
  }

  function grade(card, correct) {
    const from = card.box;
    card.box = correct ? Math.min(5, card.box + 1) : 1;
    if (correct) card.ok += 1; else card.bad += 1;
    card.last = Date.now();
    save();
    return { from, to: card.box };
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
  }

  function boxCount(n) { return cards.filter((c) => c.box === n).length; }
  function dueCount() { return cards.filter((c) => c.box < 5).length; }

  /* ---------------- 路由 ---------------- */

  function go(name) {
    view = name;
    $$('.view').forEach((v) => { v.hidden = v.dataset.view !== name; });
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.go === name));
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    if (name === 'home') renderHome();
    if (name === 'review') renderReviewStart();
    if (name === 'list') renderList();
    if (name === 'lookup') renderLookup();
    if (name === 'stats') renderStats();
    if (name === 'add') prepareAddForm();
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go]');
    if (t) { go(t.dataset.go); }
  });

  /* ---------------- 概览 ---------------- */

  function renderHome() {
    const due = dueCount();
    $('#dueNum').textContent = due;
    $('#dueNote').textContent = due
      ? '从最生的盒子开始，答对升一盒，答错回 1 号盒。'
      : '都进 5 号盒了。想再检查一遍，就进复习单独选一个盒。';

    const total = cards.length || 1;
    $('#boxStrip').innerHTML = [1, 2, 3, 4, 5].map((n) => {
      const c = boxCount(n);
      const pct = cards.length ? Math.round((c / total) * 100) : 0;
      return '<button class="boxcell" data-box="' + n + '" data-jump="' + n + '">'
        + '<div class="bl">' + n + ' 号盒</div>'
        + '<div class="bn">' + c + '</div>'
        + '<div class="bs">' + pct + '%</div>'
        + '<i></i></button>';
    }).join('');

    $$('#boxStrip .boxcell').forEach((el) => {
      el.addEventListener('click', () => { go('review'); pickBox(Number(el.dataset.jump)); });
    });

    const recent = cards.slice(-5).reverse();
    $('#recentList').innerHTML = recent.length
      ? recent.map((c) => '<li><span class="rid">' + esc(c.id) + '</span>'
        + '<span class="rfront">' + esc(c.front) + '</span>'
        + '<span class="boxbadge">' + c.box + '</span></li>').join('')
      : '<li class="empty" style="border:0">还没有卡</li>';
    $('#startQuick').disabled = !due;
  }

  $('#startQuick').addEventListener('click', () => { go('review'); pickBox(0); });

  /* ---------------- 复习 ---------------- */

  let pickedBox = 0;

  function pickBox(n) {
    pickedBox = n;
    $$('#boxPick .pickcell').forEach((el) => el.classList.toggle('on', Number(el.dataset.box) === n));
    $('#startReview').disabled = !poolFor(n).length;
    const pool = poolFor(n).length;
    $('#pickHint').textContent = pool ? '这一轮 ' + pool + ' 张' : '这个盒里还没有卡';
  }

  function poolFor(n) {
    return n === 0 ? cards.filter((c) => c.box < 5) : cards.filter((c) => c.box === n);
  }

  function renderReviewStart() {
    const opts = [{ n: 0, label: '全部' }].concat([1, 2, 3, 4, 5].map((n) => ({ n, label: n + ' 号盒' })));
    $('#boxPick').innerHTML = opts.map((o) => {
      const c = o.n === 0 ? dueCount() : boxCount(o.n);
      return '<button class="pickcell" data-box="' + o.n + '"><b>' + o.label + '</b><span>' + c + ' 张</span></button>';
    }).join('');
    $$('#boxPick .pickcell').forEach((el) => {
      el.addEventListener('click', () => pickBox(Number(el.dataset.box)));
    });
    pickBox(pickedBox);
    showReviewPane('start');
  }

  function showReviewPane(which) {
    $('#reviewStart').hidden = which !== 'start';
    $('#reviewRun').hidden = which !== 'run';
    $('#reviewDone').hidden = which !== 'done';
  }

  $('#startReview').addEventListener('click', () => startReview(pickedBox));

  function startReview(box) {
    const pool = poolFor(box);
    if (!pool.length) { toast('这个盒里还没有卡'); return; }
    /* 先拍快照，边遍历边改盒会漏卡 */
    session = { queue: pool.map((c) => c.id), idx: 0, ok: 0, bad: 0, box: box, phase: 'ask' };
    showReviewPane('run');
    renderCard();
  }

  function current() {
    return session ? byId(session.queue[session.idx]) : null;
  }

  function renderCard() {
    if (!session) return;
    const card = current();
    if (!card) return finishReview();

    session.phase = 'ask';
    $('#progress').textContent = (session.idx + 1) + ' / ' + session.queue.length;
    $('#barFill').style.width = Math.round((session.idx / session.queue.length) * 100) + '%';

    $('#cardBox').textContent = card.box;
    $('#cardId').textContent = card.id;
    $('#cardTags').textContent = card.tags.join(' · ');

    if (card.type === 'cloze') {
      $('#cardFront').className = 'front sentence';
      $('#cardFront').innerHTML = esc(card.front).replace(/_{2,}/g, '<mark>___</mark>');
      $('#cardCn').textContent = card.cn || '';
      $('#cardCn').hidden = !card.cn;
    } else {
      $('#cardFront').className = 'front';
      $('#cardFront').textContent = card.front;
      $('#cardCn').hidden = true;
    }

    $('#actAsk').hidden = !isSelfCheck(card);
    $('#actInput').hidden = isSelfCheck(card);
    $('#actSelf').hidden = true;
    $('#actResult').hidden = true;

    if (!isSelfCheck(card)) {
      const input = $('#answerInput');
      input.value = '';
      input.disabled = false;
      $('#submitBtn').disabled = false;
      setTimeout(() => input.focus(), 30);
    }
  }

  $('#revealBtn').addEventListener('click', () => {
    const card = current();
    if (!card) return;
    session.phase = 'reveal';
    $('#actAsk').hidden = true;
    $('#cardBack').textContent = readable(card.back);
    $('#actSelf').hidden = false;
    $('#knowBtn').textContent = card.box < 5 ? '认识 · 升一盒' : '认识';
  });

  function selfAnswer(correct) {
    const card = current();
    if (!card) return;
    const r = grade(card, correct);
    session.ok += correct ? 1 : 0;
    session.bad += correct ? 0 : 1;
    toast(correct
      ? (r.from === r.to ? '保持在 5 号盒' : '升到 ' + r.to + ' 号盒')
      : (r.from === 1 ? '退回 1 号盒' : '从 ' + r.from + ' 号盒退回 1 号盒'));
    next();
  }

  $('#knowBtn').addEventListener('click', () => selfAnswer(true));
  $('#dontBtn').addEventListener('click', () => selfAnswer(false));

  function submitAnswer() {
    const card = current();
    if (!card || isSelfCheck(card)) return;
    const raw = $('#answerInput').value;
    if (!raw.trim()) { $('#answerInput').focus(); return; }

    const ok = judge(card, raw);
    session.ok += ok ? 1 : 0;
    session.bad += ok ? 0 : 1;
    const r = grade(card, ok);

    session.phase = 'result';
    $('#actInput').hidden = true;
    $('#actResult').hidden = false;
    $('#verdict').className = 'verdict ' + (ok ? 'ok' : 'no');
    $('#verdict').textContent = ok ? '对' : '错';
    $('#answerLine').innerHTML = ok
      ? (r.from === r.to ? '保持在 5 号盒' : '升到 ' + r.to + ' 号盒')
      : '答案是 <b>' + esc(readable(card.back)) + '</b>，退回 1 号盒';
    setTimeout(() => $('#nextBtn').focus(), 20);
  }

  $('#submitBtn').addEventListener('click', submitAnswer);
  $('#answerInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitAnswer(); }
  });
  $('#nextBtn').addEventListener('click', () => next());

  function next() {
    if (!session) return;
    session.idx += 1;
    if (session.idx >= session.queue.length) return finishReview();
    renderCard();
  }

  function finishReview() {
    if (!session) return;
    const total = session.ok + session.bad;
    $('#doneOk').textContent = session.ok;
    $('#doneTotal').textContent = total;
    $('#doneNote').textContent = total
      ? '正确率 ' + Math.round((session.ok / total) * 100) + '%。答对的都往上走了一格。'
      : '一张也没答，卡还在原来的盒里。';
    showReviewPane('done');
  }

  $('#quitReview').addEventListener('click', () => {
    if (session && session.ok + session.bad > 0) finishReview();
    else showReviewPane('start');
  });
  $('#againBtn').addEventListener('click', () => startReview(session ? session.box : 0));

  document.addEventListener('keydown', (e) => {
    if (view !== 'review' || $('#reviewRun').hidden) return;
    if (!$('#actSelf').hidden) {
      if (e.key === 'y' || e.key === '1') selfAnswer(true);
      if (e.key === 'n' || e.key === '2') selfAnswer(false);
      return;
    }
    if (!$('#actResult').hidden && e.key === 'Enter') { e.preventDefault(); next(); return; }
    if (!$('#actAsk').hidden && e.key === 'Enter') { e.preventDefault(); $('#revealBtn').click(); }
  });

  /* ---------------- 录卡 ---------------- */

  function prepareAddForm() {
    if ($('#fId').value.trim()) return;
    const nums = cards
      .map((c) => { const m = /^([A-Z]+)(\d{3})$/.exec(c.id); return m && m[1] === 'K' ? Number(m[2]) : 0; })
      .filter((n) => n > 0);
    const nxt = (nums.length ? Math.max.apply(null, nums) : 0) + 1;
    $('#fId').value = 'K' + String(nxt).padStart(3, '0');
  }

  $('#fType').addEventListener('change', () => {
    $('#cnRow').hidden = $('#fType').value !== 'cloze';
  });

  function addMsg(text, bad) {
    const el = $('#addMsg');
    el.textContent = text;
    el.style.color = bad ? '#b4553f' : '';
  }

  $('#addForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#fId').value.trim().toUpperCase();
    const type = $('#fType').value;
    const front = $('#fFront').value.trim();
    const back = $('#fBack').value.trim();
    const cn = $('#fCn').value.trim();
    const tags = Array.from(new Set($('#fTags').value.split(',').map((s) => s.trim()).filter(Boolean)));

    if (!/^[A-Z]+\d{3}$/.test(id)) { addMsg('编号要像 K001 这样：字母 + 三位数字', true); $('#fId').focus(); return; }
    if (cards.some((c) => c.id === id)) { addMsg('编号 ' + id + ' 已经有了', true); $('#fId').focus(); return; }
    if (!front) { addMsg('正面不能空着', true); $('#fFront').focus(); return; }
    if (!back) { addMsg('背面不能空着', true); $('#fBack').focus(); return; }
    if (type === 'cloze' && !/_{2,}/.test(front)) { addMsg('填空卡的正面要用两个以上下划线表示空位', true); $('#fFront').focus(); return; }

    const card = { id: id, type: type, front: front, back: back, cn: cn, tags: tags, box: 1, ok: 0, bad: 0, last: 0 };
    cards.push(card);
    save();
    addMsg('已入库 ' + id + '，在 1 号盒。');
    $('#addForm').reset();
    $('#cnRow').hidden = true;
    prepareAddForm();
    $('#fFront').focus();
  });

  $('#loadSample').addEventListener('click', () => {
    if (cards.length && !confirm('会替换掉现在所有卡，确定？')) return;
    cards = SAMPLE.map((c) => normalizeCard(c));
    save();
    $('#loadMsg').textContent = '已载入 ' + cards.length + ' 张示例卡。';
    prepareAddForm();
  });

  $('#loadDeck').addEventListener('click', async () => {
    const btn = $('#loadDeck');
    btn.disabled = true;
    $('#loadMsg').textContent = '正在取词库…';
    try {
      const res = await fetch('/challenge/deck.json');
      const deck = await res.json();
      const words = Array.isArray(deck.words) ? deck.words : [];
      let n = 0;
      words.forEach((w, i) => {
        const id = 'W' + String(i + 1).padStart(3, '0');
        if (!w || !w.f || cards.some((c) => c.id === id)) return;
        cards.push({ id: id, type: 'en2cn', front: w.f, back: w.b, cn: '', tags: ['考研'], box: 1, ok: 0, bad: 0, last: 0 });
        n += 1;
      });
      save();
      $('#loadMsg').textContent = n ? '导进 ' + n + ' 张（全部在 1 号盒）。' : '这些词已经都在卡池里了。';
      prepareAddForm();
    } catch (err) {
      $('#loadMsg').textContent = '取词库失败：' + err.message;
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------------- 清单 ---------------- */

  $('#listFilter').addEventListener('change', renderList);

  function renderList() {
    const f = Number($('#listFilter').value) || 0;
    const rows = cards
      .slice()
      .sort((a, b) => a.box - b.box || a.id.localeCompare(b.id))
      .filter((c) => !f || c.box === f);

    $('#listCount').textContent = rows.length + ' / ' + cards.length + ' 张';
    $('#listTable').querySelector('tbody').innerHTML = rows.length
      ? rows.map((c) => '<tr><td><span class="boxbadge">' + c.box + '</span></td>'
        + '<td class="mono">' + esc(c.id) + '</td>'
        + '<td class="front-cell" title="' + esc(c.front) + '">' + esc(c.front) + '</td>'
        + '<td class="front-cell">' + esc(readable(c.back)) + '</td>'
        + '<td class="tagcell">' + esc(c.tags.join(' · ')) + '</td></tr>').join('')
      : '<tr><td colspan="5" class="empty">没有卡</td></tr>';
  }

  /* ---------------- 查词 ---------------- */

  function renderLookup() {
    const q = norm($('#lookupInput').value);
    const hits = $('#lookupHits');
    if (!q) {
      hits.innerHTML = '<li class="empty" style="display:block;border:0">输入字母或中文，打前几个字就够。</li>';
      return;
    }
    const found = cards.filter((c) => norm(c.front).startsWith(q));
    hits.innerHTML = found.length
      ? found.map((c) => '<li><span class="hid">' + esc(c.id) + '</span>'
        + '<span><span class="hfront">' + esc(c.front) + '</span>'
        + '<div class="hback">' + esc(readable(c.back)) + (c.cn ? '　' + esc(c.cn) : '') + '</div></span>'
        + '<span class="hbox">' + c.box + ' 号盒</span></li>').join('')
      : '<li class="empty" style="display:block;border:0">没有找到「' + esc(q) + '」。</li>';
  }

  $('#lookupInput').addEventListener('input', renderLookup);
  $('#lookupBtn').addEventListener('click', renderLookup);
  $('#lookupInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') renderLookup(); });

  /* ---------------- 统计 ---------------- */

  function renderStats() {
    const total = cards.length;
    const mastered = cards.filter((c) => c.box >= 4).length;
    const rate = total ? Math.round((mastered / total) * 100) : 0;
    const right = cards.reduce((s, c) => s + c.ok, 0);
    const wrong = cards.reduce((s, c) => s + c.bad, 0);

    $('#statTotal').textContent = total;
    $('#statRate').textContent = rate + '%';
    $('#statRight').textContent = right;
    $('#statWrong').textContent = wrong;

    const max = Math.max(1, Math.max.apply(null, [1, 2, 3, 4, 5].map(boxCount)));
    $('#statBars').innerHTML = [1, 2, 3, 4, 5].map((n) => {
      const c = boxCount(n);
      return '<div class="barline"><span class="bl">' + n + ' 号盒</span>'
        + '<span class="track"><i class="fill" style="width:' + Math.round((c / max) * 100) + '%;background:var(--b' + n + ')"></i></span>'
        + '<span class="bn">' + c + '</span></div>';
    }).join('');

    const tags = {};
    cards.forEach((c) => {
      c.tags.forEach((t) => {
        if (!tags[t]) tags[t] = { total: 0, done: 0 };
        tags[t].total += 1;
        if (c.box >= 4) tags[t].done += 1;
      });
    });
    const keys = Object.keys(tags).sort();
    $('#tagTable').querySelector('tbody').innerHTML = keys.length
      ? keys.map((t) => {
        const d = tags[t];
        const pct = Math.round((d.done / d.total) * 100);
        return '<tr><td>' + esc(t) + '</td><td class="mono">' + d.total + '</td><td class="mono">' + d.done + '</td>'
          + '<td><div class="progressbar"><span class="bar"><i style="display:block;height:100%;width:' + pct + '%;background:var(--fg)"></i></span>'
          + '<span class="mono">' + pct + '%</span></div></td></tr>';
      }).join('')
      : '<tr><td colspan="4" class="empty">还没有标签</td></tr>';
  }

  /* ---------------- 数据弹层 ---------------- */

  function openSheet(v) { $('#sheetMask').hidden = !v; }
  $('#menuBtn').addEventListener('click', () => openSheet(true));
  $('#closeSheet').addEventListener('click', () => openSheet(false));
  $('#sheetMask').addEventListener('click', (e) => { if (e.target === $('#sheetMask')) openSheet(false); });

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(cards, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = 'cards-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('已导出 ' + cards.length + ' 张');
  });

  $('#importBtn').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(String(reader.result));
        if (!Array.isArray(arr)) throw new Error('顶层要是数组');
        if (cards.length && !confirm('会替换掉现在 ' + cards.length + ' 张卡，确定？')) return;
        cards = arr.map(normalizeCard).filter((c) => c.id && c.front);
        save();
        toast('已导入 ' + cards.length + ' 张');
        openSheet(false);
        go('home');
      } catch (err) {
        toast('这个文件读不了：' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#wipeBtn').addEventListener('click', () => {
    if (!cards.length) { toast('本来就是空的'); return; }
    if (!confirm('清空全部 ' + cards.length + ' 张卡？导出一份再清比较稳。')) return;
    cards = [];
    save();
    openSheet(false);
    go('home');
    toast('已清空');
  });

  /* ---------------- 启动 ---------------- */

  const existed = load();
  if (!existed) {
    cards = SAMPLE.map((c) => normalizeCard(c));
    save();
  }
  const VIEWS = ['home', 'review', 'add', 'list', 'lookup', 'stats'];
  go(VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home');
})();
