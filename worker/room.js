// 房间与题目的确定性生成：同一房间 + 同一天 → 同一套题
// 服务端只算「第几号卡」，卡面内容在浏览器里从 deck.json 取。

export const DECK_ID = "kaoyan-core";
export const N = 20; // 一局题数

// FNV-1a：任意字符串 → 32 位种子
export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32：种子 → 可复现的伪随机序列
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 从 0..size-1 取 n 个不重复下标（部分 Fisher–Yates）
export function picks(seed, size, n) {
  const r = rng(seed);
  const idx = Array.from({ length: size }, (_, i) => i);
  const out = [];
  const k = Math.min(n, size);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(r() * (size - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
    out.push(idx[i]);
  }
  return out;
}

// 北京时间当天，YYYYMMDD。Cloudflare 是 UTC，别直接切 toISOString()
export function todayRound(now = Date.now()) {
  return new Date(now + 8 * 3600e3).toISOString().slice(0, 10).replace(/-/g, "");
}

const enc = new TextEncoder();

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ticket = "<issuedAt>.<签名>"，证明这一局是服务端刚发的
export async function makeTicket(env, room, round, issuedAt) {
  const key = env.TICKET_KEY || "dev-only-key-change-me";
  const sig = await hmac(key, `${room}:${round}:${issuedAt}`);
  return `${issuedAt}.${sig}`;
}

// 验签成功返回 issuedAt，失败返回 null
export async function readTicket(env, room, round, ticket) {
  if (typeof ticket !== "string") return null;
  const dot = ticket.indexOf(".");
  if (dot < 0) return null;
  const issuedAt = Number(ticket.slice(0, dot));
  if (!Number.isFinite(issuedAt)) return null;
  const expect = await makeTicket(env, room, round, issuedAt);
  if (ticket !== expect) return null;
  return issuedAt;
}
