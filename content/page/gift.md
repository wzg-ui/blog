---
title: "给你的"
slug: "gift"
url: "/gift/"
description: "四道题，答对了就打开。"
layout: "gift"

# 时间窗：到点自动放行，过期整页下线；侧栏入口用同一对时间戳控制显隐
# （见 layouts/_partials/sidebar/left.html 和 custom.ts 的 setupGiftMenu）。
unlockAt: "2026-11-23T00:00:00+08:00"
expireAt: "2026-11-23T23:59:59+08:00"

lead: "四道题，你和我各填一栏"

# 题干上方那行小字。别写成提示答案的话。
note: "答对了才往下走"

# 每道题两个框，左「你」右「我」——顺序固定在数组里，别调换，
# 哈希是按「你我、你我……」的 DOM 顺序接起来算的。
pair: ["你", "我"]

# 每题 text 是题干，hint 是题干下面那行小字（格式提示，可以不给）。
questions:
    - text: "农历生日，几月几号"
      hint: "写成 10.15 这样"
    - text: "属什么"
      hint: "只填属相，一个字"
    - text: "名字里的最后一个字"
      hint: "各填一个字"
    - text: "今年多大，周岁"
      hint: "填数字"

gift:
    # 由 .workbuddy/scripts/make_gift.mjs --answers answers.json 生成 ——
    # 四道题、每道两个框，八个答案规范化后按 DOM 顺序首尾相接取 SHA-256。
    # ⚠️ 只存哈希，不存答案。仓库公开，明文入库等于把答案贴在门上。
    answersHash: "ad0299684cf133933e7f53cbe81473f7807cc93225324b8efe00fc9df820da81"

sitemap:
    disable: true
robots:
    disable: true
---

<!--
  这个文件本身不产出正文 —— layouts/gift.html 把 main 整块接管了。
  信在 content/page/gift-letter.md，明文，改字直接改。

  ⚠️ 改题目或答案后必须重跑：
      printf '%s\n' '["你1", "我1", "你2", "我2", "你3", "我3", "你4", "我4"]' > .workbuddy/answers.json
      node .workbuddy/scripts/make_gift.mjs --answers .workbuddy/answers.json
  把输出的 answersHash 贴回上面的 gift 段，然后删掉 answers.json。
-->
