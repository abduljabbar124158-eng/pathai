import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  Dna,
  PieChart,
  ShieldCheck,
  AlertCircle,
  FileText,
  ChevronRight,
  TrendingUp,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import { SlideCase } from '../types/pathology';

interface AIAnalysisPanelProps {
  currentCase: SlideCase;
  onOpenReport: () => void;
  onOpenConsultation: () => void;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  currentCase,
  onOpenReport,
  onOpenConsultation,
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'biomarkers' | 'quality' | 'model'>('metrics');

  return (
    <div className="w-96 flex flex-col bg-slate-900 border-l border-slate-800 text-slate-100 h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold tracking-tight text-white">PathAI Diagnostics</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 mono">Model: AIS-WSI-ResNetVision-v4</p>
        </div>
        <span className="text-[10px] mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-medium">
          INFERENCE READY
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/40 text-xs">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`py-2 font-medium transition text-center border-b-2 ${
            activeTab === 'metrics'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Metrics
        </button>
        <button
          onClick={() => setActiveTab('biomarkers')}
          className={`py-2 font-medium transition text-center border-b-2 ${
            activeTab === 'biomarkers'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Biomarkers
        </button>
        <button
          onClick={() => setActiveTab('quality')}
          className={`py-2 font-medium transition text-center border-b-2 ${
            activeTab === 'quality'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          QC Check
        </button>
        <button
          onClick={() => setActiveTab('model')}
          className={`py-2 font-medium transition text-center border-b-2 ${
            activeTab === 'model'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Pipeline
        </button>
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: METRICS */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {/* Primary Diagnosis Callout */}
            <div className="bg-gradient-to-br from-rose-950/40 via-slate-900 to-indigo-950/30 border border-rose-900/40 p-3.5 rounded-xl shadow-lg">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                Primary Histopathologic Prediction
              </span>
              <h3 className="text-sm font-bold text-white leading-snug">
                {currentCase.primaryDiagnosis}
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-medium">{currentCase.grade}</p>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-rose-900/30">
                <span className="text-slate-400">AJCC Staging:</span>
                <span className="font-semibold text-rose-300 mono">{currentCase.stageAJCC}</span>
              </div>
            </div>

            {/* Key Quantitative Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Tumor Purity</span>
                <span className="text-xl font-bold text-rose-400 mono">
                  {currentCase.tumorPurity}%
                </span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${currentCase.tumorPurity}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Mitotic Figure Rate</span>
                <span className="text-xl font-bold text-amber-400 mono">
                  {currentCase.mitoticIndex}
                  <span className="text-xs font-normal text-slate-400 ml-1">/10 HPF</span>
                </span>
                <span className="text-[10px] text-amber-500 mt-1 block">
                  {currentCase.mitoticIndex > 20 ? 'High proliferative' : 'Moderate'}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">TIL Infiltration</span>
                <span className="text-xl font-bold text-purple-400 mono">
                  {currentCase.tilScore}%
                </span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${currentCase.tilScore}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Biopsy Surface Area</span>
                <span className="text-xl font-bold text-cyan-400 mono">
                  {currentCase.totalAreaMm2}
                  <span className="text-xs font-normal text-slate-400 ml-1">mm²</span>
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Adequate core sample</span>
              </div>
            </div>

            {/* Tissue Composition Breakdown */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300 block mb-3 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                Tissue Architecture Distribution
              </span>
              <div className="space-y-2.5">
                {currentCase.tissueRegions.map((region) => (
                  <div key={region.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                        <span
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: region.color }}
                        ></span>
                        {region.name}
                      </span>
                      <span className="text-slate-200 mono font-semibold text-[11px]">
                        {region.coveragePercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${region.coveragePercent}%`,
                          backgroundColor: region.color,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BIOMARKERS */}
        {activeTab === 'biomarkers' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 flex items-center justify-between pb-1">
              <span>Immune & Molecular Biomarkers</span>
              <span className="mono text-[10px] text-cyan-400">CAP / ASCO Guideline</span>
            </div>

            {currentCase.biomarkers.map((bm, idx) => (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{bm.name}</h4>
                    <span className="text-sm font-bold text-cyan-400 mono mt-0.5 block">
                      {bm.score}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full mono ${
                      bm.interpretation === 'Positive' || bm.interpretation === 'High'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : bm.interpretation === 'Negative' || bm.interpretation === 'Low'
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {bm.interpretation}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">{bm.details}</p>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Threshold: {bm.cutoff}</span>
                  <span className="text-cyan-400 mono font-medium">
                    {bm.confidence.toFixed(1)}% Conf
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: QUALITY CONTROL */}
        {activeTab === 'quality' && (
          <div className="space-y-3">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Automated Slide QC: PASSED
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Whole Slide Image scan meets ISO/CAP digital pathology diagnostic criteria with zero
                obstructive artifacts or out-of-focus tiles.
              </p>
            </div>

            <div className="space-y-2">
              {currentCase.qualityMetrics.map((qc, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="text-slate-300 font-medium block">{qc.parameter}</span>
                    <span className="text-[11px] text-slate-400 mono">{qc.value}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="mono font-bold text-emerald-400">{qc.score}%</span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MODEL PIPELINE */}
        {activeTab === 'model' && (
          <div className="space-y-3 text-xs">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <h4 className="font-bold text-white mb-1.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Inference Architecture
              </h4>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Two-stage deep learning pipeline with hierarchical Vision Transformer (ViT) patch
                embedding (256x256 px at 0.25 µm/px) combined with an attention-based multiple
                instance learning (MIL) slide aggregator.
              </p>
            </div>

            <div className="space-y-2">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Backbone Neural Net</span>
                <span className="text-slate-200 font-medium">
                  ConvNeXt-Large + WSI Slide Transformer
                </span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Patch Extraction Grid</span>
                <span className="text-slate-200 font-medium mono">
                  4,280 patches analyzed (100% tissue coverage)
                </span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Stain Normalization</span>
                <span className="text-slate-200 font-medium">
                  Macenko Optical Density Normalization
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/90 space-y-2">
        <button
          onClick={onOpenReport}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-cyan-950"
        >
          <FileText className="w-4 h-4" />
          <span>Generate CAP Surgical Pathology Report</span>
        </button>

        <button
          onClick={onOpenConsultation}
          className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs transition border border-slate-700"
        >
          <Dna className="w-3.5 h-3.5 text-indigo-400" />
          <span>Consult PathAI Assistant (Gemini)</span>
        </button>
      </div>
    </div>
  );
};
