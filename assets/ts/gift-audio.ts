/** Use the submit gesture on the same media element before asynchronous verification. */
export function primeGiftAudio(root: HTMLElement | null): () => void {
    const audio = root?.querySelector<HTMLAudioElement>('[data-gift-audio]');
    if (!audio) return () => {};
    const volume = audio.volume;
    let released = false;
    // No audible playback before the answer is verified. Keeping the element in
    // the same document preserves its user-initiated playback permission.
    audio.volume = 0;
    void audio.play().catch(() => {});
    return () => {
        if (released) return;
        released = true;
        audio.pause();
        audio.volume = volume;
    };
}

/** The intro continues through the envelope; opening it switches to the reading song. */
export function setupGiftAudio(root: HTMLElement, time: () => number, canPlay: () => boolean) {
    const intro = root.querySelector<HTMLAudioElement>('[data-gift-audio]');
    const letter = root.querySelector<HTMLAudioElement>('[data-gift-letter-audio]');
    const button = root.querySelector<HTMLButtonElement>('[data-gift-music]');
    const startAt = Number(intro?.dataset.start ?? 30);
    const endAt = Number(intro?.dataset.end ?? 74);
    const failed = new Set<HTMLAudioElement>();
    let active: HTMLAudioElement | null = null;
    let wanted = true;
    let waitingForLetter = false;
    let generation = 0;

    const update = () => {
        if (!button) return;
        const on = !!active && !active.paused && !active.ended;
        button.textContent = active && failed.has(active) ? '重试音乐' : on ? '关闭音乐' : '开启音乐';
        button.setAttribute('aria-pressed', String(on));
        button.title = active?.dataset.title ?? '';
    };
    const pause = () => {
        generation++;
        intro?.pause(); letter?.pause();
        update();
    };
    const syncIntro = () => {
        if (active !== intro || !intro || !Number.isFinite(intro.duration)) return;
        if (waitingForLetter) return;
        const position = Math.min(endAt, startAt + Math.max(0, time() / 1000), intro.duration - 0.05);
        if (Math.abs(intro.currentTime - position) > 0.3) intro.currentTime = position;
    };
    const play = () => {
        if (!active || !wanted || failed.has(active) || !canPlay() || document.hidden) return;
        const track = active;
        const request = ++generation;
        syncIntro();
        void track.play().then(() => {
            if (track !== active || !wanted || !canPlay() || document.hidden) track.pause();
            if (request === generation) update();
        }).catch(() => {
            // A visible button handles autoplay denial without interrupting the show.
            if (request === generation) update();
        });
    };
    for (const track of [intro, letter]) {
        if (!track) continue;
        track.addEventListener('play', update);
        track.addEventListener('pause', update);
        track.addEventListener('ended', update);
        track.addEventListener('error', () => { failed.add(track); update(); });
    }
    intro?.addEventListener('loadedmetadata', syncIntro);
    button?.addEventListener('click', () => {
        if (!canPlay() || !active) return;
        if (!active.paused) { wanted = false; pause(); }
        else {
            wanted = true;
            if (failed.delete(active)) active.load();
            play();
        }
    });
    const select = (track: HTMLAudioElement | null, position: number, volume: number) => {
        pause(); active = track;
        if (button) button.hidden = !track;
        if (track) { track.volume = volume; track.currentTime = position; }
        update(); play();
    };
    return {
        start: () => { waitingForLetter = false; select(intro, startAt, 0.65); },
        waitForLetter: () => {
            waitingForLetter = true;
            if (active !== intro) select(intro, startAt, 0.65);
            else if (intro?.paused) play();
        },
        readLetter: () => { waitingForLetter = false; select(letter, 0, 0.4); },
        pause,
        resume: play,
        stop: () => { pause(); active = null; waitingForLetter = false; if (button) button.hidden = true; },
    };
}
