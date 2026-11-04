// 成绩存储：线上走 D1，本地 wrangler dev 没绑 DB 时退化成内存（进程重启即清空）
// 两边接口一致，路由层不用关心用的是哪个。

const mem = new Map(); // key: room|round|name -> row

const better = (a, b) =>
  a.correct > b.correct || (a.correct === b.correct && a.ms < b.ms);

export async function saveScore(env, row) {
  if (!env.DB) {
    const key = `${row.room}|${row.round}|${row.name}`;
    const old = mem.get(key);
    if (!old || better(row, old)) mem.set(key, row);
    return;
  }
  await env.DB.prepare(
    `INSERT INTO scores (room, round, name, correct, total, ms)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(room, round, name) DO UPDATE SET
       correct = excluded.correct,
       total   = excluded.total,
       ms      = excluded.ms
     WHERE excluded.correct > scores.correct
        OR (excluded.correct = scores.correct AND excluded.ms < scores.ms)`,
  )
    .bind(row.room, row.round, row.name, row.correct, row.total, row.ms)
    .run();
}

export async function topBoard(env, room, round, limit = 10) {
  if (!env.DB) {
    return [...mem.values()]
      .filter((r) => r.room === room && r.round === round)
      .sort((a, b) => (a.correct === b.correct ? a.ms - b.ms : b.correct - a.correct))
      .slice(0, limit)
      .map(({ name, correct, total, ms }) => ({ name, correct, total, ms }));
  }
  const { results } = await env.DB.prepare(
    `SELECT name, correct, total, ms FROM scores
     WHERE room = ? AND round = ?
     ORDER BY correct DESC, ms ASC
     LIMIT ?`,
  )
    .bind(room, round, limit)
    .all();
  return results ?? [];
}

export async function countBoard(env, room, round) {
  if (!env.DB) {
    return [...mem.values()].filter((r) => r.room === room && r.round === round).length;
  }
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM scores WHERE room = ? AND round = ?`,
  )
    .bind(room, round)
    .first();
  return row?.n ?? 0;
}

// 名次：比我好的人 + 1
export function rankOf(board, name) {
  const i = board.findIndex((r) => r.name === name);
  return i < 0 ? null : i + 1;
}
