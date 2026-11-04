import {
  DECK_ID,
  N,
  fnv1a,
  picks,
  todayRound,
  makeTicket,
  readTicket,
} from "./room.js";
import { saveScore, topBoard, countBoard, rankOf } from "./store.js";

const ROOM_RE = /^[A-HJ-NP-Z2-9]{4}$/;
const TICKET_TTL = 2 * 3600e3; // 一局两小时内有效

// 只认白名单，词库内容不进 Worker，大小从静态文件读一次
const DECKS = {
  "kaoyan-core": "/challenge/deck.json",
  kaoyan: "/dicts/kaoyan.json",
  cet4: "/dicts/cet4.json",
  cet6: "/dicts/cet6.json",
  ielts: "/dicts/ielts.json",
};

const deckSizeCache = new Map();

async function deckSize(env, origin, file) {
  if (deckSizeCache.has(file)) return deckSizeCache.get(file);
  // 从 assets 里读一次就缓存住，避免尺寸写死在两个地方
  const res = await env.ASSETS.fetch(new Request(new URL(file, origin)));
  if (!res.ok) throw new Error("deck not found");
  const deck = await res.json();
  deckSizeCache.set(file, deck.words.length);
  return deck.words.length;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const fail = (error, status = 400) => json({ ok: false, error }, status);

function cleanName(raw) {
  if (typeof raw !== "string") return "";
  // 去掉控制字符，掐掉首尾空白，最长 12 字
  const s = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return s.length > 12 ? "" : s;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!path.startsWith("/api/")) {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
    }

    const parts = path.split("/").filter(Boolean); // ["api","room","ABCD","score"]
    if (parts[1] !== "room" || !parts[2]) return fail("unknown route", 404);

    const room = parts[2].toUpperCase();
    if (!ROOM_RE.test(room)) return fail("房间码是 4 位，去掉 I O 0 1");

    const action = parts[3] ?? "";
    const round = url.searchParams.get("round") || todayRound();

    try {
      if (action === "" && request.method === "GET") {
        return await getRoom(env, url, room, round);
      }
      if (action === "score" && request.method === "POST") {
        return await postScore(env, request, room, round);
      }
      if (action === "board" && request.method === "GET") {
        const board = await topBoard(env, room, round);
        return json({ ok: true, round, count: await countBoard(env, room, round), board });
      }
      return fail("unknown route", 404);
    } catch (err) {
      return json({ ok: false, error: String(err?.message || err) }, 500);
    }
  },
};

async function getRoom(env, url, room, round) {
  const deck = url.searchParams.get("deck") || DECK_ID;
  const file = DECKS[deck];
  if (!file) return fail("词库不存在");
  const size = await deckSize(env, url.origin, file);
  const issuedAt = Date.now();
  const seed = fnv1a(`${room}:${round}:${deck}`);
  return json({
    ok: true,
    room,
    round,
    deck,
    size,
    n: N,
    picks: picks(seed, size, N),
    issuedAt,
    ticket: await makeTicket(env, room, round, issuedAt),
  });
}

async function postScore(env, request, room, round) {
  const body = await request.json().catch(() => null);
  if (!body) return fail("请求体不是 JSON");

  const name = cleanName(body.name);
  if (!name) return fail("昵称 1–12 个字，不能带控制字符");

  const correct = Number(body.correct);
  const total = Number(body.total);
  const ms = Number(body.ms);
  if (![correct, total, ms].every(Number.isFinite)) return fail("成绩字段必须是数字");
  if (total !== N) return fail(`一局 ${N} 题`);
  if (correct < 0 || correct > total) return fail("答对数超出范围");
  if (ms <= 0) return fail("用时无效");

  const issuedAt = await readTicket(env, room, round, body.ticket);
  if (!issuedAt) return fail("这局不是服务端发的，重新开一局");
  const age = Date.now() - issuedAt;
  if (age > TICKET_TTL) return fail("这局过期了，刷新再来");
  if (ms > age + 5000) return fail("用时比开局到现在还长");
  if (ms < total * 400) return fail("用时短得不像真的");

  await saveScore(env, { room, round, name, correct, total, ms });

  const board = await topBoard(env, room, round);
  return json({
    ok: true,
    round,
    rank: rankOf(board, name),
    count: await countBoard(env, room, round),
    board,
  });
}
