---
title: "给你的"
slug: "letter"
url: "/gift/letter/"
description: ""
layout: "gift-letter"

unlockAt: "2026-10-15T00:00:00+08:00"
expireAt: "2026-10-16T00:00:00+08:00"

subtitle: "拆开看看"
signature: "PIEMM"

gift:
    # 这一页**不需要** answersHash —— 校验发生在答题页。
    # 这里只存正文密文，密码是「五个答案拼成的那个串」。
    pbkdf2Iterations: 120000
    cipher: "jYxtprJdFt2duYLqdKE6u7woySnAf9dtQ+vDa3wlywDEMpMNzvvrLN3bpl7tU5Wm2wlqaSAdMsrystairEn3tRlwcIm+g7UekvqoA/MbOIjvnmdjQN2A0w1y55NLnRtcGv6becLEsGCcJkC5w0aH146kP0xO7VutztUrkCclCsyvB3hzHk1vFbkKNEpgmf+Ht9DFRKOI2h/s7dLDdcdfazGC0EbBIeZSWrZgMkGZ7FJndE2hYO+E6QZNfQfB9XwSxal3OJT0wG5616K0LStYlNcDCTLnJ0FZgnY8t9WqVb5J2nHmGhy6PfcAs+vkO58="

sitemap:
    disable: true
robots:
    disable: true
---

<!--
  表演页：粒子聚心 → 烟花 → 信封 → 正文。
  正文是上面 cipher 里的密文，用「五个答案拼成的那个串」在浏览器里解开。
  换答案 / 换正文都要重跑 make_gift.mjs，然后把新的 gift 段贴回来
  （答案哈希不用往这里贴 —— 校验发生在答题页）。
-->