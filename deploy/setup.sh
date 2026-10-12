#!/usr/bin/env bash
# ============================================================
#  博客服务器初始化（Ubuntu 22.04 / 阿里云 ECS 2核2G）
# ------------------------------------------------------------
#  这个脚本只做「一次性」的环境准备，可以重复执行，不会重复改动。
#  它不做的事：不碰你的博客内容，不动浏览器配置。
#
#  用法：
#    sudo bash setup.sh
#
#  做完之后，按 README.md 继续走「填 .env → docker compose up -d」
# ============================================================
set -euo pipefail

log()  { printf '\033[1;32m[+]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "需要 root 权限，请用：sudo bash setup.sh"

# ============================================================
# 1. 基础环境
# ============================================================
log "设置时区为 Asia/Shanghai（日志时间才和你对得上）"
timedatectl set-timezone Asia/Shanghai

log "安装基础工具"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git ufw openssl

# ============================================================
# 2. swap —— 2G 内存的机器必须开，不开就会「偶尔 502、重启就好」
# ============================================================
if swapon --show 2>/dev/null | grep -q '/swapfile'; then
	log "swap 已存在，跳过"
else
	log "创建 2GB swap"
	fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
	chmod 600 /swapfile
	mkswap /swapfile >/dev/null
	swapon /swapfile
	grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 有 swap 但尽量晚用：内存够时就不用换出，避免无谓的磁盘 IO
sysctl -w vm.swappiness=10 >/dev/null
grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
grep -q '^vm.vfs_cache_pressure' /etc/sysctl.conf || echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf

log "当前内存状况："
free -h | sed 's/^/    /'

# ============================================================
# 3. Docker
# ============================================================
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
	log "Docker 已安装：$(docker --version)"
else
	log "安装 Docker（走阿里云镜像源，国内快很多）"
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg \
		| gpg --dearmor -o /etc/apt/keyrings/docker.gpg
	chmod a+r /etc/apt/keyrings/docker.gpg

	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
		> /etc/apt/sources.list.d/docker.list

	apt-get update -qq
	apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
		docker-buildx-plugin docker-compose-plugin
	systemctl enable --now docker
fi

# ------------------------------------------------------------
# 日志轮转：不设的话容器日志会一路涨到把系统盘写满，
# 这是小磁盘 VPS 最常见的「服务器突然挂了」的原因。
# ------------------------------------------------------------
DAEMON_JSON=/etc/docker/daemon.json
if [[ ! -f $DAEMON_JSON ]] || ! grep -q 'max-size' $DAEMON_JSON; then
	log "配置 Docker 日志上限（每容器最多 30MB）"
	mkdir -p /etc/docker
	cat > $DAEMON_JSON <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
JSON
	systemctl restart docker
else
	log "Docker 日志上限已配置，跳过"
fi

# ------------------------------------------------------------
# 镜像加速：国内直连 Docker Hub 极慢甚至会超时。
# 建议去阿里云控制台「容器镜像服务 → 镜像加速器」拿你自己的专属地址，
# 那个地址带账号标识，比公共镜像站稳定得多。
# ------------------------------------------------------------
if grep -q 'registry-mirrors' $DAEMON_JSON 2>/dev/null; then
	log "镜像加速器已配置，跳过"
else
	warn "还没有配置镜像加速器。推荐做法："
	warn "  阿里云控制台 → 容器镜像服务 → 镜像工具 → 镜像加速器，复制专属地址"
	warn "  然后执行：sudo bash setup.sh --mirror <你的加速地址>"
fi

# 支持 --mirror 参数写入加速地址
if [[ "${1:-}" == "--mirror" && -n "${2:-}" ]]; then
	log "写入镜像加速器：$2"
	python3 - "$DAEMON_JSON" "$2" <<'PY'
import json, sys
path, mirror = sys.argv[1], sys.argv[2]
try:
    with open(path) as f: cfg = json.load(f)
except Exception:
    cfg = {}
cfg.setdefault("registry-mirrors", [])
if mirror not in cfg["registry-mirrors"]:
    cfg["registry-mirrors"].insert(0, mirror)
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
print("daemon.json 已更新")
PY
	systemctl restart docker
fi

# ============================================================
# 4. 防火墙
# ============================================================
# 注意：阿里云真正生效的第一道防线是「安全组」，ufw 只是第二层。
# 如果安全组没放行 80/443，这里配得再对也访问不了。
log "配置 ufw（只放行 22 / 80 / 443）"
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp  >/dev/null
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null   # HTTP/3
ufw --force enable >/dev/null
ufw status verbose | sed 's/^/    /'

# ============================================================
# 5. 目录准备
# ============================================================
log "创建站点目录 /srv/blog"
mkdir -p /srv/blog

# ============================================================
# 完成
# ============================================================
cat <<'EOF'

============================================================
  环境准备完成。接下来还需要你在「阿里云控制台」做两件事：

    1. 安全组放行 80 / 443（入方向），否则外网访问不了
    2. 如果打算 SSH 用密钥登录：绑定密钥对，然后禁用密码登录

  然后回到 deploy 目录：
      cp .env.example .env && vi .env     # 填域名和密码
      docker compose up -d
      docker compose ps                   # 确认四个容器都是 healthy

============================================================
EOF
