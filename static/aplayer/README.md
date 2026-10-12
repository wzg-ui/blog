# 音乐播放器资源（自托管）

这个目录是背景音乐播放器的全部依赖，**故意不从 CDN 加载**。

## 里面是什么

| 文件 | 版本 | 来源 |
| --- | --- | --- |
| `APlayer.min.css` | 1.10.1 | [DIYgod/APlayer](https://github.com/DIYgod/APlayer)（MIT） |
| `APlayer.min.js` | 1.10.1 | 同上 |
| `Meting.min.js` | 2.0.2 | [metowolf/MetingJS](https://github.com/metowolf/MetingJS)（MIT） |

许可证原文在 `LICENSE-APlayer.txt` 与 `LICENSE-MetingJS.txt`。

## 为什么不挂 CDN

本机实测 `cdn.jsdelivr.net` SSL 握手失败，和 KaTeX、Mermaid、PhotoSwipe 的处理方式一致 —— 挂了页面上的脚本会直接不加载，播放器静默消失，排查时很难看出原因。

## 升级方式

不要手改这三个文件，重新从 npm 拉一份覆盖：

```bash
npm pack aplayer meting --registry=https://registry.npmmirror.com
tar -xzf aplayer-*.tgz && tar -xzf meting-*.tgz
cp package/dist/APlayer.min.css package/dist/APlayer.min.js ./static/aplayer/
cp package/dist/Meting.min.js ./static/aplayer/
```

## ⚠️ API 选型：只有 injahow 能用

MetingJS 只是前端，歌单数据靠一个第三方 API 转发。本项目实测结果（2026-10-12）：

| API | 元数据（歌名 / 封面 / 歌词） | 音频直链 |
| --- | --- | --- |
| `api.injahow.cn/meting/` | ✅ 正常，200 首 | ✅ HTTP 200，`audio/mpeg` |
| `api.i-meto.com/meting/api` | ✅ 正常 | ❌ 所有平台均返回「服务器未知异常」 |
| `meting.qjqq.cn` | ❌ HTTP 522 | — |

**所以 `params.toml` 里的 `api` 不要随手换成别的。** 如果哪天 injahow 也挂了，换个地址即可：

```toml
api = "https://你的新地址/?server=:server&type=:type&id=:id"
```

`server` / `type` / `id` 三个占位符必须原样保留，MetingJS 会把它们替换掉。

## 字段名兼容性

MetingJS v2 读的是 `name` / `artist` / `url` / `pic` / `lrc` 这五个字段，injahow 返回的正好是这五个。换 API 时先确认字段名对得上，否则播放器会出现空白条目。

## 想彻底不要第三方依赖

改成放本地音频：把 mp3 丢进这个目录，在 `params.toml` 里把播放器改成 `<audio>` 直出，或者把歌单 JSON 生成为本地文件。这条路最稳，代价是要自己准备音频。
