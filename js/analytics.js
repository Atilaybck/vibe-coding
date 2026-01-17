// js/analytics.js
import { state } from './config.js';
import { saveState } from './storage.js';
import { escapeHtml } from './utils.js';

export function updateStats() {
    const total = state.questions.length;
    const answered = state.answeredAll.size;
    const accuracy =
        answered > 0
            ? Math.round(((answered - state.wrongSet.size) / answered) * 100)
            : 0;

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statDone").textContent = answered;
    document.getElementById("statAccuracy").textContent = accuracy + "%";
    document.getElementById("statWrongs").textContent = state.wrongSet.size;
}

export function startQuestionTimer() {
    state.questionStartTime = Date.now();
}

export function recordQuestionTime(questionId) {
    if (!state.questionStartTime) return;

    const timeSpent = Date.now() - state.questionStartTime;

    if (!state.analyticsData[questionId]) {
        state.analyticsData[questionId] = {
            attempts: 0,
            timeSpent: 0,
            correct: false,
        };
    }

    state.analyticsData[questionId].attempts++;
    state.analyticsData[questionId].timeSpent += timeSpent;

    saveState();
}

export function updateAnalyticsDashboard() {
    const times = Object.values(state.analyticsData)
        .map((d) => d.timeSpent)
        .filter((t) => t > 0);

    const avgTime =
        times.length > 0
            ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 1000)
            : 0;

    const totalTime = Math.round(times.reduce((a, b) => a + b, 0) / 1000 / 60);

    document.getElementById("avgTime").textContent = avgTime + "s";
    document.getElementById("totalTime").textContent = totalTime + "m";

    if (times.length > 0) {
        const fastest = Math.min(...times);
        const slowest = Math.max(...times);
        document.getElementById("fastestQ").textContent = Math.round(fastest / 1000) + "s";
        document.getElementById("slowestQ").textContent = Math.round(slowest / 1000) + "s";
    }

    const weakTopics = document.getElementById("weakTopics");
    const wrongQuestions = state.questions.filter((q) => state.wrongSet.has(q._uid));

    if (wrongQuestions.length === 0) {
        weakTopics.innerHTML =
            '<div style="opacity: 0.5; padding: 12px;">Harika! Henüz yanlış cevap yok 🎉</div>';
    } else {
        weakTopics.innerHTML = wrongQuestions
            .slice(0, 5)
            .map((q) => {
                const accuracy = state.analyticsData[q._uid]?.correct ? 100 : 0;
                return `
          <div class="weak-topic-item">
            <span class="topic-name">${escapeHtml(q.title.substring(0, 50))}...</span>
            <span class="topic-accuracy">${accuracy}%</span>
          </div>
        `;
            })
            .join("");
    }

    const recommendations = document.getElementById("recommendations");
    const recs = [];

    if (wrongQuestions.length > 3) recs.push("Bu sorulara tekrar dönüp pratik yapmanızı öneririz.");
    if (avgTime > 60) recs.push("Ortalama süreniz yüksek. Daha hızlı düşünmeyi deneyin.");
    if (state.answeredAll.size === state.questions.length && state.wrongSet.size === 0)
        recs.push("Mükemmel! Tüm soruları doğru cevapladınız! 🎉");
    if (recs.length === 0) recs.push("Harika gidiyorsunuz! Çalışmaya devam edin.");

    recommendations.innerHTML = recs
        .map(
            (r) => `
    <div class="recommendation-item">
      <span class="recommendation-text">${r}</span>
    </div>
  `
        )
        .join("");
}
