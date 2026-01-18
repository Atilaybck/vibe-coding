// js/utils.js


export function escapeHtml(s = "") {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

export function getAnswerKey(ans = "") {
    const s = String(ans).trim().toUpperCase();
    const m = s.match(/^([A-Z])/);
    return m ? m[1] : null;
}

export function getOptionKey(opt) {
    if (typeof opt === "string") {
        const m = opt.trim().match(/^([A-Z])\s*\)/i);
        return m ? m[1].toUpperCase() : null;
    }
    if (opt && typeof opt === "object") {
        if (opt.label) return String(opt.label).trim().toUpperCase();
        if (opt.text) {
            const m = String(opt.text).trim().match(/^([A-Z])\s*\)/i);
            return m ? m[1].toUpperCase() : null;
        }
    }
    return null;
}
