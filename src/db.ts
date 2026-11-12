import fs from 'fs';
import path from 'path';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Document {
  id: number;
  filename: string;
  extracted_text: string;
  created_at: string;
}

export interface DocumentChat {
  id: number;
  document_id: number;
  question: string;
  answer: string;
  created_at: string;
}

export interface Quiz {
  id: number;
  topic: string;
  questions_json: string;
  created_at: string;
}

export interface Note {
  id: number;
  title: string;
  original_text: string;
  summary: string;
  created_at: string;
}

export interface ResumeAnalysis {
  id: number;
  job_title: string;
  match_score: number;
  analysis_json: string;
  created_at: string;
}

export interface InterviewSession {
  id: number;
  role: string;
  created_at: string;
}

export interface InterviewTurn {
  id: number;
  session_id: number;
  question: string;
  answer?: string;
  feedback?: string;
  created_at: string;
}

export interface StudyPlan {
  id: number;
  goal: string;
  current_skills: string;
  created_at: string;
}

export interface Milestone {
  id: number;
  plan_id: number;
  title: string;
  description: string;
  order_index: number;
  completed: number; // 0 or 1
}

interface DatabaseState {
  chat_messages: ChatMessage[];
  documents: Document[];
  document_chats: DocumentChat[];
  quizzes: Quiz[];
  notes: Note[];
  resume_analyses: ResumeAnalysis[];
  interview_sessions: InterviewSession[];
  interview_turns: InterviewTurn[];
  study_plans: StudyPlan[];
  milestones: Milestone[];
  auto_ids: Record<string, number>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'pathai.json');

const initialDb: DatabaseState = {
  chat_messages: [],
  documents: [],
  document_chats: [],
  quizzes: [],
  notes: [],
  resume_analyses: [],
  interview_sessions: [],
  interview_turns: [],
  study_plans: [],
  milestones: [],
  auto_ids: {
    chat_message: 1,
    document: 1,
    document_chat: 1,
    quiz: 1,
    note: 1,
    resume_analysis: 1,
    interview_session: 1,
    interview_turn: 1,
    study_plan: 1,
    milestone: 1,
  },
};

let db: DatabaseState = initialDb;

function loadDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
    } else {
      saveDb();
    }
  } catch (err) {
    console.warn('Failed to read db file, using in-memory store:', err);
    db = initialDb;
  }
}

function saveDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save db file:', err);
  }
}

// Initialize on module load
loadDb();

export const database = {
  // Chat
  addChatMessage(role: 'user' | 'assistant', content: string) {
    const id = db.auto_ids.chat_message++;
    const msg: ChatMessage = {
      id,
      role,
      content,
      created_at: new Date().toISOString(),
    };
    db.chat_messages.push(msg);
    saveDb();
    return id;
  },

  getChatHistory() {
    return [...db.chat_messages].slice(-50);
  },

  // Documents
  addDocument(filename: string, extracted_text: string) {
    const id = db.auto_ids.document++;
    const doc: Document = {
      id,
      filename,
      extracted_text,
      created_at: new Date().toISOString(),
    };
    db.documents.push(doc);
    saveDb();
    return id;
  },

  getDocument(id: number) {
    return db.documents.find((d) => d.id === id);
  },

  getDocuments() {
    return db.documents.map(({ id, filename, created_at }) => ({ id, filename, created_at }));
  },

  addDocumentChat(document_id: number, question: string, answer: string) {
    const id = db.auto_ids.document_chat++;
    const chat: DocumentChat = {
      id,
      document_id,
      question,
      answer,
      created_at: new Date().toISOString(),
    };
    db.document_chats.push(chat);
    saveDb();
    return id;
  },

  getDocumentChats(document_id: number) {
    return db.document_chats.filter((c) => c.document_id === document_id);
  },

  // Quiz
  addQuiz(topic: string, questions_json: string) {
    const id = db.auto_ids.quiz++;
    const quiz: Quiz = {
      id,
      topic,
      questions_json,
      created_at: new Date().toISOString(),
    };
    db.quizzes.push(quiz);
    saveDb();
    return id;
  },

  getQuizzes() {
    return [...db.quizzes].reverse();
  },

  // Notes
  addNote(title: string, original_text: string, summary: string) {
    const id = db.auto_ids.note++;
    const note: Note = {
      id,
      title,
      original_text,
      summary,
      created_at: new Date().toISOString(),
    };
    db.notes.push(note);
    saveDb();
    return id;
  },

  getNotes() {
    return [...db.notes].reverse();
  },

  // Resume Analysis
  addResumeAnalysis(job_title: string, match_score: number, analysis_json: string) {
    const id = db.auto_ids.resume_analysis++;
    const res: ResumeAnalysis = {
      id,
      job_title,
      match_score,
      analysis_json,
      created_at: new Date().toISOString(),
    };
    db.resume_analyses.push(res);
    saveDb();
    return id;
  },

  getResumeAnalyses() {
    return [...db.resume_analyses].reverse();
  },

  // Interview Practice
  addInterviewSession(role: string) {
    const id = db.auto_ids.interview_session++;
    const session: InterviewSession = {
      id,
      role,
      created_at: new Date().toISOString(),
    };
    db.interview_sessions.push(session);
    saveDb();
    return id;
  },

  getInterviewSession(id: number) {
    return db.interview_sessions.find((s) => s.id === id);
  },

  addInterviewTurn(session_id: number, question: string) {
    const id = db.auto_ids.interview_turn++;
    const turn: InterviewTurn = {
      id,
      session_id,
      question,
      created_at: new Date().toISOString(),
    };
    db.interview_turns.push(turn);
    saveDb();
    return id;
  },

  getInterviewTurn(id: number) {
    return db.interview_turns.find((t) => t.id === id);
  },

  updateInterviewTurn(id: number, answer: string, feedback: string) {
    const turn = db.interview_turns.find((t) => t.id === id);
    if (turn) {
      turn.answer = answer;
      turn.feedback = feedback;
      saveDb();
    }
  },

  // Study Planner
  addStudyPlan(goal: string, current_skills: string) {
    const id = db.auto_ids.study_plan++;
    const plan: StudyPlan = {
      id,
      goal,
      current_skills,
      created_at: new Date().toISOString(),
    };
    db.study_plans.push(plan);
    saveDb();
    return id;
  },

  addMilestone(plan_id: number, title: string, description: string, order_index: number) {
    const id = db.auto_ids.milestone++;
    const milestone: Milestone = {
      id,
      plan_id,
      title,
      description,
      order_index,
      completed: 0,
    };
    db.milestones.push(milestone);
    saveDb();
    return milestone;
  },

  toggleMilestone(id: number) {
    const m = db.milestones.find((item) => item.id === id);
    if (!m) return null;
    m.completed = m.completed ? 0 : 1;
    saveDb();
    return m;
  },

  getStudyPlans() {
    return db.study_plans.map((p) => {
      const planMilestones = db.milestones
        .filter((m) => m.plan_id === p.id)
        .sort((a, b) => a.order_index - b.order_index)
        .map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          completed: Boolean(m.completed),
        }));
      return {
        id: p.id,
        goal: p.goal,
        milestones: planMilestones,
      };
    }).reverse();
  },

  // Progress Stats
  getProgressStats() {
    const totalMilestones = db.milestones.length;
    const completedMilestones = db.milestones.filter((m) => m.completed === 1).length;
    return {
      chats_sent: db.chat_messages.filter((m) => m.role === 'user').length,
      documents_uploaded: db.documents.length,
      quizzes_generated: db.quizzes.length,
      notes_summarized: db.notes.length,
      resumes_analyzed: db.resume_analyses.length,
      interview_sessions: db.interview_sessions.length,
      study_plans: db.study_plans.length,
      milestones_total: totalMilestones,
      milestones_completed: completedMilestones,
      milestones_completion_pct: totalMilestones
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : 0,
    };
  },
};
