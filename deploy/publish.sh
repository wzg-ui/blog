#!/usr/bin/env bash
# ============================================================
#  在服务器上构建并发布博客
# ------------------------------------------------------------
#  做四件事：拉最新代码 → 用正确的 baseURL 构建 → 重启 Caddy
#
#  用法：
#     bash deploy/publish.sh                        # 用 deploy/.env 里的域名
#     bash deploy/publish.sh http://1.2.3.4/        # 还没有域名时，用 IP
#     bash deploy/publish.sh https://example.com/   # 显式指定
#
#  前提：服务器已装 Hugo（deploy/setup.sh 会装）
#       docker compose 已在 deploy/ 下起过一次
# ============================================================
set -euo pipefail

BLOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BLOG_DIR"

log()  { printf '\033[1;32m[+]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

# ------------------------------------------------------------
# 1. 确定访问地址（baseURL）
#    Hugo 会把绝对链接写死成这个地址，填错的话站内跳转会全坏。
# ------------------------------------------------------------
BASE="${1:-}"
if [[ -z "$BASE" ]]; then
	if [[ -f deploy/.env ]] && grep -qE '^[[:space:]]*BLOG_DOMAIN=[^[:space:]]+' deploy/.env; then
		DOMAIN=$(grep -E '^[[:space:]]*BLOG_DOMAIN=' deploy/.env | head -1 | cut -d= -f2 | tr -d '[:space:]')
		BASE="https://${DOMAIN}/"
	else
		cat >&2 <<'EOF'

没有可用的访问地址，无法继续。

deploy/.env 里还没有 BLOG_DOMAIN —— 这很正常，
说明域名还没买或者还没备案。

这种情况请显式把 IP 传进来：

    bash deploy/publish.sh http://你的服务器公网IP/

EOF
		exit 1
	fi
fi
log "访问地址：$BASE"

# ------------------------------------------------------------
# 2. 拉最新代码
# ------------------------------------------------------------
if git rev-parse --git-dir >/dev/null 2>&1; then
	log "拉取最新代码"
	git pull --ff-only
else
	warn "当前不是 git 仓库，跳过拉取（如果你是用 scp 传上来的，属正常）"
fi

# ------------------------------------------------------------
# 3. 构建
#    --cleanDestinationDir 会删掉目标目录里已不存在的文件，
#    否则删过的文章会一直留在线上。
# ------------------------------------------------------------
command -v hugo >/dev/null 2>&1 || die "找不到 hugo。
  装法一：重跑 sudo bash deploy/setup.sh（会自动装）
  装法二：本地构建后上传 public/，见 deploy/README.md"

mkdir -p deploy/site
log "构建中（$(hugo version | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1) extended）"
hugo --gc --minify --cleanDestinationDir \
	-b "$BASE" \
	-d deploy/site \
	--logLevel warn

log "产出 $(find deploy/site -type f | wc -l) 个文件，共 $(du -sh deploy/site | cut -f1)"

# ------------------------------------------------------------
# 4. 让 Caddy 重新加载
#    Caddyfile 是只读挂载的，改了内容需要重启容器才会生效。
#    （没有用 caddy reload，因为配置里关掉了 admin API）
# ------------------------------------------------------------
log "重启 Caddy"
docker compose -f deploy/docker-compose.yml restart caddy >/dev/null

# ------------------------------------------------------------
# 5. 顺手验一下
# ------------------------------------------------------------
sleep 2
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$BASE" || echo "000")
if [[ "$CODE" == "200" ]]; then
	log "完成 → $BASE  可访问"
else
	warn "完成，但自检返回 $CODE。检查一下："
	warn "  docker compose -f deploy/docker-compose.yml logs --tail 30 caddy"
fi
