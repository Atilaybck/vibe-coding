// Buraya tüm soru setlerini ekle (dosya adları)
const JSON_FILES = [
  "4.1-questions.json",
  "4.2-questions.json",
];

const card = document.getElementById("card");
const front = document.getElementById("front");
const back = document.getElementById("back");

const setLabel = document.getElementById("setLabel"); // ✅ hangi json/set yazısı

const qText = document.getElementById("qText");
const opts = document.getElementById("opts");
const ansText = document.getElementById("ansText");
const nextBtn = document.getElementById("nextBtn");

let questions = [];
let current = null;
let isFlipped = false;
let locked = false; // cevap verildi mi?

function pickRandomQuestion() {
  if (!questions.length) return null;
  return questions[Math.floor(Math.random() * questions.length)];
}

// Basit XSS koruması
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// JSON içindeki `inline` ve ```block``` kodları HTML'e çevirir
function formatRichText(input) {
  let s = escapeHtml(input);

  // ```code block```
  s = s.replace(
    /```([\s\S]*?)```/g,
    `<pre class="codeblock"><code>$1</code></pre>`
  );

  // `inline code`
  s = s.replace(/`([^`\n]+)`/g, `<code class="inline-code">$1</code>`);

  // newline -> <br>
  s = s.replace(/\n/g, "<br>");

  return s;
}

function renderQuestion(q) {
  current = q;
  isFlipped = false;
  locked = false;

  front.style.display = "block";
  back.style.display = "none";

  // ✅ üstte hangi setten geldiği
  if (setLabel) setLabel.textContent = `Konu: ${q.set ?? "-"}`;

  // textContent yerine innerHTML (formatRichText güvenli escape yapıyor)
  qText.innerHTML = formatRichText(q.question);

  opts.innerHTML = Object.entries(q.options)
    .map(([key, val]) => {
      return `
        <li class="option" data-key="${escapeHtml(
          key
        )}" role="button" tabindex="0">
          <strong>${escapeHtml(key)})</strong> ${formatRichText(val)}
        </li>
      `;
    })
    .join("");

  const correctKey = q.answer;
  const correctText = q.options[correctKey] ?? "";
  ansText.innerHTML = `<strong>Doğru cevap:</strong> ${escapeHtml(
    correctKey
  )}) ${formatRichText(correctText)}`;
}

function flip() {
  if (!current) return;
  isFlipped = !isFlipped;
  front.style.display = isFlipped ? "none" : "block";
  back.style.display = isFlipped ? "block" : "none";
}

function markAnswers(selectedKey) {
  if (!current) return;

  const correctKey = current.answer;

  const items = [...opts.querySelectorAll(".option")];
  items.forEach((li) => {
    const key = li.dataset.key;
    li.classList.add("option--disabled");

    if (key === correctKey) li.classList.add("option--correct");
    if (key === selectedKey && selectedKey !== correctKey) {
      li.classList.add("option--wrong");
    }
  });
}

async function init() {
  try {
    // tüm jsonları paralel çek
    const dataArrays = await Promise.all(
      JSON_FILES.map(async (path) => {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`${path} okunamadı: ${res.status}`);
        return res.json();
      })
    );

    // tek havuz
    questions = dataArrays.flat();

    const q = pickRandomQuestion();
    if (!q) throw new Error("Soru bulunamadı.");
    renderQuestion(q);
  } catch (err) {
    qText.textContent = "Hata: " + err.message;
    opts.innerHTML = "";
    ansText.textContent = "";
    if (setLabel) setLabel.textContent = "Konu: -";
  }
}

// Kart tıklama: buton / şık tıklanınca flip olmasın
card.addEventListener("click", (e) => {
  if (e.target === nextBtn) return;
  if (e.target.closest(".option")) return;
  flip();
});

// ✅ Kartın DIŞINA tıklayınca yeni soru
document.addEventListener("click", (e) => {
  // kartın içindeyse hiçbir şey yapma
  if (e.target.closest("#card")) return;

  const q = pickRandomQuestion();
  if (q) renderQuestion(q);
});

// Şık seçimi (event delegation)
opts.addEventListener("click", (e) => {
  const li = e.target.closest(".option");
  if (!li || locked) return;

  locked = true;
  const selectedKey = li.dataset.key;

  markAnswers(selectedKey);
});

// Enter ile de seçilsin
opts.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const li = e.target.closest(".option");
  if (!li || locked) return;

  locked = true;
  markAnswers(li.dataset.key);
});

nextBtn.addEventListener("click", () => {
  const q = pickRandomQuestion();
  if (q) renderQuestion(q);
});

init();
