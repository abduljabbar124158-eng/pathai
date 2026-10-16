// ---------------------------------------------------------------
// PathAI frontend -- vanilla JS, no build step needed.
// Each section below wires one feature's form(s) to its Flask API.
// ---------------------------------------------------------------

// ---- Sidebar navigation -----------------------------------------------
const navItems = document.querySelectorAll(".nav-item");
const panels = document.querySelectorAll(".panel");

navItems.forEach(btn => {
  btn.addEventListener("click", () => {
    navItems.forEach(b => b.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.panel}`).classList.add("active");
    if (btn.dataset.panel === "dashboard") loadDashboard();
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

// ---- Feature 8: Dashboard ------------------------------------------------
async function loadDashboard() {
  const grid = document.getElementById("stat-grid");
  const pathTrack = document.getElementById("progress-path");
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
    const allMilestones = plans.flatMap(p => p.milestones.map(m => ({ ...m, goal: p.goal })));
    pathTrack.innerHTML = allMilestones.length
      ? allMilestones.map(m => `
          <div class="path-item">
            <div class="path-node ${m.completed ? "done" : ""}" data-id="${m.id}"></div>
            <div class="path-item-text">
              <div class="path-item-title">${escapeHtml(m.title)}</div>
              <div class="path-item-desc">${escapeHtml(m.goal)}</div>
            </div>
          </div>`).join("")
      : `<p class="hint">No study plan milestones yet -- generate one in Study Planner.</p>`;

    pathTrack.querySelectorAll(".path-node").forEach(node => {
      node.addEventListener("click", async () => {
        await api(`/api/planner/milestone/${node.dataset.id}/toggle`, { method: "POST" });
        loadDashboard();
      });
    });
  } catch (err) {
    grid.innerHTML = `<p class="hint">Could not load dashboard: ${err.message}</p>`;
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

// ---- Feature 1: AI Chatbot ------------------------------------------------
const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

function appendMsg(container, role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  appendMsg(chatLog, "user", message);
  chatInput.value = "";
  chatInput.disabled = true;
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

// ---- Feature 2: PDF Chat ---------------------------------------------------
let currentDocumentId = null;
const pdfUploadForm = document.getElementById("pdf-upload-form");
const pdfUploadStatus = document.getElementById("pdf-upload-status");
const pdfChatLog = document.getElementById("pdf-chat-log");
const pdfAskForm = document.getElementById("pdf-ask-form");

pdfUploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById("pdf-file-input");
  if (!fileInput.files.length) return;
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  pdfUploadStatus.textContent = "Uploading and extracting text…";
  try {
    const result = await api("/api/pdf/upload", { method: "POST", body: formData });
    currentDocumentId = result.document_id;
    pdfUploadStatus.textContent = `Loaded "${result.filename}" (${result.char_count} characters). You can ask questions below.`;
  } catch (err) {
    pdfUploadStatus.textContent = `Error: ${err.message}`;
  }
});

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

// ---- Feature 3: Quiz Generator ---------------------------------------------
document.getElementById("quiz-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = document.getElementById("quiz-content").value.trim();
  const numQuestions = document.getElementById("quiz-count").value;
  const output = document.getElementById("quiz-output");
  output.innerHTML = `<p class="hint">Generating quiz…</p>`;
  try {
    const result = await api("/api/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, num_questions: numQuestions }),
    });
    if (!result.questions || !result.questions.length) {
      output.innerHTML = `<p class="hint">No questions were generated. Try adding more detail to your topic/notes.</p>`;
      return;
    }
    output.innerHTML = result.questions.map((q, i) => `
      <div class="quiz-question">
        <strong>Q${i + 1}. ${escapeHtml(q.question)}</strong>
        ${(q.options || []).map((opt, idx) => `
          <div class="quiz-option ${idx === q.correct_index ? "correct" : ""}">${escapeHtml(opt)}</div>
        `).join("")}
        <p class="hint">${escapeHtml(q.explanation || "")}</p>
      </div>
    `).join("");
  } catch (err) {
    output.innerHTML = `<p class="hint">Error: ${err.message}</p>`;
  }
});

// ---- Feature 4: Notes Summarizer --------------------------------------------
document.getElementById("notes-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("notes-title").value.trim();
  const text = document.getElementById("notes-text").value.trim();
  const output = document.getElementById("notes-output");
  output.innerHTML = `<p class="hint">Summarizing…</p>`;
  try {
    const { summary } = await api("/api/notes/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, text }),
    });
    output.innerHTML = `<h3>${escapeHtml(title)}</h3><div class="output-block">${escapeHtml(summary)}</div>`;
  } catch (err) {
    output.innerHTML = `<p class="hint">Error: ${err.message}</p>`;
  }
});

// ---- Feature 5: Resume Analyzer ----------------------------------------------
document.getElementById("resume-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const jobTitle = document.getElementById("resume-job-title").value.trim();
  const jd = document.getElementById("resume-jd").value.trim();
  const fileInput = document.getElementById("resume-file-input");
  const resumeText = document.getElementById("resume-text").value.trim();
  const output = document.getElementById("resume-output");
  output.innerHTML = `<p class="hint">Analyzing…</p>`;

  try {
    let result;
    if (fileInput.files.length) {
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
    output.innerHTML = `
      <h3>Match score: <span class="badge">${result.match_score}/100</span></h3>
      <p><strong>Strengths</strong></p>
      <div class="output-block">${(result.strengths || []).map(s => "• " + escapeHtml(s)).join("\n")}</div>
      <p><strong>Gaps</strong></p>
      <div class="output-block">${(result.gaps || []).map(s => "• " + escapeHtml(s)).join("\n")}</div>
      <p><strong>Suggestions</strong></p>
      <div class="output-block">${(result.suggestions || []).map(s => "• " + escapeHtml(s)).join("\n")}</div>
    `;
  } catch (err) {
    output.innerHTML = `<p class="hint">Error: ${err.message}</p>`;
  }
});

// ---- Feature 6: Interview Practice --------------------------------------------
let currentTurnId = null;
const interviewCard = document.getElementById("interview-card");
const interviewLog = document.getElementById("interview-log");

document.getElementById("interview-start-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const role = document.getElementById("interview-role").value.trim();
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

document.getElementById("interview-answer-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("interview-answer-input");
  const answer = input.value.trim();
  if (!answer || !currentTurnId) return;
  appendMsg(interviewLog, "user", answer);
  input.value = "";
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

// ---- Feature 7: Study Planner ---------------------------------------------------
document.getElementById("planner-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const goal = document.getElementById("planner-goal").value.trim();
  const currentSkills = document.getElementById("planner-skills").value.trim();
  const output = document.getElementById("planner-output");
  output.innerHTML = `<p class="hint">Building your roadmap…</p>`;
  try {
    const result = await api("/api/planner/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, current_skills: currentSkills }),
    });
    output.innerHTML = `
      <h3>${escapeHtml(result.goal)}</h3>
      <div class="path-track">
        ${result.milestones.map(m => `
          <div class="path-item">
            <div class="path-node ${m.completed ? "done" : ""}" data-id="${m.id}"></div>
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
      });
    });
  } catch (err) {
    output.innerHTML = `<p class="hint">Error: ${err.message}</p>`;
  }
});

// ---- Start screen ---------------------------------------------------------------
const startAppButton = document.getElementById("start-app-btn");
startAppButton.addEventListener("click", () => {
  document.getElementById("welcome-screen").hidden = true;
  document.getElementById("app-shell").hidden = false;
  loadDashboard();
});

// ---- Init ---------------------------------------------------------------------
