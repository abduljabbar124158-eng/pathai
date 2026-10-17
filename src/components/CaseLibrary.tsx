import React, { useState } from 'react';
import { Search, Filter, Upload, FolderOpen, Microscope, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SlideCase, OrganSystem } from '../types/pathology';

interface CaseLibraryProps {
  cases: SlideCase[];
  selectedCaseId: string;
  onSelectCase: (c: SlideCase) => void;
  onUploadCustomCase: (newCase: SlideCase) => void;
}

export const CaseLibrary: React.FC<CaseLibraryProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  onUploadCustomCase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgan, setSelectedOrgan] = useState<string>('All');
  const [isUploading, setIsUploading] = useState(false);

  const organs = ['All', 'Breast', 'Lung', 'Colorectal', 'Prostate'];

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.primaryDiagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.organ.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrgan = selectedOrgan === 'All' || c.organ === selectedOrgan;
    return matchesSearch && matchesOrgan;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Simulate AI Whole Slide Image ingestion and segmentation pipeline
    setTimeout(() => {
      const customCase: SlideCase = {
        id: `custom-${Date.now()}`,
        caseNumber: `USER-WSI-${Math.floor(1000 + Math.random() * 9000)}`,
        patientAge: 59,
        patientGender: 'Female',
        collectionDate: new Date().toISOString().split('T')[0],
        organ: 'Breast',
        procedure: `Uploaded Whole Slide Image (${file.name})`,
        stain: 'H&E',
        primaryDiagnosis: 'Infiltrating Mammary Carcinoma (NST)',
        grade: 'Histologic Grade 2 (Moderately Differentiated)',
        stageAJCC: 'pT1c N0 M0',
        slideUrl: 'custom_upload',
        resolutionMpp: 0.25,
        totalAreaMm2: 21.0,
        tumorPurity: 74.0,
        mitoticIndex: 18,
        tilScore: 19,
        clinicalHistory: `Specimen ingested from uploaded slide file: ${file.name}. Processed with automated tile pyramid and cell segmentation.`,
        grossDescription: 'Single glass slide scanned at 40x equivalent resolution.',
        microscopicNotes: 'Nests and cord-like infiltration of malignant epithelial cells surrounded by fibrotic stroma. Automated cell recognition detected high-confidence atypical nuclei and mitotic figures.',
        biomarkers: [
          {
            name: 'HER2 IHC Status (AI Predicted)',
            score: '2+ Equivocal',
            interpretation: 'Equivocal',
            details: 'Weak to moderate complete membranous staining in >10% of tumor cells. Reflex FISH testing advised.',
            cutoff: 'ASCO/CAP guideline',
            confidence: 93.2,
          },
          {
            name: 'Ki-67 Proliferation Index',
            score: '28.4%',
            interpretation: 'High',
            details: 'Quantified across 1,200 detected neoplastic nuclei.',
            cutoff: '>20% High',
            confidence: 94.6,
          },
        ],
        qualityMetrics: [
          { parameter: 'Scan Focus Uniformity', value: '97.2%', score: 97, status: 'optimal' },
          { parameter: 'Tissue Fold / Artifact', value: 'None detected', score: 100, status: 'optimal' },
          { parameter: 'Stain Contrast', value: '1.45', score: 97, status: 'optimal' },
        ],
        tissueRegions: [
          {
            id: 'tr-u1',
            name: 'Invasive Tumor Core',
            type: 'invasive_tumor',
            color: '#f43f5e',
            coveragePercent: 52.0,
            path: 'M 200 240 Q 360 160 540 210 T 780 340 Q 860 560 720 710 T 460 810 Q 240 740 170 560 Z',
          },
          {
            id: 'tr-u2',
            name: 'Reactive Stroma',
            type: 'stroma',
            color: '#06b6d4',
            coveragePercent: 30.0,
            path: 'M 140 200 Q 290 120 580 160 T 840 320 Q 930 570 780 770 T 420 890 Q 190 820 100 580 Z',
          },
          {
            id: 'tr-u3',
            name: 'TIL Infiltrate',
            type: 'lymphocytic_infiltrate',
            color: '#8b5cf6',
            coveragePercent: 18.0,
            path: 'M 300 320 Q 380 270 450 300 T 420 400 Q 340 420 280 370 Z',
          },
        ],
        cells: [
          { id: 'cu1', x: 42, y: 38, type: 'mitotic_figure', confidence: 0.95, diameterMicrons: 14.5 },
          { id: 'cu2', x: 50, y: 44, type: 'atypical_nucleus', confidence: 0.98, diameterMicrons: 22.0 },
          { id: 'cu3', x: 38, y: 62, type: 'lymphocyte', confidence: 0.93, diameterMicrons: 8.0 },
        ],
        heatmapGrid: [
          [0.05, 0.08, 0.15, 0.22, 0.24, 0.19, 0.12, 0.05, 0.02, 0.01],
          [0.08, 0.22, 0.55, 0.76, 0.82, 0.74, 0.49, 0.24, 0.07, 0.02],
          [0.15, 0.51, 0.86, 0.95, 0.98, 0.95, 0.84, 0.58, 0.24, 0.05],
          [0.22, 0.69, 0.94, 0.99, 1.00, 0.99, 0.93, 0.76, 0.38, 0.09],
          [0.26, 0.75, 0.96, 1.00, 1.00, 1.00, 0.95, 0.81, 0.45, 0.12],
          [0.23, 0.71, 0.93, 0.98, 0.99, 0.98, 0.91, 0.77, 0.40, 0.10],
          [0.16, 0.56, 0.85, 0.93, 0.96, 0.93, 0.82, 0.61, 0.27, 0.06],
          [0.08, 0.30, 0.60, 0.75, 0.81, 0.75, 0.59, 0.36, 0.12, 0.03],
          [0.03, 0.11, 0.27, 0.42, 0.48, 0.43, 0.29, 0.14, 0.04, 0.01],
          [0.01, 0.02, 0.07, 0.12, 0.15, 0.13, 0.07, 0.03, 0.01, 0.00],
        ],
      };

      onUploadCustomCase(customCase);
      setIsUploading(false);
    }, 1500);
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-4">
      {/* Search, Filter, and Upload Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search accession #, pathology diagnosis, organ, or stage..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Organ Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {organs.map((organ) => (
            <button
              key={organ}
              onClick={() => setSelectedOrgan(organ)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                selectedOrgan === organ
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {organ}
            </button>
          ))}
        </div>

        {/* Upload Custom Slide Button */}
        <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition border border-slate-700 shadow-sm shrink-0">
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isUploading ? 'Analyzing Slide WSI...' : 'Upload Slide (WSI/Image)'}</span>
          <input
            type="file"
            accept="image/*,.svs,.ndpi,.tiff"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Case Thumbnails Carousel / Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        {filteredCases.map((c) => {
          const isSelected = c.id === selectedCaseId;
          return (
            <div
              key={c.id}
              onClick={() => onSelectCase(c)}
              className={`cursor-pointer rounded-xl p-3 border transition-all ${
                isSelected
                  ? 'bg-slate-950 border-cyan-500 ring-1 ring-cyan-500 shadow-lg shadow-cyan-950/40'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] mono text-cyan-400 font-bold block">
                    {c.caseNumber}
                  </span>
                  <h4 className="text-xs font-bold text-white mt-0.5 line-clamp-1">
                    {c.primaryDiagnosis}
                  </h4>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                  {c.organ}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Purity: <strong className="text-slate-200">{c.tumorPurity}%</strong></span>
                <span>Mitoses: <strong className="text-amber-400">{c.mitoticIndex}/10HPF</strong></span>
                <span className="mono text-[10px] text-slate-400">{c.stain}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
