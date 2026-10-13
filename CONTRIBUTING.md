# 给 blog.piemm.net 投稿

这个站是个人博客，用 Hugo 搭的，源码全部公开在仓库里。**投稿走 GitHub**，具体两种方式，按你的习惯选。

---

## 方式一：只提 Issue（推荐第一次用这个）

打开 **[New issue](https://github.com/wzg-ui/blog/issues/new/choose)**，选「投稿文章」，按表单填。

表单里要写的东西不多：

| 填什么 | 说明 |
|---|---|
| 文章标题 | 站上显示的标题，别带书名号和日期 |
| 文件路径 | 放在 `content/posts/` 下的位置，命名规则见下 |
| 一句话简介 | 30 字以内，会放进 description 和搜索结果 |
| 正文草稿 | 完整正文，或者只给大纲，细节在 Issue 里一起敲 |

提完我看到就会动手。**正文还没写完也照样提**，大纲先聊起来比闷头写完再发有用。

---

## 方式二：直接发 Pull Request

会 git 的话更直接：

```bash
git clone https://github.com/wzg-ui/blog.git
cd blog
hugo server          # 本地预览
```

新建文件 `content/posts/你的文件名.md`，写完提交、开 PR。

⚠️ **推送前务必先构建一次**，确认没报错：

```bash
hugo --minify --gc
```

有报错先解决，别把坏掉的构建推上来。

---

## 命名规则

文件名直接就是 URL，所以要跟文章标题脱钩：

| 规则 | 例子 |
|---|---|
| 英文小写 | ✅ `reverse-basics.md` |
| 词间用连字符 | ✅ `two-setbacks.md` |
| 不用中文文件名 | ❌ `逆向基础.md` |
| 标题里不写日期 | ❌ `2026-10-14 逆向基础` ❌ |

放在子目录也行，和现有文章保持一致：

```
content/posts/programming/programming-languages.md   ← 带目录
content/posts/site-launch.md                        ← 不带目录
```

---

## 文章格式

正文区在 `content/posts/`，不分类、不打标签（站上只有一栏文章）。

front matter 最小可用版本：

```yaml
---
title: "你的标题"
date: 2026-10-14T15:30:00+08:00
slug: "your-slug"
description: "一句话简介，30 字以内"
---
```

几个约定：

- **正文中文，术语留英文**，中英文之间加空格
- **`date` 写定稿时刻**，精确到分钟，不是创建草稿的时间
- **标题不写日期**，显示日期由 `date` 字段决定
- 新文章默认 `draft: true`，定稿了改成 `false` 或直接提 Issue 让我改

### 现成的骨架

仓库里有两个 archetype：

| 文件 | 用途 |
|---|---|
| `archetypes/default.md` | 结论 + 推导的结构，适合技术向 |
| `archetypes/notes.md` | 随笔，五段式 |

生成新文章：

```bash
hugo new posts/your-slug.md             # 默认骨架
hugo new posts/your-slug.md --kind notes  # 随笔骨架
```

---

## 写作上的几条约定

不是规定，是这个站的取向，不合你的话在 Issue 里说：

1. **挂不上自己踩过的坑，就先别写**。读者要的是「你真的遇到过」，不是百科定义。
2. **别只写结论**，写你怎么想到的、卡在哪、后来怎么解决的。
3. **不确定的就说不确定**，标出来。博客不是文档，不需要装作什么都知道。
4. 代码块标明语言（```cpp / ```py），不然不高亮。

---

## 别的

- **评论和讨论**在每篇文章底下的评论区，GitHub 账号登录即可
- **发现站点 bug** 也提 Issue，选「站点问题或建议」

有问题随时开 Issue 问我。