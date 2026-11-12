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

function switchPanel(name) {
  if (!name) return;
  navItems.forEach(b => b.classList.toggle("active", b.dataset.panel === name));
  panels.forEach(p => p.classList.toggle("active", p.id === `panel-${name}`));
  if (name === "dashboard") loadDashboard();
  pulseGlyph();
}

navItems.forEach(btn => {
  btn.addEventListener("click", () => switchPanel(btn.dataset.panel));
});

// Dashboard quick-access buttons reuse the same panel switcher
document.querySelectorAll("[data-goto]").forEach(btn => {
  btn.addEventListener("click", () => switchPanel(btn.dataset.goto));
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

    // Continue learning: point at the first unfinished milestone
    const next = allMilestones.find(m => !m.completed);
    const contTitle = document.getElementById("dash-continue-title");
    const contDesc = document.getElementById("dash-continue-desc");
    if (contTitle && contDesc) {
      if (next) {
        contTitle.textContent = next.title;
        contDesc.textContent = next.goal || next.description || "Pick up where you left off.";
      } else if (allMilestones.length) {
        contTitle.textContent = "All milestones complete";
        contDesc.textContent = "Nice work — generate a new roadmap for your next goal.";
      }
    }

    // Personalised tip, derived from real usage (no API key required)
    const insight = document.getElementById("dash-insight");
    if (insight) insight.textContent = buildInsight(stats);

    // Recent activity, pulled from the real history endpoints
    const recent = document.getElementById("recent-activity");
    if (recent) recent.innerHTML = await buildActivityFeed(plans);

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

// Rule-based coaching tip from real usage counters
function buildInsight(stats) {
  if (!stats.quizzes_generated && stats.notes_summarized) {
    return "You summarise notes but haven't quizzed yourself yet — generate a 5-question quiz from your last notes.";
  }
  if (stats.resumes_analyzed && !stats.interview_sessions) {
    return "Resume analysed. Next best step: run one mock interview for that same role.";
  }
  if (stats.milestones_total && stats.milestones_completion_pct < 100) {
    return `Roadmap is ${stats.milestones_completion_pct}% complete — click a milestone node below to mark the next one done.`;
  }
  if (!stats.chats_sent) {
    return "Ask the AI Chatbot one question about your current subject to get started.";
  }
  return "Steady progress — keep one streak alive: a short quiz a day beats a long cram.";
}

// Recent activity feed built from the history endpoints (failures are ignored)
async function buildActivityFeed(plans) {
  const items = [];
  const grab = async (path, fn) => {
    try {
      const rows = await api(path);
      if (rows && rows.length) items.push(fn(rows[0]));
    } catch (_) { /* history is optional */ }
  };
  await grab("/api/quiz/history", r => `📝 Quiz generated — ${String(r.topic || "").slice(0, 60)}`);
  await grab("/api/notes/history", r => `📚 Note summarised — ${r.title}`);
  await grab("/api/resume/history", r => `💼 Resume analysed — ${r.job_title} (${r.match_score}%)`);
  await grab("/api/pdf/documents", r => `📄 PDF ingested — ${r.filename}`);
  if (plans && plans.length) items.push(`📅 Study plan — ${plans[0].goal}`);
  return items.length
    ? items.slice(0, 5).map(t => `<li>${escapeHtml(t)}</li>`).join("")
    : `<li class="nothing-hint">No activity yet — try any tool above.</li>`;
}

function statBox(value, label) {
  return `<div class="stat-box"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// -----------------------------------------------------------------------------
// Minimal, dependency-free Markdown renderer for AI answers.
// Safe by design: every string is HTML-escaped first, so model output can never
// inject markup. Supports headings, bold/italic/strike, inline + fenced code,
// links, bullet/numbered lists, blockquotes, horizontal rules, and tables.
// -----------------------------------------------------------------------------
function renderMarkdown(md) {
  const raw = String(md ?? "").replace(/\r\n?/g, "\n");

  // 1) Protect fenced code blocks from the markdown pass.
  const codeBlocks = [];
  let text = raw.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, (_m, code) => {
    codeBlocks.push(code.replace(/\n$/, ""));
    return `\u0000CODE${codeBlocks.length - 1}\u0000`;
  });

  // 2) Escape HTML.
  text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 3) The model sometimes emits literal HTML line breaks — treat as newlines.
  text = text.replace(/&lt;br\s*\/?&gt;/gi, "\n");

  const inline = (s) => s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const isRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  const isSep = (l) => /-/.test(l) && /^\s*\|?[\s:|-]+$/.test(l);
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const isUl = (l) => /^\s*[-*+]\s+/.test(l);
  const isOl = (l) => /^\s*\d+[.)]\s+/.test(l);
  const isHr = (l) => /^\s*([-*_])\1{2,}\s*$/.test(l);
  const isQuote = (l) => /^\s*>\s?/.test(l);
  const isHeading = (l) => /^#{1,6}\s+/.test(l);

  const lines = text.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const codeRef = line.trim().match(/^\u0000CODE(\d+)\u0000$/);
    if (codeRef) {
      out.push(`<pre class="md-code"><code>${escapeHtml(codeBlocks[Number(codeRef[1])])}</code></pre>`);
      i++; continue;
    }

    if (isHeading(line)) {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      const level = Math.min(m[1].length + 2, 6); // keep answers from shouting
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
      i++; continue;
    }

    if (isHr(line)) { out.push("<hr>"); i++; continue; }

    if (isRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && isRow(lines[i])) { body.push(cells(lines[i])); i++; }
      out.push(
        `<div class="md-table-wrap"><table class="md-table"><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>` +
        `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
      );
      continue;
    }

    if (isQuote(line)) {
      const buf = [];
      while (i < lines.length && isQuote(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    if (isUl(line)) {
      const items = [];
      while (i < lines.length && isUl(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/, "")); i++; }
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>`);
      continue;
    }

    if (isOl(line)) {
      const items = [];
      while (i < lines.length && isOl(lines[i])) { items.push(lines[i].replace(/^\s*\d+[.)]\s+/, "")); i++; }
      out.push(`<ol>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</ol>`);
      continue;
    }

    // Paragraph: gather consecutive plain lines.
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isHeading(lines[i]) && !isHr(lines[i]) &&
           !isUl(lines[i]) && !isOl(lines[i]) && !isQuote(lines[i]) && !isRow(lines[i])) {
      para.push(lines[i]); i++;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }

  return out.join("\n").replace(/\u0000CODE(\d+)\u0000/g, (_m, n) => `<code>${escapeHtml(codeBlocks[Number(n)])}</code>`);
}

// ---- Feature 1: AI Chatbot --------------------------------------------------
const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

function appendMsg(container, role, text) {
  if (!container) return;
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  if (role === "assistant") {
    // Assistant answers are Markdown; render them (escapeHtml runs inside).
    div.classList.add("md");
    div.innerHTML = renderMarkdown(text);
  } else {
    div.textContent = text;
  }
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

// Suggested prompt chips fill the chat input and submit the existing form
const promptChips = document.querySelectorAll(".prompt-chip");
promptChips.forEach(chip => {
  chip.addEventListener("click", () => {
    if (!chatInput || !chatForm) return;
    chatInput.value = (chip.textContent || "").trim();
    chatForm.requestSubmit();
  });
});

// ---- Feature 2: PDF Chat ----------------------------------------------------
let currentDocumentId = null;
const pdfUploadForm = document.getElementById("pdf-upload-form");
const pdfUploadStatus = document.getElementById("pdf-upload-status");
const pdfDocInfo = document.getElementById("pdf-doc-info");
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
    if (pdfDocInfo) pdfDocInfo.textContent = "LOADING DOCUMENT…";
    pulseGlyph();
    try {
      const result = await api("/api/pdf/upload", { method: "POST", body: formData });
      currentDocumentId = result.document_id;
      pdfUploadStatus.textContent = `Loaded "${result.filename}" (${result.char_count} characters). You can now ask questions below.`;
      if (pdfDocInfo) pdfDocInfo.textContent = `LOADED: ${result.filename} // ${result.char_count} CHARS`;
    } catch (err) {
      pdfUploadStatus.textContent = `Error: ${err.message}`;
      if (pdfDocInfo) pdfDocInfo.textContent = "UPLOAD FAILED // NO DOCUMENT LOADED";
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
          <div class="md quiz-explanation">${renderMarkdown(q.explanation || "")}</div>
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
      output.innerHTML = `<h3>${escapeHtml(title)}</h3><div class="output-block md">${renderMarkdown(summary)}</div>`;
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
