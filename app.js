// app.js
document.addEventListener("DOMContentLoaded", async () => {
  let questions = [];
  let index = 0;
  let flipped = false;
  let locked = false; // şık seçilince kilitle

  const card = document.getElementById("card");
  const front = document.getElementById("front");
  const back = document.getElementById("back");
  const counter = document.getElementById("counter");

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");

  // ✅ progress bar
  const progressFill = document.getElementById("progressFill");
  const answered = new Set(); // cevaplanan soru index’leri

  function escapeHtml(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  // "C) 10" / "C" / "c)..." -> "C"
  function getAnswerKey(ans = "") {
    const s = String(ans).trim().toUpperCase();
    const m = s.match(/^([A-Z])/);
    return m ? m[1] : null;
  }

  // opt: "C) 10" veya {label:"C", text:"10"} veya {text:"C) 10"}
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

  function updateProgress() {
    const total = questions.length || 1;
    const done = answered.size;
    const pct = Math.round((done / total) * 100);
    if (progressFill) progressFill.style.width = pct + "%";
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
        // string seçenek
        if (typeof opt === "string") {
          const key = getOptionKey(opt) || "";
          return `<div class="opt" role="button" tabindex="0" data-key="${escapeHtml(
            key
          )}">${escapeHtml(opt)}</div>`;
        }

        // object seçenek
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

  // Yanlış seçince: seçilen kırmızı + doğru olan yeşil aynı anda
  function applyOptionResult(selectedKey) {
    const correctKey = getAnswerKey(questions[index]?.answer);
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

    // ✅ bu soruyu cevaplandı say (ilk seçimle)
    answered.add(index);
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
    if (!questions.length) return;

    const q = questions[index];
    counter.textContent = `${index + 1} / ${questions.length}`;
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
    updateProgress();
    fitCardHeight();
  }

  function toggleFlip() {
    flipped = !flipped;
    card.classList.toggle("flip", flipped);
    fitCardHeight();
  }

  function next() {
    index = (index + 1) % questions.length;
    render();
  }

  function prev() {
    index = (index - 1 + questions.length) % questions.length;
    render();
  }

  function randomNext() {
    if (!questions.length) return;
    if (questions.length === 1) return;

    let r = index;
    while (r === index) r = Math.floor(Math.random() * questions.length);
    index = r;
    render();
  }

  function shuffle() {
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    index = 0;
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

  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    next();
  });

  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    prev();
  });

  shuffleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    shuffle();
  });

  // kartın DIŞINA tıklayınca rastgele soru gelsin
  document.addEventListener("click", () => {
    randomNext();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "r" || e.key === "R") randomNext();
  });

  // load questions
  try {
    const [resMain, res43] = await Promise.all([
      fetch("./questions/questions.json"),
      fetch("./questions/4.3-question.json"),
    ]);

    if (!resMain.ok) throw new Error("questions.json yüklenemedi");
    if (!res43.ok) throw new Error("4.3-question.json yüklenemedi");

    const q1 = await resMain.json();
    const q2 = await res43.json();

    questions = [...q1, ...q2];

    shuffle();
  } catch (err) {
    front.innerHTML = `<p class="q-title">Hata</p><div class="muted">${escapeHtml(
      err.message
    )}</div>`;
    back.innerHTML = "";
    console.error(err);
  }
});
