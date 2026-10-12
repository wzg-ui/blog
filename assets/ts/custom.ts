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
   右上角唱片播放器
   ------------------------------------------------------------
   取代了原来的 APlayer 左下角浮层。设计要求：
   · 收起时是右上角一张黑胶唱片，播放时转，暂停就停在原地
   · 点开才展开歌单面板，点哪首放哪首，带进度条与上下曲
   · 数据仍走 Meting 兼容接口，配置在 params.toml 的 [music]

   几个刻意的处理：
   · 列表不显示封面 —— 热歌榜 200 首就是 200 个图片请求，
     只给唱片本体加载一张，省下的流量比列表好看重要
   · 歌单元数据在页面空闲时预取，点开面板不用等
   · 旋转靠 animation-play-state 起停，不是自己算角度，
     所以暂停会停在当前角度，不会跳回 0°
   · 标签页切到后台就暂停，不在看不见的地方放歌
   · 单曲取流失败自动跳下一首，但不无限跳（连错 3 次就停）
   ============================================================ */

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

    const { api = '', server = 'netease', type = 'playlist', id = '' } = root.dataset;
    if (!api || !id) return;

    // :server / :type / :id 三个占位符由 Meting 接口约定，顺序不能动
    const endpoint = api
        .replace(':server', server)
        .replace(':type', type)
        .replace(':id', id);

    const shuffling = root.dataset.order === 'random';
    const volume = Number(root.dataset.volume ?? 0.5);
    audio.volume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.5;

    let tracks: MusicTrack[] = [];
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

    const playAt = (index: number) => {
        if (!tracks.length) return;
        current = (index + tracks.length) % tracks.length;
        paintCurrent();
        audio.src = tracks[current].url;
        // 浏览器没给交互权限时 play() 会 reject，静默吞掉即可
        void audio.play().catch(() => undefined);
    };

    const step = (delta: number) => {
        if (!tracks.length) return;

        if (!shuffling || tracks.length < 2) {
            playAt(current < 0 ? 0 : current + delta);
            return;
        }

        let next = current;
        while (next === current) next = Math.floor(Math.random() * tracks.length);
        playAt(next);
    };

    /* ---------- 歌单加载 ---------- */

    const load = async () => {
        if (loaded || loading) return;
        loading = true;

        try {
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = (await res.json()) as MusicTrack[];
            tracks = Array.isArray(data) ? data.filter((t) => t && t.url) : [];
            if (!tracks.length) throw new Error('empty playlist');

            loaded = true;
            if (statusEl) statusEl.hidden = true;

            // 随机播放时先替用户选一首，但不动手播 —— 自动播放会被拦
            current = shuffling ? Math.floor(Math.random() * tracks.length) : 0;
            renderList();
            paintCurrent();

            if (root.dataset.autoplay === 'true') playAt(current);
        } catch {
            if (statusEl) statusEl.textContent = '歌单加载失败，收起再点唱片重试';
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
        playAt(Number(item.dataset.index));
    });

    btnPlay?.addEventListener('click', () => {
        if (!audio.paused) {
            audio.pause();
            return;
        }
        if (audio.src) void audio.play().catch(() => undefined);
        else playAt(current < 0 ? 0 : current);
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
    audio.addEventListener('pause', () => root.classList.remove('is-playing'));
    audio.addEventListener('playing', () => { errorStreak = 0; });
    audio.addEventListener('timeupdate', paintProgress);
    audio.addEventListener('loadedmetadata', paintProgress);
    audio.addEventListener('ended', () => step(1));

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

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && !audio.paused) audio.pause();
    });

    /* ---------- 空闲预取 ---------- */

    const idle = (window as unknown as {
        requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    }).requestIdleCallback;

    if (typeof idle === 'function') idle(() => void load(), { timeout: 3000 });
    else window.setTimeout(() => void load(), 1500);
}

document.addEventListener('DOMContentLoaded', setupCodeGroups);
document.addEventListener('DOMContentLoaded', setupParticleBackground);
document.addEventListener('DOMContentLoaded', setupSiteRuntime);
document.addEventListener('DOMContentLoaded', setupMusicPlayer);
