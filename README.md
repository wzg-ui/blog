# 博客仓库

Hugo + Stack 主题。内容以 Markdown 存放，站点是构建产物，部署全自动。

```
blog/
├── config/_default/        站点配置（改标题、域名、菜单、公式开关都在这里）
│   ├── hugo.toml           主配置：域名、语言、永久链接
│   ├── params.toml         主题参数：六个内容区、公式、侧边栏
│   ├── markup.toml         数学公式与代码高亮的渲染规则
│   └── menu.toml           左侧导航菜单
├── content/                ★ 你写的东西全在这里
│   ├── algorithm/          算法竞赛
│   ├── lowlevel/           C 与底层
│   ├── ai/                 AI
│   ├── rust/               Rust
│   ├── math/               数学（下分六个子领域）
│   ├── notes/              随笔
│   └── page/               关于、归档、搜索（固定页面，不用改）
├── layouts/                对本主题的定制
│   ├── _shortcodes/        codegroup —— 代码并排/切换对照
│   ├── _markup/            代码块文件名栏
│   └── _partials/          覆盖主题默认行为（Mermaid 本地化、去 Google Fonts）
├── assets/                 custom.css 与 custom.ts（会被自动打包）
├── static/                 自托管资源：KaTeX / Mermaid / PhotoSwipe
├── themes/hugo-theme-stack 主题本体（内嵌，不用子模块）
└── .github/workflows/      每次 push 自动构建检查
```

---

## 一、写作流程

### 新建一篇文章

在 `content/` 下对应的领域目录里新建 `.md` 文件即可，**文件名就是 URL**。

```
content/math/linear-algebra/eigenvalue.md
  → https://你的域名/math/linear-algebra/eigenvalue/
```

**文件名请用英文小写加连字符**（`segment-tree.md` 而不是 `线段树.md`），否则 URL 里会出现一长串 `%E7%BA%BF%E6%AE%B5%E6%A0%91`。

### 文章开头的字段

```yaml
---
title: "线段树维护区间和"          # 显示用标题，可以写中文
date: 2026-10-12                   # 首次发布日期
slug: "segment-tree-range-sum"     # 可选，不写则用文件名
description: "一句话摘要，会用于 SEO 和分享卡片"
categories:
    - 算法竞赛                      # 领域分类，和目录保持一致
tags:
    - 线段树                        # 标签随便加
---
```

字段后面空一行，再写 `<!--more-->`，这之前的内容会作为列表页的摘要。

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

---

## 二、必须自己去做的三件事

这三件我做不了，需要你的账号或身份：

### 1. 改域名

打开 `config/_default/hugo.toml`，把第一行换掉：

```toml
baseURL = "https://你的域名/"
```

### 2. 改站点信息

`config/_default/params.toml` 里：

- `[sidebar] subtitle` —— 侧边栏那句话
- `[sidebar] avatar` —— 头像，把图片放到 `static/` 下再填 `/图片名.png`
- `[footer] since` —— 起始年份

`config/_default/menu.toml` 里的 GitHub 地址也要换成你自己的。

### 3. 部署到 Cloudflare Pages

1. 把本仓库推到 GitHub（私有仓库也可以）
2. 打开 Cloudflare 控制台 → Workers 和 Pages → 创建 → Pages → 连接到 Git
3. 选择本仓库，构建配置填：

   | 字段 | 值 |
   | --- | --- |
   | 框架预设 | Hugo |
   | 构建命令 | `hugo --gc --minify` |
   | 输出目录 | `public` |
   | 环境变量 | `HUGO_VERSION` = `0.167.0` |

4. 保存后自动构建，一两分钟就能访问了

`HUGO_VERSION` 这一项**一定要填**。Cloudflare 默认装的 Hugo 版本可能不满足本主题要求（需要 ≥ 0.157 且必须是 extended 版）。

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

主题是内嵌的（`themes/hugo-theme-stack`），下面这四处是定制，主题升级时要注意：

| 文件 | 改动 | 为什么 |
| --- | --- | --- |
| `data/external.toml` | KaTeX、PhotoSwipe 改本地路径 | jsdelivr 在国内经常不可达，会导致公式完全不显示 |
| `layouts/_partials/article/components/mermaid.html` | Mermaid 改本地路径 | 同上。主题里这个 CDN 是写死的，只能覆盖整个文件 |
| `layouts/_partials/head/custom-font.html` | 置空 | 原本从 Google Fonts 加载 Lato，国内不稳且不含中文字形。改用系统字体栈，定义在 `assets/css/custom.css` |
| `layouts/_shortcodes/codegroup.html` 等 | 新增 | 主题没有代码分组，这是自己加的 |

**升级主题的正确姿势**：把新版本解压到 `themes/hugo-theme-stack`，然后逐个确认上表这四个文件是否还需要保留（尤其 mermaid 那个），跑一次 `hugo` 看有没有报错。

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
