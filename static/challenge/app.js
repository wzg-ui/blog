// 单词挑战：取题 → 四选一 → 提交成绩
// 判定只有一句「选中项的释义 === 正确释义」，不涉及 Python 核心。

const ROOM_RE = /^[A-HJ-NP-Z2-9]{4}$/;
const $ = (id) => document.getElementById(id);

const state = {
  room: "",
  round: "",
  picks: [],
  ticket: "",
  words: [],
  i: 0,
  correct: 0,
  n: 20,
  startAt: 0,
  locked: false,
  timer: 0,
  wrong: [],
};

const pad = (v) => String(v).padStart(2, "0");
const secs = (ms) => (ms / 1000).toFixed(1) + " 秒";
const clock = (ms) => `${pad(Math.floor(ms / 60000))}:${pad(Math.floor((ms % 60000) / 1000))}`;

function view(name) {
  for (const id of ["view-start", "view-play", "view-done"]) {
    $(id).hidden = id !== `view-${name}`;
  }
}

function tip(text) {
  $("tip").textContent = text;
}

// ---------- 启动 ----------

async function start(code) {
  code = (code || "").trim().toUpperCase();
  if (!ROOM_RE.test(code)) {
    $("roomInput").focus();
    return alert("房间码是 4 位，去掉 I O 0 1");
  }
  $("startBtn").disabled = true;
  $("startBtn").textContent = "出题…";

  try {
    const res = await fetch(`/api/room/${code}?deck=kaoyan-core`);
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || "出题失败");

    const deck = await fetch("/challenge/deck.json", { cache: "force-cache" }).then((x) => x.json());

    Object.assign(state, {
      room: code,
      round: r.round,
      picks: r.picks,
      ticket: r.ticket,
      words: deck.words,
      i: 0,
      correct: 0,
      n: r.n,
      startAt: Date.now(),
      locked: false,
      wrong: [],
    });

    $("roomLabel").textContent = code;
    $("deckMeta").textContent = `${deck.name} ${deck.words.length} 词`;
    history.replaceState(null, "", `/challenge/?room=${code}`);
    view("play");
    tickTimer();
    render();
  } catch (err) {
    alert(String(err.message || err));
  } finally {
    $("startBtn").disabled = false;
    $("startBtn").textContent = "开始";
  }
}

function tickTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    $("timer").textContent = clock(Date.now() - state.startAt);
  }, 200);
}

// ---------- 出题 ----------

function optionsFor(word) {
  const seen = new Set([word.b]);
  const pool = [];
  let guard = 0;
  while (pool.length < 3 && guard++ < 2000) {
    const w = state.words[Math.floor(Math.random() * state.words.length)];
    if (seen.has(w.b)) continue;
    seen.add(w.b);
    pool.push(w.b);
  }
  const opts = [word.b, ...pool].map((text) => ({ text, ok: text === word.b }));
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

function render() {
  const word = state.words[state.picks[state.i]];
  $("progress").textContent = `${state.i + 1} / ${state.n}`;
  const w = $("word");
  w.textContent = word.f;
  w.classList.toggle("small", word.f.length > 16);

  const box = $("options");
  box.classList.remove("locked");
  box.textContent = "";
  optionsFor(word).forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.type = "button";

    const key = document.createElement("span");
    key.className = "key";
    key.textContent = String(idx + 1);

    const text = document.createElement("span");
    text.className = "txt";
    text.textContent = opt.text;

    btn.append(key, text);
    btn.addEventListener("click", () => answer(idx));
    box.append(btn);
  });
  state.locked = false;
  tip("按 1–4 也可以选");
}

function answer(idx) {
  if (state.locked) return;
  const box = $("options");
  const btns = [...box.querySelectorAll(".option")];
  const word = state.words[state.picks[state.i]];
  const chosen = btns[idx];
  if (!chosen) return;

  state.locked = true;
  box.classList.add("locked");

  const isRight = chosen.querySelector(".txt").textContent === word.b;
  if (isRight) {
    state.correct++;
    chosen.classList.add("correct");
    tip("对");
  } else {
    chosen.classList.add("wrong");
    btns.find((b) => b.querySelector(".txt").textContent === word.b)?.classList.add("correct");
    state.wrong.push(word.f);
    tip(`错，${word.f} 是 ${word.b}`);
  }

  setTimeout(() => {
    state.i++;
    if (state.i >= state.n) finish();
    else render();
  }, isRight ? 260 : 1100);
}

// ---------- 收尾 ----------

function finish() {
  clearInterval(state.timer);
  const ms = Date.now() - state.startAt;
  state.ms = ms;
  $("progress").textContent = `${state.n} / ${state.n}`;
  $("timer").textContent = clock(ms);
  $("scoreNum").textContent = state.correct;
  $("scoreMeta").textContent = `用时 ${secs(ms)}` + (state.wrong.length ? ` · 错 ${state.wrong.length} 个` : " · 全对");
  $("nameInput").value = localStorage.getItem("challenge-name") || "";
  $("resultMsg").textContent = "";
  $("boardWrap").hidden = true;
  view("done");
  $("nameInput").focus();
}

async function submit() {
  const name = $("nameInput").value.trim();
  if (!name) {
    $("resultMsg").textContent = "先写个昵称";
    $("nameInput").focus();
    return;
  }
  localStorage.setItem("challenge-name", name);
  $("submitBtn").disabled = true;
  $("submitBtn").textContent = "提交…";

  try {
    const res = await fetch(`/api/room/${state.room}/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        round: state.round,
        name,
        correct: state.correct,
        total: state.n,
        ms: state.ms,
        ticket: state.ticket,
      }),
    });
    const r = await res.json();
    if (!r.ok) throw new Error(r.error || "提交失败");
    $("resultMsg").textContent = r.rank ? `第 ${r.rank} 名，共 ${r.count} 人` : "";
    renderBoard(r.board, name);
  } catch (err) {
    $("resultMsg").textContent = String(err.message || err);
  } finally {
    $("submitBtn").disabled = false;
    $("submitBtn").textContent = "上榜";
  }
}

function renderBoard(rows, me) {
  const ol = $("board");
  ol.textContent = "";
  rows.forEach((row, i) => {
    const li = document.createElement("li");
    if (row.name === me) li.className = "me";

    const rk = document.createElement("span");
    rk.className = "rk";
    rk.textContent = String(i + 1).padStart(2, "0");

    const nm = document.createElement("span");
    nm.className = "nm";
    nm.textContent = row.name;

    const sc = document.createElement("span");
    sc.className = "sc";
    sc.textContent = `${row.correct}/${row.total}`;

    const tm = document.createElement("span");
    tm.className = "tm";
    tm.textContent = secs(row.ms);

    li.append(rk, nm, sc, tm);
    ol.append(li);
  });
  $("boardWrap").hidden = false;
}

// ---------- 交互 ----------

document.addEventListener("keydown", (e) => {
  if (!$("view-play").hidden) {
    const map = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
    const idx = map[e.key.toLowerCase()];
    if (idx !== undefined) {
      e.preventDefault();
      answer(idx);
    }
  } else if (!$("view-done").hidden && e.key === "Enter" && document.activeElement === $("nameInput")) {
    submit();
  }
});

$("startBtn").addEventListener("click", () => start($("roomInput").value));
$("roomInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") start($("roomInput").value);
});
$("roomInput").addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
});
$("submitBtn").addEventListener("click", submit);

$("shareLink").addEventListener("click", async (e) => {
  e.preventDefault();
  const url = `${location.origin}/challenge/?room=${state.room}`;
  try {
    await navigator.clipboard.writeText(url);
    $("resultMsg").textContent = "链接已复制，发给朋友";
  } catch {
    prompt("复制这个链接", url);
  }
});

// 带 ?room= 直接开局
const room = new URLSearchParams(location.search).get("room");
if (room) start(room);
