# 博客仓库

Hugo + Stack 主题。内容以 Markdown 存放，站点是构建产物，部署全自动。

```
blog/
├── config/_default/        站点配置（改标题、域名、菜单、公式开关都在这里）
│   ├── hugo.toml           主配置：域名、语言、永久链接
│   ├── params.toml         主题参数：内容区、公式、侧边栏
│   ├── markup.toml         数学公式与代码高亮的渲染规则
│   └── menu.toml           左侧导航菜单
├── content/                ★ 你写的东西全在这里
│   ├── posts/              文章（唯一内容区，不分类）
│   └── page/               归档、搜索（固定页面，不用改）
├── layouts/                对本主题的定制
│   ├── home.html           首页：置顶区 + 常规列表
│   ├── archives.html       归档页（覆盖主题，去掉默认的「分类云」）
│   ├── _shortcodes/        codegroup —— 代码并排/切换对照
│   ├── _markup/            代码块文件名栏
│   └── _partials/          覆盖主题默认行为（左侧导航折叠、Mermaid 本地化、去 Google Fonts、音乐播放器）
├── assets/                 custom.css 与 custom.ts（会被自动打包）
├── static/                 自托管资源：KaTeX / Mermaid / PhotoSwipe
│   ├── _headers            Cloudflare Pages 缓存与安全响应头
│   └── _redirects          日后改 URL 时用来接住旧链接
├── deploy/                 ★ 服务器部署：评论与统计
│   ├── docker-compose.yml  四个服务的编排（Caddy / Waline / Umami / PostgreSQL）
│   ├── Caddyfile           反向代理与自动 HTTPS
│   ├── setup.sh            一键初始化：换源装 Docker、开 swap、配防火墙
│   ├── .env.example        配置模板（复制成 .env 后填，.env 已被 git 忽略）
│   └── README.md           部署步骤、DNS 解析、备份、排错
├── themes/hugo-theme-stack 主题本体（内嵌，不用子模块）
├── .github/workflows/      每次 push 自动构建检查
└── .gitattributes          统一换行符为 LF —— shell 脚本在 Linux 上必须
```

---

## 一、写作流程

### 新建一篇文章

在 `content/posts/` 下新建 `.md` 文件即可，**文件名就是 URL**。

```
content/posts/segment-tree-range-sum.md
  → https://你的域名/posts/segment-tree-range-sum/
```

文章不分栏目，写的时候不用先想「这篇该放哪儿」。等某类文章攒够数量，再考虑拆独立目录——
届时记得同步 `params.toml` 的 `mainSections` 和 `menu.toml`。

**文件名请用英文小写加连字符**（`segment-tree.md` 而不是 `线段树.md`），否则 URL 里会出现一长串 `%E7%BA%BF%E6%AE%B5%E6%A0%91`。

### 文章开头的字段

```yaml
---
title: "线段树维护区间和"          # 显示用标题，可以写中文
date: 2026-10-12                   # 首次发布日期
slug: "segment-tree-range-sum"     # 可选，不写则用文件名
description: "一句话摘要，会用于 SEO 和分享卡片"
pinned: true                       # 可选，写这一行才会进首页「置顶」区
---
```

字段后面空一行，再写 `<!--more-->`，这之前的内容会作为列表页的摘要。

### 首页置顶

首页最上面是「置顶」区，下面是按时间排的常规列表。

**只有 front matter 里写了 `pinned: true` 的文章才会进置顶区**，不加就是普通文章。置顶区内部按 `weight` 升序排，`weight` 不写就按日期倒序——所以想控制置顶顺序，给它们编上号即可：

```yaml
weight: 1     # 置顶第一条
weight: 2     # 置顶第二条
```

同一篇文章不会在置顶区和下面的列表里出现两次（置顶的那几篇会从常规列表里去掉）。

> 站里没有分类、也没有标签 —— 别写 `categories` / `tags`，加了不报错但什么用都没有。
> `/posts/` 这个栏目页也不生成，首页就是文章入口。

### 语法速查

| 要写的东西 | 怎么写 |
| --- | --- |
| 行内公式 | `$O(n\log n)$` |
| 独立公式 | `$$ ... $$` 单独占一行 |
| 多行对齐推导 | 用 `\begin{aligned} ... \end{aligned}` 包在 `$$` 里 |
| 代码块 | <code>```cpp</code> 开头，<code>```</code> 结尾 |
| 代码块加文件名 | <code>```cpp {title="main.cpp"}</code> |
| 代码块显示行号 | <code>```cpp {linenos=true}</code> |
| 高亮某几行 | <code>```cpp {hl_lines=[2,5]}</code> |
| 流程图 | <code>```mermaid</code> 开头，直接写 `graph TD; A-->B;` |
| 表格 | 标准 Markdown 表格语法 |

公式**不需要**加 `math: true`，已经在 `params.toml` 里全局开启了。

### 代码并排对照

同一算法的多语言实现，用 `codegroup`：

**并排两栏**（适合短函数对照）：

```markdown
{{< codegroup mode="columns" >}}
{{< code lang="cpp" label="C++" >}}
int add(int a, int b) { return a + b; }
{{< /code >}}
{{< code lang="rust" label="Rust" >}}
fn add(a: i32, b: i32) -> i32 { a + b }
{{< /code >}}
{{< /codegroup >}}
```

**标签页切换**（适合长代码，省版面）：

把 `mode="columns"` 去掉即可，默认就是标签页。

内层 `code` 还支持 `linenos="true"` 和 `hl="2,5"`：

```markdown
{{< code lang="cpp" label="带行号" linenos="true" hl="2" >}}
```

> ⚠️ 代码里如果出现 `{{<` 或 `{{%`，Hugo 会误认为是短代码。遇到这种情况，把这两个符号拆开写，或者改用普通代码块。

### 本地预览（可选）

不需要装任何东西——本机不构建也能写，push 之后云端会构建。
如果确实想在本地看效果，装一个 Hugo 就能预览：

```bash
hugo server          # 然后浏览器打开 http://localhost:1313
```

### 生产构建

要生成可上传到 Cloudflare 的 `public/`，在仓库根执行：

```bash
tools/hugo/hugo.exe --minify --gc --cleanDestinationDir --destination public
```

> ⚠️ **`--cleanDestinationDir` 不能省**。本项目的 JS / CSS 都带内容哈希（`custom.<sha>.js`），
> 改一次代码就换一个文件名。不清空目录的话，旧版本会一直躺在 `public/` 里 ——
> HTML 引用的是新的，目录里却有一堆没人引用的旧文件。传到 Cloudflare 就是线上多出一堆
> 永远不会有人访问的垃圾，还会把文件总数越堆越多。实测踩过：72 个文件里 2 个是陈旧版本。
>
> ⚠️ **换了 slug 或删了文章，也必须带这个参数** —— 旧路径的产物不会被自动删掉，
> 线上会留着已经「删掉」的文章。

---

## 二、必须自己去做的事

这几件我做不了，需要你的账号或身份。

### 1. 改域名

打开 `config/_default/hugo.toml`，把第一行换掉：

```toml
baseURL = "https://你的域名/"
```

> 部署到 Cloudflare Pages 时可以不改这个文件，改用构建命令的 `-b` 参数动态指定（见下方第 3 节）。但本地预览和 RSS 的自洽性依赖它，建议正式域名确定后就填上。

### 2. 改站点信息

`config/_default/params.toml` 里：

- `[sidebar] subtitle` —— 侧边栏那句话
- `[sidebar] avatar` —— 头像，把图片放到 `static/` 下再填 `/图片名.png`
- `[footer] since` —— 起始年份

左侧导航有三项：**主页 / 搜索 / 归档**。主页直接指向站点根目录（首页就是文章列表）。
其中「搜索」「归档」不写在 `menu.toml` 里，而在各自页面的 front matter（`menu.main`）——
想调顺序就改那两个文件里的 `weight`。

- **「归档」不是链接，是可展开的折叠项**：点一下在下面列出全部文章标题，点标题直接进文章。
  模板在 `layouts/_partials/sidebar/left.html`（覆盖主题，主题的菜单不支持子级），
  开合逻辑在 `custom.ts` 的 `setupArchiveMenu()`。列表取法与首页一致，所以顺序也一致。
- **首页与列表页没有右侧栏**。`params.toml` 里的 `[[widgets.homepage]]` 已整段撤掉
  （原先挂的是「搜索」框与「归档」部件，和左侧导航重复，又正好被右上角的唱片压住）。
  ⚠️ 文章页右侧那个「目录」靠 `[[widgets.page]] type = "toc"`，**不要删**。

侧边栏顶部那个 GitHub 图标指向 `https://github.com/wzg-ui`（配置在 `config/_default/menu.toml`
的 `[[social]]`，外链已设 `newTab = true`）。换地址就改那一行，不想要这个图标就把整块删掉。

### 3. 部署到 Cloudflare Pages

1. 仓库已经建好了：<https://github.com/wzg-ui/blog>（公开）。改完直接推：

   ```bash
   git push
   ```

   > **在 WorkBuddy 会话里推送可能报 `CONNECT tunnel failed, response 502`** ——
   > 那是会话环境注入了本地代理（`http_proxy=127.0.0.1:25705`）导致，不是网络断。
   > 临时绕过：`env -u http_proxy -u https_proxy git push`。

2. 打开 Cloudflare 控制台 → Workers 和 Pages → 创建 → Pages → 连接到 Git
3. 选择本仓库，构建配置填：

   | 字段 | 值 |
   | --- | --- |
   | 框架预设 | Hugo |
   | 构建命令 | `hugo --gc --minify -b "$CF_PAGES_URL"` |
   | 输出目录 | `public` |
   | 环境变量 | `HUGO_VERSION` = `0.167.0` |

4. 保存后自动构建，一两分钟就能访问了

**两个参数都不能省：**

- `HUGO_VERSION` —— Cloudflare 默认装的 Hugo 版本太老，认不出本项目用的 `layouts/_partials/`、`layouts/_shortcodes/` 新目录规范，会直接构建失败。本项目实测版本是 **0.167.0 extended**。
- `-b "$CF_PAGES_URL"` —— 不加的话，构建出来的所有绝对链接都指向 `example.com`，分享卡片、RSS、站内跳转全是坏的。这个变量由 Cloudflare 自动注入，指向当前部署地址。

> **域名备案下来后**，把构建命令里的 `-b` 换成正式域名：`hugo --gc --minify -b "https://你的域名"`。
> 不改的话，用户从正式域名进来后，页面里所有链接又会跳回 `xxx.pages.dev`。

### 4. 起评论和统计（可选）

博客本身是静态的，不配这个也能正常写、正常读。想要评论和访问统计的话，部署配置都在 **`deploy/` 目录**：

```bash
cd deploy
sudo bash setup.sh          # 装 Docker、开 swap、配防火墙
cp .env.example .env && vi .env
docker compose up -d
```

完整步骤、DNS 解析、备份和排错见 **`deploy/README.md`**。

⚠️ 这一步的前提是**域名已经完成 ICP 备案** —— 你的服务器在大陆，评论服务和统计服务的子域名指向它，没备案会被拦截。

---

## 三、Obsidian 写作环境

**把 `content/` 目录作为 Obsidian 的仓库打开**（不是整个 `blog/`）——这样文件列表里只有你的文章，不会混进主题和配置文件。

需要安装这几个社区插件（设置 → 第三方插件 → 浏览）：

| 插件 | 作用 |
| --- | --- |
| **Templater** | 新建文件时自动填好 front matter 骨架 |
| **Obsidian Git** | 一键提交并推送，不用开终端 |
| **Image auto upload Plugin** | 粘贴图片自动上传到图床并回填链接 |
| **Advanced Tables** | 表格自动补全，Tab 跳列 |
| **Latex Suite** | 打 `mk` 展开成 `$$...$$`，写推导提速明显 |

### 图片上传配置

1. 装 [PicGo](https://github.com/Molunerfinn/PicGo/releases)
2. 图床选「阿里云 OSS」，填 AccessKey、Bucket、区域
3. 在 Obsidian 的 Image auto upload 插件里选「PicGo」，上传服务选 PicGo
4. 之后 `Ctrl+V` 粘贴截图，会自动上传并把链接写进正文

> OSS 的 Bucket 记得设成**公共读**，否则图片外链打不开。绑自定义域名的 OSS 需要备案。

---

## 四、本仓库对主题做的改动

主题是内嵌的（`themes/hugo-theme-stack`），下面这些是定制，主题升级时要注意：

| 文件 | 改动 | 为什么 |
| --- | --- | --- |
| `data/external.toml` | KaTeX、PhotoSwipe 改本地路径 | jsdelivr 在国内经常不可达，会导致公式完全不显示 |
| `layouts/_partials/article/components/mermaid.html` | Mermaid 改本地路径 | 同上。主题里这个 CDN 是写死的，只能覆盖整个文件 |
| `layouts/_partials/head/custom-font.html` | 置空 | 原本从 Google Fonts 加载 Lato，国内不稳且不含中文字形。改用系统字体栈，定义在 `assets/css/custom.css` |
| `layouts/home.html` | 新增 | 首页 = 置顶区 + 常规列表。`pinned: true` 的文章钉在最前，且不再出现在下方列表里 |
| `layouts/archives.html` | 覆盖主题 | 去掉归档页顶部的「分类云」（站里不分类，那块本来就是空的） |
| `layouts/_partials/sidebar/left.html` | 覆盖主题 | 把「归档」导航项改成可展开的折叠项（主题的菜单不支持子级）。其余部分与主题一致，升级时对照 diff 一次 |
| `content/posts/_index.md` | `build: render never` | 不再输出 `/posts/` 栏目页 —— 首页已经是文章入口，导航里也没有「文章」 |
| `content/page/_index.md` | `build: render never` | 同理，`content/page/` 只是归档/搜索的容器，不该有自己那个空壳列表页 |
| `layouts/_shortcodes/codegroup.html` 等 | 新增 | 主题没有代码分组，这是自己加的 |
| `static/aplayer/` | 已弃用（留档） | 上一版 APlayer + MetingJS 的自托管资源。2026-10-12 换成自研播放器后**不再加载**，留着备查与许可证 |
| `layouts/_partials/footer/custom.html` | 新增 | 「右上角唱片播放器」+ 页脚「本站已运行」的挂载点，只把 `params.toml` 的 `[music]` 翻成 `data-*` |
| `layouts/_partials/head/custom.html` | 追加统计骨架 | 已撤下 APlayer / MetingJS 的样式与脚本，现在只负责输出 Cloudflare 统计的 beacon |
| `assets/ts/custom.ts` | 追加粒子点阵背景、运行时长计时器、右上角唱片播放器、导航折叠 | canvas 由脚本自己插进 body，模板不用改 |
| `assets/css/custom.css` | 追加整套灰阶配色、背景装饰、卡片整块可点、导航子菜单、唱片播放器样式 | 覆盖主题的 `:root` / `[data-scheme="dark"]` 变量 |

**升级主题的正确姿势**：把新版本解压到 `themes/hugo-theme-stack`，然后逐个确认上表这些文件是否还需要保留（尤其 mermaid 那个），跑一次 `hugo` 看有没有报错。

---

## 五、常见问题

**构建报 `icon 'xxx.svg' is not found`**
主题只内置了 24 个图标。可用的名字在 `themes/hugo-theme-stack/assets/icons/` 里，或者把你自己的 SVG 放进 `assets/icons/`。

**公式显示成一片红色或原始 `$...$` 文本**
检查 `config/_default/markup.toml` 里的 `passthrough` 配置还在。另外确认 `public/katex/` 目录构建后确实存在。

**代码块没有高亮 / 复制按钮不见了**
复制按钮依赖 `.highlight` 结构和 `code[data-lang]` 属性。如果你改了 `layouts/_markup/render-codeblock.html`，注意别把 `<div class="highlight">` 包没了。

**新建的文章不显示**
front matter 里 `draft: true` 的话，生产构建不会输出。本地 `hugo server` 会显示（带草稿标记），想预览生产效果用 `hugo server --disableFastRender -e production`。
