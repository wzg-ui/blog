# 正文插图都放这儿

图片文件丢在这个目录下，正文里用短代码引用：

```markdown
{{< img src="/images/xxx.png" >}}
{{< img src="/images/xxx.png" caption="图注" >}}
{{< img src="xxx.png" >}}
```

- `src` 以 `/` 开头 = 从 `static/` 根算，即 `/images/xxx.png`
- 不带 `/` = 简写，自动补成 `/images/xxx.png`
- `caption` 可选，填了就渲染成图注（居中、小字、二级色）

文件名用英文小写加连字符（`stack-paginator-bug.png`），别用中文和空格 ——
中文名在某些服务器与浏览器组合下会拿到 404。

⚠️ **不要把图片放在 `content/posts/` 里**。本项目的主题不触发 Hugo 的图片处理链
（`Processed images` 恒为 0），放在那边图片既不缩放也不跟随文章，相对路径会直接 404。
原因写在 `layouts/_shortcodes/img.html` 的注释里。