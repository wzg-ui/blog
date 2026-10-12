/**
 * 自定义脚本
 *
 * 放在 assets/ts/custom.ts 会被 Stack 自动打包（主题会检测这个文件），
 * 因此不需要额外引入任何资源。
 *
 * 目前有三块：
 *   1. codegroup 短代码的标签页切换
 *   2. 粒子点阵背景
 *   3. 页脚的「本站已运行」计时器
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

document.addEventListener('DOMContentLoaded', setupCodeGroups);
document.addEventListener('DOMContentLoaded', setupParticleBackground);
document.addEventListener('DOMContentLoaded', setupSiteRuntime);
