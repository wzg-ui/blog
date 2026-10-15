# 正文插图都放这儿

图片文件丢在这个目录下，正文里用 **Markdown 标准语法**引用：

```markdown
![图注文字](/images/xxx.jpg)
![](/images/xxx.jpg)
```

- 路径**必须以 `/images/` 开头**（从 `static/` 根算），且**必须带前导斜杠**
- 图注文字（`[]` 里的内容）就是 `alt`，图挂不上时会显示它，建议写
- 想要**图注**（显示在图下方的小字）用短代码，见下

文件名用英文小写加连字符（`stack-paginator-bug.png`），别用中文和空格 ——
中文名在某些服务器与浏览器组合下会拿到 404。

⚠️ **不要把图片放在 `content/posts/` 里**。本项目的主题不触发 Hugo 的图片处理链
（`Processed images` 恒为 0），放在那边图片既不缩放也不跟随文章，相对路径会直接 404。
原因写在 `layouts/_shortcodes/img.html` 的注释里。

---

## 为什么用 Markdown 语法而不是短代码

早先统一要求写 `{{< img src="xxx.jpg" >}}` 短代码。现在**正文改用 Markdown 语法**，
原因是短代码在 **VS Code 的 Markdown 预览里不会被渲染**，只会显示成一行裸文本，
写文章时看不到图。

实测结论（2026-10-15）：两种写法在站点上**都能正常显示**。
Markdown 语法 Hugo 会输出 `<p><img alt loading="lazy" sizes src></p>`，
正好命中 `custom.css` 里`.article-content > p > img` 的规则
（撑满正文宽 + 6px 圆角 + 去掉行内基线间隙），懒加载也是主题自动加的。

⚠️ **Markdown 语法唯一丢掉的是图注（caption）** —— 它没法生成 `<figure>` + `<figcaption>`。
需要图注的那一张仍用短代码：

```markdown
{{< img src="/images/xxx.jpg" caption="图注" >}}
```

两种混用没问题，样式不会打架。

---

## 编辑器预览能加载到图的原因

仓库根的 `images/` 是指向 `static/images/` 的**目录联接**（junction，本机才有，不入库）：

```bash
cmd //c "mklink /J images static\images"
```

VS Code 预览把 `/images/xxx.jpg` 解析到仓库根，靠这个联接找到图。
重建命令在 `.gitignore` 的注释里也有记录。

⚠️ 联接删掉不影响站点（图片真身在 `static/images/`），但预览会重新裂图。

---

## ⚠️ 想看真实渲染效果，还是得起 Hugo server

VS Code 预览是markdown 渲染，不是站点渲染，两者不完全等价
（主题的图片处理、图注、懒加载策略都只有 site 里才准）：

```bash
./tools/hugo/hugo.exe server --port 1313 --buildDrafts --buildFuture
```

浏览器开 <http://localhost:1313/>。

⚠️ 草稿必须加 `--buildDrafts --buildFuture` 才看得到；
文章路径带 section 分目录，是 `/posts/<section>/<slug>/`，不是 `/posts/<slug>/`。
⚠️ **启动 server 和截图必须写在同一条 bash 命令里** ——
server 随命令结束被回收，分两条必然 `ERR_CONNECTION_REFUSED`。

### 写文章时的实际流程

1. 图放进 `static/images/`
2. 正文写 `![图注](/images/xxx.jpg)`
3. VS Code 预览能粗看；要确认最终样式 → 起 server 看 `localhost:1313`
