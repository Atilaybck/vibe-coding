// js/main.js
import { state, selectors } from './config.js';
import { loadState, saveState } from './storage.js';
import { updateStats, updateAnalyticsDashboard } from './analytics.js';
import { initMonacoEditor, runCode } from './playground.js';
import { initSwipe, resetCardTransform } from './swipe.js';
import {
    render, next, prev, randomNext, shuffleCurrent,
    resetAll, toggleFlip, getActiveList, updateProgress
} from './quiz.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Init state
    loadState();

    // Handlers
    selectors.card.addEventListener("click", (e) => {
        if (state.swiping || e.target.closest("button") || e.target.closest(".opt")) return;
        toggleFlip();
    });

    selectors.statsBtn.onclick = (e) => {
        e.stopPropagation();
        updateStats();
        selectors.statsModal.classList.add("open");
    };

    selectors.closeStats.onclick = () => selectors.statsModal.classList.remove("open");

    window.onclick = (e) => {
        if (e.target === selectors.statsModal) selectors.statsModal.classList.remove("open");
    };

    selectors.themeBtn.onclick = (e) => {
        e.stopPropagation();
        selectors.themeMenu.classList.toggle("open");
    };

    selectors.themeMenu.querySelectorAll("button").forEach((btn) => {
        btn.onclick = () => {
            const theme = btn.dataset.theme;
            if (theme === "default") document.documentElement.removeAttribute("data-theme");
            else document.documentElement.setAttribute("data-theme", theme);
            selectors.themeMenu.classList.remove("open");
            saveState();
        };
    });

    document.addEventListener("click", (e) => {
        if (selectors.themeMenu) selectors.themeMenu.classList.remove("open");
        if (selectors.pickPanel) selectors.pickPanel.classList.remove("open");

        const isInteractive =
            e.target.closest("button") ||
            e.target.closest(".card") ||
            e.target.closest(".top") ||
            e.target.closest(".modal-content");

        if (!isInteractive) {
            next();
        }
    });

    selectors.shuffleBtn.onclick = (e) => {
        e.stopPropagation();
        shuffleCurrent();
    };

    selectors.wrongsBtn.onclick = (e) => {
        e.stopPropagation();
        state.mode = state.mode === "all" ? "wrongs" : "all";
        state.index = 0;
        render();
        saveState();
    };

    selectors.resetBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm("Tüm ilerlemeyi sıfırlamak istiyor musun?")) resetAll();
    };

    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
        if (e.key === "r" || e.key === "R") randomNext();
        if (e.key === "Escape") selectors.statsModal.classList.remove("open");
    });

    // Swipe
    function flyOutAndGo(dir) {
        const flyX = dir * (window.innerWidth * 0.9);
        selectors.card.style.transition = "transform 180ms ease, opacity 180ms ease";
        selectors.card.style.transform = `translateX(${flyX}px) rotate(${dir * 10}deg)`;
        selectors.card.style.opacity = "0";

        setTimeout(() => {
            state.flipped = false;
            selectors.card.classList.remove("flip");
            if (dir === -1) next();
            else prev();

            selectors.card.style.transition = "none";
            selectors.card.style.transform = `translateX(${dir * -60}px)`;
            requestAnimationFrame(() => {
                selectors.card.style.transition = "transform 200ms ease, opacity 200ms ease";
                selectors.card.style.transform = "";
                selectors.card.style.opacity = "1";
            });
        }, 190);
    }

    initSwipe(flyOutAndGo);

    // Picker
    if (selectors.pickBtn) {
        selectors.pickBtn.onclick = (e) => {
            e.stopPropagation();
            selectors.pickPanel.classList.toggle("open");
        };
        selectors.applyBtn.onclick = async (e) => {
            e.stopPropagation();
            await loadSelectedQuestions();
            selectors.pickPanel.classList.remove("open");
        };
    }

    async function loadSelectedQuestions() {
        const files = getSelectedFiles();
        if (!files.length) {
            state.questions = [];
            resetAll();
            selectors.front.innerHTML = `<p class="q-title">En az 1 dosya seç</p>`;
            return;
        }

        const responses = await Promise.all(files.map((f) => fetch(`./questions/${f}`)));
        const jsons = await Promise.all(responses.map((r) => r.json()));
        const merged = jsons.flat();

        state.questions = merged.map((q, i) => ({ ...q, _uid: `q_${i + 1}` }));

        loadState();
        render();
    }

    function getSelectedFiles() {
        if (!selectors.picker)
            return ["4.1-question.json", "4.2-question.json", "4.3-question.json"];
        return [
            ...selectors.picker.querySelectorAll('input[type="checkbox"]:checked'),
        ].map((x) => x.value);
    }

    // Editor
    selectors.togglePlayground.onclick = () => {
        selectors.codePlayground.classList.toggle("open");
    };

    selectors.runCodeBtn.onclick = runCode;

    selectors.resetCodeBtn.onclick = () => {
        const active = getActiveList();
        const q = active[state.index];
        if (state.monacoEditor) {
            state.monacoEditor.setValue(q?.code || "// Kodu buraya yazın\n");
        }
    };

    selectors.analyticsBtn.onclick = (e) => {
        e.stopPropagation();
        updateAnalyticsDashboard();
        selectors.analyticsModal.classList.add("open");
    };

    selectors.closeAnalytics.onclick = () => selectors.analyticsModal.classList.remove("open");

    window.addEventListener("click", (e) => {
        if (e.target === selectors.analyticsModal) selectors.analyticsModal.classList.remove("open");
    });

    // Init Monaco
    initMonacoEditor(getActiveList);

    // Initial Load
    await loadSelectedQuestions();
});
