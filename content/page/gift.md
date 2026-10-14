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

# 五道题。答案不在这里 —— 只有拼接后的 SHA-256 存在 gift.answersHash。
# 顺序即拼接顺序，改动这里的顺序会让已发出的哈希全部失效。
questions:
    - "最喜欢的明星（打一歌手）"
    - "最近在听（打一歌名）"
    - "请 PIEMM 喝奶茶（打一品牌）"
    - "PIEMM 不懂英语（打一单词 1）"
    - "PIEMM 不懂英语（打一单词 2）"

gift:
    # 由 .workbuddy/scripts/make_gift.mjs 生成 —— 五个答案规范化后拼串取 SHA-256。
    # ⚠️ 只存哈希，不存答案。仓库公开，明文入库等于把答案贴在门上。
    answersHash: "3c7e46fe7cc619c84fe69f92c6b10260d3b99c7fb6c46d0e2a57f6858ee789f6"

# 不进 sitemap / 不被索引：这个页面存在的意义就是「不让人提前找到」。
sitemap:
    disable: true
robots:
    disable: true
---

<!--
  这个文件本身不产出正文 —— layouts/gift.html 把 main 整块接管了。

  ⚠️ 改答案后**必须**重跑下面这条，把新的 answersHash 贴回上面的 gift 段：
      node .workbuddy/scripts/make_gift.mjs .workbuddy/gift-plain.md 答案1 答案2 答案3 答案4 答案5

  正文在 gift-letter.md，明文，没有加密 —— 改字直接改，不用跑任何脚本。
-->