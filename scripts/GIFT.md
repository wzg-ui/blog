# 生日动画

正式入口是 `/gift/` 答题。提交成功后在同一文档中展开演出，地址更新为 `/gift/letter/`，
保留提交按钮或回车操作授予的音频播放权限，因此正常答题流程无需再点“开启音乐”。
答错时不播放音乐。直接打开或刷新 `/gift/letter/` 时，仍可能需要浏览器允许播放的首次点击。

| 时间 | 画面 |
| --- | --- |
| 0–9 秒 | 彩色小窗口沿曲线依次围出爱心 |
| 9–12 秒 | 展示完整爱心 |
| 12–13.5 秒 | 爱心淡出，祝福窗口开始出现 |
| 13.5–20.5 秒 | 祝福窗口逐渐铺满屏幕 |
| 20.5–41 秒 | 祝福淡出，星空蛋糕、烛火、星环与星屑出现 |
| 41–44 秒 | 蛋糕淡出，接到原有信封与正文 |

右上角可跳过动画，结束后可重播；Esc 跳到信封。切到后台暂停动画，回来继续。
系统启用“减少动态效果”时直接显示信封。浏览器没有 Canvas 时也能打开信。

动画配乐是歌单中的《还是分开》（张叶蕾），播放 00:30–01:14。
信封出现后继续播放第一首；等待打开期间循环这个片段，音乐按钮仍可使用。
点开信封时切到《Young for you》（李金艳版），从头播放，音量略降低以便读信。
两首歌使用站点现有的网易云音频接口，歌曲 ID 和片段范围写在信件 front matter 的 `giftMusic` 中。
自动播放受限时点击右上角“开启音乐”；可以关闭音乐，重播会保留这个选择。
切到后台时音乐和动画一起暂停，跳过动画也继续播放第一首；时间过期时所有音乐停止。
网络或音源失败时可点击“重试音乐”，动画和信件仍可继续查看。

## 修改位置

- `assets/ts/gift-show.ts`：时间线、配色、心形和窗口布局；每次播放重新打乱文案，单个场景内不重复。爱心和满屏祝福各自的最后一张固定为“生日快乐”。
- `assets/ts/gift-messages.ts`：280 条短祝福，每条不超过七个字，适合手机窗口。
- `assets/ts/gift-cake.ts`：Canvas 蛋糕及星光；静态纹理只生成一次。
- `assets/ts/gift-audio.ts`：音频播放、静音、后台暂停及重播同步。
- `assets/css/custom.css`：弹窗外观、控制按钮，以及原有信封样式。
- `layouts/gift-letter.html`：演出容器、信封和正文。
- `layouts/_partials/gift/stage.html`：答题页与独立演出页共用的舞台，答题完成前隐藏。
- `content/page/gift-letter.md`：原有信件内容和正式开放日期。

演出直接计算连续心形坐标，不再读取旧版 `static/gift/fx.json` 的栅格数据。
旧文件保留，但无需运行 WorkBuddy 的 Python 生成器。

## 本地预览

```powershell
node scripts/preview-gift.mjs
```

打开 http://127.0.0.1:1331/gift/letter/ 。脚本将站点构建到 `build-preview/codex-gift/`，
仅修改该目录中生成的 HTML 的时间窗，不改源文件和 `public/`。改完源文件后重新启动脚本。
此预览目录用于本机查看，正式发布仍使用正常 Hugo 构建得到的 `public/`。

## 验证

```powershell
node scripts/verify-gift.mjs
node scripts/verify-gift.mjs --real-time
```

测试使用真实 Chrome 检查桌面、手机、旋转屏幕、320px 宽度、完整动画、信封正文、
重播、跳过、减少动态效果和生日时间锁。加 `--real-time` 另检查真实 44 秒的阶段推进。
只在测试浏览器中模拟生日当天，不改正式日期。截图写入被 Git 忽略的 `shots/gift-combined/`。

Windows 默认使用已安装的 Google Chrome；其他路径可通过 `CHROME_PATH` 环境变量指定。
旧 `.workbuddy/scripts/verify_gift.mjs` 针对旧粒子数据与旧时间线，不适用于当前演出。
