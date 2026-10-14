/** Procedural galaxy cake. Static icing is cached; only light, rings and stars animate. */
const TAU = Math.PI * 2;
const fract = (n: number) => n - Math.floor(n);
const noise = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rotation = 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = rotation + i * Math.PI / 5 - Math.PI / 2;
        const radius = i % 2 ? r * 0.42 : r;
        const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
    ellipse(ctx, x, y, radius, radius, gradient);
}

export function createGiftCake() {
    const texture = document.createElement('canvas');
    texture.width = 1000; texture.height = 1200;
    const c = texture.getContext('2d');
    if (!c) return () => {};
    c.scale(2, 2);

    // Porcelain plate and its thin gold rim.
    glow(c, 250, 470, 150, '#4b5bd138');
    ellipse(c, 250, 487, 145, 38, '#070a22');
    const plate = c.createLinearGradient(100, 440, 390, 500);
    plate.addColorStop(0, '#343762'); plate.addColorStop(0.48, '#a6a4c5'); plate.addColorStop(1, '#333654');
    ellipse(c, 250, 473, 145, 39, plate);
    c.strokeStyle = '#d9bd87aa'; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(250, 472, 139, 35, 0, 0, TAU); c.stroke();
    ellipse(c, 250, 468, 126, 29, '#171a45');

    // A cylinder, clipped before painting the nebula so its silhouette stays crisp.
    c.save();
    c.beginPath(); c.moveTo(142, 305);
    c.bezierCurveTo(142, 263, 358, 263, 358, 305);
    c.lineTo(358, 448); c.bezierCurveTo(358, 492, 142, 492, 142, 448); c.closePath();
    c.clip();
    const body = c.createLinearGradient(140, 0, 360, 0);
    body.addColorStop(0, '#0b123a'); body.addColorStop(0.24, '#172b7e');
    body.addColorStop(0.52, '#182258'); body.addColorStop(0.78, '#234db0'); body.addColorStop(1, '#080e35');
    c.fillStyle = body; c.fillRect(140, 260, 220, 230);
    c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 100; i++) {
        const x = 130 + noise(i) * 240;
        const y = 285 + noise(i + 101) * 200;
        glow(c, x, y, 10 + noise(i + 10) * 40,
            ['#466cf42c', '#743ac52c', '#35a9f029', '#112f8a38'][i % 4]);
    }
    c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 250; i++) {
        const x = 144 + noise(i + 300) * 212, y = 300 + noise(i + 602) * 180;
        const band = Math.abs(x - (280 + 55 * Math.sin(y * 0.035)));
        const color = i % 3 ? '#fff0bd' : '#8cbdff';
        c.globalAlpha = band < 40 ? 0.65 : 0.24;
        if (i % 13 === 0) star(c, x, y, 3 + noise(i + 2) * 4, color, noise(i) * 3);
        else ellipse(c, x, y, noise(i + 3) * 1.5 + 0.3, noise(i + 3) * 1.5 + 0.3, color);
    }
    c.globalAlpha = 1;
    const shine = c.createLinearGradient(140, 0, 360, 0);
    shine.addColorStop(0, '#739eff50'); shine.addColorStop(0.08, 'transparent');
    shine.addColorStop(0.88, 'transparent'); shine.addColorStop(1, '#9ebcff38');
    c.fillStyle = shine; c.fillRect(140, 300, 220, 190);
    c.restore();

    // Lavender frosting, marbled with gold and cream.
    const icing = c.createLinearGradient(140, 280, 350, 330);
    icing.addColorStop(0, '#8b9ddd'); icing.addColorStop(0.35, '#eee1e4');
    icing.addColorStop(0.65, '#a499d2'); icing.addColorStop(1, '#f4d9a4');
    ellipse(c, 250, 307, 108, 34, '#6576bd');
    ellipse(c, 250, 301, 108, 33, icing);
    c.save(); c.beginPath(); c.ellipse(250, 301, 106, 31, 0, 0, TAU); c.clip();
    for (let i = 0; i < 12; i++) {
        c.strokeStyle = ['#fff4cf', '#eabd6b', '#a7a9ed', '#f3e6f8'][i % 4];
        c.lineWidth = 2 + noise(i) * 6;
        c.beginPath();
        c.ellipse(230 + noise(i + 42) * 50, 295 + noise(i + 12) * 15,
            18 + i * 8, 5 + i * 1.8, -0.14, 0.2 + i * 0.5, 4.7 + i * 0.3); c.stroke();
    }
    for (let i = 0; i < 28; i++) star(c, 150 + noise(i + 43) * 200, 278 + noise(i + 19) * 46, 1.5 + noise(i) * 3, '#fff4c9');
    c.restore();
    c.strokeStyle = '#fff0cdaf'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(250, 301, 107, 32, 0, 0, Math.PI); c.stroke();
    // Small icing drips catch the candlelight on the front edge.
    for (const [x, y, len] of [[153, 315, 16], [177, 326, 9], [319, 325, 15], [348, 314, 11]]) {
        c.lineWidth = 4; c.lineCap = 'round'; c.strokeStyle = '#c5c4ed';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + len); c.stroke();
    }
    // Striped candle.
    ellipse(c, 250, 300, 12, 4, '#42417360');
    const wax = c.createLinearGradient(245, 0, 255, 0);
    wax.addColorStop(0, '#9a84c9'); wax.addColorStop(0.45, '#fff0fb'); wax.addColorStop(1, '#c4a9da');
    c.fillStyle = wax; c.fillRect(246, 232, 8, 68);
    c.save(); c.beginPath(); c.rect(246, 232, 8, 68); c.clip();
    c.strokeStyle = '#b779c9'; c.lineWidth = 2;
    for (let y = 230; y < 305; y += 11) { c.beginPath(); c.moveTo(245, y); c.lineTo(255, y + 5); c.stroke(); }
    c.restore(); ellipse(c, 250, 232, 4, 2, '#fff2df');
    c.strokeStyle = '#39253a'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(250, 232); c.lineTo(250, 223); c.stroke();

    const orbitPoint = (angle: number, ring: number) => {
        const rx = ring === 0 ? 169 : 157;
        const ry = ring === 0 ? 48 : 43;
        const tilt = ring === 0 ? -0.38 : -0.22;
        const x = Math.cos(angle) * rx, y = Math.sin(angle) * ry;
        return { x: 250 + x * Math.cos(tilt) - y * Math.sin(tilt),
            y: (ring === 0 ? 210 : 405) + x * Math.sin(tilt) + y * Math.cos(tilt) };
    };

    return (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, alpha: number) => {
        if (alpha <= 0) return;
        const scale = Math.min(width / 510, height / 690, 1.4);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.translate(width / 2, height / 2 - 18 * scale);
        ctx.scale(scale, scale); ctx.translate(-250, -300);
        glow(ctx, 250, 340, 235, '#23358435');

        const rings = (front: boolean) => {
            for (let r = 0; r < 2; r++) {
                for (let trail = 0; trail < 3; trail++) {
                    ctx.beginPath();
                    for (let k = 0; k <= 100; k++) {
                        const a = (front ? 0 : Math.PI) + k / 100 * Math.PI;
                        const p = orbitPoint(a, r);
                        const y = p.y + trail * 3 + Math.sin(time * 0.6) * 3;
                        k ? ctx.lineTo(p.x, y) : ctx.moveTo(p.x, y);
                    }
                    ctx.strokeStyle = ['#eed1a9aa', '#9f96e8aa', '#6689ff44'][trail];
                    ctx.lineWidth = trail === 0 ? 1.5 : 0.8; ctx.stroke();
                }
                for (let k = 0; k < 9; k++) {
                    const a = (time * (r ? 0.7 : 0.5) + k * TAU / 9) % TAU;
                    if ((Math.sin(a) >= 0) !== front) continue;
                    const p = orbitPoint(a, r);
                    glow(ctx, p.x, p.y, 9, '#e9ce9660');
                    ellipse(ctx, p.x, p.y, 1.8, 1.8, '#fff0c9');
                }
            }
        };
        rings(false);
        ctx.drawImage(texture, 0, 0, 500, 600);
        rings(true);

        // Rising confetti follows a loose helix; seeded attributes avoid per-frame randomness.
        for (let i = 0; i < 145; i++) {
            const life = fract(noise(i + 3) + time * (0.035 + noise(i + 45) * 0.045));
            const a = noise(i + 19) * TAU + time * 0.45 + life * 5;
            const radius = 72 + noise(i + 62) * 95;
            const x = 250 + Math.cos(a) * radius * (1 - life * 0.3);
            const y = 494 - life * 400;
            if (y > 280 && y < 465 && Math.abs(x - 250) < 112) continue;
            const opacity = Math.sin(life * Math.PI) * (0.4 + noise(i) * 0.6);
            ctx.globalAlpha = alpha * opacity;
            const color = ['#f9cd69', '#a7aaff', '#6fb9ed', '#f6e1a6', '#e596c1'][i % 5];
            const size = 1 + noise(i + 9) * 4;
            if (i % 4 === 0) star(ctx, x, y, size + 1, color, a);
            else ellipse(ctx, x, y, size, size, color);
        }
        ctx.globalAlpha = alpha;
        const flicker = Math.sin(time * 9) * 1.8 + Math.sin(time * 17) * 0.7;
        glow(ctx, 250, 213, 65 + flicker, '#ffbc4f55');
        glow(ctx, 250, 281, 58, '#ffd89038');
        ctx.save(); ctx.translate(250, 228);
        const flame = ctx.createLinearGradient(0, -37, 0, 0);
        flame.addColorStop(0, '#ffecc0'); flame.addColorStop(0.45, '#ffdb74'); flame.addColorStop(1, '#ff8a32');
        ctx.fillStyle = flame; ctx.shadowColor = '#ffc35c'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.moveTo(flicker * 0.6, -40 - flicker);
        ctx.bezierCurveTo(1 + flicker, -25, 15, -12, 7, -3);
        ctx.bezierCurveTo(-6, 7, -15, -8, flicker * 0.6, -40 - flicker); ctx.fill();
        ctx.shadowBlur = 0; ellipse(ctx, 0, -8, 3.5, 9, '#fff9d9'); ctx.restore();

        ctx.textAlign = 'center'; ctx.fillStyle = '#f5e1bd';
        ctx.font = 'italic 26px Georgia, serif'; ctx.fillText('Happy Birthday', 250, 560);
        ctx.fillStyle = '#b5b9d4'; ctx.font = '13px "Microsoft YaHei", sans-serif';
        ctx.fillText('愿你的每一个心愿，都有星光回应', 250, 589);
        ctx.restore();
    };
}
