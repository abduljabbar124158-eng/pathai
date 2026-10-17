import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle, Shield, FileCheck, Building2, User } from 'lucide-react';
import { SlideCase } from '../types/pathology';

interface ClinicalReportModalProps {
  currentCase: SlideCase;
  onClose: () => void;
}

export const ClinicalReportModal: React.FC<ClinicalReportModalProps> = ({
  currentCase,
  onClose,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
        {/* Modal Top Bar (Non-printed action header) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm tracking-wide">
              PathAI Surgical Pathology Diagnostic Report
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Medical Pathology Report Body */}
        <div ref={reportRef} className="p-8 overflow-y-auto space-y-6 text-sm font-sans bg-white">
          {/* Institution & Lab Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-cyan-700 text-white rounded font-black flex items-center justify-center text-xs tracking-tighter">
                  PATH
                </div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  PATHAI PRECISION DIGITAL PATHOLOGY LABORATORY
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                College of American Pathologists (CAP) Accredited • CLIA #99D2054192
              </p>
              <p className="text-xs text-slate-500">
                Department of Anatomical Pathology & Molecular Oncology
              </p>
            </div>
            <div className="text-right text-xs">
              <span className="font-bold text-slate-700 block">FINAL SURGICAL PATHOLOGY REPORT</span>
              <span className="text-slate-500">Accession: </span>
              <span className="font-bold text-slate-900 mono">{currentCase.caseNumber}</span>
              <span className="block text-slate-500 mt-0.5">Report Date: {currentCase.collectionDate}</span>
            </div>
          </div>

          {/* Patient Demographics & Specimen Data Box */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-28 text-slate-500 font-medium">Patient:</span>
                <span className="font-bold text-slate-800">
                  ANONYMIZED_SUBJECT_{currentCase.caseNumber.slice(-4)}
                </span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-medium">Age / Gender:</span>
                <span className="text-slate-800 font-semibold">
                  {currentCase.patientAge} Y / {currentCase.patientGender}
                </span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-medium">Medical Record #:</span>
                <span className="text-slate-800 mono">MRN-9028471</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-medium">Referring MD:</span>
                <span className="text-slate-800 font-medium">Dr. S. Vance, MD (Oncology)</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex">
                <span className="w-28 text-slate-500 font-medium">Organ / Source:</span>
                <span className="font-bold text-slate-800">{currentCase.organ}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-medium">Procedure:</span>
                <span className="text-slate-800">{currentCase.procedure}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-medium">Stain / Prep:</span>
                <span className="text-slate-800 font-medium">
                  {currentCase.stain} Whole Slide Image (0.25 µm/px)
                </span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-medium">Quality Assurance:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Optimal (Focus 98%+)
                </span>
              </div>
            </div>
          </div>

          {/* Clinical History */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Clinical History & Pre-Op Indication
            </h4>
            <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
              {currentCase.clinicalHistory}
            </p>
          </div>

          {/* FINAL PATHOLOGIC DIAGNOSIS (Prominent) */}
          <div className="border-2 border-slate-900 p-4 rounded-xl bg-slate-50/50">
            <span className="text-xs font-extrabold text-cyan-800 uppercase tracking-wider block mb-1">
              Final Pathologic Diagnosis
            </span>
            <div className="text-base font-black text-slate-950 leading-snug">
              {currentCase.primaryDiagnosis.toUpperCase()}
            </div>
            <div className="text-xs font-bold text-slate-800 mt-1">
              Histologic Grade: {currentCase.grade}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">
              Pathologic Staging (AJCC 8th Ed.): {currentCase.stageAJCC}
            </div>
          </div>

          {/* AI Quantitative Histopathology & Biomarker Panel */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Automated Biomarkers & Quantitative Pathology Metrics</span>
              <span className="text-[10px] text-cyan-700 mono font-semibold">
                Validated PathAI Algorithm v4
              </span>
            </h4>
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Marker / Parameter</th>
                  <th className="py-2 px-3">Result / Score</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Threshold Criteria</th>
                  <th className="py-2 px-3 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentCase.biomarkers.map((bm, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{bm.name}</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-900 mono">{bm.score}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          bm.interpretation === 'Positive' || bm.interpretation === 'High'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bm.interpretation === 'Negative' || bm.interpretation === 'Low'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {bm.interpretation}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">{bm.cutoff}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 mono font-medium">
                      {bm.confidence.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Microscopic Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Microscopic Description
            </h4>
            <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              {currentCase.microscopicNotes}
            </p>
          </div>

          {/* Sign-off & CAP Compliance Block */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-xs">
            <div>
              <p className="text-[11px] text-slate-500 max-w-md">
                PathAI algorithmic measurements were verified in conjunction with whole slide visual
                inspection in accordance with CAP/ASCO digital pathology diagnostic standards.
              </p>
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-2">
                <Shield className="w-3.5 h-3.5 text-cyan-600" />
                <span>Digitally signed and cryptographically verified in PathAI LIMS</span>
              </div>
            </div>

            <div className="text-right">
              <div className="h-10 border-b border-slate-400 w-48 flex items-end justify-center pb-1">
                <span className="font-serif italic text-sm text-slate-700">A. Harrison, M.D.</span>
              </div>
              <span className="text-[11px] font-bold text-slate-800 block mt-1">
                Arthur Harrison, MD, FCAP
              </span>
              <span className="text-[10px] text-slate-500 block">
                Director of Anatomic Pathology
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
