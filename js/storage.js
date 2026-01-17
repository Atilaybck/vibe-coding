// js/storage.js
import { state } from './config.js';

export function saveState() {
    const data = {
        wrongs: Array.from(state.wrongSet),
        answeredAll: Array.from(state.answeredAll),
        answeredWrongs: Array.from(state.answeredWrongs),
        index: state.index,
        mode: state.mode,
        theme: document.documentElement.getAttribute("data-theme") || "default",
        analytics: state.analyticsData,
    };
    localStorage.setItem("quiz_state", JSON.stringify(data));
}

export function loadState() {
    const saved = localStorage.getItem("quiz_state");
    if (!saved) return;
    try {
        const data = JSON.parse(saved);
        state.wrongSet = new Set(data.wrongs || []);
        state.answeredAll = new Set(data.answeredAll || []);
        state.answeredWrongs = new Set(data.answeredWrongs || []);
        state.index = data.index || 0;
        state.mode = data.mode || "all";
        state.analyticsData = data.analytics || {};
        if (data.theme) {
            if (data.theme === "default") document.documentElement.removeAttribute("data-theme");
            else document.documentElement.setAttribute("data-theme", data.theme);
        }
    } catch (e) {
        console.error("Failed to load state", e);
    }
}
