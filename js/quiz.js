// js/quiz.js
import { state, selectors } from './config.js';
import { escapeHtml, getAnswerKey, getOptionKey } from './utils.js';
import { saveState } from './storage.js';
import { updateStats, startQuestionTimer } from './analytics.js';
import { syncEditorWithQuestion } from './playground.js';

export function getActiveList() {
    if (state.mode === "wrongs") {
        const arr = state.questions.filter((q) => state.wrongSet.has(q._uid));
        return arr.length ? arr : state.questions;
    }
    return state.questions;
}

export function fitCardHeight() {
    requestAnimationFrame(() => {
        const h = Math.max(selectors.front.scrollHeight, selectors.back.scrollHeight);
        selectors.card.style.height = Math.max(500, h) + "px";
    });
}

export function updateProgress() {
    const active = getActiveList();
    const total = active.length || 1;

    let done = 0;
    if (state.mode === "all") {
        done = state.answeredAll.size;
    } else {
        done = active.reduce(
            (acc, q) => acc + (state.answeredWrongs.has(q._uid) ? 1 : 0),
            0
        );
    }

    const pct = Math.round((done / total) * 100);
    if (selectors.progressFill) selectors.progressFill.style.width = pct + "%";
    if (selectors.editorCounter) selectors.editorCounter.textContent = `(${done} / ${total})`;
}

export function renderQuestionCode(q) {
    if (!q.code) return "";
    let lang = (q.lang || "javascript").toLowerCase();
    if (lang === "nodejs") lang = "javascript"; // Prism doesn't know nodejs

    return `
<pre class="language-${lang}"><code class="language-${lang}">${escapeHtml(
        q.code
    )}</code></pre>
`;
}

export function renderOptions(q) {
    if (!Array.isArray(q.options)) return "";
    const lang = q.lang || "javascript";

    return q.options
        .map((opt) => {
            if (typeof opt === "string") {
                const key = getOptionKey(opt) || "";
                return `<div class="opt" role="button" tabindex="0" data-key="${escapeHtml(
                    key
                )}">${escapeHtml(opt)}</div>`;
            }

            const key = getOptionKey(opt) || "";
            const label = opt.label ? `${escapeHtml(opt.label)}) ` : "";
            const hasCode =
                typeof opt.code === "string" && opt.code.trim().length > 0;
            const hasText =
                typeof opt.text === "string" && opt.text.trim().length > 0;

            if (hasCode) {
                let optLang = (q.lang || "javascript").toLowerCase();
                if (optLang === "nodejs") optLang = "javascript";

                return `
<div class="opt" role="button" tabindex="0" data-key="${escapeHtml(key)}">
  <div><strong>${label}</strong></div>
  <pre class="language-${optLang}"><code class="language-${optLang}">${escapeHtml(
                    opt.code
                )}</code></pre>
</div>
`;
            }

            return `<div class="opt" role="button" tabindex="0" data-key="${escapeHtml(
                key
            )}"><strong>${label}</strong>${hasText ? escapeHtml(opt.text) : ""}</div>`;
        })
        .join("");
}

export function applyOptionResult(selectedKey) {
    const active = getActiveList();
    const correctKey = getAnswerKey(active[state.index]?.answer);
    const opts = selectors.front.querySelectorAll(".opt");

    opts.forEach((el) => {
        const k = (el.dataset.key || "").toUpperCase();
        el.classList.add("opt-disabled");

        if (correctKey && k === correctKey) el.classList.add("opt-correct");
        if (selectedKey && k === selectedKey && k !== correctKey)
            el.classList.add("opt-wrong");
    });
}

export function onOptionPick(el) {
    if (state.locked) return;

    const selectedKey = (el.dataset.key || "").toUpperCase();
    if (!selectedKey) return;

    state.locked = true;

    const active = getActiveList();
    const q = active[state.index];
    const correctKey = getAnswerKey(q?.answer);

    if (state.mode === "all") {
        state.answeredAll.add(state.index);
    } else {
        if (q?._uid) state.answeredWrongs.add(q._uid);
    }

    if (selectedKey && correctKey && selectedKey !== correctKey && q?._uid) {
        state.wrongSet.add(q._uid);
    }

    updateProgress();
    applyOptionResult(selectedKey);
    fitCardHeight();
    saveState();
}

export function bindOptionClicks() {
    const opts = selectors.front.querySelectorAll(".opt");
    opts.forEach((el) => {
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            onOptionPick(el);
        });

        el.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onOptionPick(el);
            }
        });
    });
}



export function render() {
    const active = getActiveList();
    if (!active.length) {
        selectors.front.innerHTML = `<p class="q-title">Liste boş</p>`;
        selectors.back.innerHTML = "";
        return;
    }

    if (state.index >= active.length) state.index = 0;

    const q = active[state.index];
    state.locked = false;

    // Check if finished
    const total = active.length || 0;
    let done = 0;
    if (state.mode === "all") {
        done = state.answeredAll.size;
    } else {
        done = active.reduce((acc, q) => acc + (state.answeredWrongs.has(q._uid) ? 1 : 0), 0);
    }

    if (total > 0 && done >= total) {
        selectors.front.innerHTML = `
            <div class="finish-msg" style="text-align: center; padding: 40px 20px;">
                <h2 style="font-size: 2rem; margin-bottom: 20px;">🎉 Tebrikler!</h2>
                <p style="font-size: 1.2rem; margin-bottom: 30px;">Seçilen tüm soruları başarıyla bitirdiniz.</p>
                <button onclick="location.reload()" class="pick-btn" style="padding: 12px 24px; cursor: pointer;">Sıfırla ve Yeniden Başla</button>
            </div>
        `;
        selectors.back.innerHTML = `<div class="explain" style="text-align: center; padding: 20px;">Harika bir iş çıkardın!</div>`;
        selectors.counter.textContent = `${total} / ${total}`;
        return;
    }

    selectors.counter.textContent = `${state.index + 1} / ${active.length}`;
    syncEditorWithQuestion(q);

    selectors.front.innerHTML = `
    <p class="q-title">${escapeHtml(q.title)}</p>
    ${renderQuestionCode(q)}
    <div class="options">${renderOptions(q)}</div>
    <div class="muted">Tıkla → cevabı gör</div>
  `;

    selectors.back.innerHTML = `
    <p class="answer">Cevap: ${escapeHtml(q.answer)}</p>
    <div class="explain">${escapeHtml(q.explain || "")}</div>
    <div class="muted">Tekrar tıkla → soruya dön</div>
  `;

    if (window.Prism) Prism.highlightAll();

    state.flipped = false;
    selectors.card.classList.remove("flip");

    selectors.card.style.transition = "";
    selectors.card.style.transform = "";
    selectors.card.style.opacity = "";

    bindOptionClicks();

    updateProgress();
    fitCardHeight();
    updateStats();
    startQuestionTimer();
}

export function toggleFlip() {
    state.flipped = !state.flipped;
    selectors.card.classList.toggle("flip", state.flipped);
    fitCardHeight();
}

export function next() {
    const active = getActiveList();
    if (!active.length) return;
    state.index = (state.index + 1) % active.length;
    render();
    saveState();
}

export function prev() {
    const active = getActiveList();
    if (!active.length) return;
    state.index = (state.index - 1 + active.length) % active.length;
    render();
    saveState();
}

export function randomNext() {
    const active = getActiveList();
    if (!active.length || active.length === 1) return;
    let r = state.index;
    while (r === state.index) r = Math.floor(Math.random() * active.length);
    state.index = r;
    render();
    saveState();
}

export function shuffleCurrent() {
    for (let i = state.questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.questions[i], state.questions[j]] = [state.questions[j], state.questions[i]];
    }
    state.mode = "all";
    state.index = 0;
    render();
    saveState();
}

export function resetAll() {
    state.wrongSet.clear();
    state.answeredAll.clear();
    state.answeredWrongs.clear();
    state.mode = "all";
    state.index = 0;
    if (selectors.progressFill) selectors.progressFill.style.width = "0%";
    render();
    saveState();
}
