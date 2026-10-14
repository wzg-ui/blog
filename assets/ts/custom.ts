/**
 * 自定义脚本
 *
 * 放在 assets/ts/custom.ts 会被 Stack 自动打包（主题会检测这个文件），
 * 因此不需要额外引入任何资源。
 *
 * 目前有四块：
 *   1. codegroup 短代码的标签页切换
 *   2. 粒子点阵背景
 *   3. 页脚的「本站已运行」计时器
 *   4. 右上角的黑胶唱片播放器
 */

function activateCodeGroup(group: Element, targetId: string) {
    group.querySelectorAll('.codegroup__tab').forEach((tab) => {
        const on = tab.getAttribute('data-codegroup-target') === targetId;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.setAttribute('tabindex', on ? '0' : '-1');
    });
    group.querySelectorAll('.codegroup__panel').forEach((panel) => {
        panel.classList.toggle('is-active', panel.id === targetId);
    });
}

function setupCodeGroups() {
    const groups = document.querySelectorAll('.codegroup');
    if (!groups.length) return;

    groups.forEach((group) => {
        const tabs = group.querySelectorAll('.codegroup__tab');
        if (!tabs.length) return;

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-codegroup-target');
                if (target) activateCodeGroup(group, target);
            });
        });

        // 左右方向键切换，键盘可操作
        const bar = group.querySelector('.codegroup__tabs');
        if (bar) {
            bar.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                event.preventDefault();
                const list = Array.from(tabs);
                const current = list.findIndex((t) => t.classList.contains('is-active'));
                const next = event.key === 'ArrowRight'
                    ? (current + 1) % list.length
                    : (current - 1 + list.length) % list.length;
                const target = list[next].getAttribute('data-codegroup-target');
                if (target) {
                    activateCodeGroup(group, target);
                    (list[next] as HTMLElement).focus();
                }
            });
        }
    });

    // 通过 #cg-3-1 这类锚点直达时，自动切到对应面板
    const hash = window.location.hash.slice(1);
    if (hash) {
        const panel = document.getElementById(hash);
        if (panel && panel.classList.contains('codegroup__panel')) {
            const group = panel.closest('.codegroup');
            if (group) activateCodeGroup(group, hash);
        }
    }
}

/* ============================================================
   粒子点阵背景
   ------------------------------------------------------------
   canvas 由脚本自己插进 body，不依赖任何模板改动。
   层级相关的样式在 assets/css/custom.css 的「粒子点阵背景」一节。

   几个刻意的处理：
   · 粒子数量按视口面积算，最多 70 个 —— O(n²) 连线，再多会掉帧
   · devicePixelRatio 上限压到 2，4K 屏不至于画 4 倍像素
   · 标签页切到后台就停掉 rAF，不在看不见的地方烧 CPU
   · 系统开启「减少动态效果」时只画一帧静态点阵
   · 只在深色主题下绘制，切到亮色立即停掉（学 haxo：它的粒子层是夜间专属）
   ============================================================ */

type Scheme = 'light' | 'dark';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

const BG_CANVAS_ID = 'bg-particles';
const LINK_DISTANCE = 132;
const CURSOR_RADIUS = 150;
const DENSITY = 26000;
const MIN_PARTICLES = 18;
const MAX_PARTICLES = 70;
const DRIFT = 0.26;

/* 配色改成无彩色之后，粒子也去掉色相，改用冷白。
   亮色下不绘制，所以这里只需要一套颜色。 */
const DOT_COLOR = 'rgba(255, 255, 255, 0.50)';
const LINE_COLOR = 'rgba(255, 255, 255, 0.14)';

function readScheme(): Scheme {
    return document.documentElement.dataset.scheme === 'dark' ? 'dark' : 'light';
}

function setupParticleBackground() {
    if (document.getElementById(BG_CANVAS_ID)) return;

    const canvas = document.createElement('canvas');
    canvas.id = BG_CANVAS_ID;
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        canvas.remove();
        return;
    }

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frame = 0;
    let cursorX = -9999;
    let cursorY = -9999;

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.max(
            MIN_PARTICLES,
            Math.min(MAX_PARTICLES, Math.round((width * height) / DENSITY)),
        );
        particles = [];
        for (let i = 0; i < count; i += 1) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * DRIFT,
                vy: (Math.random() - 0.5) * DRIFT,
            });
        }
    };

    const render = () => {
        ctx.clearRect(0, 0, width, height);

        // 亮色下不绘制。清空是必须的 —— 从深色切过来时上一帧还留在画布上。
        if (readScheme() !== 'dark') return;

        if (!still) {
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x <= 0 || p.x >= width) p.vx *= -1;
                if (p.y <= 0 || p.y >= height) p.vy *= -1;
            }
        }

        ctx.lineWidth = 0.6;

        for (let i = 0; i < particles.length; i += 1) {
            const a = particles[i];

            for (let j = i + 1; j < particles.length; j += 1) {
                const b = particles[j];
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                if (dist > LINK_DISTANCE) continue;
                ctx.strokeStyle = LINE_COLOR;
                ctx.globalAlpha = 1 - dist / LINK_DISTANCE;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }

            const cursorDist = Math.hypot(a.x - cursorX, a.y - cursorY);
            if (cursorDist < CURSOR_RADIUS) {
                ctx.strokeStyle = LINE_COLOR;
                ctx.globalAlpha = (1 - cursorDist / CURSOR_RADIUS) * 0.9;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(cursorX, cursorY);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = DOT_COLOR;
        for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    const loop = () => {
        render();
        frame = window.requestAnimationFrame(loop);
    };

    const start = () => {
        if (!frame) frame = window.requestAnimationFrame(loop);
    };
    const stop = () => {
        if (frame) {
            window.cancelAnimationFrame(frame);
            frame = 0;
        }
    };

    /* 该不该转。三个条件里任何一个不成立就停：
       亮色（看不见）、系统要求减少动态效果、页面切到后台。 */
    const shouldRun = () =>
        readScheme() === 'dark' && !still && !document.hidden;

    const sync = () => {
        if (shouldRun()) start();
        else stop();
    };

    resize();
    render();

    if (!still) {
        sync();

        document.addEventListener('visibilitychange', sync);

        window.addEventListener(
            'mousemove',
            (event: MouseEvent) => {
                cursorX = event.clientX;
                cursorY = event.clientY;
            },
            { passive: true },
        );

        window.addEventListener('mouseleave', () => {
            cursorX = -9999;
            cursorY = -9999;
        });
    }

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            resize();
            render();
        }, 180);
    });

    // 切主题时两件事都要做：重画（render），以及决定还转不转（sync）
    new MutationObserver(() => {
        render();
        sync();
    }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-scheme'],
    });
}

/* ============================================================
   页脚「本站已运行」计时器
   ------------------------------------------------------------
   起始时刻不写在这里，而是写在 config/_default/params.toml 的
   footer.customText 里，通过 <span data-since="..."> 传进来 ——
   改上线时间只需要改配置，不用回来动脚本。

   几个刻意处理：
   · 只更新 textContent，不碰 innerHTML，省掉每秒一次的重排解析
   · 页面切到后台就 clearInterval，回到前台先补画一次再重新起表，
     这样切回来不会显示过期的时间，也不会为了追帧去补算
   · 数字用等宽数字（tabular-nums，见 custom.css），
     否则每秒进位的位数变化会让整行左右抖
   ============================================================ */

const RUNTIME_TICK_MS = 1000;

function setupSiteRuntime() {
    const el = document.getElementById('site-runtime');
    if (!el) return;

    const since = new Date(el.dataset.since ?? '');
    if (Number.isNaN(since.getTime())) return;

    const pad = (n: number) => String(n).padStart(2, '0');

    const paint = () => {
        const totalSeconds = Math.max(0, Math.floor((Date.now() - since.getTime()) / 1000));
        const days = Math.floor(totalSeconds / 86400);
        const rest = totalSeconds % 86400;
        el.textContent =
            `${days} 天 ${pad(Math.floor(rest / 3600))}:${pad(Math.floor((rest % 3600) / 60))}:${pad(rest % 60)}`;
    };

    paint();

    let timer = window.setInterval(paint, RUNTIME_TICK_MS);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            window.clearInterval(timer);
            timer = 0;
        } else if (!timer) {
            paint();
            timer = window.setInterval(paint, RUNTIME_TICK_MS);
        }
    });
}

/* ============================================================
   左侧导航：可展开的「归档」
   ------------------------------------------------------------
   模板（layouts/_partials/sidebar/left.html）已经把「归档」渲染成一个
   带 <ol class="menu-children"> 的折叠项，这里只负责开合与无障碍属性。

   为什么不用 <details>：得跟旁边导航项长得一模一样，
   <details>/<summary> 自带三角标记和默认样式，压起来比重写还麻烦。
   ============================================================ */

function setupArchiveMenu() {
    const folder = document.querySelector<HTMLElement>('#main-menu .menu-item--folder');
    const btn = folder?.querySelector<HTMLButtonElement>('.menu-folder');
    if (!folder || !btn) return;

    const setOpen = (open: boolean) => {
        folder.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    // 初始态由模板写死（aria-expanded="false"），这里同步一次，避免两边说法不一致
    setOpen(false);

    btn.addEventListener('click', () => {
        setOpen(!folder.classList.contains('is-open'));
    });
}

/* ============================================================
   右上角唱片播放器
   ------------------------------------------------------------
   取代了原来的 APlayer 左下角浮层。设计要求：
   · 收起时是右上角一张黑胶唱片，播放时转，暂停就停在原地
   · 点开才展开歌单面板，点哪首放哪首，带进度条与上下曲
   · 音源两选一，见 params.toml 的 [music].source：
       api   —— 运行时按 Meting 兼容接口拉歌单
       local —— 歌单由 Hugo 构建时写进页面，文件放 assets/music/，一个请求都不发
   · [music].id 可以写多个（逗号分隔），几张歌单会合并成一份并去重
   · 读歌单与取音频可以分两家接口（[music].api 与 [music].listapi）：
     qijieya 给完整版音频但缓存歌单 24 小时，刚从歌单里加的歌要等一天才露头；
     所以列表走不缓存的 i-meto，音频仍回到 qijieya（i-meto 的直链取不到，实测 401/404）
   · 先按语种筛（全部 / 中文 / 英文），再选播放模式
   · 播放模式四种：随机 / 顺序 / 逆序 / 单曲循环，面板底部直接点选

   几个刻意的处理：
   · 列表不显示封面 —— 热歌榜 200 首就是 200 个图片请求，
     只给唱片本体加载一张，省下的流量比列表好看重要
   · 歌单元数据在页面空闲时预取，点开面板不用等
   · 旋转靠 animation-play-state 起停，不是自己算角度，
     所以暂停会停在当前角度，不会跳回 0°
   · 标签页切到后台就暂停，不在看不见的地方放歌
   · 单曲取流失败自动跳下一首，但不无限跳（连错 8 次就停）
   ============================================================ */

type PlayMode = 'shuffle' | 'order' | 'reverse' | 'single';
type LangFilter = 'all' | 'zh' | 'en';

interface MusicTrack {
    name: string;
    artist: string;
    url: string;
    pic?: string;
}

function setupMusicPlayer() {
    const root = document.getElementById('music-player') as HTMLElement | null;
    if (!root) return;

    const pick = <T extends Element>(selector: string) => root.querySelector(selector) as T | null;

    const disc = pick<HTMLButtonElement>('.mp__disc');
    const panel = pick<HTMLElement>('.mp__panel');
    const cover = pick<HTMLImageElement>('.mp__cover');
    const listEl = pick<HTMLUListElement>('.mp__list');
    const statusEl = pick<HTMLElement>('.mp__status');
    const searchInput = pick<HTMLInputElement>('.mp__search-input');
    const nowTitle = pick<HTMLElement>('.mp__now-title');
    const nowArtist = pick<HTMLElement>('.mp__now-artist');
    const btnPlay = pick<HTMLButtonElement>('.mp__btn--play');
    const btnPrev = pick<HTMLButtonElement>('.mp__btn--prev');
    const btnNext = pick<HTMLButtonElement>('.mp__btn--next');
    const btnClose = pick<HTMLButtonElement>('.mp__close');
    const bar = pick<HTMLElement>('.mp__bar');
    const barFill = pick<HTMLElement>('.mp__bar-fill');
    const audio = pick<HTMLAudioElement>('.mp__audio');

    if (!disc || !panel || !listEl || !audio) return;

    const source = root.dataset.source === 'local' ? 'local' : 'api';
    const { api = '', server = 'netease', type = 'playlist', id = '' } = root.dataset;
    // local 模式下歌单由 Hugo 构建时写好，既不需要接口，也不该因为没有 id 就不渲染
    if (source === 'api' && (!api || !id)) return;

    /* id 允许写多个，用逗号或空格分隔 —— 几张歌单会合并成一份列表。
       这样「PIEEE」与「我喜欢的音乐」可以同时放进来。 */
    const ids = id.split(/[\s,]+/).filter(Boolean);

    // :server / :type / :id 三个占位符由 Meting 接口约定，顺序不能动
    const endpointFor = (playlistId: string) =>
        api.replace(':server', server).replace(':type', type).replace(':id', playlistId);

    /* 读歌单与取音频分开走两家接口。
       起因：Meting 系公共实例普遍把歌单结果缓存 24 小时（injahow 源码 CACHE_TIME = 86400），
       往歌单里新加的歌最长要等一天才会出现在播放器里 —— 列表于是改问 i-meto（不缓存）。
       但 i-meto 的音频直链是废的（实测 401 / 404），所以拿到的列表要再「改挂」回 api：
       只留 type 与 id 两个参数重新拼一遍，音频 / 封面就都回到能用的那家了。
       listapi 没配或挂掉时，照旧直接用 api 拉列表。 */
    const apiBase = api.split('?')[0];
    const listApi = root.dataset.listapi ?? '';
    const listEndpointFor = (playlistId: string) =>
        listApi
            ? listApi.replace(':server', server).replace(':type', type).replace(':id', playlistId)
            : endpointFor(playlistId);

    /* 把任意一条 Meting 链接改挂到 api 上。只认 type 与 id
       （Meting 系接口的 url / pic / lrc 都靠这两个参数定位）。 */
    const rebase = (raw?: string): string => {
        if (!raw) return '';
        try {
            const q = new URL(raw, window.location.href).searchParams;
            const kind = q.get('type');
            const trackId = q.get('id');
            if (!kind || !trackId) return '';
            return `${apiBase}?server=${encodeURIComponent(server)}&type=${kind}&id=${encodeURIComponent(trackId)}`;
        } catch {
            return '';
        }
    };

    /* 两家的字段名不一样：injahow 回 name / artist，i-meto 回 title / author。
       统一成内部用的 name / artist，顺手把链接改挂回 api。 */
    const normalizeTrack = (
        raw: Partial<MusicTrack> & { title?: string; author?: string },
    ): MusicTrack => ({
        name: raw.name ?? raw.title ?? '',
        artist: raw.artist ?? raw.author ?? '',
        url: rebase(raw.url),
        pic: rebase(raw.pic),
    });

    const fetchTracks = async (
        endpoint: string,
    ): Promise<MusicTrack[]> => {
        try {
            const res = await fetch(endpoint);
            if (!res.ok) return [];
            const data = (await res.json()) as Array<Partial<MusicTrack> & { title?: string; author?: string }>;
            if (!Array.isArray(data)) return [];
            return data.map(normalizeTrack).filter((t) => t.url);
        } catch {
            return [];
        }
    };

    /* 播放模式：随机 / 顺序 / 逆序 / 单曲循环。
       配置里的 order 只用来定初值（兼容旧的 random / list 写法），
       运行时由面板底部那排按钮切，并记在 localStorage，下次打开还是上次那个。 */
    const MODE_KEY = 'mp-mode';
    const MODES: PlayMode[] = ['shuffle', 'order', 'reverse', 'single'];
    const LEGACY: Record<string, PlayMode> = { random: 'shuffle', list: 'order' };

    const readMode = (): PlayMode => {
        try {
            const saved = window.localStorage.getItem(MODE_KEY);
            if (saved && (MODES as string[]).includes(saved)) return saved as PlayMode;
        } catch { /* 隐私模式下 localStorage 会抛错，忽略 */ }
        const fromConfig = LEGACY[root.dataset.order ?? ''] ?? (root.dataset.order ?? '');
        return (MODES as string[]).includes(fromConfig) ? (fromConfig as PlayMode) : 'order';
    };

    let mode = readMode();

    /* 语种筛选：全部 / 中文 / 英文。
       刻意不靠人工给每首歌打标 —— 曲名里出现中日韩统一表意文字就算中文，否则算英文；
       曲名是纯符号时退回看歌手名。网易云的中文歌名基本都有汉字，这个判得够准。 */
    const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
    const LANGS: LangFilter[] = ['all', 'zh', 'en'];
    const LANG_KEY = 'mp-lang';

    const trackLang = (t: MusicTrack): 'zh' | 'en' =>
        CJK.test(t.name || t.artist || '') ? 'zh' : 'en';

    const readLang = (): LangFilter => {
        try {
            const saved = window.localStorage.getItem(LANG_KEY);
            if (saved && (LANGS as string[]).includes(saved)) return saved as LangFilter;
        } catch { /* 忽略 */ }
        return 'all';
    };

    let lang = readLang();

    /* 歌单关键词。跟语种是两个维度，叠加生效：先按语种取子集，再按关键词过滤。
       不写进 localStorage —— 搜索是个临时动作，下次打开应该看到完整歌单。 */
    let keyword = '';

    const volume = Number(root.dataset.volume ?? 0.5);
    audio.volume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.5;

    let allTracks: MusicTrack[] = [];   // 几张歌单合并后的全集
    let tracks: MusicTrack[] = [];      // 当前语种下真正参与播放的子集
    let current = -1;
    let loading = false;
    let loaded = false;
    let errorStreak = 0;
    let flashTimer = 0;

    /* 面板顶部那行状态，加载完本来会隐藏，这里借来当临时提示条。
       QQ 音乐源下约七成曲子取不到直链，不提示的话用户只会看到画面自己跳走。 */
    const flash = (text: string) => {
        if (!statusEl) return;
        statusEl.textContent = text;
        statusEl.hidden = false;
        window.clearTimeout(flashTimer);
        flashTimer = window.setTimeout(() => {
            statusEl.hidden = true;
        }, 2600);
    };

    /* ---------- 列表渲染 ---------- */

    const renderList = () => {
        listEl.textContent = '';
        const frag = document.createDocumentFragment();

        tracks.forEach((track, i) => {
            const li = document.createElement('li');
            li.className = 'mp__item';
            li.dataset.index = String(i);
            if (i === current) li.classList.add('is-current');

            const name = document.createElement('span');
            name.className = 'mp__item-name';
            name.textContent = track.name || '未知曲目';

            const artist = document.createElement('span');
            artist.className = 'mp__item-artist';
            artist.textContent = track.artist || '';

            li.append(name, artist);
            frag.append(li);
        });

        listEl.append(frag);
    };

    function paintProgress() {
        const { duration, currentTime } = audio;
        const ratio = Number.isFinite(duration) && duration > 0 ? currentTime / duration : 0;
        if (barFill) barFill.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
        if (bar) bar.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    }

    const paintCurrent = () => {
        const track = tracks[current];
        if (!track) return;

        if (nowTitle) nowTitle.textContent = track.name || '未知曲目';
        if (nowArtist) nowArtist.textContent = track.artist || '';
        if (cover && track.pic) {
            cover.src = track.pic;
            cover.alt = `${track.name} - ${track.artist}`;
        }

        listEl.querySelectorAll<HTMLElement>('.mp__item').forEach((el) => {
            el.classList.toggle('is-current', Number(el.dataset.index) === current);
        });

        const active = listEl.querySelector<HTMLElement>('.mp__item.is-current');
        if (active) active.scrollIntoView({ block: 'nearest' });

        paintProgress();
    };

    /* ---------- 播放控制 ---------- */

    /* playAt 返回 promise：true = 真的响了，false = 被浏览器拦下。
       自动播放那条线要看这个返回值决定补不补手势兜底（见下面「进站自动播放」）。 */
    const playAt = (index: number, startAt = 0): Promise<boolean> => {
        if (!tracks.length) return Promise.resolve(false);
        current = (index + tracks.length) % tracks.length;
        paintCurrent();
        audio.src = tracks[current].url;

        // 跨页续播用：src 刚换好时 metadata 还没到，直接写 currentTime 会被丢掉，
        // 得等 loadedmetadata。已经在播的（readyState >= 1）就直接设。
        if (startAt > 0) {
            const seek = () => { audio.currentTime = startAt; };
            if (audio.readyState >= 1) seek();
            else audio.addEventListener('loadedmetadata', seek, { once: true });
        }

        return audio.play().then(() => true).catch(() => false);
    };

    /* ---------- 进站自动播放 ----------
       浏览器的自动播放策略是硬限制：没有用户手势时，带声音的 play() 一律被拒
       （Chrome / Safari / Firefox 都一样，静音才放行），前端没有写法能真绕过去。
       所以这里做的是「尽量早 + 兜底」两件事：

         ① 页面一加载就试播 —— 访客之前在本站交互过、或刚从文章链接点进来时，
            这一次多半直接就成了，进门即有声音；
         ② 被拦下就挂一组一次性监听，等他第一次点击 / 按键 / 滚动 / 触摸时补播。
            不用去右上角找播放按钮，随便动一下就行。

       等待期间唱片带一圈呼吸光圈 +「点一下播放」气泡（.mp.is-armed），播起来即撤。 */
    const autoplayOn = root.dataset.autoplay === 'true';
    const resumeOn = root.dataset.resume === 'true';
    const GESTURES = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    let armed = false;

    // 这三个互相调用，用函数声明（会被提升），别改成 const
    function unarm() {
        if (!armed) return;
        armed = false;
        root.classList.remove('is-armed');
        GESTURES.forEach((type) => window.removeEventListener(type, onGesture, true));
    }

    function onGesture() {
        unarm();
        // 手势到手，这一次 play() 必定放行
        void playAt(current < 0 ? 0 : current).then((ok) => { if (!ok) arm(); });
    }

    function arm() {
        if (armed || !tracks.length) return;
        armed = true;
        root.classList.add('is-armed');
        GESTURES.forEach((type) =>
            window.addEventListener(type, onGesture, { capture: true, once: true, passive: true }));
    }

    /* ---------- 跨页续播 ----------
       Hugo 是多页站点，点进文章会整页刷新，音频本来每次都得从第一首重来。
       把「播到哪了」记在 sessionStorage（关掉标签页即失效），新页面接着放。 */
    const RESUME_KEY = 'mp-resume';

    let lastResumeSave = 0;      // timeupdate 落盘的节流时间戳
    let pausedByHidden = false;  // 标记这次暂停是「切走了」还是「他按了暂停」

    const clearResume = () => {
        try { window.sessionStorage.removeItem(RESUME_KEY); } catch { /* 隐私模式，忽略 */ }
    };

    const readResume = (): { url: string; time: number } | null => {
        if (!resumeOn) return null;
        try {
            const raw = window.sessionStorage.getItem(RESUME_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw) as { url?: string; time?: number };
            if (!data || !data.url) return null;
            return { url: data.url, time: Number(data.time) || 0 };
        } catch {
            return null;
        }
    };

    const saveResume = () => {
        try {
            const track = tracks[current];
            // 没在播就不动原记录 —— 手动暂停由 pause 事件显式清掉
            if (!track || audio.paused) return;
            window.sessionStorage.setItem(RESUME_KEY, JSON.stringify({
                url: track.url,
                time: audio.currentTime,
            }));
        } catch { /* 忽略 */ }
    };

    const startAutoplay = () => {
        if (!autoplayOn || armed || !tracks.length) return;

        const saved = readResume();
        const at = saved ? tracks.findIndex((t) => t.url === saved.url) : -1;
        // 命中上次那首就接上进度，否则按当前模式挑好的 current 从头放
        const target = at >= 0 ? at : (current < 0 ? 0 : current);
        const offset = at >= 0 && saved ? saved.time : 0;

        void playAt(target, offset).then((ok) => { if (!ok) arm(); });
    };

    const step = (delta: number) => {
        if (!tracks.length) return;

        // 随机：从别的曲子里随便挑一首（只有一首时就原地循环）
        if (mode === 'shuffle' && tracks.length > 1) {
            let next = current;
            while (next === current) next = Math.floor(Math.random() * tracks.length);
            void playAt(next);
            return;
        }

        // 逆序：前进方向等于列表倒着走。单曲模式下手动上/下一首仍按列表顺序走，
        // 只有「放完自动续」才原地重来（见 ended 事件）。
        const dir = mode === 'reverse' ? -delta : delta;
        void playAt(current < 0 ? 0 : current + dir);
    };

    /* ---------- 播放模式 ---------- */

    const modeBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.mp__mode'));

    const renderMode = () => {
        modeBtns.forEach((btn) => {
            const active = btn.dataset.mode === mode;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    };

    const setMode = (next: PlayMode) => {
        mode = next;
        renderMode();
        try { window.localStorage.setItem(MODE_KEY, next); } catch { /* 忽略 */ }
    };

    modeBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const next = btn.dataset.mode as PlayMode;
            if (MODES.includes(next)) setMode(next);
        });
    });

    renderMode();

    /* ---------- 语种筛选 ---------- */

    const langBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.mp__filter'));

    const renderLang = () => {
        langBtns.forEach((btn) => {
            const active = btn.dataset.lang === lang;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    };

    /* 重算参与播放的子集（语种 + 关键词），并尽量保住「正在播的那首」在列表里的位置。
       被筛掉时 current 置 -1：歌继续放，只是列表里没有高亮项。 */
    const applyFilters = () => {
        const playingUrl = tracks[current]?.url ?? '';
        const q = keyword.trim().toLowerCase();

        tracks = allTracks.filter((t) => {
            if (lang !== 'all' && trackLang(t) !== lang) return false;
            if (!q) return true;
            // 歌名与歌手任一命中即可，这样中英文混着搜都能找到
            return (t.name || '').toLowerCase().includes(q)
                || (t.artist || '').toLowerCase().includes(q);
        });

        if (playingUrl) {
            current = tracks.findIndex((t) => t.url === playingUrl);
        } else if (mode === 'shuffle' && tracks.length) {
            current = Math.floor(Math.random() * tracks.length);
        } else {
            current = tracks.length ? 0 : -1;
        }

        renderList();
        renderLang();

        if (!tracks.length) {
            if (statusEl) {
                statusEl.textContent = q ? '没有找到匹配的歌' : '这一类暂时没有歌';
                statusEl.hidden = false;
            }
            return;
        }

        if (statusEl) statusEl.hidden = true;
        paintCurrent();
    };

    langBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const next = btn.dataset.lang as LangFilter;
            if (!LANGS.includes(next) || next === lang) return;
            lang = next;
            try { window.localStorage.setItem(LANG_KEY, next); } catch { /* 忽略 */ }
            applyFilters();
        });
    });

    renderLang();

    /* 关键词输入：边打边筛，不按回车也生效 */
    searchInput?.addEventListener('input', () => {
        keyword = searchInput.value;
        applyFilters();
    });

    // 清空按钮（type=search 在 WebKit 下自带一个）会把 value 置空，但不会触发 input
    searchInput?.addEventListener('search', () => {
        keyword = searchInput.value;
        applyFilters();
    });

    /* ---------- 歌单加载 ---------- */

    /* local 模式：歌单是构建时写死在页面里的那段 JSON，读它就行，不发请求 */
    const readLocalTracks = (): MusicTrack[] => {
        const holder = document.getElementById('mp-tracks');
        if (!holder?.textContent) return [];
        try {
            const data = JSON.parse(holder.textContent) as MusicTrack[];
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    };

    const load = async () => {
        if (loaded || loading) return;
        loading = true;

        try {
            let list: MusicTrack[];

            if (source === 'local') {
                list = readLocalTracks();
            } else {
                // 多张歌单并发拉。单张失败不该拖垮其余，所以逐条吞掉错误，
                // 全空了再统一报「加载失败」。
                // 每张都先问不缓存的那家，空手才退回 api。
                const parts = await Promise.all(ids.map(async (playlistId) => {
                    const fresh = await fetchTracks(listEndpointFor(playlistId));
                    if (fresh.length) return fresh;
                    return fetchTracks(endpointFor(playlistId));
                }));
                list = parts.reduce<MusicTrack[]>((acc, part) => acc.concat(part), []);
            }

            // 按 url 去重 —— 同一首歌同时出现在两张歌单里时只留一份
            const seen = new Set<string>();
            allTracks = list.filter((t) => {
                if (!t || !t.url || seen.has(t.url)) return false;
                seen.add(t.url);
                return true;
            });
            if (!allTracks.length) throw new Error('empty');

            loaded = true;
            // 挑子集、定位当前曲、渲染列表与筛选态，全都交给 applyFilters
            applyFilters();

            if (root.dataset.autoplay === 'true') startAutoplay();
        } catch {
            if (statusEl) {
                statusEl.textContent = source === 'local'
                    ? '还没有音频，把文件放进 assets/music/ 再重新构建'
                    : '歌单加载失败，收起再点唱片重试';
            }
            allTracks = [];
            tracks = [];
            current = -1;
        } finally {
            loading = false;
        }
    };

    /* ---------- 面板开合 ---------- */

    const setOpen = (open: boolean) => {
        root.classList.toggle('is-open', open);
        panel.setAttribute('aria-hidden', open ? 'false' : 'true');
        disc.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) void load();
    };

    disc.addEventListener('click', () => setOpen(!root.classList.contains('is-open')));
    btnClose?.addEventListener('click', () => setOpen(false));

    document.addEventListener('click', (event) => {
        if (root.classList.contains('is-open') && !root.contains(event.target as Node)) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && root.classList.contains('is-open')) setOpen(false);
    });

    /* ---------- 控件绑定 ---------- */

    listEl.addEventListener('click', (event) => {
        const item = (event.target as HTMLElement).closest<HTMLElement>('.mp__item');
        if (!item) return;
        void playAt(Number(item.dataset.index));
    });

    btnPlay?.addEventListener('click', () => {
        if (!audio.paused) {
            audio.pause();
            return;
        }
        if (audio.src) void audio.play().catch(() => undefined);
        else void playAt(current < 0 ? 0 : current);
    });

    btnPrev?.addEventListener('click', () => {
        // 播过 3 秒先回开头，这是播放器的通用肌肉记忆
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        step(-1);
    });

    btnNext?.addEventListener('click', () => step(1));

    const seek = (clientX: number) => {
        if (!bar || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        audio.currentTime = ratio * audio.duration;
        paintProgress();
    };

    bar?.addEventListener('click', (event) => seek((event as unknown as MouseEvent).clientX));

    bar?.addEventListener('keydown', (event) => {
        const keyboardEvent = event as KeyboardEvent;
        const jump = keyboardEvent.key === 'ArrowRight' ? 5 : keyboardEvent.key === 'ArrowLeft' ? -5 : 0;
        if (!jump || !Number.isFinite(audio.duration)) return;
        keyboardEvent.preventDefault();
        audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + jump));
    });

    /* ---------- 音频事件 ---------- */

    audio.addEventListener('play', () => root.classList.add('is-playing'));
    audio.addEventListener('pause', () => {
        root.classList.remove('is-playing');
        // 「他按了暂停」= 不想听了，跨页续播的进度一并丢掉；切标签页引起的暂停保留
        if (!pausedByHidden) clearResume();
    });
    audio.addEventListener('playing', () => { errorStreak = 0; });
    audio.addEventListener('timeupdate', () => {
        paintProgress();
        // 一秒落一次盘就够 —— timeupdate 一秒能来四次
        const now = Date.now();
        if (now - lastResumeSave > 1000) {
            lastResumeSave = now;
            saveResume();
        }
    });
    audio.addEventListener('loadedmetadata', paintProgress);
    // 单曲循环：原地重来；其余模式按当前模式续下一首
    audio.addEventListener('ended', () => {
        if (mode === 'single') {
            audio.currentTime = 0;
            void audio.play().catch(() => undefined);
            return;
        }
        step(1);
    });

    audio.addEventListener('error', () => {
        if (!audio.error) return;
        root.classList.remove('is-playing');
        errorStreak += 1;
        // 单曲取流失败不打断整个歌单，但连错太多次说明是接口挂了，别继续跳。
        // 阈值给到 8：QQ 音乐源下约七成曲子取不到直链（版权/VIP），阈值小了会误停。
        if (errorStreak <= 8 && tracks.length > 1) {
            flash('这首取不到音源，已跳过');
            window.setTimeout(() => step(1), 400);
        }
    });

    /* 切走标签页先停、回来接着放 —— 访客的预期是「一直在放」，
       而不是切一次就没了。手动按的暂停不算（那才是他真要停）。 */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (!audio.paused) {
                pausedByHidden = true;
                saveResume();       // 隐藏前先把进度落盘，免得这期间翻页丢了位置
                audio.pause();
            }
            return;
        }
        if (pausedByHidden) {
            pausedByHidden = false;
            void audio.play().catch(() => undefined);
        }
    });

    // 翻页 / 关标签前再落一次盘，比 beforeunload 在移动端可靠
    window.addEventListener('pagehide', saveResume);

    /* ---------- 空闲预取 ---------- */

    const idle = (window as unknown as {
        requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    }).requestIdleCallback;

    // 自动播放开着就别等空闲了 —— 访客进站第一秒就该有声音
    if (autoplayOn) void load();
    else if (typeof idle === 'function') idle(() => void load(), { timeout: 3000 });
    else window.setTimeout(() => void load(), 1500);
}

/* ============================================================
   私密文章：时间锁 + 密码锁
   ------------------------------------------------------------
   页面模板 layouts/_default/secret.html。正文在构建期被 AES-256-GCM
   加密（.workbuddy/scripts/seal.mjs），这里只负责：
     ① 未到 unlockAt —— 只显示倒计时，密码框不给提交
     ② 到了 unlockAt —— 放出密码框，输对就解密填进正文
     ③ 过了 expireAt —— 收回正文，重新锁上

   ⚠️ 仓库公开，所以密码只存在于「她敲进去的那一瞬间」，
   页面里只有密文。这里不做任何形式的密码比对——PBKDF2 之后
   直接拿密文去 AES-GCM 解，解不开就是密码错。
   ============================================================ */

const SECRET_TICK_MS = 1000;

function setupSecretPost() {
    const root = document.querySelector<HTMLElement>('[data-secret]');
    if (!root) return;

    const gate = root.querySelector<HTMLElement>('[data-secret-gate]');
    const state = root.querySelector<HTMLElement>('[data-secret-state]');
    const form = root.querySelector<HTMLFormElement>('[data-secret-form]');
    const input = root.querySelector<HTMLInputElement>('[data-secret-input]');
    const submit = root.querySelector<HTMLButtonElement>('[data-secret-submit]');
    const msg = root.querySelector<HTMLElement>('[data-secret-msg]');
    const body = root.querySelector<HTMLElement>('[data-secret-body]');
    const cipherRaw = root.dataset.cipher ?? '';

    if (!gate || !state || !form || !input || !body || !cipherRaw) return;

    const unlockAt = new Date(root.dataset.unlock ?? '').getTime();
    const expireRaw = root.dataset.expire ?? '';
    const expireAt = expireRaw ? new Date(expireRaw).getTime() : NaN;
    const iterations = Number(root.dataset.iterations ?? 120000);

    const hasExpire = Number.isFinite(expireAt);
    const hasUnlock = Number.isFinite(unlockAt);

    /* ---------- 到期倒计时文案 ---------- */

    const pad = (n: number) => String(n).padStart(2, '0');

    const countdown = (ms: number): string => {
        const total = Math.max(0, Math.floor(ms / 1000));
        const d = Math.floor(total / 86400);
        const h = Math.floor((total % 86400) / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;

        const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
        return d > 0 ? `${d} 天 ${clock}` : clock;
    };

    const fmtDate = (t: number): string => {
        const d = new Date(t);
        return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 ` +
            `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    /* ---------- 解锁 ---------- */

    const te = new TextEncoder();
    const td = new TextDecoder();

    let unlocked = false;
    let busy = false;
    let formShown = false;

    const decrypt = async (password: string): Promise<string> => {
        // base64 →  salt(16B) || iv(12B) || ciphertext+tag
        // ⚠️ 密文来自 data-cipher 属性。若改回 <script> 承载，务必小心：
        //    <script> 内是原始文本，Hugo 转义出的 &#43; 不会被解码，
        //    atob() 拿到的是坏串，解密必然失败（表现为「密码不对」）。
        const raw = atob(cipherRaw.trim());
        const packed = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) packed[i] = raw.charCodeAt(i);

        if (packed.length < 44) throw new Error('密文长度不对');

        const salt = packed.slice(0, 16);
        const iv = packed.slice(16, 28);
        const data = packed.slice(28); // ct || tag 必须拼在一起，WebCrypto 不接受分开传

        const material = await crypto.subtle.importKey(
            'raw', te.encode(password), 'PBKDF2', false, ['deriveKey']
        );
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
            material,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return td.decode(plain);
    };

    const showBody = (html: string) => {
        body.innerHTML = html;
        body.hidden = false;
        gate.hidden = true;
        // 解密后正文里可能有图片，懒加载属性要重新触发计算
        body.querySelectorAll('img[data-src]').forEach((img) => {
            const lazy = img as HTMLImageElement & { dataSrc?: string };
            if (lazy.dataset.src) img.src = lazy.dataset.src;
        });
    };

    const say = (text: string, kind: 'info' | 'error' = 'info') => {
        if (!msg) return;
        msg.textContent = text;
        msg.classList.toggle('is-error', kind === 'error');
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (busy || unlocked) return;

        const password = input.value;
        if (!password) {
            say('先输一下密码', 'error');
            input.focus();
            return;
        }

        busy = true;
        if (submit) {
            submit.disabled = true;
            submit.textContent = '解锁中';
        }
        say('正在解密…');

        try {
            const html = await decrypt(password);
            unlocked = true;
            showBody(html);
            // 不留在 history 里 —— 刷新会回到锁着的样子
            try {
                history.replaceState(null, '', location.pathname + location.hash);
            } catch { /* file:// 下可能失败，不影响 */ }
        } catch {
            say('密码不对，再想想', 'error');
            input.select();
        } finally {
            busy = false;
            if (submit && !unlocked) {
                submit.disabled = false;
                submit.textContent = '解锁';
            }
        }
    });

    /* ---------- 时间锁 ---------- */

    let timer = 0;

    const openForm = () => {
        form.hidden = false;
        say('');
        input.focus({ preventScroll: true });
    };

    const lock = (reason: string) => {
        form.hidden = true;
        formShown = false;
        state.hidden = false;
        state.innerHTML = reason;
        input.value = '';
    };

    const tick = () => {
        const now = Date.now();

        if (hasExpire && now >= expireAt) {
            window.clearInterval(timer);
            timer = 0;
            if (unlocked) {
                // 已经解开了也要收回去：正文先清空，再显示已过期
                unlocked = false;
                body.innerHTML = '';
                body.hidden = true;
                gate.hidden = false;
            }
            lock(
                `<p class="secret-gate__title">这一篇已经过期了</p>` +
                `<p class="secret-gate__hint">开放时间到 ${fmtDate(expireAt)} 为止。</p>`
            );
            return;
        }

        if (hasUnlock && now < unlockAt) {
            lock(
                `<p class="secret-gate__title">还没到时间</p>` +
                `<p class="secret-gate__count" data-secret-count>${countdown(unlockAt - now)}</p>` +
                `<p class="secret-gate__hint">${fmtDate(unlockAt)} 准时打开。</p>`
            );
            return;
        }

        // 到点了：放密码框。如果已经解开或正在显示，就别重复处理。
        if (unlocked || formShown) return;

        state.hidden = true;
        state.innerHTML = '';
        openForm();
        formShown = true;
    };

    const start = () => {
        if (timer) return;
        timer = window.setInterval(tick, SECRET_TICK_MS);
        tick();
    };

    // 标签页在后台时秒级倒计时没必要跑，回来时 tick() 会立刻校正
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') tick();
    });

    start();
}

document.addEventListener('DOMContentLoaded', setupCodeGroups);
document.addEventListener('DOMContentLoaded', setupParticleBackground);
document.addEventListener('DOMContentLoaded', setupSiteRuntime);
document.addEventListener('DOMContentLoaded', setupArchiveMenu);
document.addEventListener('DOMContentLoaded', setupMusicPlayer);
/* ============================================================
   Gift 流程：五道题 → 粒子表演 → 信封 → 正文
   ------------------------------------------------------------
   两个页面各管一段：

     /gift/          setupGiftQuiz()  收五个答案 → 拼串 → SHA-256
                     比对 front matter 里的 answersHash，对上了就跳走。

     /gift/letter/   setupGiftShow()  播粒子 + 烟花，弹出信封，点开显示正文。

   ⚠️ 正文**不加密** —— 明文写在 gift-letter.md 里，由 Hugo 正常渲染。
      所以五道题就是唯一的门：校验过不去，表演根本不会开始；
      校验过去了，表演页直接就能读，不需要任何密码、密钥、中转。
      （早期版本在表演页做过 AES-GCM 解密，靠 sessionStorage 传密码 ——
        那层已经撤掉了，改字直接改 md，不用重跑任何脚本。）

   ⚠️ 仓库公开，所以页面里只有 answersHash。
      整体判定，不提示哪一题错了 —— 逐题提示就得存五个单独哈希，
      等于把每题的可搜索空间砍到 1/5，白送爆破面。
   ============================================================ */

/**
 * 表演阶段的时间线（毫秒）。加在这里方便整体调节奏。
 *
 * ⚠️ 总和 = 34000ms，三十四秒。
 *    原来是 60000（一分钟），用户明确要求压到「二三十秒」——
 *    一分钟太久，看到后半段已经审美疲劳，信封迟迟不来。
 *    30 秒是折中：够看完所有变化，又不至于拖。
 *
 * ⚠️ 改阶段时长时，verify_gift.mjs 里那条「总和必须等于 34000」的静态断言
 *    和它自己压缩用的 SPEEDUP 常量都要跟着改，否则验收脚本会误报。
 *
 * 阶段表（**照着参考视频重做的一版**，跟旧版完全不同）：
 *   ① draw    6s  粒子**从中心一点点长出**心形的边（描边，不是实心）
 *   ② hold    5s  心形完整，轻轻呼吸；光带绕边跑
 *   ③ retreat 4s  **退回散开** —— 心形解散，粒子回到四周
 *   ④ wish    15s 彩色祝福卡片铺满屏（DOM，见 build_wishes）
 *   ⑤ fade    4s  压暗，卡片与粒子全部退场，信封从暗处浮上来
 *
 * ⚠️③ 为什么是「退回」而不是旧版的「炸成星火四散」：
 *    参考视频里心形散开的方式是**粒子反向收回去**，看着像心「散了」
 *    而不是「炸了」—— 后者满屏渣渣，和「心消失」的优雅感正好相反。
 *    旧版的 radial 速度会让粒子朝各方向飞出屏幕。
 *    现在改成：沿「从心形中心指向粒子」的方向**慢速**外推，
 *    速度只有汇聚时的 40%，且不做任何向上偏置 ⇒ 粒子飘散在原地附近，
 *    读起来是「心慢慢化开」，不是「炸」。
 */
const GIFT_SHOW = {
    draw: 6000,       // ① 描出心形轮廓            6s
    hold: 5000,       // ② 心形呼吸 + 光带绕边      5s
    retreat: 4000,    // ③ 心形退回散开            4s
    wish: 15000,      // ④ 祝福卡片铺满屏          15s
    fade: 4000,       // ⑤ 压暗、准备出信封         4s
} as const;

/**
 * 判定串规范化 —— **必须与 .workbuddy/scripts/make_gift.mjs 的 normalize() 逐字一致**。
 * 两边对不上，症状是「答案明明是对的却总说不对」。
 *
 * 三步，每一步都对应「她会怎么打」：
 *   NFKC    全角「ＡＢＣ」≡ 半角「ABC」，全角标点、圈码也一并归一
 *   toLower 大小写不该有影响（五个答案都是英文）
 *   只留 \p{L} \p{N}  空格、逗号、顿号、竖线、大括号、句点全丢掉
 *
 *   ⇒ 也就是说下面这几种写法，规范化之后**完全一样**：
 *       带大括号、空格分隔、正常大小写
 *       带大括号、逗号分隔、全小写
 *       不带大括号、空格分隔
 *
 * ⚠️⚠️ 这个文件是**入库的**，注释里绝对不能出现真答案 ——
 *    仓库公开，写在注释里等于把答案贴在门上。
 *    （这条曾经真踩过：注释里写了三个示例答案，验收脚本一 grep 就红了。）
 *    要举例子就用 <答案1> <答案2> 这种占位形式。
 *
 *   \p{L} 含汉字，所以中文答案也不会被误删。
 */
const giftCanonical = (raw: string): string =>
    raw.normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '');

const giftPad = (n: number): string => String(n).padStart(2, '0');

const giftCountdown = (ms: number): string => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const clock = `${giftPad(h)}:${giftPad(m)}:${giftPad(s)}`;
    return d > 0 ? `${d} 天 ${clock}` : clock;
};

const giftFormatDate = (t: number): string => {
    const d = new Date(t);
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 ` +
        `${giftPad(d.getHours())}:${giftPad(d.getMinutes())}`;
};

/** 读时间戳；解析不了返回 NaN，由调用方决定当没设置处理 */
const giftTime = (raw: string | undefined): number =>
    raw ? new Date(raw).getTime() : NaN;

/**
 * 侧栏「Special Gift」入口的时间显隐
 *
 * 菜单是 Hugo 静态渲染的，没法在构建期按「当前时刻」决定显隐 ——
 * 构建早就跑完了，而解锁时刻在未来。所以模板（sidebar/left.html）先把这一项
 * 渲染出来，并挂上 giftUnlock / giftExpire 两个时间戳，这里在运行时决定藏不藏。
 *
 * ⚠️ 藏的只是菜单项，不是路由 —— 知道 URL 的人照样能直接打开 /gift/。
 *    真正把关的是那一页自己的时间锁。
 */
function setupGiftMenu() {
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-gift-menu]'));
    if (!items.length) return;

    const sync = () => {
        const now = Date.now();
        for (const item of items) {
            const unlock = giftTime(item.dataset.giftUnlock);
            const expire = giftTime(item.dataset.giftExpire);
            const tooEarly = Number.isFinite(unlock) && now < unlock;
            const tooLate = Number.isFinite(expire) && now >= expire;
            item.hidden = tooEarly || tooLate;
        }
    };

    sync();
    // 30 秒一次足够 —— 这个窗口跨的是整天，不是秒级倒计时
    const timer = window.setInterval(sync, 30_000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') sync();
    });
    window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
}

/** base64 → Uint8Array。atob 只认 ASCII，所以走逐字符 charCodeAt */
const giftB64ToBytes = (b64: string): Uint8Array => {
    const raw = atob(b64.trim());
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
};

/**
 * 答题页
 */
function setupGiftQuiz() {
    const root = document.querySelector<HTMLElement>('[data-gift-quiz]');
    if (!root) return;

    const gate = root.querySelector<HTMLElement>('[data-gift-gate]');
    const state = root.querySelector<HTMLElement>('[data-gift-state]');
    const form = root.querySelector<HTMLFormElement>('[data-gift-form]');
    // 只有一个框：五题答案连成一整串，她自己填进来的就是那个串
    const input = root.querySelector<HTMLTextAreaElement>('[data-gift-input]');
    const submit = root.querySelector<HTMLButtonElement>('[data-gift-submit]');
    const msg = root.querySelector<HTMLElement>('[data-gift-msg]');

    if (!gate || !state || !form || !submit || !msg || !input) return;

    const expectHash = (root.dataset.hash ?? '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(expectHash)) return;

    const unlockAt = giftTime(root.dataset.unlock);
    const expireAt = giftTime(root.dataset.expire);
    const hasUnlock = Number.isFinite(unlockAt);
    const hasExpire = Number.isFinite(expireAt);

    const say = (text: string, kind: 'info' | 'error' = 'info') => {
        msg.textContent = text;
        msg.classList.toggle('is-error', kind === 'error');
    };

    const lock = (html: string) => {
        form.hidden = true;
        state.hidden = false;
        state.innerHTML = html;
    };

    /* ---------- 提交 ---------- */

    let busy = false;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (busy) return;

        // 时间锁优先：过期后即便哈希对了也不放行
        const now = Date.now();
        if (hasExpire && now >= expireAt) {
            lock(
                `<p class="gift-gate__title">已经结束啦</p>` +
                `<p class="gift-gate__hint">开放时间到 ${giftFormatDate(expireAt)} 为止。</p>`
            );
            return;
        }
        if (hasUnlock && now < unlockAt) return;

        // 她填的是「五题答案连起来的一整串」，规范化后直接拿去哈希 ——
        // 不再由前端拼，前端拼就得知道分隔符，两边规则容易对不上
        const phrase = giftCanonical(input.value);
        if (!phrase) {
            say('还没填呢', 'error');
            input.focus();
            return;
        }

        busy = true;
        submit.disabled = true;
        submit.textContent = '看看对不对…';
        say('正在核对…');

        // SHA-256 是异步的，必须让出一帧，否则按钮会卡一下才变文案
        window.setTimeout(async () => {
            try {
                const digest = await crypto.subtle.digest(
                    'SHA-256',
                    new TextEncoder().encode(phrase)
                );
                const hex = Array.from(new Uint8Array(digest))
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('');

                if (hex !== expectHash) {
                    say('有答案不对，再想想', 'error');
                    return;
                }

                // 对上了。正文是明文写在 gift-letter.md 里的，
                // 表演页不需要密码 —— 直接跳过去。
                say('对了，正在打开…');
                // 延时一下让这句话被看见，不然跳得太快像是没反应
                window.setTimeout(() => window.location.replace('/gift/letter/'), 400);
            } catch {
                say('核对失败，稍后再试', 'error');
            } finally {
                busy = false;
                submit.disabled = false;
                submit.textContent = '提交';
            }
        }, 16);
    });

    // 只有一个输入框了，Enter 必须能直接提交 —— 五个框的时候靠 Tab 串，
    // 只有一个框再让人去点按钮是倒退
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    /* ---------- 时间锁 ---------- */

    let shown = false;

    const tick = () => {
        const now = Date.now();

        if (hasExpire && now >= expireAt) {
            lock(
                `<p class="gift-gate__title">已经结束啦</p>` +
                `<p class="gift-gate__hint">开放时间到 ${giftFormatDate(expireAt)} 为止。</p>`
            );
            return;
        }

        if (hasUnlock && now < unlockAt) {
            lock(
                `<p class="gift-gate__title">还没到时间</p>` +
                `<p class="gift-gate__count">${giftCountdown(unlockAt - now)}</p>` +
                `<p class="gift-gate__hint">${giftFormatDate(unlockAt)} 准时打开。</p>`
            );
            return;
        }

        if (shown) return;
        shown = true;
        gate.hidden = true;
        form.hidden = false;
        input.focus({ preventScroll: true });
    };

    const timer = window.setInterval(tick, 1000);
    tick();

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') tick();
    });

    window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
}

/* ============================================================
   表演页：粒子聚心 + 烟花 + 信封
   ------------------------------------------------------------
   ⚠️ 关于「这段动效用 Python 写」

   静态站没有后端，浏览器也不认 Python —— 所以**整段**动画不可能用 Python 跑在
   访客机器上。能用 Python 的是它的**数学部分**：粒子目标点、烟花初速度、
   配色、错峰延迟，全部由 .workbuddy/scripts/gift_fx.py 用 numpy 算好，
   导出成 assets/gift/fx.json。这里按那份数据逐帧画。

   分工：Python 负责「算什么」，浏览器负责「画出来」。
   改粒子数、改配色、改心形大小 → 改 Python 重跑一次；
   改动画节奏、改发光强度 → 改这里。

   好处：物理与配色用 numpy 写比 JS 好调（调参不用来回切浏览器看），
   数据只有 170 KB，换分辨率不用重新生成（坐标全是归一化的）。

   正文**没有加密** —— 答案答对就能读，跟普通文章一样直接写在 md 里。
   所以这里也没有解密、没有 sessionStorage 中转、没有兜底解密失败那一套。
   ============================================================ */

interface GiftParticle {
    /** 当前屏幕坐标 */
    x: number;
    y: number;
    /** 心形目标点（已乘上当前视口尺寸） */
    tx: number;
    ty: number;
    /** 色相 */
    hue: number;
    size: number;
    /** 错峰延迟，来自 Python 算好的 delay */
    delay: number;
    /** 烟花初速度（像素，fire() 每次重算） */
    vx: number;
    vy: number;
    /**
     * Python 算好的原始归一化初速度方向。
     * ⚠️ 必须单独存一份：fire() 会把 vx/vy 覆盖成像素值，
     *    而 burst 阶段要反复重放好几轮 —— 直接读 vx 会指数放大。
     */
    bvx: number;
    bvy: number;
    life: number;
    /** 该粒子绽放时的初始寿命（Python 给的，有差异，散完有先后） */
    life0: number;
    /**
     * 绽放方式：0 = 星火（向上飘）、1 = 环（径向成圈）、2 = 拖尾（斜上飞）。
     * ⚠️ 同一个初速度下三种画法观感差别很大：
     *    全走纯径向 = 心被炸碎（用户明确不要这个）；
     *    全走纯向上 = 像倒放的雨。只有掺着来才有层次。
     */
    kind: number;
    /** 已经炸开了 */
    fired: boolean;
    /** 起始点（散落阶段随机撒的位置，粒子从这里飞进心形） */
    ox: number;
    oy: number;
}

/** 背景星尘的一颗 */
interface GiftMote {
    /** 归一化坐标（-1.2 ~ 1.2，允许落在视口外） */
    nx: number;
    ny: number;
    size: number;
    /** 峰值亮度，很低 —— 这层只是让画面不空 */
    alpha: number;
    /** 漂移速度，单位「视口短边 / 秒」 */
    vx: number;
    vy: number;
    /** 闪烁相位与频率：亮度 = base × (0.55 + 0.45 × sin(elapsed/1000 × freq + phase)) */
    phase: number;
    freq: number;
    hue: number;
    /** 当前像素坐标（每帧由 nx/ny + 积分更新） */
    x: number;
    y: number;
}

/** 一个扩散椭圆环（冲击波） */
interface GiftShock {
    hue: number;
    /** 扩散速度，单位「视口短边 / 秒」 */
    speed: number;
    /** 环的平均粗细，单位「心形半宽」 */
    thickness: number;
    /** 相对 bloom 阶段开始的起跳延迟（毫秒） */
    delay: number;
    /** 峰值亮度 */
    peak: number;
    /** 椭圆扁率：1 = 正圆，0.72 = 明显扁 */
    squash: number;
    /** 旋转角（弧度） */
    tilt: number;
    /** 沿周长的粗细起伏波数 */
    wobbleN: number;
    /** 粗细起伏的相位 */
    wobblePhase: number;
}

/** fx.json 的形状（见 gift_fx.py 的产出说明） */
interface GiftFx {
    version: number;
    meta: {
        count: number;
        /** 心形方程的 x 振幅。Python 那边归一化时除的就是它 */
        heartAmp: number;
        /** 心形半宽 ÷ 视口短边 */
        heartRatio: number;
        /** 旧的「下坠」加速度，新逻辑优先用 lift；留着只为兼容 */
        gravity: number;
        /** 绽放时的向上加速度。**负值 = 向上**（canvas y 向下） */
        lift: number;
        damping: number;
        lifeDecay: number;
    };
    /** 每条 [归一化x, 归一化y, 尺寸, 色相, 错峰延迟] */
    heart: number[][];
    /** 每条 [vx, vy, 色相, 初始寿命, kind]，速度单位是「心形半宽」 */
    burst: number[][];
    /** 每条 [色相, 扩散速度, 粗细, 起跳延迟ms, 峰值亮度, 扁率, 旋转角, 起伏波数, 起伏相位] */
    shocks?: number[][];
    /** 每条 [x, y, 尺寸, 峰值alpha, vx, vy, 相位, 频率, 色相] */
    motes?: number[][];
    /** 每条 [x偏移, y偏移, 尺寸, vx, vy, 寿命, 色相] —— 绽放阶段中央那束金色喷泉 */
    sparks?: number[][];
    /**
     * 祝福卡片，每条
     * [hue, sat, light, x%, y%, 旋转角, 尺寸档, 延迟ms, 停留ms, 文案]
     *
     * ⚠️ 最后一项是**字符串**，不是数字 —— 祝福文案也走同一份 fx.json。
     *    卡片渲染成 DOM（见 custom.css 的 .gift-wish），不用 canvas 画：
     *    参考视频里那些是带圆角和阴影的「便签纸」，canvas 画不出质感，
     *    硬画只会像一堆彩色方块。
     */
    wishes?: (number | string)[][];
}

/** 余烬柱的一颗（bloom 阶段专用） */
interface GiftSpark {
    /** 相对心形中心的偏移（归一化，心形半宽的倍数） */
    ox: number;
    oy: number;
    size: number;
    /** 像素速度，fireSparks() 时算好 */
    vx: number;
    vy: number;
    life: number;
    life0: number;
    hue: number;
    x: number;
    y: number;
    active: boolean;
}

/** 一张祝福卡片（DOM，不是 canvas 粒子） */
interface GiftWish {
    hue: number;
    sat: number;
    light: number;
    /** 中心位置，占视口的百分比 */
    x: number;
    y: number;
    /** 歪斜角度（度） */
    rot: number;
    /** 尺寸档 0/1/2 */
    size: number;
    /** 相对 wish 阶段开始的延迟（毫秒） */
    delay: number;
    /** 停留时长（毫秒） */
    stay: number;
    text: string;
}

/** fx.json 拿不到时的兜底。用同一套坐标系，心形大小才对得上。 */
function giftFallbackFx(count = 1400): GiftFx {
    const heart: number[][] = [];
    const burst: number[][] = [];
    const AMP = 16.0;
    for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        const x = (16 * Math.pow(Math.sin(t), 3)) / AMP;
        const y =
            -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / AMP;
        const hue = 330 + Math.random() * 40;
        heart.push([x, y, 0.7 + Math.random() * 1.9, hue, Math.random() * 0.45]);
        const len = Math.hypot(x, y) || 1;
        // 兜底的「退回」方向：沿心形径向**慢速**外推，不给向上偏置。
        // ⚠️ 必须跟正式 fx.json 的观感一致，否则 fx.json 加载失败时
        //    心形会「炸开」而不是「散开」，跟设计意图完全相反。
        const radial = (x / len) * (0.18 + Math.random() * 0.30);
        burst.push([
            radial + (Math.random() - 0.5) * 0.22,
            (y / len) * (0.18 + Math.random() * 0.30) + (Math.random() - 0.5) * 0.18,
            320 + Math.random() * 60,
            0.75 + Math.random() * 0.25,
            Math.random() < 0.6 ? 0 : Math.random() < 0.75 ? 1 : 2,
        ]);
    }

    // 兜底祝福卡片：够铺满屏就行，文案不必跟 Python 那份完全一致
    const wishes: number[][] = [];
    const fallbackTexts = ['生日快乐', '天天开心', '万事顺心', '平安喜乐', '身体健康', '心想事成'];
    for (let i = 0; i < 42; i++) {
        const hue = [338, 350, 268, 206, 172, 146, 44, 26][i % 8];
        wishes.push([
            hue, 84, 70,
            (i % 7) * 14 + 7 + Math.random() * 4,
            Math.floor(i / 7) * 18 + 10 + Math.random() * 5,
            (Math.random() - 0.5) * 24, i % 3,
            i * 240, 3200 + Math.random() * 2000, fallbackTexts[i % fallbackTexts.length],
        ]);
    }

    return {
        version: 4,
        // ⚠️ heartRatio / lift 必须跟 gift_fx.py 的 meta 对齐，
        //    否则 fx.json 加载失败时页面会「心突然缩小一半」
        meta: {
            count,
            heartAmp: AMP,
            heartRatio: 0.036,
            gravity: 26,
            // ⚠️ lift / damping / lifeDecay 必须跟 gift_fx.py 的 meta 对齐，
            //    否则 fx.json 加载失败时粒子会在半秒内全部消失
            lift: 0.9,
            damping: 0.992,
            lifeDecay: 0.0011,
        },
        heart,
        burst,
        wishes,
    };
}

async function giftLoadFx(url: string): Promise<GiftFx> {
    try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as GiftFx;
        if (!data?.heart?.length || !data?.burst?.length) throw new Error('数据结构不对');
        return data;
    } catch {
        // 拿不到就用内置的 —— 表演照样能看，只是没有 Python 算的随机错峰
        return giftFallbackFx();
    }
}

function setupGiftShow() {
    const root = document.querySelector<HTMLElement>('[data-gift-show]');
    if (!root) return;

    const canvas = root.querySelector<HTMLCanvasElement>('[data-gift-canvas]');
    const caption = root.querySelector<HTMLElement>('[data-gift-caption]');
    // 祝福卡片层。⚠️ 可选 —— 拿不到就只是没有卡片，动画照跑。
    const wishLayer = root.querySelector<HTMLElement>('[data-gift-wishes]');
    const envelopeWrap = root.querySelector<HTMLElement>('[data-gift-envelope]');
    const envelopeBtn = root.querySelector<HTMLButtonElement>('[data-gift-open]');
    const letter = root.querySelector<HTMLElement>('[data-gift-letter]');
    const body = root.querySelector<HTMLElement>('[data-gift-body]');
    const fallback = root.querySelector<HTMLElement>('[data-gift-fallback]');
    const fallbackText = root.querySelector<HTMLElement>('[data-gift-fallback-text]');

    if (!canvas || !envelopeWrap || !envelopeBtn || !letter || !body) return;

    const fxUrl = root.dataset.fx ?? '';
    const unlockAt = giftTime(root.dataset.unlock);
    const expireAt = giftTime(root.dataset.expire);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const bail = (text: string) => {
        if (fallback && fallbackText) {
            fallbackText.textContent = text;
            fallback.hidden = false;
        }
        envelopeWrap.hidden = true;
        letter.hidden = true;
        if (caption) caption.textContent = '';
    };

    // 时间锁：解锁前 / 过期后都不演
    const now = Date.now();
    if (Number.isFinite(unlockAt) && now < unlockAt) {
        bail(`还没到时间 —— ${giftFormatDate(unlockAt)} 准时打开。`);
        return;
    }
    if (Number.isFinite(expireAt) && now >= expireAt) {
        bail('已经结束啦。');
        return;
    }

    // 过了时间就把正文收回去 —— 已经看过了也收
    const expireGuard = window.setInterval(() => {
        if (Number.isFinite(expireAt) && Date.now() >= expireAt) {
            window.clearInterval(expireGuard);
            letter.hidden = true;
            envelopeWrap.hidden = true;
            bail('已经结束啦。');
        }
    }, 30_000);

    /* ---------- 开信封 ---------- */

    let opening = false;
    envelopeBtn.addEventListener('click', () => {
        if (opening) return;
        opening = true;
        envelopeBtn.classList.add('is-open');
        if (caption) caption.textContent = '';

        // 等翻盖动画走完一半再放信纸出来，两段错开才不会像同时发生
        window.setTimeout(() => {
            envelopeWrap.hidden = true;
            letter.hidden = false;
        }, reduced ? 60 : 900);
    });

    envelopeBtn.focus({ preventScroll: true });

    /* ---------- canvas ---------- */

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const particles: GiftParticle[] = [];
    /** 背景星尘：全程都在，制造纵深 */
    const motes: GiftMote[] = [];
    /** 绽放时的扩散椭圆环 */
    const shocks: GiftShock[] = [];
    /** 绽放时中央往上窜的金色喷泉 */
    const sparks: GiftSpark[] = [];
    /** 祝福卡片（DOM 元素引用，渲染在 wishLayer 里） */
    const wishCards: HTMLElement[] = [];
    let fx: GiftFx | null = null;
    /** 心形半宽（像素） */
    let heartScale = 0;

    let startedAt = 0;
    let lastFrameAt = 0;
    let phase: 'draw' | 'hold' | 'retreat' | 'wish' | 'done' = 'draw';
    let rafId = 0;
    let envelopeShown = false;

    // 各阶段结束时刻（绝对毫秒），step() 里只跟 elapsed 比
    const T_HOLD_END = GIFT_SHOW.draw + GIFT_SHOW.hold;
    const T_RETREAT_END = T_HOLD_END + GIFT_SHOW.retreat;
    const T_WISH_END = T_RETREAT_END + GIFT_SHOW.wish;
    const T_END = T_WISH_END + GIFT_SHOW.fade;

    const resize = () => {
        // 移动端 dpr 压到 2，再高纯属浪费（粒子本身是模糊光点，看不出差别）
        const dpr = Math.min(window.devicePixelRatio || 2, 2);
        width = canvas.clientWidth || window.innerWidth;
        height = canvas.clientHeight || window.innerHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // 心形半宽（像素）：视口短边 × ratio × 方程振幅。
        // ⚠️ ratio / amp 必须跟 gift_fx.py 写进 fx.json 的一致，
        //    两边对不上心就会缩成一个小点或撑爆屏幕。
        //    ratio 现在是 0.036 ⇒ 心形竖向占约 72% 屏幕。
        //
        // ⚠️ 竖屏必须再压一档，否则心形下缘会超出视口（实测 390×844 时
        //    内容范围 y 到了 161%）。原因：min(宽,高) 在竖屏下 = 宽度，
        //    而心形方程的**竖直幅度比水平大**（y 振幅 17 对 x 的 16），
        //    横向刚好占满时纵向就溢出了。
        //    所以竖屏额外乘 0.72，让纵向留出余量给信封。
        const ratio = fx?.meta.heartRatio ?? 0.036;
        const amp = fx?.meta.heartAmp ?? 16.0;
        const portrait = height > width;
        heartScale =
            Math.min(width, height) * ratio * amp * (portrait ? 0.72 : 1);
    };

    /** 把 Python 给的归一化数据铺成实际粒子 */
    const seed = () => {
        if (!fx) return;
        const cx = width / 2;
        const cy = height / 2;
        particles.length = 0;

        for (let i = 0; i < fx.heart.length; i++) {
            const [nx, ny, size, hue, delay] = fx.heart[i];
            const b = fx.burst[i] ?? [0, 0, hue, 1, 0];
            particles.push({
                // 起点撒满视口，飞进来才有「聚拢」的感觉
                ox: Math.random() * width,
                oy: Math.random() * height,
                x: 0,
                y: 0,
                tx: cx + nx * heartScale,
                ty: cy + ny * heartScale,
                hue,
                size,
                delay,
                vx: (b[0] ?? 0) * heartScale,
                vy: (b[1] ?? 0) * heartScale,
                bvx: b[0] ?? 0,
                bvy: b[1] ?? 0,
                life: b[3] ?? 1,
                life0: b[3] ?? 1,
                kind: b[4] ?? 0,
                fired: false,
            });
        }

        // 背景星尘
        motes.length = 0;
        for (const m of fx.motes ?? []) {
            const [nx, ny, size, alpha, vx, vy, phase, freq, hue] = m;
            motes.push({
                nx,
                ny,
                size,
                alpha,
                vx,
                vy,
                phase,
                freq,
                hue,
                x: cx + nx * heartScale,
                y: cy + ny * heartScale,
            });
        }

        // 冲击波圆环
        shocks.length = 0;
        for (const s of fx.shocks ?? []) {
            const [hue, speed, thickness, delay, peak, squash, tilt, wobbleN, wobblePhase] = s;
            shocks.push({
                hue,
                speed,
                thickness,
                delay,
                peak,
                // 旧版数据只有 5 个字段，补上默认值 ⇒ 仍是正圆
                squash: squash ?? 1,
                tilt: tilt ?? 0,
                wobbleN: wobbleN ?? 1,
                wobblePhase: wobblePhase ?? 0,
            });
        }

        // 金色余烬柱
        sparks.length = 0;
        for (const s of fx.sparks ?? []) {
            const [ox, oy, size, s_vx, s_vy, life, hue] = s;
            sparks.push({
                ox,
                oy,
                size,
                vx: 0,
                vy: 0,
                life: 0,
                life0: life || 0.7,
                hue,
                x: cx + ox * heartScale,
                y: cy + oy * heartScale,
                active: false,
            });
        }
    };

/**
     * 点燃中央的金色喷泉（hold 收尾时闪一下，给心一个仪式感的结束）。
     */
    const fireSparks = () => {
        const cx = width / 2;
        const cy = height / 2;
        const data = fx?.sparks;
        if (!data || !data.length) return;
        for (let i = 0; i < sparks.length; i++) {
            const sp = sparks[i];
            const d = data[i];
            sp.vx = (d[3] ?? 0) * heartScale;
            sp.vy = (d[4] ?? 0) * heartScale;
            sp.life = d[5] ?? 0.7;
            sp.life0 = d[5] ?? 0.7;
            sp.x = cx + (d[0] ?? 0) * heartScale;
            sp.y = cy + (d[1] ?? 0) * heartScale;
            sp.active = true;
        }
    };

    /**
     * 心形「退回散开」—— 给每颗粒子一个慢速外推的速度。
     *
     * ⚠️ 与旧版 fire() 的区别，这是这次重做的关键：
     *    旧版给的是「从心形中心指向粒子的**径向速度 + 向上偏置**」，
     *    粒子朝各个方向飞出屏幕 —— 视觉上心被炸碎，满屏渣渣。
     *    现在 Python 侧给的 burst 方向改成：**纯径向、慢速、无向上偏置**，
     *    这里只负责把归一化速度换算成像素。
     *
     *    ⇒ 粒子在原地附近慢慢飘散开，读起来是「心化开了」，
     *      而不是「心炸了」。这正是参考视频里的观感。
     *
     * ⚠️ 必须用 bvx / bvy（seed 时存下的**原始归一化速度**），
     *    不是 p.vx / p.vy —— 后者被覆盖成像素值，反复调用会指数放大。
     */
    const scatterHeart = () => {
        for (const p of particles) {
            // kind 保留给「少量粒子飞得更远」用：拖尾类飞 1.6 倍，
            // 让散开的方向不那么整齐
            const speedMul = p.kind === 2 ? 1.6 : p.kind === 1 ? 1.15 : 1;
            p.vx = p.bvx * heartScale * speedMul;
            p.vy = p.bvy * heartScale * speedMul;
            p.life = p.life0;
            p.fired = true;
        }
    };

/**
     * 构建祝福卡片（DOM，不是 canvas 粒子）。
     *
     * ⚠️ 为什么用 DOM：参考视频里那些是**带圆角、带阴影、写着字**的便签纸。
     *    canvas 画不出阴影，画出来只是一堆彩色圆点，没有质感。
     *    八十几个绝对定位的 div 完全不吃性能。
     *
     * ⚠️ 一次性全部建好、靠 CSS animation-delay 错峰出现 ——
     *    不用 setTimeout 一个个塞：那样 fade 阶段不好统一回收，
     *    页面切走时还会留下悬空的定时器。
     *
     * ⚠️⚠️ 竖屏必须**重排 + 限量**，不能只靠 CSS 缩放。
     *
     * Python 按「8 列 × 10 行 = 80 张」铺位置（y 从 7% 到 90%），
     * 那是照着**桌面 1440×900** 算的。手机视口 390×844，比例完全不同：
     *
     *   横向：桌面 8 列各占 12.5% 宽；手机上一张四字卡片就有 ~15% 宽
     *        ⇒ 8 列根本排不下，实测左右各被切掉 18 张
     *   纵向：同样 10 行，手机的行距被拉大 ⇒ 卡片全挤在屏幕 40% 以下，
     *        **上半屏空一大片**
     *
     * 算过竖屏的物理上限（390×844，卡片 60×40px）：
     *   4 列（列距 22%，容得下）× 10 行（行距 8.2%）= **40 张**
     *   5 列不行 —— 列距 17.6% < 卡片占的 20.8%，必然重叠出界。
     *
     * ⇒ 竖屏用 4×10 = 40 张并**只渲染前 40 条**，剩下的根本不建 DOM
     *   （不是隐藏）。顺带把手机上要建的节点数减半，动画更跟手。
     *
     * ⚠️ 为什么必须在 JS 做：只有这里知道 window.innerWidth。
     *   CSS 媒体查询能改样式，但没法「少建 40 个元素」。
     */
    const buildWishes = () => {
        const data = fx?.wishes;
        if (!data?.length || !wishLayer) return;

        // 尺寸档 → 字号。⚠️ 主题 html 是 62.5%，1rem = 10px，
        // 所以 13.5px ≈ 1.35rem。别按 16px 直觉写 rem，会小到离谱。
        const sizePx = [13.5, 15.5, 18];

        const portrait = window.innerHeight > window.innerWidth;
        const cols = portrait ? 4 : 8;
        const maxCards = portrait ? 40 : data.length;

        for (let i = 0; i < Math.min(data.length, maxCards); i++) {
            const row = data[i];
            const [hue, sat, light, xp, yp, rot, size, delay, stay, text] = row;

            let left = xp as number;
            let top = yp as number;
            let scale = 1;

            if (portrait) {
                // 保留原始位置里的抖动量（只借随机感，不照抄坐标），
                // 再按 4×10 新网格铺满全屏
                const srcCol = i % 8;
                const srcRow = Math.floor(i / 8);
                const jitterX = (xp as number) - ((srcCol + 0.5) / 8 * 100);
                const jitterY = (yp as number) - ((srcRow + 0.5) / 10 * 100);

                const newCol = i % cols;
                const newRow = Math.floor(i / cols);

                // 横向：4 列铺 8%~92%
                left = 8 + ((newCol + 0.5) / cols) * 84 + jitterX * 0.5;
                // 纵向：10 行铺 8%~90%
                top = 8 + ((newRow + 0.5) / 10) * 82 + jitterY * 0.5;
                scale = 0.84;
            }

            const el = document.createElement('div');
            el.className = 'gift-wish';
            el.textContent = String(text);
            el.style.left = `${Math.max(12, Math.min(88, left))}%`;
            el.style.top = `${Math.max(6, Math.min(92, top))}%`;
            el.style.setProperty('--w-hue', String(hue));
            el.style.setProperty('--w-sat', `${sat as number}%`);
            el.style.setProperty('--w-light', `${light as number}%`);
            el.style.setProperty('--w-rot', `${rot as number}deg`);
            el.style.setProperty('--w-size', `${sizePx[(size as number) | 0] ?? sizePx[1]}px`);
            el.style.setProperty('--w-scale', String(scale));
            // ⚠️ delay / stay 写进 CSS 变量，动画节奏全在 custom.css 里，
            //    JS 不参与调度 ⇒ prefers-reduced-motion 那边一刀切就够。
            //
            // ⚠️⚠️ 竖屏不能「按比例压缩」delay，必须**重新按批次铺开**。
            // 踩过的坑：前 40 条的 delay 只到 5745ms（数据里正好是 5 批），
            // 按 40/80 = 0.5 压缩后 → 3.8 秒就播完，
            // 而 wish 阶段有 15 秒 ⇒ 后 11 秒屏幕全空，
            // 实测「DOM 里 40 张卡」但 20 秒时可见 0 张。
            //
            // 正确做法：先算出「每批间隔」= wish 时长 / 批数，
            // 再让同批的卡片都落在那一批的延迟上 —— 时间轴重新铺满。
            /* ⚠️⚠️ 全部卡片**同时在场**，不做批次接力。
             *
             * 参考视频里那 80+ 张是**一瞬间铺满**的，不是一批批换。
             * 之前试过两种接力方案，效果都差：
             *  ① 按比例压缩 delay → 前 40 条的 delay 只到 5745ms
             *     （数据里正好 5 批），压缩后 3.8 秒就播完，
             *     而 wish 有 15 秒 ⇒ 后 11 秒屏幕全空。
             *  ② 按批次重铺时间轴 → 任何时刻屏幕上只有 8~16 张，
             *     截图上半屏整片空，跟参考视频差很远。
             *
             * ⇒ delay 全 0、stay 覆盖整个 wish 阶段。
             *   唯一的「变化」是每张卡片的 rotate 和位置不同，
             *   视觉上仍是满屏，但不是「换批」。
             */
            el.style.setProperty('--w-delay', '0ms');
            // 留 1.2 秒淡出余量：stay 到点后 out 动画还要 0.85 秒
            el.style.setProperty('--w-stay', `${GIFT_SHOW.wish - 1200}ms`);
            wishLayer.appendChild(el);
            wishCards.push(el);
        }
    };

    /** 回收所有卡片（fade 阶段调一次，别留着占内存） */
    const clearWishes = () => {
        for (const el of wishCards) el.remove();
        wishCards.length = 0;
    };

    const showEnvelope = () => {
        if (envelopeShown) return;
        envelopeShown = true;
        envelopeWrap.hidden = false;
        if (caption) caption.textContent = '';
    };

    const step = (now: number) => {
        const elapsed = now - startedAt;

        /* ---- 阶段推进 ----
         * ⚠️ 五阶段是一条链，每一步只跟前一步比，别用「elapsed > 绝对时刻」
         *    混着写 —— 改某个阶段时长时很容易漏改一处，表现就是某个阶段被跳过。
         */
        if (phase === 'draw' && elapsed > GIFT_SHOW.draw) phase = 'hold';
        if (phase === 'hold' && elapsed > T_HOLD_END) {
            phase = 'retreat';
            // 心形开始「退回散开」
            scatterHeart();
            // 收尾闪一下金色喷泉 —— 心定格的最后一拍
            fireSparks();
        }
        if (phase === 'retreat' && elapsed > T_RETREAT_END) {
            phase = 'wish';
            // ⚠️ 卡片在这里才建：wish 阶段开始前屏幕上不能有它们，
            //    否则「心散开」的时候旁边已经飘着卡片，注意力被抢走。
            root.classList.add('is-wishing');
            buildWishes();
        }
        if (phase === 'wish' && elapsed > T_WISH_END) {
            phase = 'done';
            clearWishes();
            root.classList.remove('is-wishing');
        }

        /* ---- 时间驱动，而不是帧驱动 ----
         * ⚠️ 这一段是从「按帧」改成「按时间」的核心。
         *    原来每帧 p.t += 0.008，粒子 125 帧（约 2 秒）就聚完心形，
         *    剩下的十几秒只能干站着。
         *    现在进度直接由 elapsed / 阶段时长算出：
         *      · 帧率高 → 帧多，但每帧走得更少
         *      · 帧率低（老手机）→ 帧少，每帧走得多
         *    两者观感一致，三十秒就是三十秒。
         */
        const dt = Math.min(0.05, (now - lastFrameAt) / 1000) || 0.016;
        lastFrameAt = now;

        const tSec = elapsed / 1000;
        // draw：0→1 描边进度。hold：0→1 心跳进度。
        const drawP = Math.min(1, elapsed / GIFT_SHOW.draw);
        const holdP = Math.max(0, (elapsed - GIFT_SHOW.draw) / GIFT_SHOW.hold);

        // 心跳：hold 阶段一下一下地缩放。
        // 频率用「每分钟 62 次」换算 —— 写死一个常数是按某个阶段的秒数
        // 调的，阶段时长一改心跳就会变得忽快忽慢。
        let scaleMul = 1;
        if (phase === 'hold') {
            const beat = Math.max(0, Math.sin(tSec * ((62 / 60) * Math.PI * 2)));
            scaleMul = 1 + beat * beat * 0.045;
        }

        /* ---- 画 ---- */
        const darken =
            phase === 'done' ? Math.max(0, 1 - (elapsed - T_WISH_END) / GIFT_SHOW.fade) : 1;

        ctx.clearRect(0, 0, width, height);
        if (darken <= 0.02) {
            rafId = 0;
            showEnvelope();
            return;
        }

        const cx = width / 2;
        const cy = height / 2;
        const shortSide = Math.min(width, height);

        // 'lighter' 让密集处自然过曝成亮白，比逐个画光晕快得多也好看
        ctx.globalCompositeOperation = 'lighter';

        /* ---- ① 背景星尘：全程都在，最先画（在最底层） ----
         * 亮度按 sin 呼吸，每颗频率不同（Python 给），
         * 加上向上飘 —— 越过视口顶边就从底部循环回来。 */
        for (const m of motes) {
            m.x += m.vx * shortSide * dt;
            m.y += m.vy * shortSide * dt;
            // 飘出上边界就从下方回来（无限循环）
            if (m.y < -shortSide * 0.25) {
                m.y = height + shortSide * 0.2;
                m.x = cx + m.nx * shortSide;
            }
            if (m.x < -shortSide * 0.25) m.x = width + shortSide * 0.2;
            else if (m.x > width + shortSide * 0.25) m.x = -shortSide * 0.2;

            const twinkle = 0.55 + 0.45 * Math.sin(tSec * m.freq + m.phase);
            const a = m.alpha * twinkle * darken;
            if (a <= 0.005) continue;
            ctx.fillStyle = `hsla(${m.hue}, 70%, 72%, ${a})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fill();
        }

        /* ---- ② 心形辉光底：中心一团柔光 ----
         * ⚠️ 必须画在主粒子**下面**（现在编号排②，主粒子是③）。
         *    之前它写在最后、画在最上层，径向渐变会把已经成形的心形糊掉 ——
         *    'lighter' 模式下 0.16 的粉紫叠上去，心内部直接变成一团糊。
         *    让心「发亮」而不是「一堆亮点」。
         *
         * ⚠️ draw 阶段**刻意不给辉光** —— 描边时中心还是空的，
         *    一团中心光会把空心轮廓填实，正好毁掉这次要的效果。
         *    等 hold（心已完整）才渐亮。 */
        if (phase === 'hold' || phase === 'retreat' || phase === 'wish') {
            const glowR = heartScale * (1.05 + 0.05 * Math.sin(tSec * 2));
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
            // 散开之后要快速收掉 —— wish 阶段的主角是卡片，不是这团光
            const ga = (phase === 'hold' ? 0.13 : phase === 'retreat' ? 0.06 : 0.03) * darken;
            g.addColorStop(0, `hsla(330, 90%, 70%, ${ga})`);
            g.addColorStop(0.55, `hsla(300, 85%, 60%, ${ga * 0.45})`);
            g.addColorStop(1, 'hsla(280, 80%, 55%, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

        /* ---- ③ 扩散椭圆环：retreat（心散开）时放一圈 ----
         * ⚠️ 分段画而不是一次 arc()，因为要沿周长调制粗细。
         *    一次画出来的完美正圆在动态画面里极其扎眼，像 PS 的辅助线；
         *    真实烟火是**略扁的椭圆**（上升气流把它压扁），粗细也不均匀。
         *    放在粒子**之前**画，环才像在粒子后面扩散。
         */
        if (phase === 'retreat' || phase === 'wish' || phase === 'done') {
            const retreatElapsed = elapsed - T_HOLD_END;
            const SEG = 72;
            for (const s of shocks) {
                const local = (retreatElapsed - s.delay) / 1000;
                if (local <= 0) continue;
                const r = local * s.speed * shortSide;
                if (r > shortSide * 1.6) continue;
                const t = Math.min(1, local / 3.2);
                // 淡出用平方：起手亮、后面快速收，避免环张到最大时还很刺眼
                const a = s.peak * (1 - t) * (1 - t) * darken;
                if (a <= 0.004) continue;

                const baseLw = Math.max(1.5, s.thickness * heartScale * (1 - t * 0.5));
                const cosTilt = Math.cos(s.tilt);
                const sinTilt = Math.sin(s.tilt);

                for (let i = 0; i < SEG; i++) {
                    const th = (i / SEG) * Math.PI * 2;
                    // 椭圆：先在单位圆上取点，沿 y 压扁，再整体旋转
                    const ex = Math.cos(th) * r;
                    const ey = Math.sin(th) * r * s.squash;
                    const px = cx + ex * cosTilt - ey * sinTilt;
                    const py = cy + ex * sinTilt + ey * cosTilt;

                    // 沿周长的粗细起伏：让环不是均匀的「笔画」
                    const wob = 0.62 + 0.38 * Math.sin(th * s.wobbleN + s.wobblePhase);
                    ctx.strokeStyle = `hsla(${s.hue}, 96%, 72%, ${a * wob})`;
                    ctx.lineWidth = baseLw * wob;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px, py);
                    ctx.stroke();
                }
            }
        }

        /* ---- ④ 主粒子群 ----
         * ⚠️ 这是「描边 → 定住 → 慢速散开」三段的核心：
         *    · draw    —— 从屏幕中心**逐段描出**心的边（不是从四周飞过来）
         *    · hold    —— 定在轮廓上，跟着心跳一起缩放
         *    · retreat —— 沿径向**慢速**外推，粒子逐渐变淡
         */
        for (const p of particles) {
            if (!p.fired) {
                // ---- 描边 / 定住 ----
                // 每颗粒子有自己的错峰 delay（Python 给），进度到它时才出发。
                // 关键是**位移插值**而不是「直接跳到目标」——
                // 直接赋值会看到粒子「啪」地一下出现，不是「长出来」。
                const lead = p.delay * 0.42;
                const local = Math.max(0, Math.min(1, (drawP - lead) / (1 - lead)));
                // easeOutCubic：起手快、收尾慢，读起来像笔锋渐隐
                const eased = 1 - Math.pow(1 - local, 3);

                // 起点：屏幕正中心一点（参考视频里心是从中心「长」出来的，
                // 不是从四周飞过来聚拢的 —— 后者更像「粒子聚形」，
                // 前者更像「一笔画出来」）
                const sx = cx;
                const sy = cy;

                // 心跳时目标点整体缩放
                const gx = cx + (p.tx - cx) * scaleMul;
                const gy = cy + (p.ty - cy) * scaleMul;

                // 先走到中心点，再从中心「长」到目标 —— 两段式，
                // 这样起点是一致的（一束），而不是各散各的
                const toCenter = Math.min(1, eased * 2.2);
                const grow = Math.max(0, Math.min(1, (eased - 0.45) / 0.55));
                p.x = sx + (gx - sx) * toCenter * grow;
                p.y = sy + (gy - sy) * toCenter * grow;
            } else {
                // ---- 退回散开：按真实 dt 积分 ----
                // ⚠️ 写死 0.016 的话，120Hz 屏幕上会比 60Hz 快一倍。
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                // 阻尼按 dt 折算，否则高刷屏上衰减快一倍
                const damp = Math.pow(fx!.meta.damping, dt * 60);
                p.vx *= damp;
                p.vy *= damp;
                // ⚠️ lift 现在是**很轻的下坠**（正值 0.9）。
                //    之前这里是 -5（向上），粒子全堆到画面顶部 ——
                //    参考视频里心是「原地化开」，不是「往天上飘」。
                p.vy += (fx!.meta.lift ?? 0.9) * dt * 60;
                p.life -= fx!.meta.lifeDecay * dt * 60;
            }

            if (p.life <= 0) continue;

            // 亮度：draw 时用 eased（跟着描边进度一起亮起来），
            // hold 时满亮，retreat 之后按剩余寿命线性收掉
            let base: number;
            if (p.fired) {
                base = 0.9 * (p.life / p.life0);
            } else {
                // 描边进度：粒子还没到的部分是暗的 ⇒ 边缘有一圈「正在生长」的暗区
                const lead = p.delay * 0.42;
                const local = Math.max(0, Math.min(1, (drawP - lead) / (1 - lead)));
                base = 0.20 + 0.80 * (1 - Math.pow(1 - local, 3));
                // hold/retreat 之后目标点不再移动，保持满亮
                if (elapsed > GIFT_SHOW.draw) base = 1.0;
            }

            const alpha = base * darken;
            if (alpha <= 0.01) continue;

            ctx.fillStyle =
                `hsla(${p.hue}, 94%, ${64 + (1 - Math.min(1, drawP)) * 8}%, ${alpha})`;
            ctx.beginPath();
            // 散开时略微放大：像失焦的余烬
            const sizeMul = p.fired ? (p.kind === 2 ? 1.4 : 1.12) : 1;
            ctx.arc(p.x, p.y, p.size * sizeMul, 0, Math.PI * 2);
            ctx.fill();
        }

        /* ---- ⑤ 光带：hold 阶段绕着心形轮廓跑的一道亮线 ----
         * ⚠️ 这是让 hold 阶段不显得「干站着」的关键。
         *    做法：给每颗粒子一个随时间循环的相位偏移，
         *    相位差的绝对值小于阈值就点亮 —— 视觉上就是一道光带绕圈跑。
         *    比整体亮度呼吸更「活」，因为亮的是**局部**。
         *
         * ⚠️ 用 atan2 的角度差定位，对**空心轮廓**特别合适：
         *    轮廓上每一点都有唯一的角度，光带天然贴着边跑，
         *    不会跑到心形内部去（实心心的话内部粒子会一起亮，反而糊了）。 */
        if (phase === 'hold') {
            const bandPos = (tSec * 0.62) % 1;          // 光带绕一圈的周期 ≈ 1.6s
            const bandHalf = 0.070;                     // 光带占整圈的宽度
            for (const p of particles) {
                // 用目标点相对中心的角度当相位，保证光带贴着心形轮廓
                const ang = Math.atan2(p.ty - cy, p.tx - cx);
                const norm = (ang + Math.PI) / (Math.PI * 2);
                // 环形距离（0 附近最亮），用最短弧
                let d = Math.abs(norm - bandPos);
                if (d > 0.5) d = 1 - d;
                if (d > bandHalf) continue;
                const f = 1 - d / bandHalf;              // 0~1，中心最亮
                ctx.fillStyle = `hsla(48, 100%, 82%, ${0.55 * f * f * darken})`;
                ctx.beginPath();
                ctx.arc(cx + (p.tx - cx) * scaleMul, cy + (p.ty - cy) * scaleMul,
                        p.size * 2.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        /* ---- ⑥ 金色余烬柱：bloom 阶段中央那束往上窜的喷泉 ----
         * 画在主粒子**之后**：它是整个绽放段的视觉焦点，
         * 叠在上层才压得住均匀散开的面。
         * 寿命比主粒子短（life0 0.45~0.85 ⇒ 1.5~2.8 秒），
         * 所以它总是「窜一下就没」，配上下一次点燃才有节奏感。 */
        for (const sp of sparks) {
            if (!sp.active || sp.life <= 0) continue;
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            const damp = Math.pow(fx!.meta.damping, dt * 60);
            sp.vx *= damp;
            sp.vy *= damp;
            sp.vy += (fx!.meta.lift ?? 0.9) * dt * 60;
            sp.life -= fx!.meta.lifeDecay * dt * 60 * 1.05;   // 比主粒子略快

            if (sp.life <= 0) { sp.active = false; continue; }
            // 亮度的衰减用平方：起手「窜」出来时很亮，随后快速收掉
            const a = Math.pow(sp.life / sp.life0, 2) * 0.95 * darken;
            if (a <= 0.01) continue;
            ctx.fillStyle = `hsla(${sp.hue}, 98%, ${66 + 14 * (sp.life / sp.life0)}%, ${a})`;
            ctx.beginPath();
            // 快灭时画大一点糊开，像余烬散掉
            const r = sp.size * (1 + (1 - sp.life / sp.life0) * 0.9);
            ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        /* ---- ⑦ 辉光：散开阶段叠一层大尺寸低透明度光点 ----
         * ⚠️ 采样点从 40 提到 130，原因：粒子散开后每个位置只有零星几颗，
         *    单点辉光叠不出「一片火光」的整体感。
         *    步长用 37（与粒子数互质）保证取样不落规律。
         *
         * ⚠️ wish 阶段必须**关掉**：那一段的主角是满屏的祝福卡片，
         *    粒子辉光继续叠在上面会让卡片读不清、显得画面脏。 */
        if (phase === 'retreat') {
            for (let i = 0; i < 130; i++) {
                const p = particles[(i * 37) % particles.length];
                if (!p.fired || p.life <= 0) continue;
                const a = 0.13 * (p.life / p.life0) * darken;
                if (a <= 0.006) continue;
                ctx.fillStyle = `hsla(${p.hue}, 95%, 76%, ${a})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalCompositeOperation = 'source-over';

        /* ---- 收尾 ---- */
        if (phase === 'done') {
            if (elapsed - T_WISH_END > GIFT_SHOW.fade * 0.5) showEnvelope();
            rafId = window.requestAnimationFrame(step);
            return;
        }

        /* ---- 字幕（也给读屏用户一份时间线） ---- */
        if (caption) {
            if (phase === 'draw') caption.textContent = '…';
            else if (phase === 'hold') caption.textContent = '';
            else if (phase === 'wish') caption.textContent = '';
        }

        rafId = window.requestAnimationFrame(step);
    };

    const start = () => {
        // ⚠️ 顺序不能换：resize() 要先算出 heartScale，
        //    seed() 才拿得到位置系数把粒子铺开。反了的话所有粒子会叠在正中一点。
        resize();
        seed();
        // ⚠️ 起点全部放在**屏幕正中心**（step() 里的描边插值也用中心点做起点）。
        //    旧版撒满全屏再聚拢，那是「粒子聚形」；参考视频是从中心
        //    「一笔长出」心形，观感完全不同。ox/oy 现在只是备份值，
        //    resize 时重置用。
        for (const p of particles) {
            p.x = width / 2;
            p.y = height / 2;
        }

        if (reduced) {
            showEnvelope();
            return;
        }
        startedAt = performance.now();
        lastFrameAt = startedAt;
        rafId = window.requestAnimationFrame(step);
    };

    /* ---------- 装载数据 → 起播 ---------- */

    void giftLoadFx(fxUrl).then((data) => {
        fx = data;
        // ⚠️ 顺序：start() 里先 resize() 算出 heartScale，再 seed() 把粒子
        //    铺到位置上。先 seed 的话 heartScale 还是 0，所有粒子会叠在正中一点。
        start();
    });

    window.addEventListener('resize', () => {
        if (phase === 'done' || envelopeShown) return;
        resize();
        // ⚠️ resize 后必须重新铺位置，否则粒子会留在旧坐标上，
        //    画面尺寸一变就看到粒子「跳」到别处。
        //    卡片位置用的是**百分比**，天然跟着视口缩放，不用重建。
        seed();
        if (phase === 'draw') {
            // 描边阶段：全部回到屏幕中心（跟 start() 的初始状态一致）
            for (const p of particles) {
                p.x = width / 2;
                p.y = height / 2;
            }
        }
    }, { passive: true });

    window.addEventListener('pagehide', () => {
        if (rafId) window.cancelAnimationFrame(rafId);
        window.clearInterval(expireGuard);
        clearWishes();
        root.classList.remove('is-wishing');
        void T_END; // 保留常量引用，提醒改时间线时五个阶段是一组
    });
}

document.addEventListener('DOMContentLoaded', setupSecretPost);
document.addEventListener('DOMContentLoaded', setupGiftMenu);
document.addEventListener('DOMContentLoaded', setupGiftQuiz);
document.addEventListener('DOMContentLoaded', setupGiftShow);
