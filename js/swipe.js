// js/swipe.js
import { state, selectors, CONSTANTS } from './config.js';

export function setCardTransform(dx) {
    const rot = Math.max(-8, Math.min(8, dx / 18));
    selectors.card.style.transform = `translateX(${dx}px) rotate(${rot}deg)`;
    selectors.card.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / 600));
}

export function resetCardTransform() {
    selectors.card.style.transition = "transform 200ms ease, opacity 200ms ease";
    selectors.card.style.transform = "";
    selectors.card.style.opacity = "";
    setTimeout(() => {
        selectors.card.style.transition = "";
    }, 220);
}

export function initSwipe(flyOutAndGo) {
    selectors.card.addEventListener(
        "touchstart",
        (e) => {
            const t = e.touches[0];
            state.touchStartX = t.clientX;
            state.touchStartY = t.clientY;
            state.dragging = false;
            state.dxLive = 0;
            state.swiping = false;
        },
        { passive: true }
    );

    selectors.card.addEventListener(
        "touchmove",
        (e) => {
            const t = e.touches[0];
            const dx = t.clientX - state.touchStartX;
            const dy = t.clientY - state.touchStartY;
            if (!state.dragging) {
                if (Math.abs(dy) > CONSTANTS.SWIPE_MAX_Y) return;
                if (Math.abs(dx) < CONSTANTS.SWIPE_START_X) return;
                state.dragging = true;
            }
            state.dxLive = dx;
            selectors.card.style.transition = "none";
            setCardTransform(state.dxLive);
        },
        { passive: true }
    );

    selectors.card.addEventListener(
        "touchend",
        () => {
            if (!state.dragging) return;
            state.swiping = true;
            if (Math.abs(state.dxLive) >= CONSTANTS.SWIPE_TRIGGER_X)
                flyOutAndGo(state.dxLive < 0 ? -1 : 1);
            else resetCardTransform();
            setTimeout(() => {
                state.swiping = false;
            }, 0);
        },
        { passive: true }
    );
}
