// =============================================================================
// PATHAI (1) — NOTHING OS FRONTEND LOGIC
// Maintains 100% original functionality across all 8 features,
// plus Nothing Phone live matrix clock, dark/light theme, and Glyph LED pulse.
// =============================================================================

// ---- Nothing OS Live Matrix Clock & Telemetry --------------------------------
function updateNothingClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  const lockClock = document.getElementById("lock-clock");
  const topClock = document.getElementById("top-clock");
  if (lockClock) lockClock.textContent = timeStr;
  if (topClock) topClock.textContent = timeStr;

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  const lockDate = document.getElementById("lock-date");
  if (lockDate) lockDate.textContent = dateStr;
}
setInterval(updateNothingClock, 1000);
updateNothingClock();

// ---- Nothing Glyph LED Light Interaction ------------------------------------
const glyphStrip = document.getElementById("glyph-strip");
const glyphToggleBtn = document.getElementById("glyph-toggle-btn");

function pulseGlyph() {
  if (!glyphStrip) return;
  glyphStrip.classList.add("pulsing");
  setTimeout(() => {
    glyphStrip.classList.remove("pulsing");
  }, 1200);
}

if (glyphToggleBtn) {
  glyphToggleBtn.addEventListener("click", pulseGlyph);
}
if (glyphStrip) {
  glyphStrip.addEventListener("click", pulseGlyph);
}

// ---- Nothing Dark / Chalk White Theme Switcher -----------------------------
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themeLabel = document.getElementById("theme-label");
const themeIcon = document.getElementById("theme-icon");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("nothing_theme", theme);
  if (theme === "light") {
    if (themeLabel) themeLabel.textContent = "LIGHT";
    if (themeIcon) themeIcon.textContent = "☼";
  } else {
    if (themeLabel) themeLabel.textContent = "DARK";
    if (themeIcon) themeIcon.textContent = "◐";
  }
}

const savedTheme = localStorage.getItem("nothing_theme") || "dark";
applyTheme(savedTheme);

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}

// ---- Engine Status Check ----------------------------------------------------
async function checkEngineStatus() {
  try {
    const data = await api("/api/engine-status");
    const sidebarEngine = document.getElementById("sidebar-engine-value");
    const chatStatusLabel = document.getElementById("chat-status-label");
    if (sidebarEngine && data.engine_label) sidebarEngine.textContent = data.engine_label;
    if (chatStatusLabel && data.chat_pill_label) chatStatusLabel.textContent = data.chat_pill_label;
  } catch {
    // Keep offline demo mode as default
  }
}
checkEngineStatus();

// ---- Sidebar navigation -----------------------------------------------------
const navItems = document.querySelectorAll(".nav-item");
const panels = document.querySelectorAll(".panel");

navItems.forEach(btn => {
  btn.addEventListener("click", () => {
    navItems.forEach(b => b.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    const targetPanel = document.getElementById(`panel-${btn.dataset.panel}`);
    if (targetPanel) targetPanel.classList.add("active");
    if (btn.dataset.panel === "dashboard") loadDashboard();
    pulseGlyph();
  });
});

async function api(path, options = {}) {
  const res = await fetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

// ---- Feature 8: Dashboard ---------------------------------------------------
async function loadDashboard() {
  const grid = document.getElementById("stat-grid");
  const pathTrack = document.getElementById("progress-path");
  if (!grid || !pathTrack) return;
  try {
    const stats = await api("/api/progress");
    grid.innerHTML = `
      ${statBox(stats.chats_sent, "Chat messages sent")}
      ${statBox(stats.documents_uploaded, "PDFs uploaded")}
      ${statBox(stats.quizzes_generated, "Quizzes generated")}
      ${statBox(stats.notes_summarized, "Notes summarized")}
      ${statBox(stats.resumes_analyzed, "Resumes analyzed")}
      ${statBox(stats.interview_sessions, "Interview sessions")}
      ${statBox(stats.study_plans, "Study plans created")}
      ${statBox(stats.milestones_completion_pct + "%", "Milestones completed")}
    `;
    const plans = await api("/api/planner/plans");
    const allMilestones = plans.flatMap(p => (p.milestones || []).map(m => ({ ...m, goal: p.goal })));
    pathTrack.innerHTML = allMilestones.length
      ? allMilestones.map(m => `
          <div class="path-item">
            <div class="path-node ${m.completed ? "done" : ""}" data-id="${m.id}" title="Toggle Milestone"></div>
            <div class="path-item-text">
              <div class="path-item-title">${escapeHtml(m.title)}</div>
              <div class="path-item-desc">${escapeHtml(m.goal)}</div>
            </div>
          </div>`).join("")
      : `<p class="hint nothing-hint">No study plan milestones yet — generate one in Study Planner.</p>`;

    pathTrack.querySelectorAll(".path-node").forEach(node => {
      node.addEventListener("click", async () => {
        await api(`/api/planner/milestone/${node.dataset.id}/toggle`, { method: "POST" });
        loadDashboard();
        pulseGlyph();
      });
    });
  } catch (err) {
    grid.innerHTML = `<p class="hint nothing-hint">Could not load dashboard: ${err.message}</p>`;
  }
}

function statBox(value, label) {
  return `<div class="stat-box"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---- Feature 1: AI Chatbot --------------------------------------------------
const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

function appendMsg(container, role, text) {
  if (!container) return;
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

if (chatForm) {
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    appendMsg(chatLog, "user", message);
    chatInput.value = "";
    chatInput.disabled = true;
    pulseGlyph();
    try {
      const { reply } = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      appendMsg(chatLog, "assistant", reply);
    } catch (err) {
      appendMsg(chatLog, "assistant", `Error: ${err.message}`);
    } finally {
      chatInput.disabled = false;
      chatInput.focus();
    }
  });
}

// ---- Feature 2: PDF Chat ----------------------------------------------------
let currentDocumentId = null;
const pdfUploadForm = document.getElementById("pdf-upload-form");
const pdfUploadStatus = document.getElementById("pdf-upload-status");
const pdfChatLog = document.getElementById("pdf-chat-log");
const pdfAskForm = document.getElementById("pdf-ask-form");

if (pdfUploadForm) {
  pdfUploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("pdf-file-input");
    if (!fileInput.files.length) return;
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    pdfUploadStatus.textContent = "Uploading and extracting text…";
    pulseGlyph();
    try {
      const result = await api("/api/pdf/upload", { method: "POST", body: formData });
      currentDocumentId = result.document_id;
      pdfUploadStatus.textContent = `Loaded "${result.filename}" (${result.char_count} characters). You can now ask questions below.`;
    } catch (err) {
      pdfUploadStatus.textContent = `Error: ${err.message}`;
    }
  });
}

if (pdfAskForm) {
  pdfAskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("pdf-question-input");
    const question = input.value.trim();
    if (!question) return;
    if (!currentDocumentId) {
      appendMsg(pdfChatLog, "assistant", "Please upload a PDF first.");
      return;
    }
    appendMsg(pdfChatLog, "user", question);
    input.value = "";
    pulseGlyph();
    try {
      const { answer } = await api("/api/pdf/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: currentDocumentId, question }),
      });
      appendMsg(pdfChatLog, "assistant", answer);
    } catch (err) {
      appendMsg(pdfChatLog, "assistant", `Error: ${err.message}`);
    }
  });
}

// ---- Feature 3: Quiz Generator ----------------------------------------------
const quizForm = document.getElementById("quiz-form");
if (quizForm) {
  quizForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = document.getElementById("quiz-content").value.trim();
    const numQuestions = document.getElementById("quiz-count").value;
    const output = document.getElementById("quiz-output");
    output.innerHTML = `<p class="hint nothing-hint">Generating Nothing assessment quiz questions…</p>`;
    pulseGlyph();
    try {
      const result = await api("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, num_questions: numQuestions }),
      });
      if (result.message) {
        output.innerHTML = `<div class="output-block" style="white-space: pre-line;">${escapeHtml(result.message)}</div>`;
        return;
      }
      if (!result.questions || !result.questions.length) {
        output.innerHTML = `<p class="hint nothing-hint">No questions were generated. Try adding more detail to your topic/notes.</p>`;
        return;
      }
      output.innerHTML = result.questions.map((q, i) => `
        <div class="quiz-question">
          <strong>Q${i + 1}. ${escapeHtml(q.question)}</strong>
          ${(q.options || []).map((opt, idx) => `
            <div class="quiz-option ${idx === q.correct_index ? "correct" : ""}">${escapeHtml(opt)}</div>
          `).join("")}
          <p class="hint nothing-hint">${escapeHtml(q.explanation || "")}</p>
        </div>
      `).join("");
    } catch (err) {
      output.innerHTML = `<p class="hint nothing-hint">Error: ${err.message}</p>`;
    }
  });
}

// ---- Feature 4: Notes Summarizer ---------------------------------------------
const notesForm = document.getElementById("notes-form");
if (notesForm) {
  notesForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("notes-title").value.trim();
    const text = document.getElementById("notes-text").value.trim();
    const output = document.getElementById("notes-output");
    output.innerHTML = `<p class="hint nothing-hint">Synthesizing key revision points…</p>`;
    pulseGlyph();
    try {
      const { summary } = await api("/api/notes/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text }),
      });
      output.innerHTML = `<h3>${escapeHtml(title)}</h3><div class="output-block">${escapeHtml(summary)}</div>`;
    } catch (err) {
      output.innerHTML = `<p class="hint nothing-hint">Error: ${err.message}</p>`;
    }
  });
}

// ---- Feature 5: Resume Analyzer ----------------------------------------------
const resumeForm = document.getElementById("resume-form");
if (resumeForm) {
  resumeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const jobTitle = document.getElementById("resume-job-title").value.trim();
    const jd = document.getElementById("resume-jd").value.trim();
    const fileInput = document.getElementById("resume-file-input");
    const resumeText = document.getElementById("resume-text").value.trim();
    const output = document.getElementById("resume-output");
    output.innerHTML = `<p class="hint nothing-hint">Analyzing ATS alignment & gap metrics…</p>`;
    pulseGlyph();

    try {
      let result;
      if (fileInput && fileInput.files.length) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        formData.append("job_description", jd);
        formData.append("job_title", jobTitle);
        result = await api("/api/resume/analyze", { method: "POST", body: formData });
      } else {
        result = await api("/api/resume/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_text: resumeText, job_description: jd, job_title: jobTitle }),
        });
      }
      if (result.message) {
        output.innerHTML = `<div class="output-block" style="white-space: pre-line;">${escapeHtml(result.message)}</div>`;
        return;
      }
      output.innerHTML = `
        <h3>ATS MATCH RATING: <span class="badge">${result.match_score}/100</span></h3>
        <p style="margin-top:14px; font-weight:700;">Identified Strengths</p>
        <div class="output-block">${(result.strengths || []).map(s => "• " + escapeHtml(s)).join("\n")}</div>
        <p style="margin-top:14px; font-weight:700;">Potential Gaps</p>
        <div class="output-block">${(result.gaps || []).map(s => "• " + escapeHtml(s)).join("\n")}</div>
        <p style="margin-top:14px; font-weight:700;">Strategic Actionable Suggestions</p>
        <div class="output-block">${(result.suggestions || []).map(s => "• " + escapeHtml(s)).join("\n")}</div>
      `;
    } catch (err) {
      output.innerHTML = `<p class="hint nothing-hint">Error: ${err.message}</p>`;
    }
  });
}

// ---- Feature 6: Interview Practice -------------------------------------------
let currentTurnId = null;
const interviewStartForm = document.getElementById("interview-start-form");
const interviewCard = document.getElementById("interview-card");
const interviewLog = document.getElementById("interview-log");
const interviewAnswerForm = document.getElementById("interview-answer-form");

if (interviewStartForm) {
  interviewStartForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const role = document.getElementById("interview-role").value.trim();
    pulseGlyph();
    try {
      const result = await api("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      interviewCard.style.display = "flex";
      interviewLog.innerHTML = "";
      appendMsg(interviewLog, "assistant", result.question);
      currentTurnId = result.turn_id;
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  });
}

if (interviewAnswerForm) {
  interviewAnswerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("interview-answer-input");
    const answer = input.value.trim();
    if (!answer || !currentTurnId) return;
    appendMsg(interviewLog, "user", answer);
    input.value = "";
    pulseGlyph();
    try {
      const result = await api("/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turn_id: currentTurnId, answer }),
      });
      appendMsg(interviewLog, "assistant", result.feedback_and_next_question);
      currentTurnId = result.next_turn_id;
    } catch (err) {
      appendMsg(interviewLog, "assistant", `Error: ${err.message}`);
    }
  });
}

// ---- Feature 7: Study Planner ------------------------------------------------
const plannerForm = document.getElementById("planner-form");
if (plannerForm) {
  plannerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const goal = document.getElementById("planner-goal").value.trim();
    const currentSkills = document.getElementById("planner-skills").value.trim();
    const output = document.getElementById("planner-output");
    output.innerHTML = `<p class="hint nothing-hint">Generating milestone roadmap…</p>`;
    pulseGlyph();
    try {
      const result = await api("/api/planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, current_skills: currentSkills }),
      });
      if (result.message) {
        output.innerHTML = `<div class="output-block" style="white-space: pre-line;">${escapeHtml(result.message)}</div>`;
        return;
      }
      output.innerHTML = `
        <h3>${escapeHtml(result.goal)}</h3>
        <div class="path-track" style="margin-top:16px;">
          ${(result.milestones || []).map(m => `
            <div class="path-item">
              <div class="path-node ${m.completed ? "done" : ""}" data-id="${m.id}" title="Toggle Milestone"></div>
              <div class="path-item-text">
                <div class="path-item-title">${escapeHtml(m.title)}</div>
                <div class="path-item-desc">${escapeHtml(m.description)}</div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
      output.querySelectorAll(".path-node").forEach(node => {
        node.addEventListener("click", async () => {
          await api(`/api/planner/milestone/${node.dataset.id}/toggle`, { method: "POST" });
          node.classList.toggle("done");
          pulseGlyph();
        });
      });
    } catch (err) {
      output.innerHTML = `<p class="hint nothing-hint">Error: ${err.message}</p>`;
    }
  });
}

// ---- Start Screen Unlock ----------------------------------------------------
function unlockApp() {
  const welcomeScreen = document.getElementById("welcome-screen");
  const appShell = document.getElementById("app-shell");

  if (welcomeScreen) {
    welcomeScreen.hidden = true;
    welcomeScreen.style.setProperty("display", "none", "important");
  }

  if (appShell) {
    appShell.hidden = false;
    appShell.removeAttribute("hidden");
    appShell.style.setProperty("display", "grid", "important");
  }

  if (typeof loadDashboard === "function") {
    loadDashboard();
  }

  if (typeof pulseGlyph === "function") {
    pulseGlyph();
  }
}
window.unlockApp = unlockApp;

const startAppButton = document.getElementById("start-app-btn");
if (startAppButton) {
  startAppButton.addEventListener("click", unlockApp);
}
