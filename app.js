// app.js
document.addEventListener("DOMContentLoaded", async () => {
  let questions = [];
  let index = 0;
  let flipped = false;
  let locked = false;

  // modlar
  let mode = "all"; // "all" | "wrongs"
  const wrongSet = new Set(); // _uid tutuyor

  const card = document.getElementById("card");
  const front = document.getElementById("front");
  const back = document.getElementById("back");
  const counter = document.getElementById("counter");

  const shuffleBtn = document.getElementById("shuffleBtn");
  const wrongsBtn = document.getElementById("wrongsBtn");
  const resetBtn = document.getElementById("resetBtn");

  // progress
  const progressFill = document.getElementById("progressFill");

  // ✅ iki ayrı progress set’i
  const answeredAll = new Set();    // all mod: index bazlı
  const answeredWrongs = new Set(); // wrongs mod: _uid bazlı

  function escapeHtml(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function getAnswerKey(ans = "") {
    const s = String(ans).trim().toUpperCase();
    const m = s.match(/^([A-Z])/);
    return m ? m[1] : null;
  }

  function getOptionKey(opt) {
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

  function renderQuestionCode(q) {
    if (!q.code) return "";
    const lang = q.lang || "javascript";
    return `
<pre class="language-${lang}"><code class="language-${lang}">${escapeHtml(
      q.code
    )}</code></pre>
`;
  }

  function renderOptions(q) {
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
        const hasCode = typeof opt.code === "string" && opt.code.trim().length > 0;
        const hasText = typeof opt.text === "string" && opt.text.trim().length > 0;

        if (hasCode) {
          return `
<div class="opt" role="button" tabindex="0" data-key="${escapeHtml(key)}">
  <div><strong>${label}</strong></div>
  <pre class="language-${lang}"><code class="language-${lang}">${escapeHtml(
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

  function fitCardHeight() {
    requestAnimationFrame(() => {
      const h = Math.max(front.scrollHeight, back.scrollHeight);
      card.style.height = Math.max(500, h) + "px";
    });
  }

  function getActiveList() {
    if (mode === "wrongs") {
      const arr = questions.filter((q) => wrongSet.has(q._uid));
      return arr.length ? arr : questions;
    }
    return questions;
  }

  // ✅ mode’a göre progress hesapla
  function updateProgress() {
    const active = getActiveList();
    const total = active.length || 1;

    let done = 0;
    if (mode === "all") {
      done = answeredAll.size;
    } else {
      // wrongs modunda: aktif listedeki _uid’lerden kaç tanesi answeredWrongs’ta
      done = active.reduce((acc, q) => acc + (answeredWrongs.has(q._uid) ? 1 : 0), 0);
    }

    const pct = Math.round((done / total) * 100);
    if (progressFill) progressFill.style.width = pct + "%";
  }

  function applyOptionResult(selectedKey) {
    const active = getActiveList();
    const correctKey = getAnswerKey(active[index]?.answer);
    const opts = front.querySelectorAll(".opt");

    opts.forEach((el) => {
      const k = (el.dataset.key || "").toUpperCase();
      el.classList.add("opt-disabled");

      if (correctKey && k === correctKey) el.classList.add("opt-correct");
      if (selectedKey && k === selectedKey && k !== correctKey)
        el.classList.add("opt-wrong");
    });
  }

  function onOptionPick(el) {
    if (locked) return;

    const selectedKey = (el.dataset.key || "").toUpperCase();
    if (!selectedKey) return;

    locked = true;

    const active = getActiveList();
    const q = active[index];
    const correctKey = getAnswerKey(q?.answer);

    // all mod: index bazlı cevaplandı
    if (mode === "all") {
      answeredAll.add(index);
    } else {
      // wrongs mod: _uid bazlı cevaplandı
      if (q?._uid) answeredWrongs.add(q._uid);
    }

    // yanlışsa wrongSet'e ekle
    if (selectedKey && correctKey && selectedKey !== correctKey && q?._uid) {
      wrongSet.add(q._uid);
    }

    updateProgress();
    applyOptionResult(selectedKey);
    fitCardHeight();
  }

  function bindOptionClicks() {
    const opts = front.querySelectorAll(".opt");
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

  function render() {
    const active = getActiveList();
    if (!active.length) return;

    if (index >= active.length) index = 0;

    const q = active[index];
    counter.textContent = `${index + 1} / ${active.length}`;
    locked = false;

    front.innerHTML = `
<p class="q-title">${escapeHtml(q.title)}</p>
${renderQuestionCode(q)}
<div class="options">
  ${renderOptions(q)}
</div>
<div class="muted">Tıkla → cevabı gör</div>
`;

    back.innerHTML = `
<p class="answer">Cevap: ${escapeHtml(q.answer)}</p>
<div class="explain">${escapeHtml(q.explain || "")}</div>
<div class="muted">Tekrar tıkla → soruya dön</div>
`;

    if (window.Prism) Prism.highlightAll();

    flipped = false;
    card.classList.remove("flip");

    bindOptionClicks();
    updateProgress(); // ✅ her render’da mode’a göre
    fitCardHeight();
  }

  function toggleFlip() {
    flipped = !flipped;
    card.classList.toggle("flip", flipped);
    fitCardHeight();
  }

  function next() {
    const active = getActiveList();
    index = (index + 1) % active.length;
    render();
  }

  function randomNext() {
    const active = getActiveList();
    if (!active.length || active.length === 1) return;

    let r = index;
    while (r === index) r = Math.floor(Math.random() * active.length);
    index = r;
    render();
  }

  function shuffle() {
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    mode = "all";
    index = 0;
    render();
  }

  function resetAll() {
    wrongSet.clear();
    answeredAll.clear();
    answeredWrongs.clear();
    mode = "all";
    index = 0;
    if (progressFill) progressFill.style.width = "0%";
    render();
  }

  // events
  card.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFlip();
  });

  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") toggleFlip();
  });

  shuffleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    shuffle();
  });

  wrongsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    mode = mode === "all" ? "wrongs" : "all";
    index = 0;
    render();
  });

  resetBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetAll();
  });

  document.addEventListener("click", () => {
    randomNext();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "r" || e.key === "R") randomNext();
  });

  // load questions
  try {
  const [res41, res42, res43] = await Promise.all([
    fetch("./questions/4.1-question.json"),
    fetch("./questions/4.2-question.json"),
    fetch("./questions/4.3-question.json"),
  ]);

  if (!res41.ok) throw new Error("4.1-question.json yüklenemedi");
  if (!res42.ok) throw new Error("4.2-question.json yüklenemedi");
  if (!res43.ok) throw new Error("4.3-question.json yüklenemedi");

  const q41 = await res41.json();
  const q42 = await res42.json();
  const q43 = await res43.json();

  questions = [...q41, ...q42, ...q43].map((q, i) => ({
    ...q,
    _uid: `q_${i + 1}`,
  }));

  shuffle();
  } catch (err) {
    front.innerHTML = `<p class="q-title">Hata</p><div class="muted">${escapeHtml(
      err.message
    )}</div>`;
    back.innerHTML = "";
    console.error(err);
  }
});
