import { createGiftCake } from './gift-cake';
import { GIFT_MESSAGES } from './gift-messages';
import { setupGiftAudio } from './gift-audio';

// 44 seconds match the music excerpt from 00:30 to 01:14.
const TIMELINE = { heart: 9000, hold: 12000, wishes: 13500, cake: 20500, fade: 41000, end: 44000 };
const COLORS = ['#f4b9d1', '#b4dcef', '#c7e9b1', '#e9dfa5', '#c6b9ed', '#f3bcaa', '#a6dcd5'];
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
const random = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function setupGiftShow() {
    const root = document.querySelector<HTMLElement>('[data-gift-show]');
    if (!root || root.hidden || root.dataset.giftInitialized === 'true') return;
    const canvas = root.querySelector<HTMLCanvasElement>('[data-gift-canvas]');
    const ctx = canvas?.getContext('2d');
    const heart = root.querySelector<HTMLElement>('[data-gift-heart]');
    const wishes = root.querySelector<HTMLElement>('[data-gift-wishes]');
    const caption = root.querySelector<HTMLElement>('[data-gift-caption]');
    const envelope = root.querySelector<HTMLElement>('[data-gift-envelope]');
    const open = root.querySelector<HTMLButtonElement>('[data-gift-open]');
    const letter = root.querySelector<HTMLElement>('[data-gift-letter]');
    const fallback = root.querySelector<HTMLElement>('[data-gift-fallback]');
    const fallbackText = root.querySelector<HTMLElement>('[data-gift-fallback-text]');
    const skip = root.querySelector<HTMLButtonElement>('[data-gift-skip]');
    const replay = root.querySelector<HTMLButtonElement>('[data-gift-replay]');
    if (!heart || !wishes || !envelope || !open || !letter) return;
    root.dataset.giftInitialized = 'true';

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const unlockAt = Date.parse(root.dataset.unlock ?? '');
    const expireAt = Date.parse(root.dataset.expire ?? '');
    let width = 0, height = 0, cardW = 0, cardH = 0;
    let elapsed = 0, last = 0, raf = 0, openingTimer = 0;
    let playing = false, opening = false, blocked = false, phase = '';
    let heartVisible = -1, wishesVisible = -1;
    let heartCards: HTMLElement[] = [], wishCards: HTMLElement[] = [];
    const paintCake = ctx ? createGiftCake() : null;
    const music = setupGiftAudio(root, () => elapsed, () => !blocked && (playing || opening || !envelope.hidden || !letter.hidden));

    const setCaption = (text: string) => { if (caption) caption.textContent = text; };
    const stop = () => { playing = false; cancelAnimationFrame(raf); raf = 0; };
    const accessAllowed = () => {
        const now = Date.now();
        const early = Number.isFinite(unlockAt) && now < unlockAt;
        const expired = Number.isFinite(expireAt) && now >= expireAt;
        if (!early && !expired) return true;
        blocked = true; stop(); clearTimeout(openingTimer);
        music.stop();
        heart.hidden = wishes.hidden = envelope.hidden = letter.hidden = true;
        if (skip) skip.hidden = true;
        if (replay) replay.hidden = true;
        ctx?.clearRect(0, 0, width, height);
        setCaption('');
        if (fallback && fallbackText) {
            fallbackText.textContent = early ? '这份礼物还没到开启的时间，请在生日当天再来。' : '已经结束啦。';
            fallback.hidden = false;
        }
        return false;
    };
    if (!accessAllowed()) return;
    let expiryTimer = window.setInterval(accessAllowed, 1000);

    const makeCard = (text: string, index: number, className: string) => {
        const card = document.createElement('div');
        card.className = `gift-popup ${className}`;
        card.style.setProperty('--popup-color', COLORS[index % COLORS.length]);
        const bar = document.createElement('span'); bar.className = 'gift-popup__bar';
        const title = document.createElement('span'); title.textContent = '给你的小提醒';
        const close = document.createElement('span'); close.textContent = '×';
        bar.append(title, close);
        const message = document.createElement('span'); message.className = 'gift-popup__message';
        message.textContent = text;
        card.append(bar, message);
        return card;
    };

    const layout = () => {
        width = root.clientWidth; height = root.clientHeight;
        const mobile = width < 600;
        cardW = mobile ? 86 : 124; cardH = mobile ? 40 : 49;
        root.style.setProperty('--popup-width', `${cardW}px`);
        root.style.setProperty('--popup-height', `${cardH}px`);
        if (canvas && ctx) {
            const dpr = Math.min(devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        // The analytic curve avoids grid resampling errors and preserves the notch on mobile.
        const scale = Math.max(1, Math.min((width - cardW - 36) / 32, (height - cardH - 145) / 29, 19));
        heartCards.forEach((card, i) => {
            const t = i / (heartCards.length - 1) * Math.PI * 2;
            const x = -16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            card.style.left = `${width / 2 + x * scale - cardW / 2}px`;
            card.style.top = `${height / 2 - (y + 2.5) * scale - cardH / 2 - 8}px`;
        });
        // A shuffled jittered grid fills the entire screen without clipping any message.
        const cols = Math.ceil(Math.sqrt(wishCards.length * width / height));
        const rows = Math.ceil(wishCards.length / cols);
        const order = Array.from({ length: wishCards.length }, (_, i) => i)
            .sort((a, b) => random(a + 93) - random(b + 93));
        wishCards.forEach((card, i) => {
            const cell = order[i];
            const nx = clamp(((cell % cols) + random(i + 21)) / cols);
            const ny = clamp((Math.floor(cell / cols) + random(i + 71)) / rows);
            card.style.left = `${10 + nx * Math.max(0, width - cardW - 20)}px`;
            card.style.top = `${60 + ny * Math.max(0, height - cardH - 110)}px`;
        });
    };

    const build = () => {
        // Reserve the birthday greeting for the final card of each scene.
        // Deal the other messages without repeating within a scene.
        const finale = '生日快乐';
        const messages = GIFT_MESSAGES.filter(message => message !== finale);
        for (let i = messages.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [messages[i], messages[j]] = [messages[j], messages[i]];
        }
        const heartCount = innerWidth < 600 ? 68 : 100;
        const wishCount = innerWidth < 600 ? 120 : 260;
        heartCards = Array.from({ length: heartCount }, (_, i) =>
            makeCard(i === heartCount - 1 ? finale : messages[i], i, 'gift-cell'));
        wishCards = Array.from({ length: wishCount }, (_, i) =>
            makeCard(i === wishCount - 1 ? finale : messages[(heartCount - 1 + i) % messages.length], i, 'gift-wish'));
        heart.replaceChildren(...heartCards); wishes.replaceChildren(...wishCards);
        heartVisible = wishesVisible = -1;
        layout();
    };
    const reveal = (cards: HTMLElement[], count: number, previous: number) => {
        if (count === previous) return count;
        cards.forEach((card, i) => { card.style.visibility = i < count ? 'visible' : 'hidden'; });
        return count;
    };

    const showEnvelope = () => {
        stop(); elapsed = TIMELINE.end;
        root.dataset.phase = 'envelope';
        heart.hidden = wishes.hidden = true;
        ctx?.clearRect(0, 0, width, height);
        envelope.hidden = false;
        music.waitForLetter();
        if (skip) skip.hidden = true;
        if (replay) replay.hidden = false;
        setCaption('有些话，想亲手交给你。');
        open.focus({ preventScroll: true });
    };

    const render = () => {
        const t = elapsed;
        const next = t < TIMELINE.heart ? 'heart' : t < TIMELINE.hold ? 'hold' :
            t < TIMELINE.wishes ? 'retreat' : t < TIMELINE.cake ? 'wishes' : t < TIMELINE.fade ? 'cake' : 'fade';
        if (phase !== next) {
            phase = next; root.dataset.phase = next;
            setCaption(next === 'heart' || next === 'hold' ? '把每一句小小的关心，围成一颗心。' :
                next === 'retreat' || next === 'wishes' ? '愿这些美好的事，都发生在你身上。' :
                next === 'cake' ? '闭上眼睛，许一个愿望吧。' : '还有一封信，想交给你。');
        }
        const retreat = smooth((t - TIMELINE.hold) / (TIMELINE.wishes - TIMELINE.hold));
        heartVisible = reveal(heartCards, Math.ceil(clamp(t / TIMELINE.heart) * heartCards.length), heartVisible);
        heart.style.opacity = String(1 - retreat);
        heart.style.transform = `scale(${1 - retreat * 0.08})`;
        const wishProgress = clamp((t - TIMELINE.hold - 450) / (TIMELINE.cake - TIMELINE.hold - 900));
        wishesVisible = reveal(wishCards, Math.floor(Math.pow(wishProgress, 0.85) * wishCards.length), wishesVisible);
        const dissolve = smooth((t - TIMELINE.cake) / 1400);
        wishes.style.opacity = String(1 - dissolve);
        wishes.style.transform = `scale(${1 + dissolve * 0.05})`;
        if (ctx) {
            ctx.clearRect(0, 0, width, height);
            const endFade = 1 - smooth((t - TIMELINE.fade) / (TIMELINE.end - TIMELINE.fade));
            for (let i = 0; i < 85; i++) {
                const x = random(i + 12) * width;
                const y = ((random(i + 31) * height - t * (0.003 + random(i) * 0.008)) % height + height) % height;
                ctx.fillStyle = `rgba(178,190,239,${(0.1 + 0.2 * (1 + Math.sin(t / 1300 + i)) / 2) * endFade})`;
                ctx.beginPath(); ctx.arc(x, y, 0.5 + random(i + 66), 0, Math.PI * 2); ctx.fill();
            }
            paintCake?.(ctx, width, height, Math.max(0, t - TIMELINE.cake) / 1000, dissolve * endFade);
        }
    };

    const frame = (now: number) => {
        if (!playing) return;
        if (!accessAllowed()) return;
        elapsed += Math.max(0, now - last); last = now;
        if (elapsed >= TIMELINE.end) { showEnvelope(); return; }
        render(); raf = requestAnimationFrame(frame);
    };
    const start = () => {
        if (!accessAllowed()) return;
        stop(); clearTimeout(openingTimer);
        elapsed = 0; phase = ''; opening = false;
        letter.hidden = envelope.hidden = true;
        letter.scrollTop = 0; open.classList.remove('is-open');
        heart.hidden = wishes.hidden = false;
        if (skip) skip.hidden = false;
        if (replay) replay.hidden = true;
        if (reduced.matches || !ctx) { showEnvelope(); return; }
        build(); render(); playing = true; last = performance.now();
        music.start();
        if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    skip?.addEventListener('click', () => { if (accessAllowed()) showEnvelope(); });
    replay?.addEventListener('click', start);
    open.addEventListener('click', () => {
        if (opening || !accessAllowed()) return;
        opening = true; open.classList.add('is-open'); setCaption('');
        // Start inside the click gesture so the reading track can play on mobile.
        music.readLetter();
        openingTimer = window.setTimeout(() => {
            if (!accessAllowed()) return;
            envelope.hidden = true; letter.hidden = false; root.dataset.phase = 'letter';
            const title = letter.querySelector<HTMLElement>('h1');
            title?.setAttribute('tabindex', '-1'); title?.focus({ preventScroll: true });
        }, reduced.matches ? 0 : 900);
    });
    window.addEventListener('resize', () => { if (!blocked) { layout(); if (playing) render(); } }, { passive: true });
    const resume = () => {
        if (!accessAllowed()) return;
        if (playing) { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }
        music.resume();
    };
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(raf); music.pause(); }
        else resume();
    });
    window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); clearTimeout(openingTimer); clearInterval(expiryTimer); music.pause(); });
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        expiryTimer = window.setInterval(accessAllowed, 1000);
        if (opening) { opening = false; open.classList.remove('is-open'); }
        resume();
    });
    reduced.addEventListener('change', () => { if (reduced.matches && playing) showEnvelope(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && playing && accessAllowed()) showEnvelope(); });
    start();
}
