import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { database } from './src/db.js';
import { generateText, hasLiveApiKey, OFFLINE_DEMO_MESSAGE } from './src/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Upload storage setup
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, safeName);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static asset serving for css and js
app.use('/static', express.static(path.resolve(process.cwd(), 'static')));

// Helper: JSON parse safely with markdown fence stripping
function parseJsonSafely<T>(raw: string, fallback: T): T {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

// Helper: Extract text from PDF buffer or file
async function extractPdfText(filepath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filepath);
  try {
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (err) {
    console.warn('pdfParse failed, fallback to raw text extraction:', err);
    return dataBuffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, '');
  }
}

// ---------------------------------------------------------------- Page ----
app.get('/', (_req: Request, res: Response) => {
  const templatePath = path.resolve(process.cwd(), 'templates', 'index.html');
  if (fs.existsSync(templatePath)) {
    let html = fs.readFileSync(templatePath, 'utf-8');
    // Replace Flask url_for with static URLs
    html = html.replace(/\{\{\s*url_for\('static',\s*filename='css\/style\.css'\)\s*\}\}/g, '/static/css/style.css');
    html = html.replace(/\{\{\s*url_for\('static',\s*filename='js\/app\.js'\)\s*\}\}/g, '/static/js/app.js');
    return res.setHeader('Content-Type', 'text/html').send(html);
  }
  return res.status(404).send('Template index.html not found');
});

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'PathAI',
    timestamp: new Date().toISOString(),
  });
});

// Engine Status: clarifies if running on Gemini API or local offline demo engine
app.get('/api/engine-status', (_req: Request, res: Response) => {
  const rawKey = process.env.GEMINI_API_KEY || '';
  const hasLiveKey = Boolean(rawKey.trim() && rawKey.length > 20 && rawKey !== 'mock');
  res.json({
    has_live_key: hasLiveKey,
    mode: hasLiveKey ? 'live' : 'offline_demo',
    engine_label: hasLiveKey ? 'GEMINI 3.8 ACTIVE' : 'OFFLINE DEMO ENGINE',
    chat_pill_label: hasLiveKey ? 'MODEL: GEMINI-3.8-FLASH // ONLINE' : 'ENGINE: OFFLINE DEMO // ACTIVE',
  });
});

// ---------------------------------------------------- Feature 1: Chatbot --
app.get('/api/chat', (_req: Request, res: Response) => {
  res.json(database.getChatHistory());
});

app.post('/api/chat', async (req: Request, res: Response) => {
  const message = (req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  database.addChatMessage('user', message);

  if (!hasLiveApiKey()) {
    database.addChatMessage('assistant', OFFLINE_DEMO_MESSAGE);
    return res.json({ reply: OFFLINE_DEMO_MESSAGE });
  }

  const history = database.getChatHistory().slice(-8);
  const context = history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  const prompt = `${context}\nUser: ${message}\nAssistant:`;

  const reply = await generateText(
    prompt,
    'You are PathAI, a supportive, knowledgeable AI learning and career assistant for students and interns. Answer clearly, concisely, and encouragingly.',
    400
  );

  database.addChatMessage('assistant', reply);
  res.json({ reply });
});

// ---------------------------------------------------- Feature 2: PDF Chat --
app.post('/api/pdf/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const text = await extractPdfText(req.file.path);
    if (!text.trim()) {
      return res.status(400).json({ error: 'Could not extract any text from this PDF' });
    }

    const documentId = database.addDocument(req.file.originalname, text);
    res.json({
      document_id: documentId,
      filename: req.file.originalname,
      char_count: text.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Could not process PDF: ${err.message}` });
  }
});

app.post('/api/pdf/ask', async (req: Request, res: Response) => {
  const documentId = parseInt(req.body?.document_id, 10);
  const question = (req.body?.question || '').trim();

  if (!documentId || !question) {
    return res.status(400).json({ error: 'document_id and question are both required' });
  }

  const doc = database.getDocument(documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (!hasLiveApiKey()) {
    database.addDocumentChat(documentId, question, OFFLINE_DEMO_MESSAGE);
    return res.json({ answer: OFFLINE_DEMO_MESSAGE });
  }

  const prompt = `Document excerpts:\n${doc.extracted_text.slice(0, 6000)}\n\nUser question: ${question}\n\nAnswer using only the document above. If the document does not say, say so politely.`;
  const answer = await generateText(
    prompt,
    'You are a study assistant answering questions strictly based on the uploaded document.',
    500
  );

  database.addDocumentChat(documentId, question, answer);
  res.json({ answer });
});

app.get('/api/pdf/documents', (_req: Request, res: Response) => {
  res.json(database.getDocuments());
});

// ------------------------------------------------ Feature 3: Quiz Generator --
app.post('/api/quiz/generate', async (req: Request, res: Response) => {
  const content = (req.body?.content || '').trim();
  const numQuestions = Math.min(Math.max(parseInt(req.body?.num_questions || '5', 10), 1), 10);

  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }

  if (!hasLiveApiKey()) {
    return res.json({
      quiz_id: 0,
      message: OFFLINE_DEMO_MESSAGE,
      questions: [],
    });
  }

  const prompt = `Topic / Notes:\n${content.slice(0, 4000)}\n\nGenerate exactly ${numQuestions} multiple-choice questions based on the content above.\n` +
    'Respond ONLY as a valid JSON object with the exact shape:\n' +
    '{"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct_index": 0, "explanation": "..."}]}';

  const raw = await generateText(
    prompt,
    'You are a quiz generator for students. Always respond with valid JSON only -- no markdown code blocks, no preamble.',
    1200
  );

  const fallback = { questions: [] };
  const parsed = parseJsonSafely(raw, fallback);

  const topicSummary = content.slice(0, 80);
  const quizId = database.addQuiz(topicSummary, JSON.stringify(parsed));

  res.json({ quiz_id: quizId, questions: parsed.questions || [] });
});

app.get('/api/quiz/history', (_req: Request, res: Response) => {
  res.json(database.getQuizzes());
});

// ---------------------------------------------- Feature 4: Notes Summarizer --
app.post('/api/notes/summarize', async (req: Request, res: Response) => {
  const title = (req.body?.title || 'Untitled Note').trim();
  const text = (req.body?.text || '').trim();

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  if (!hasLiveApiKey()) {
    const noteId = database.addNote(title, text, OFFLINE_DEMO_MESSAGE);
    return res.json({ note_id: noteId, title, summary: OFFLINE_DEMO_MESSAGE });
  }

  const prompt = `Title: ${title}\n\nNotes:\n${text.slice(0, 8000)}\n\nSummarize the key points in clear revision-ready bullet points. Keep it punchy and memorable.`;
  const summary = await generateText(
    prompt,
    'You are an expert study assistant summarizing notes for students preparing for exams.',
    600
  );

  const noteId = database.addNote(title, text, summary);
  res.json({ note_id: noteId, title, summary });
});

app.get('/api/notes/history', (_req: Request, res: Response) => {
  res.json(database.getNotes());
});

// ---------------------------------------------- Feature 5: Resume Analyzer --
app.post('/api/resume/analyze', upload.single('file'), async (req: Request, res: Response) => {
  let resumeText = '';
  let jobDescription = '';
  let jobTitle = '';

  if (req.file) {
    try {
      resumeText = await extractPdfText(req.file.path);
    } catch (err: any) {
      return res.status(400).json({ error: `Could not read PDF: ${err.message}` });
    }
    jobDescription = (req.body?.job_description || '').trim();
    jobTitle = (req.body?.job_title || '').trim();
  } else {
    resumeText = (req.body?.resume_text || '').trim();
    jobDescription = (req.body?.job_description || '').trim();
    jobTitle = (req.body?.job_title || '').trim();
  }

  if (!resumeText || !jobDescription) {
    return res.status(400).json({ error: 'resume and job_description are both required' });
  }

  if (!hasLiveApiKey()) {
    return res.json({
      analysis_id: 0,
      message: OFFLINE_DEMO_MESSAGE,
      match_score: 0,
      strengths: [],
      gaps: [],
      suggestions: [],
    });
  }

  const prompt = `Resume:\n${resumeText.slice(0, 6000)}\n\nJob description:\n${jobDescription.slice(0, 3000)}\n\n` +
    'Respond ONLY as JSON: {"match_score": 0-100, "strengths": ["..."], "gaps": ["..."], "suggestions": ["..."]}';

  const raw = await generateText(
    prompt,
    'You are a resume analyzer for the resume feature. Always respond with valid JSON only.',
    1000
  );

  const fallback = { match_score: 75, strengths: [], gaps: [], suggestions: [] };
  const parsed = parseJsonSafely(raw, fallback);

  const analysisId = database.addResumeAnalysis(
    jobTitle || 'Untitled role',
    parsed.match_score ?? 75,
    JSON.stringify(parsed)
  );

  res.json({ analysis_id: analysisId, ...parsed });
});

app.get('/api/resume/history', (_req: Request, res: Response) => {
  res.json(database.getResumeAnalyses());
});

// ------------------------------------------- Feature 6: Interview Practice --
app.post('/api/interview/start', async (req: Request, res: Response) => {
  const role = (req.body?.role || '').trim();
  if (!role) {
    return res.status(400).json({ error: 'role is required' });
  }

  if (!hasLiveApiKey()) {
    const sessionId = database.addInterviewSession(role);
    const turnId = database.addInterviewTurn(sessionId, OFFLINE_DEMO_MESSAGE);
    return res.json({ session_id: sessionId, turn_id: turnId, question: OFFLINE_DEMO_MESSAGE });
  }

  const prompt = `Ask one relevant, focused interview question for a candidate applying for: ${role}.`;
  const question = await generateText(
    prompt,
    'You conduct mock interviews for job seekers. Ask exactly one question, no preamble.',
    200
  );

  const sessionId = database.addInterviewSession(role);
  const turnId = database.addInterviewTurn(sessionId, question);

  res.json({ session_id: sessionId, turn_id: turnId, question });
});

app.post('/api/interview/answer', async (req: Request, res: Response) => {
  const turnId = parseInt(req.body?.turn_id, 10);
  const answer = (req.body?.answer || '').trim();

  if (!turnId) {
    return res.status(400).json({ error: 'turn_id is required' });
  }

  const turn = database.getInterviewTurn(turnId);
  if (!turn) {
    return res.status(404).json({ error: 'Interview turn not found' });
  }

  if (!hasLiveApiKey()) {
    database.updateInterviewTurn(turnId, answer, OFFLINE_DEMO_MESSAGE);
    const nextTurnId = database.addInterviewTurn(turn.session_id, OFFLINE_DEMO_MESSAGE);
    return res.json({ feedback_and_next_question: OFFLINE_DEMO_MESSAGE, next_turn_id: nextTurnId });
  }

  const sessionRow = database.getInterviewSession(turn.session_id);
  const prompt = `Role: ${sessionRow?.role || 'Applicant'}\nQuestion asked: ${turn.question}\nCandidate's answer: ${answer}\n\n` +
    'Give brief constructive feedback (2-3 sentences), then ask the next interview question.';

  const resultRaw = await generateText(
    prompt,
    'You conduct mock interviews for job seekers, giving feedback then the next question.',
    400
  );

  database.updateInterviewTurn(turnId, answer, resultRaw);
  const nextTurnId = database.addInterviewTurn(turn.session_id, resultRaw);

  res.json({ feedback_and_next_question: resultRaw, next_turn_id: nextTurnId });
});

// ----------------------------------------------- Feature 7: Study Planner --
app.post('/api/planner/generate', async (req: Request, res: Response) => {
  const goal = (req.body?.goal || '').trim();
  const currentSkills = (req.body?.current_skills || '').trim();

  if (!goal) {
    return res.status(400).json({ error: 'goal is required' });
  }

  if (!hasLiveApiKey()) {
    return res.json({
      plan_id: 0,
      goal,
      message: OFFLINE_DEMO_MESSAGE,
      milestones: [],
    });
  }

  const prompt = `Career/learning goal: ${goal}\nCurrent skills: ${currentSkills || 'none listed'}\n\n` +
    'Create a study plan roadmap. Respond ONLY as JSON: ' +
    '{"milestones": [{"title": "...", "description": "..."}]}';

  const raw = await generateText(
    prompt,
    'You create structured study plan roadmaps for students. Always respond with valid JSON only.',
    1200
  );

  const fallback = { milestones: [] as Array<{ title?: string; description?: string }> };
  const parsed = parseJsonSafely(raw, fallback);

  const planId = database.addStudyPlan(goal, currentSkills);
  const milestonesList: any[] = [];

  for (let idx = 0; idx < (parsed.milestones || []).length; idx++) {
    const m = parsed.milestones[idx];
    const created = database.addMilestone(
      planId,
      m.title || `Step ${idx + 1}`,
      m.description || '',
      idx
    );
    milestonesList.push({
      id: created.id,
      title: created.title,
      description: created.description,
      completed: false,
    });
  }

  res.json({
    plan_id: planId,
    goal,
    milestones: milestonesList,
  });
});

app.post('/api/planner/milestone/:id/toggle', (req: Request, res: Response) => {
  const paramId = req.params.id;
  const milestoneId = parseInt(Array.isArray(paramId) ? paramId[0] : paramId, 10);
  const updated = database.toggleMilestone(milestoneId);
  if (!updated) {
    return res.status(404).json({ error: 'Milestone not found' });
  }
  res.json({ id: milestoneId, completed: Boolean(updated.completed) });
});

app.get('/api/planner/plans', (_req: Request, res: Response) => {
  res.json(database.getStudyPlans());
});

// ------------------------------------------- Feature 8: Progress Dashboard --
app.get('/api/progress', (_req: Request, res: Response) => {
  const stats = database.getProgressStats();
  const liveKey = hasLiveApiKey();
  res.json({
    ...stats,
    has_live_key: liveKey,
    demo_message: liveKey ? null : OFFLINE_DEMO_MESSAGE,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PathAI Learning & Career Assistant running on http://0.0.0.0:${PORT}`);
});
