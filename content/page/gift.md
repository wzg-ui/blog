---
title: "给你的"
slug: "gift"
url: "/gift/"
description: "三道题，答对了就打开。"
layout: "gift"

# 时间窗：到点自动放行，过期整页下线；侧栏入口用同一对时间戳控制显隐
# （见 layouts/_partials/sidebar/left.html 和 custom.ts 的 setupGiftMenu）。
unlockAt: "2026-11-23T00:00:00+08:00"
expireAt: "2026-11-30T23:59:59+08:00"

lead: "三道题，都是关于我的"

# 题干上方那行小字。别写成提示答案的话。
note: "答对了才往下走"

# 每题 text 是题干，hint 是题干下面那行小字（格式提示，可以不给）。
questions:
    - text: "我的农历生日是几月几号"
      hint: "写成 10.15 这样就行"
    - text: "我属什么"
      hint: "只填属相本身，一个字"
    - text: "我的名字里最后一个字是什么"
      hint: "只填那一个字"

gift:
    # 由 .workbuddy/scripts/make_gift.mjs --answers answers.json 生成 ——
    # 三道题的答案规范化后首尾相接取 SHA-256。
    # ⚠️ 只存哈希，不存答案。仓库公开，明文入库等于把答案贴在门上。
    answersHash: "fc5ab00040f41eed2cc84d553dcb1cf348afe2a848da0c3f677521ad12dd3845"

sitemap:
    disable: true
robots:
    disable: true
---

<!--
  这个文件本身不产出正文 —— layouts/gift.html 把 main 整块接管了。
  信在 content/page/gift-letter.md，明文，改字直接改。

  ⚠️ 改题目或答案后必须重跑：
      printf '%s\n' '["答案1", "答案2", "答案3"]' > .workbuddy/answers.json
      node .workbuddy/scripts/make_gift.mjs --answers .workbuddy/answers.json
  把输出的 answersHash 贴回上面的 gift 段。
-->
