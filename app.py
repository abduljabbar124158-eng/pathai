"""
app.py
------
PathAI -- AI Learning & Career Assistant
Flask backend exposing a REST API for all 8 features. The frontend
(templates/index.html + static/js/app.js) is a single-page dashboard
that talks to these endpoints.
"""
import os
import json
from datetime import datetime, timezone

from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
from pypdf import PdfReader

import db
import ai_service

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB upload limit

db.init_db(app)


def extract_pdf_text(filepath: str) -> str:
    reader = PdfReader(filepath)
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def parse_json_safely(raw: str, fallback: dict) -> dict:
    """AI responses are sometimes wrapped in markdown code fences -- strip and parse safely."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        return fallback


# ---------------------------------------------------------------- Page ----
@app.route("/")
def index():
    return render_template("index.html")


# ---------------------------------------------------- Feature 1: Chatbot --
@app.route("/api/chat", methods=["GET", "POST"])
def chat():
    if request.method == "GET":
        rows = db.query_all("SELECT role, content FROM chat_message ORDER BY id")
        return jsonify([dict(r) for r in rows])

    data = request.get_json(force=True)
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "message is required"}), 400

    db.execute("INSERT INTO chat_message (role, content) VALUES (?, ?)", ("user", user_message))

    recent = db.query_all("SELECT role, content FROM chat_message ORDER BY id DESC LIMIT 10")
    context = "\n".join(f"{r['role']}: {r['content']}" for r in reversed(recent))

    reply = ai_service.generate_text(
        prompt=f"Conversation so far:\n{context}\n\nRespond to the last user message helpfully and concisely.",
        system="You are PathAI, a friendly assistant for students on learning and career questions.",
    )
    db.execute("INSERT INTO chat_message (role, content) VALUES (?, ?)", ("assistant", reply))
    return jsonify({"reply": reply})


# ------------------------------------------------------ Feature 2: PDF Chat
@app.route("/api/pdf/upload", methods=["POST"])
def pdf_upload():
    file = request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"error": "No file uploaded"}), 400

    safe_name = f"{datetime.now().timestamp()}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_name)
    file.save(filepath)

    try:
        text = extract_pdf_text(filepath)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Could not read PDF: {exc}"}), 400

    doc_id = db.execute(
        "INSERT INTO document (filename, extracted_text) VALUES (?, ?)",
        (file.filename, text[:50000]),
    )
    return jsonify({"document_id": doc_id, "filename": file.filename, "char_count": len(text)})


@app.route("/api/pdf/ask", methods=["POST"])
def pdf_ask():
    data = request.get_json(force=True)
    document_id = data.get("document_id")
    question = data.get("question", "").strip()
    doc_row = db.query_one("SELECT * FROM document WHERE id = ?", (document_id,))
    if not doc_row:
        return jsonify({"error": "Document not found"}), 404
    if not question:
        return jsonify({"error": "question is required"}), 400

    answer = ai_service.generate_text(
        prompt=f"Document content:\n{doc_row['extracted_text'][:8000]}\n\nQuestion: {question}",
        system="Answer the question using only the document content provided. If the answer isn't in the document, say so.",
    )
    db.execute(
        "INSERT INTO document_chat (document_id, question, answer) VALUES (?, ?, ?)",
        (document_id, question, answer),
    )
    return jsonify({"answer": answer})


@app.route("/api/pdf/documents", methods=["GET"])
def pdf_documents():
    rows = db.query_all("SELECT id, filename, created_at FROM document ORDER BY id DESC")
    return jsonify([dict(r) for r in rows])


# --------------------------------------------------- Feature 3: Quiz Gen --
@app.route("/api/quiz/generate", methods=["POST"])
def quiz_generate():
    data = request.get_json(force=True)
    topic_or_notes = data.get("content", "").strip()
    num_questions = int(data.get("num_questions", 5))
    if not topic_or_notes:
        return jsonify({"error": "content is required"}), 400

    raw = ai_service.generate_text(
        prompt=(
            f"Create {num_questions} multiple-choice quiz questions based on this topic/notes:\n"
            f"{topic_or_notes[:6000]}\n\n"
            'Respond ONLY as JSON: {"questions": [{"question": "...", "options": ["...","...","...","..."], '
            '"correct_index": 0, "explanation": "..."}]}'
        ),
        system="You are a quiz generator. Always respond with valid JSON only, no extra text.",
        max_tokens=1500,
    )
    parsed = parse_json_safely(raw, fallback={"questions": []})
    quiz_id = db.execute(
        "INSERT INTO quiz (topic, questions_json) VALUES (?, ?)",
        (topic_or_notes[:255], json.dumps(parsed)),
    )
    return jsonify({"quiz_id": quiz_id, **parsed})


@app.route("/api/quiz/history", methods=["GET"])
def quiz_history():
    rows = db.query_all("SELECT id, topic, created_at FROM quiz ORDER BY id DESC")
    return jsonify([dict(r) for r in rows])


# --------------------------------------------- Feature 4: Notes Summarizer
@app.route("/api/notes/summarize", methods=["POST"])
def notes_summarize():
    data = request.get_json(force=True)
    text = data.get("text", "").strip()
    title = data.get("title", "Untitled Note").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400

    summary = ai_service.generate_text(
        prompt=f"Summarize these notes into clear, concise bullet points a student can revise from:\n\n{text[:8000]}",
        system="You are a study notes summarizer for students.",
    )
    note_id = db.execute(
        "INSERT INTO note (title, original_text, summary) VALUES (?, ?, ?)",
        (title, text, summary),
    )
    return jsonify({"note_id": note_id, "summary": summary})


@app.route("/api/notes/history", methods=["GET"])
def notes_history():
    rows = db.query_all("SELECT id, title, summary, created_at FROM note ORDER BY id DESC")
    return jsonify([dict(r) for r in rows])


# ---------------------------------------------- Feature 5: Resume Analyzer
@app.route("/api/resume/analyze", methods=["POST"])
def resume_analyze():
    if "file" in request.files and request.files["file"].filename:
        file = request.files["file"]
        safe_name = f"{datetime.now().timestamp()}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, safe_name)
        file.save(filepath)
        try:
            resume_text = extract_pdf_text(filepath)
        except Exception as exc:  # noqa: BLE001
            return jsonify({"error": f"Could not read PDF: {exc}"}), 400
        job_description = request.form.get("job_description", "").strip()
        job_title = request.form.get("job_title", "").strip()
    else:
        data = request.get_json(force=True)
        resume_text = data.get("resume_text", "").strip()
        job_description = data.get("job_description", "").strip()
        job_title = data.get("job_title", "").strip()

    if not resume_text or not job_description:
        return jsonify({"error": "resume and job_description are both required"}), 400

    raw = ai_service.generate_text(
        prompt=(
            f"Resume:\n{resume_text[:6000]}\n\nJob description:\n{job_description[:3000]}\n\n"
            'Respond ONLY as JSON: {"match_score": 0-100, "strengths": ["..."], "gaps": ["..."], "suggestions": ["..."]}'
        ),
        system="You are a resume analyzer for the resume feature. Always respond with valid JSON only.",
        max_tokens=1000,
    )
    parsed = parse_json_safely(raw, fallback={"match_score": 0, "strengths": [], "gaps": [], "suggestions": []})

    analysis_id = db.execute(
        "INSERT INTO resume_analysis (job_title, match_score, analysis_json) VALUES (?, ?, ?)",
        (job_title or "Untitled role", parsed.get("match_score", 0), json.dumps(parsed)),
    )
    return jsonify({"analysis_id": analysis_id, **parsed})


@app.route("/api/resume/history", methods=["GET"])
def resume_history():
    rows = db.query_all("SELECT id, job_title, match_score, created_at FROM resume_analysis ORDER BY id DESC")
    return jsonify([dict(r) for r in rows])


# ------------------------------------------- Feature 6: Interview Practice
@app.route("/api/interview/start", methods=["POST"])
def interview_start():
    data = request.get_json(force=True)
    role = data.get("role", "").strip()
    if not role:
        return jsonify({"error": "role is required"}), 400

    question = ai_service.generate_text(
        prompt=f"Ask one relevant, focused interview question for a candidate applying for: {role}.",
        system="You conduct mock interviews for job seekers. Ask exactly one question, no preamble.",
        max_tokens=200,
    )
    session_id = db.execute("INSERT INTO interview_session (role) VALUES (?)", (role,))
    turn_id = db.execute(
        "INSERT INTO interview_turn (session_id, question) VALUES (?, ?)",
        (session_id, question),
    )
    return jsonify({"session_id": session_id, "turn_id": turn_id, "question": question})


@app.route("/api/interview/answer", methods=["POST"])
def interview_answer():
    data = request.get_json(force=True)
    turn_id = data.get("turn_id")
    answer = data.get("answer", "").strip()
    turn = db.query_one("SELECT * FROM interview_turn WHERE id = ?", (turn_id,))
    if not turn:
        return jsonify({"error": "Interview turn not found"}), 404

    session_row = db.query_one("SELECT * FROM interview_session WHERE id = ?", (turn["session_id"],))
    result_raw = ai_service.generate_text(
        prompt=(
            f"Role: {session_row['role']}\nQuestion asked: {turn['question']}\nCandidate's answer: {answer}\n\n"
            "Give brief constructive feedback (2-3 sentences), then ask the next interview question."
        ),
        system="You conduct mock interviews for job seekers, giving feedback then the next question.",
        max_tokens=400,
    )
    db.execute(
        "UPDATE interview_turn SET answer = ?, feedback = ? WHERE id = ?",
        (answer, result_raw, turn_id),
    )
    next_turn_id = db.execute(
        "INSERT INTO interview_turn (session_id, question) VALUES (?, ?)",
        (session_row["id"], result_raw),
    )
    return jsonify({"feedback_and_next_question": result_raw, "next_turn_id": next_turn_id})


# ----------------------------------------------- Feature 7: Study Planner
@app.route("/api/planner/generate", methods=["POST"])
def planner_generate():
    data = request.get_json(force=True)
    goal = data.get("goal", "").strip()
    current_skills = data.get("current_skills", "").strip()
    if not goal:
        return jsonify({"error": "goal is required"}), 400

    raw = ai_service.generate_text(
        prompt=(
            f"Career/learning goal: {goal}\nCurrent skills: {current_skills or 'none listed'}\n\n"
            'Create a study plan roadmap. Respond ONLY as JSON: '
            '{"milestones": [{"title": "...", "description": "..."}]}'
        ),
        system="You create structured study plan roadmaps for students. Always respond with valid JSON only.",
        max_tokens=1200,
    )
    parsed = parse_json_safely(raw, fallback={"milestones": []})

    plan_id = db.execute(
        "INSERT INTO study_plan (goal, current_skills) VALUES (?, ?)",
        (goal, current_skills),
    )
    for idx, m in enumerate(parsed.get("milestones", [])):
        db.execute(
            "INSERT INTO milestone (plan_id, title, description, order_index) VALUES (?, ?, ?, ?)",
            (plan_id, m.get("title", f"Step {idx+1}"), m.get("description", ""), idx),
        )

    milestone_rows = db.query_all(
        "SELECT * FROM milestone WHERE plan_id = ? ORDER BY order_index", (plan_id,)
    )
    return jsonify({
        "plan_id": plan_id,
        "goal": goal,
        "milestones": [
            {"id": m["id"], "title": m["title"], "description": m["description"], "completed": bool(m["completed"])}
            for m in milestone_rows
        ],
    })


@app.route("/api/planner/milestone/<int:milestone_id>/toggle", methods=["POST"])
def planner_toggle_milestone(milestone_id):
    row = db.query_one("SELECT * FROM milestone WHERE id = ?", (milestone_id,))
    if not row:
        return jsonify({"error": "Milestone not found"}), 404
    new_value = 0 if row["completed"] else 1
    db.execute("UPDATE milestone SET completed = ? WHERE id = ?", (new_value, milestone_id))
    return jsonify({"id": milestone_id, "completed": bool(new_value)})


@app.route("/api/planner/plans", methods=["GET"])
def planner_list():
    plans = db.query_all("SELECT * FROM study_plan ORDER BY id DESC")
    result = []
    for p in plans:
        milestone_rows = db.query_all(
            "SELECT * FROM milestone WHERE plan_id = ? ORDER BY order_index", (p["id"],)
        )
        result.append({
            "id": p["id"],
            "goal": p["goal"],
            "milestones": [
                {"id": m["id"], "title": m["title"], "description": m["description"], "completed": bool(m["completed"])}
                for m in milestone_rows
            ],
        })
    return jsonify(result)


# ------------------------------------------- Feature 8: Progress Dashboard
@app.route("/api/progress", methods=["GET"])
def progress():
    def count(sql, params=()):
        return db.query_one(sql, params)[0]

    total_milestones = count("SELECT COUNT(*) FROM milestone")
    completed_milestones = count("SELECT COUNT(*) FROM milestone WHERE completed = 1")

    return jsonify({
        "chats_sent": count("SELECT COUNT(*) FROM chat_message WHERE role = 'user'"),
        "documents_uploaded": count("SELECT COUNT(*) FROM document"),
        "quizzes_generated": count("SELECT COUNT(*) FROM quiz"),
        "notes_summarized": count("SELECT COUNT(*) FROM note"),
        "resumes_analyzed": count("SELECT COUNT(*) FROM resume_analysis"),
        "interview_sessions": count("SELECT COUNT(*) FROM interview_session"),
        "study_plans": count("SELECT COUNT(*) FROM study_plan"),
        "milestones_total": total_milestones,
        "milestones_completed": completed_milestones,
        "milestones_completion_pct": round((completed_milestones / total_milestones) * 100) if total_milestones else 0,
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
