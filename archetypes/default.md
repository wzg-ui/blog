---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
date: {{ .Date }}
draft: true
slug: "{{ .File.ContentBaseName }}"
description: ""
# 站里没有分类、也没有标签（hugo.toml 已 disableKinds = ["taxonomy", "term"]），
# 别再加 categories / tags —— 加了不报错，但什么用都没有。
# date 由 Hugo 自动填成精确到秒的时间戳，列表页显示到分钟，不要手改成纯日期。
# 想让这篇文章钉在首页最上面，加一行 `pinned: true`（不加就是普通文章）；
# 置顶区内部按 weight 升序排，weight 不写就按日期倒序。
---

<!--more-->

## 结论


## 推导
