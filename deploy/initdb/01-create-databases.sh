#!/bin/bash
# ============================================================
#  PostgreSQL 首次启动时自动执行的建库脚本
#  （只在数据卷为空时跑一次，之后改这里不会再生效）
#
#  Waline 和 Umami 共用一个 PG 实例，但要各自独立的数据库。
#  直接读 docker-compose 传进来的环境变量，避免两处写死不一致。
# ============================================================
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE ${WALINE_DB}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${WALINE_DB}')\gexec
    SELECT 'CREATE DATABASE ${UMAMI_DB}'  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${UMAMI_DB}')\gexec
EOSQL

echo "[initdb] 已确保数据库存在：${WALINE_DB} / ${UMAMI_DB}"
