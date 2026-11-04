-- 成绩表：一局一房间一行，同一昵称只留最好成绩
CREATE TABLE IF NOT EXISTS scores (
  room       TEXT    NOT NULL,
  round      TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  correct    INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  ms         INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_score ON scores(room, round, name);
CREATE INDEX IF NOT EXISTS idx_board ON scores(room, round, correct DESC, ms ASC);
