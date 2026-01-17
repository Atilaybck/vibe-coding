// js/playground.js
import { state, selectors } from './config.js';

export function syncEditorWithQuestion(q) {
    state.currentQuestionCode = q?.code && String(q.code).trim() ? String(q.code) : "";
    const monacoLang = (q?.lang || "javascript").toLowerCase();

    if (!state.monacoEditor) return;

    state.monacoEditor.setValue(
        state.currentQuestionCode || "// Bu soruda kod yok\n"
    );

    if (window.monaco?.editor && state.monacoEditor.getModel) {
        const model = state.monacoEditor.getModel();
        if (model) window.monaco.editor.setModelLanguage(model, monacoLang);
    }
}

export function initMonacoEditor(getActiveList, index) {
    if (!window.require) return;

    require.config({
        paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" },
    });
    require(["vs/editor/editor.main"], function () {
        state.monacoEditor = monaco.editor.create(document.getElementById("editor"), {
            value: state.currentQuestionCode || "// Kodu buraya yazın\nconsole.log(\"Merhaba Dünya!\");",
            language: "javascript",
            theme: "vs-dark",
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
        });

        const active = getActiveList();
        syncEditorWithQuestion(active[state.index]);
    });
}

export function runCode() {
    if (!state.monacoEditor) return;

    const code = state.monacoEditor.getValue();
    selectors.consoleOutput.innerHTML = "";

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const logs = [];

    console.log = (...args) => {
        logs.push({ type: "log", message: args.map((a) => String(a)).join(" ") });
        originalLog.apply(console, args);
    };

    console.error = (...args) => {
        logs.push({ type: "error", message: args.map((a) => String(a)).join(" ") });
        originalError.apply(console, args);
    };

    console.warn = (...args) => {
        logs.push({ type: "warn", message: args.map((a) => String(a)).join(" ") });
        originalWarn.apply(console, args);
    };

    try {
        new Function(code)();
    } catch (error) {
        logs.push({ type: "error", message: error.message });
    }

    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;

    logs.forEach((log) => {
        const div = document.createElement("div");
        div.className = `console-${log.type}`;
        div.textContent = log.message;
        selectors.consoleOutput.appendChild(div);
    });

    if (logs.length === 0) {
        selectors.consoleOutput.innerHTML =
            '<div class="console-log" style="opacity: 0.5;">Çıktı yok</div>';
    }
}
