# 部署手册

这份文档对应的最终决策：**`.com` 域名 · 先 Cloudflare Pages 后服务器 · 现在就重置服务器**。

---

## 〇、先看时间线

| 阶段 | 耗时 | 做什么 | 卡在哪 |
|---|---|---|---|
| ① 今天 | ~30 min | 推 GitHub → Cloudflare Pages 上线，**拿到能分享的链接** | 无 |
| ② 今天 | ~20 min | 阿里云买 `.com` 域名 + 实名认证 + **ECS 续费** | 无 |
| ③ 今天 | ~15 min | 重置服务器，跑 `setup.sh` | 无 |
| ④ 今天 | ~30 min | 申请备案服务码 → 提交 ICP 备案 | 无 |
| ⑤ 等 | 1–2 周 | 管局审核（浙江约 1–3 工作日） | **只能等** |
| ⑥ 备案后 | ~30 min | 域名解析 + 起 Waline / Umami，收工 | 无 |

**关键认知**：①和③④可以**同时做**。先发 Pages 是为了让你今天就有东西给别人看，而不是干等备案。

---

## 一、线 ① 今天就能分享的链接

### 1. 推代码到 GitHub

在本地 `blog/` 目录（已初始化好 git 仓库）：

```bash
# 到 GitHub 网页建一个空仓库，比如叫 blog，不要勾选任何初始化文件
git remote add origin git@github.com:你的用户名/blog.git
git push -u origin main
```

### 2. Cloudflare Pages 连仓库

Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git，然后按这个填：

| 配置项 | 值 |
|---|---|
| Framework preset | `Hugo` |
| Build command | `hugo --gc --minify -b "$CF_PAGES_URL"` |
| Build output directory | `public` |
| 环境变量 `HUGO_VERSION` | `0.167.0` |

**`HUGO_VERSION` 这一项不能漏。** Pages 默认装的是老版本 Hugo，你的主题用了 `layouts/_partials/`、`layouts/_shortcodes/` 这套新目录规范，老版本会直接构建失败。

**`-b "$CF_PAGES_URL"` 的作用**：让构建出来的绝对链接自动指向当前部署的域名。首次上线时你还没有自己的域名，不加这个参数所有链接会指向 `example.com`，点进去全是坏的。

> 域名备案下来后，把 build command 改成 `hugo --gc --minify -b "https://你的域名"`。
> 不改的话，用户访问 `你的域名` 时页面里所有链接都会跳到 `xxx.pages.dev`，体验很怪。

推送后约 1 分钟就能拿到 `https://你的项目名.pages.dev`，这个链接**现在就可以发给别人**。

---

## 二、线 ② 买域名 + 备案

### 买域名的四个硬条件

1. **必须在阿里云国内站 `aliyun.com` 买**，不能用国际站 `alibabacloud.com`，也不能用 GoDaddy / Cloudflare / Namecheap —— 工信部备案系统不认境外注册商的域名。
2. **后缀选 `.com`**。`.ai`、`.org`、`.dev` 这些没有工信部批复，**无法备案**。
3. **完成实名认证**，个人用身份证，且实名信息要和备案主体完全一致。
4. 域名必须在有效期内、状态正常（不能是 ClientHold）。

> 下单前可以去 `beian.aliyun.com` 用「检测域名是否可备案」工具验一下，10 秒出结果。

### ⚠️ 顺手把 ECS 续上

你的实例 **2026-11-12 到期，只剩 31 天**，而备案流程本身就要 1–2 周。

阿里云官方明确警告：**备案过程中或备案成功后服务器到期释放，导致备案网站没有指向的阿里云服务器，备案号可能被注销**。

续费一次（比如再买一年）成本很低，被注销后重新备案要再等一个流程 —— 这笔钱别省。

### 备案顺序（不能颠倒）

```
重置服务器  →  申请备案服务码  →  提交 ICP 备案  →  管局审核  →  公安联网备案
```

**为什么必须先重置？** 你机器上现在跑着一个 WordPress 站点。备案审核期间管局可能会访问你的 IP 核验，如果指向的站点和备案信息不符会被驳回。重置过后是干净环境，没有这个风险。

**备案服务码怎么拿**：阿里云控制台 → 备案 → 服务码管理。ECS 的申请条件是：

> 包年包月，且**购买时长大于 3 个月（含续费累计）**，**与服务器使用时间、剩余期限均无关**。

你 7-28 购买、11-12 到期，累计约 3.5 个月，**已满足条件，可以直接申请**（不用非得先续费才能拿码 —— 但上面说的续费该做还是要做）。每台 ECS 最多 5 个服务码。

**提交备案时注意**：

- 主体性质选「个人」
- **网站名称**别用「博客」「论坛」「社区」这类词，这类通常需要前置审批，容易被驳。建议用你的 ID 或姓名，比如 `BLZRW 的技术笔记`
- 网站内容简介如实写：技术学习笔记
- 核验单拍照要清晰，模糊是最高频的驳回原因
- 保持手机畅通，管局可能电话核实

**浙江管局审核约 1–3 个工作日**，加上阿里云初审，整体 1–2 周。

**公安联网备案**：拿到 ICP 备案号、网站开通后 **30 日内**，去全国互联网安全管理服务平台 `beian.mps.gov.cn` 提交，通过后要在网站页脚挂上公安备案号。

---

## 三、线 ③ 服务器跑评论和统计

### 两条路线，先选一条

**路线一（推荐，也是你选的）：博客留 Pages，服务器只跑有状态服务**

```
你的域名            → Cloudflare Pages   （静态博客，全球 CDN，不消耗服务器带宽）
comments.你的域名   → 118.31.174.108    （Waline 评论）
stats.你的域名      → 118.31.174.108    （Umami 统计）
```

大陆云服务器带宽普遍只有 1–5 Mbps，静态站直出体验一般；放 Pages 反而更快，还免费自带 HTTPS 和 CDN。服务器只干它擅长的事。

**路线二：所有东西都放服务器**

打开 `deploy/Caddyfile` 里「场景 A」那一段，把构建产物拷到 `deploy/site/`。适合你不想依赖第三方托管的情况。

### 部署步骤

```bash
# 1. 重置系统后，重新 SSH 上来
# 2. 把整个 blog/ 目录传上去（或者直接 git clone 你的仓库）
#    推荐位置：/srv/blog
cd /srv/blog/deploy

# 3. 环境初始化（装 Docker、开 swap、配防火墙）
sudo bash setup.sh

# 4.（强烈建议）配镜像加速器，否则拉镜像会非常慢
#    阿里云控制台 → 容器镜像服务 → 镜像工具 → 镜像加速器，复制专属地址
sudo bash setup.sh --mirror https://你的ID.mirror.aliyuncs.com

# 5. 填配置
cp .env.example .env
vi .env          # 必填：BLOG_DOMAIN / PG_PASSWORD / UMAMI_APP_SECRET / ADMIN_EMAIL
# 生成随机密码：openssl rand -base64 24

# 6. 起服务
docker compose up -d
docker compose ps        # 四个容器都应该是 running / healthy
```

### DNS 解析

在阿里云 DNS 控制台加记录（**备案通过后才能加**）：

| 记录类型 | 主机记录 | 记录值 |
|---|---|---|
| A | `comments` | `118.31.174.108` |
| A | `stats` | `118.31.174.108` |

Caddy 会自动为这两个子域名申请 Let's Encrypt 证书，不用你手动配。

### 后台地址

- **Waline**：`https://comments.你的域名/ui/register` —— **第一个注册的账号自动成为管理员**
- **Umami**：`https://stats.你的域名` —— 默认 `admin` / `umami`，**登录后立刻改密码**

### 接到博客上

编辑 `blog/config/_default/params.toml`：

```toml
[comments]
    enabled = true
    provider = "waline"
    [comments.waline]
        serverURL = "https://comments.你的域名"
```

统计需要在 `layouts/_partials/head/custom.html` 里加一段 Umami 的 script 标签（Umami 后台「设置 → 网站」里能直接复制）。

---

## 四、日常运维

```bash
cd /srv/blog/deploy

docker compose ps                  # 看状态
docker compose logs -f waline      # 看某个服务日志
docker compose pull && docker compose up -d    # 更新镜像
docker compose restart caddy       # 改完 Caddyfile 后重启
```

### 备份数据库

```bash
docker compose exec -T postgres pg_dumpall -U blog | gzip > ~/backup-$(date +%F).sql.gz
```

建议挂一条 cron 每周跑一次，并把文件同步到阿里云 OSS。评论和统计数据看着不重要，丢了还是会心疼。

---

## 五、出问题先看这里

| 现象 | 大概率原因 |
|---|---|
| 页面打不开、超时 | 阿里云**安全组**没放行 80/443（ufw 配对了也没用，安全组是第一道） |
| 证书申请失败 | 域名没备案 / DNS 还没生效 / 80 端口不通 |
| 间歇性 502，重启就好 | **没开 swap**，2G 内存被 OOM Killer 杀了进程。跑一下 `free -h` 确认 |
| 容器起来又退出 | `docker compose logs <服务名>` 看报错，多半是 `.env` 没填全 |
| 拉镜像卡住 | 没配镜像加速器 |
| 磁盘满了 | 容器日志没限制。`setup.sh` 已配好上限，若手动装过 Docker 要自己补 `daemon.json` |
