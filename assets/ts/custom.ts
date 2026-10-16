import { setupGiftShow } from './gift-show';
import { primeGiftAudio } from './gift-audio';

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
 *
 * 另外这里是 KaTeX 的调用方（公式渲染本身的库与样式是本地静态资源，
 * 由 layouts/_partials/head/custom.html 挂载）：
 *   5. 正文公式渲染
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
    // The birthday show has its own soundtrack and playback controls.
    if (document.querySelector('[data-gift-show]')) return;
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

/**
 * 正文公式渲染（KaTeX + auto-render）
 *
 * 库与样式是本地静态资源，见 layouts/_partials/head/custom.html 的挂载段：
 *   /katex/katex.min.css + katex.min.js + contrib/auto-render.min.js
 * 本函数只负责「告诉 auto-render 去哪扫、扫什么分隔符」。
 *
 * ⚠️ 为什么要挂这一段：static/katex/ 里的文件早就下载好了，
 *    但没在页面里挂载就等于不存在。2026-10-16 收到第一篇带公式的投稿
 *    （《从一道 x→−∞ 的根号极限说起》）才发现公式全是裸的 $$ 文本。
 *
 * ⚠️ 为什么用 auto-render 而不是 Hugo 服务端渲染：
 *    本站没配 math 引擎，纯前端最省事，也不拖慢静态站点的构建。
 *
 * ⚠️ 只扫 .article-content：侧栏、页脚都没有公式，
 *    全页扫反而可能把代码块里的 $ 误判成公式。
 *
 * ⚠️ 忽略 code / pre：代码示例里常有 `$VAR`、`$(...)` 这类写法，
 *    不排除掉会被当成公式渲染成一坨错的东西。
 */
function setupKatex() {
    const content = document.querySelector('.article-content');
    if (!content) return;

    const render = (window as any).renderMathInElement;
    if (typeof render !== 'function') return; // 资源没加载成功就别硬调

    render(content, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
        throwOnError: false
    });
}

document.addEventListener('DOMContentLoaded', setupKatex);
document.addEventListener('DOMContentLoaded', setupCodeGroups);
document.addEventListener('DOMContentLoaded', setupParticleBackground);
document.addEventListener('DOMContentLoaded', setupSiteRuntime);
document.addEventListener('DOMContentLoaded', setupArchiveMenu);
document.addEventListener('DOMContentLoaded', setupMusicPlayer);
/* ============================================================
   Gift 流程：五道题 → 爱心弹窗 → 星空蛋糕 → 信封 → 正文
   ------------------------------------------------------------
   两个页面各管一段：

     /gift/          setupGiftQuiz()  收五个答案 → 拼串 → SHA-256
                     比对 front matter 里的 answersHash，对上了就跳走。

     /gift/letter/   setupGiftShow()  播放 gift-show.ts 中的连续演出，点信封显示正文。

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
    const stage = document.querySelector<HTMLElement>('[data-gift-show]');

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
        const releaseAudio = primeGiftAudio(stage);
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

                // Recheck the time window after asynchronous verification.
                const verifiedAt = Date.now();
                if ((hasExpire && verifiedAt >= expireAt) || (hasUnlock && verifiedAt < unlockAt)) {
                    tick();
                    return;
                }
                say('对了，正在打开…');
                releaseAudio();
                if (stage) {
                    // Keep the document and audio element alive across the transition.
                    root.hidden = true;
                    stage.hidden = false;
                    document.body.classList.remove('article-page');
                    document.body.classList.add('gift-page');
                    document.title = stage.dataset.title || document.title;
                    window.history.replaceState(null, '', stage.dataset.url || '/gift/letter/');
                    window.clearInterval(timer);
                    setupGiftShow();
                } else {
                    window.location.replace('/gift/letter/');
                }
            } catch {
                say('核对失败，稍后再试', 'error');
            } finally {
                releaseAudio();
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

document.addEventListener('DOMContentLoaded', setupSecretPost);
document.addEventListener('DOMContentLoaded', setupGiftMenu);
document.addEventListener('DOMContentLoaded', setupGiftQuiz);
document.addEventListener('DOMContentLoaded', setupGiftShow);
