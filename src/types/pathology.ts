export type StainType = 'H&E' | 'IHC (HER2)' | 'IHC (PD-L1)' | 'IHC (Ki-67)' | 'Trichrome' | 'PAS';

export type OrganSystem = 'Breast' | 'Lung' | 'Colorectal' | 'Prostate' | 'Skin' | 'Gastric' | 'Kidney';

export interface CellDetection {
  id: string;
  x: number; // percentage coordinates 0-100
  y: number;
  type: 'mitotic_figure' | 'lymphocyte' | 'atypical_nucleus' | 'apoptotic_body' | 'plasma_cell' | 'stromal_cell';
  confidence: number;
  diameterMicrons: number;
}

export interface TissueRegion {
  id: string;
  name: string;
  type: 'invasive_tumor' | 'stroma' | 'necrosis' | 'lymphocytic_infiltrate' | 'normal_tissue';
  color: string;
  coveragePercent: number;
  path: string; // SVG path coordinate string relative to 1000x1000 slide coordinate space
}

export interface BiomarkerResult {
  name: string;
  score: string;
  interpretation: 'Positive' | 'Negative' | 'Equivocal' | 'High' | 'Low';
  details: string;
  cutoff: string;
  confidence: number;
}

export interface QualityMetric {
  parameter: string;
  value: string;
  score: number; // 0 - 100
  status: 'optimal' | 'acceptable' | 'suboptimal';
}

export interface SlideCase {
  id: string;
  caseNumber: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  collectionDate: string;
  organ: OrganSystem;
  procedure: string;
  stain: StainType;
  primaryDiagnosis: string;
  grade: string;
  stageAJCC: string;
  slideUrl: string;
  ihcComparisonUrl?: string;
  ihcType?: StainType;
  resolutionMpp: number; // Microns per pixel (e.g. 0.25 at 40x)
  totalAreaMm2: number;
  tumorPurity: number; // 0 - 100 %
  mitoticIndex: number; // per 10 HPF
  tilScore: number; // % Tumor-infiltrating lymphocytes
  biomarkers: BiomarkerResult[];
  qualityMetrics: QualityMetric[];
  tissueRegions: TissueRegion[];
  cells: CellDetection[];
  heatmapGrid: number[][]; // 10x10 or 12x12 grid of tumor probability (0.0 to 1.0)
  clinicalHistory: string;
  grossDescription: string;
  microscopicNotes: string;
}

export interface UserAnnotation {
  id: string;
  type: 'ruler' | 'pin' | 'polygon';
  points: { x: number; y: number }[];
  label: string;
  color: string;
  measurement?: string;
}
