---
title: "Special Gift"
slug: "gift"
url: "/gift/"
description: "五个问题。全部答对，才会打开。"
layout: "gift"

# 时间锁：解锁前只显示倒计时，到点自动放行；过期后整个页面下线。
# 侧栏那个入口用同一对时间戳控制显隐（见 layouts/_partials/sidebar/left.html）。
unlockAt: "2026-10-15T00:00:00+08:00"
expireAt: "2026-10-16T00:00:00+08:00"

lead: "来看看能不能 Get 到我的问题"

# 这一行显示在题干上方。别删 —— 五个答案都是英文，没提示她会卡在中文题上。
note: "提示：五个答案都是英文"

# 五道题，只用来提示，**不输入**。
# 把五个答案按顺序拼成**一个字符串**，用一对大括号括起来填进下面的框。
# 大小写、空格、逗号、顿号、有没有大括号都不影响判定 —— 判定前会全部规范化。
# ⚠️ 这里没有答案 —— 只有拼串后的 SHA-256 存在 gift.answersHash。
questions:
    - "最喜欢的明星（打一歌手）"
    - "最近在听（打一歌名）"
    - "请 PIEMM 喝奶茶（打一品牌）"
    - "PIEMM 不懂英语（打一单词 1）"
    - "PIEMM 不懂英语（打一单词 2）"

# 输入框里那个占位符怎么写。**纯格式示例**，不要填真答案 —— 那是剧透。
placeholder: "{ 你的五个答案，用空格隔开 }"

gift:
    # 由 .workbuddy/scripts/make_gift.mjs --answers answers.json 生成
    # —— 五个答案规范化后首尾相接取 SHA-256。
    # ⚠️ 只存哈希，不存答案。仓库公开，明文入库等于把答案贴在门上。
    answersHash: "ac660d52a902a10b90ef9c4ad3c07041c2f7b13e2b0d6acdfe3d94f7a43bfd60"

# 不进 sitemap / 不被索引：这个页面存在的意义就是「不让人提前找到」。
sitemap:
    disable: true
robots:
    disable: true
---

<!--
  这个文件本身不产出正文 —— layouts/gift.html 把 main 整块接管了。

  ⚠️ 改答案后**必须**重跑下面这条，把新的 answersHash 贴回上面的 gift 段：
      printf '%s\n' '["答案1", "答案2", "答案3", "答案4", "答案5"]' > .workbuddy/answers.json
      node .workbuddy/scripts/make_gift.mjs --answers .workbuddy/answers.json

  ⚠️ placeholder 只是给人看的示例，**改成她不会写的答案就等于剧透**。

  正文在 gift-letter.md，明文，没有加密 —— 改字直接改，不用跑任何脚本。
-->
