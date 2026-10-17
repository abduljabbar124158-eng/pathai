import React, { useState } from 'react';
import {
  Microscope,
  Cpu,
  Layers,
  Split,
  FileText,
  Sparkles,
  FolderOpen,
  Maximize2,
  Minimize2,
  ChevronDown,
  Info,
  CheckCircle,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { SAMPLE_CASES } from './data/sampleCases';
import { SlideCase, CellDetection } from './types/pathology';
import { VirtualMicroscope } from './components/VirtualMicroscope';
import { AIAnalysisPanel } from './components/AIAnalysisPanel';
import { ClinicalReportModal } from './components/ClinicalReportModal';
import { PathologyAssistant } from './components/PathologyAssistant';
import { CaseLibrary } from './components/CaseLibrary';
import { SlideComparator } from './components/SlideComparator';

export default function App() {
  const [cases, setCases] = useState<SlideCase[]>(SAMPLE_CASES);
  const [currentCase, setCurrentCase] = useState<SlideCase>(SAMPLE_CASES[0]);
  const [activeStain, setActiveStain] = useState<'H&E' | 'IHC'>('H&E');

  // View Mode: 'microscope' | 'comparator' | 'cases'
  const [viewMode, setViewMode] = useState<'microscope' | 'comparator' | 'cases'>('microscope');

  // Modals / Drawers
  const [showReport, setShowReport] = useState<boolean>(false);
  const [showAssistant, setShowAssistant] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSelectCase = (selected: SlideCase) => {
    setCurrentCase(selected);
    setActiveStain('H&E');
  };

  const handleUploadCustomCase = (newCase: SlideCase) => {
    setCases((prev) => [newCase, ...prev]);
    setCurrentCase(newCase);
    setViewMode('microscope');
    triggerToast(`Slide ${newCase.caseNumber} ingested and segmented successfully.`);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Application Navbar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30">
        {/* Brand & Scanner Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-md shadow-cyan-950 flex items-center justify-center">
              <Microscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  PathAI
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80 mono">
                  CLINICAL WSI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5">
                Digital Pathology Intelligence Platform
              </p>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 mx-2 hidden sm:block"></div>

          {/* Case Selector Dropdown */}
          <div className="relative group hidden md:block">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs cursor-pointer hover:border-slate-700">
              <span className="text-slate-400">Case:</span>
              <span className="font-bold text-white mono">{currentCase.caseNumber}</span>
              <span className="text-slate-400">({currentCase.organ} - {currentCase.primaryDiagnosis.split(',')[0]})</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </div>

            {/* Dropdown Menu */}
            <div className="absolute left-0 top-full mt-1 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 hidden group-hover:block z-50">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCase(c)}
                  className={`w-full text-left p-2 rounded-lg text-xs transition ${
                    c.id === currentCase.id
                      ? 'bg-cyan-950 text-cyan-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="mono">{c.caseNumber}</span>
                    <span className="text-[10px] text-slate-400">{c.organ}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5 font-normal">
                    {c.primaryDiagnosis}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Mode Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('microscope')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === 'microscope'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Microscope className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Virtual Microscope</span>
          </button>

          <button
            onClick={() => setViewMode('comparator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === 'comparator'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">H&E vs IHC</span>
          </button>

          <button
            onClick={() => setViewMode('cases')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              viewMode === 'cases'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Case Archive</span>
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Stain Toggle when in Microscope mode */}
          {viewMode === 'microscope' && (
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveStain('H&E')}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  activeStain === 'H&E'
                    ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                H&E
              </button>
              <button
                onClick={() => setActiveStain('IHC')}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  activeStain === 'IHC'
                    ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {currentCase.ihcType || 'IHC'}
              </button>
            </div>
          )}

          {/* CAP Report Button */}
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Report</span>
          </button>

          {/* AI Consultation Assistant Button */}
          <button
            onClick={() => setShowAssistant(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>PathAI Consult</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Central Stage View (Changes according to viewMode) */}
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          {viewMode === 'cases' && (
            <div className="flex-1 flex flex-col overflow-y-auto rounded-xl">
              <CaseLibrary
                cases={cases}
                selectedCaseId={currentCase.id}
                onSelectCase={(c) => {
                  handleSelectCase(c);
                  setViewMode('microscope');
                }}
                onUploadCustomCase={handleUploadCustomCase}
              />
            </div>
          )}

          {viewMode === 'microscope' && (
            <VirtualMicroscope
              currentCase={currentCase}
              activeStain={activeStain}
              onSnapshot={(filename) => {
                triggerToast(`Microscopy snapshot saved: ${filename}`);
              }}
            />
          )}

          {viewMode === 'comparator' && (
            <SlideComparator currentCase={currentCase} />
          )}
        </div>

        {/* Right Quantitative AI Pathology Metrics Panel */}
        <AIAnalysisPanel
          currentCase={currentCase}
          onOpenReport={() => setShowReport(true)}
          onOpenConsultation={() => setShowAssistant(true)}
        />
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white border border-cyan-500 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clinical Pathology CAP Report Modal */}
      {showReport && (
        <ClinicalReportModal
          currentCase={currentCase}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Pathology AI Assistant Drawer */}
      {showAssistant && (
        <PathologyAssistant
          currentCase={currentCase}
          onClose={() => setShowAssistant(false)}
        />
      )}
    </div>
  );
}
