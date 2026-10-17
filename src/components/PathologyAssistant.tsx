import React, { useState } from 'react';
import { X, Send, Sparkles, Bot, Stethoscope, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { SlideCase } from '../types/pathology';

interface PathologyAssistantProps {
  currentCase: SlideCase;
  onClose: () => void;
}

export const PathologyAssistant: React.FC<PathologyAssistantProps> = ({
  currentCase,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    { role: 'user' | 'assistant'; text: string; source?: string; recommendations?: string[] }[]
  >([
    {
      role: 'assistant',
      text: `Hello, I am the PathAI Clinical Consultation Assistant. I have loaded Case **${currentCase.caseNumber}** (${currentCase.organ} - ${currentCase.primaryDiagnosis}, Grade: ${currentCase.grade}). How can I assist with differential diagnosis, biomarker validation, or WHO/CAP classification?`,
    },
  ]);

  const quickPrompts = [
    'What are the primary differential diagnoses for this lesion?',
    'Summarize the therapeutic implications of the biomarker panel.',
    'What additional IHC stains or molecular tests are recommended?',
    'Explain the histologic grading criteria for this specimen.',
  ];

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || query;
    if (!textToSend.trim() || loading) return;

    const newHistory = [
      ...chatHistory,
      { role: 'user' as const, text: textToSend },
    ];
    setChatHistory(newHistory);
    setQuery('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/analyze-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseData: {
            caseId: currentCase.caseNumber,
            tissue: currentCase.organ,
            stain: currentCase.stain,
            diagnosis: currentCase.primaryDiagnosis,
            grade: currentCase.grade,
            mitoticCount: `${currentCase.mitoticIndex} per 10 HPF`,
            cellDensity: 'High',
            tumorPurity: `${currentCase.tumorPurity}%`,
            biomarkerSummary: currentCase.biomarkers.map((b) => `${b.name}: ${b.score}`).join(', '),
          },
          clinicalQuery: textToSend,
        }),
      });

      const data = await response.json();

      setChatHistory([
        ...newHistory,
        {
          role: 'assistant',
          text: data.analysis || 'Clinical review completed.',
          source: data.source,
          recommendations: data.recommendations,
        },
      ]);
    } catch (err) {
      console.error(err);
      setChatHistory([
        ...newHistory,
        {
          role: 'assistant',
          text: 'Unable to communicate with the AI consultation endpoint. Please verify your connection.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              PathAI Diagnostic Assistant
            </h3>
            <p className="text-[11px] text-slate-400">
              Correlated with Case {currentCase.caseNumber} ({currentCase.organ})
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] p-3.5 rounded-2xl leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow-lg'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Recommendations bullets if provided */}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px]">
                  <span className="font-bold text-cyan-400 block mb-1">
                    Recommended Clinical Steps:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    {msg.recommendations.map((rec, rIdx) => (
                      <li key={rIdx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {msg.source && (
                <div className="mt-2 text-[10px] text-slate-500 mono flex justify-end">
                  Engine: {msg.source}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 bg-slate-950 p-3 rounded-xl border border-slate-800 w-fit">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing histomorphology & synthesizing clinical guidance...</span>
          </div>
        )}
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            disabled={loading}
            onClick={() => handleSend(prompt)}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask PathAI about this case, IHC markers, or guidelines..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
