---
title: "页面"

# content/page/ 只是「搜索」「归档」这两个页面的容器目录，
# 它自己那个列表页（/page/）没有导航入口、也没有内容，
# 之前一直靠 sitemap 才被看见，页顶还会多出一行「章节」。
# 和 content/posts/_index.md 同理，直接不生成。
# 不影响子页面：/search/ 与 /archives/ 照常。
build:
  render: never
  list: never
---
