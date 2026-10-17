import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Layers,
  Crosshair,
  Ruler,
  Eye,
  EyeOff,
  Activity,
  Sliders,
  Sparkles,
  Camera,
  Grid,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { SlideCase, CellDetection } from '../types/pathology';

interface VirtualMicroscopeProps {
  currentCase: SlideCase;
  activeStain: 'H&E' | 'IHC';
  onCellSelect?: (cell: CellDetection) => void;
  onSnapshot?: (dataUrl: string) => void;
  isComparisonMode?: boolean;
}

export const VirtualMicroscope: React.FC<VirtualMicroscopeProps> = ({
  currentCase,
  activeStain,
  onCellSelect,
  onSnapshot,
  isComparisonMode = false,
}) => {
  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(2.5); // 1 = 1x, 4 = 4x, 10 = 10x, 20 = 20x, 40 = 40x
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer Toggles
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.65);
  const [probabilityCutoff, setProbabilityCutoff] = useState<number>(0.4);
  const [showSegmentation, setShowSegmentation] = useState<boolean>(true);
  const [showCells, setShowCells] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [selectedCellFilter, setSelectedCellFilter] = useState<string>('all');

  // Active Tool: 'pan' | 'measure' | 'counter' | 'roi'
  const [activeTool, setActiveTool] = useState<'pan' | 'measure' | 'counter'>('pan');
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [manualCountedCells, setManualCountedCells] = useState<{ x: number; y: number; label: string }[]>([]);
  const [hoveredCell, setHoveredCell] = useState<CellDetection | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom & pan
  const handleResetView = () => {
    setZoom(2.5);
    setPan({ x: 0, y: 0 });
    setMeasurePoints([]);
  };

  // Magnification presets
  const magnifications = [
    { label: '1x (Overview)', value: 1.0 },
    { label: '4x', value: 2.0 },
    { label: '10x', value: 5.0 },
    { label: '20x', value: 10.0 },
    { label: '40x (Oil)', value: 20.0 },
  ];

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 1.2 : 0.83;
    setZoom((prev) => Math.min(Math.max(prev * zoomDelta, 0.8), 35));
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (activeTool === 'measure') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = ((e.clientX - rect.left - rect.width / 2 - pan.x) / zoom) + 500;
      const clickY = ((e.clientY - rect.top - rect.height / 2 - pan.y) / zoom) + 500;
      if (measurePoints.length >= 2) {
        setMeasurePoints([{ x: clickX, y: clickY }]);
      } else {
        setMeasurePoints((prev) => [...prev, { x: clickX, y: clickY }]);
      }
    } else if (activeTool === 'counter') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = ((e.clientX - rect.left - rect.width / 2 - pan.x) / zoom) + 500;
      const clickY = ((e.clientY - rect.top - rect.height / 2 - pan.y) / zoom) + 500;
      setManualCountedCells((prev) => [
        ...prev,
        { x: clickX, y: clickY, label: `#${prev.length + 1}` },
      ]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && activeTool === 'pan') {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Distance calculation for measurement ruler
  const measuredDistanceMicrons = useMemo(() => {
    if (measurePoints.length < 2) return null;
    const dx = measurePoints[1].x - measurePoints[0].x;
    const dy = measurePoints[1].y - measurePoints[0].y;
    // Scale: 1000 coordinate units corresponds to approx 1000 * resolutionMpp * 4 = 1000 µm
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    const microns = pixelDistance * 1.25; // Calibrated microns
    return Math.round(microns);
  }, [measurePoints]);

  // Scale bar calculation based on current zoom
  const scaleBar = useMemo(() => {
    const baseMicronsPerPixel = currentCase.resolutionMpp;
    // Length in pixels for standard scale on screen
    const targetMicrons = zoom > 12 ? 20 : zoom > 6 ? 50 : zoom > 2 ? 200 : 500;
    const barWidthPx = (targetMicrons / (baseMicronsPerPixel * 4)) * (zoom / 2.5);
    return {
      label: `${targetMicrons} µm`,
      widthPx: Math.min(Math.max(barWidthPx, 40), 160),
    };
  }, [zoom, currentCase.resolutionMpp]);

  // Filter cells
  const filteredCells = useMemo(() => {
    if (selectedCellFilter === 'all') return currentCase.cells;
    return currentCase.cells.filter((c) => c.type === selectedCellFilter);
  }, [currentCase.cells, selectedCellFilter]);

  // Capture viewport snapshot
  const handleCaptureSnapshot = () => {
    if (onSnapshot) {
      onSnapshot(`snapshot-${currentCase.caseNumber}-${zoom.toFixed(1)}x.png`);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col bg-slate-950 overflow-hidden select-none border border-slate-800 rounded-xl shadow-2xl">
      {/* Top Microscope Toolbar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-20">
        {/* Case & Lens Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mono">
              WSI VIRTUAL OBJECTIVE
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700"></div>

          {/* Quick Magnification Selector */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            {magnifications.map((mag) => {
              const isActive = Math.abs(zoom - mag.value) < 1.0;
              return (
                <button
                  key={mag.label}
                  onClick={() => setZoom(mag.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                    isActive
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {mag.label}
                </button>
              );
            })}
          </div>

          <span className="text-xs text-slate-400 mono hidden sm:inline">
            Zoom: <span className="text-cyan-300 font-bold">{(zoom * 2).toFixed(1)}x</span>
          </span>
        </div>

        {/* Interactive Mode & Tool Selector */}
        <div className="flex items-center gap-2">
          {/* Active Tool Buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTool('pan')}
              title="Pan / Navigate Slide (Drag)"
              className={`p-1.5 rounded transition ${
                activeTool === 'pan' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crosshair className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('measure')}
              title="Digital Caliper Ruler (Measure Microns µm)"
              className={`p-1.5 rounded transition flex items-center gap-1 ${
                activeTool === 'measure' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Ruler className="w-4 h-4" />
              {activeTool === 'measure' && <span className="text-[10px] pr-1">Measure</span>}
            </button>
            <button
              onClick={() => setActiveTool('counter')}
              title="Cell Marker Pinpoint Counter"
              className={`p-1.5 rounded transition flex items-center gap-1 ${
                activeTool === 'counter' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              {activeTool === 'counter' && <span className="text-[10px] pr-1">Counter ({manualCountedCells.length})</span>}
            </button>
          </div>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Calibrated Reticle Grid"
            className={`p-1.5 rounded-lg border transition ${
              showGrid
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Reset Zoom */}
          <button
            onClick={handleResetView}
            title="Reset to 1x Center Overview"
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Capture Snapshot */}
          <button
            onClick={handleCaptureSnapshot}
            title="Export High-Res Microscopy Snapshot"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Snapshot</span>
          </button>
        </div>
      </div>

      {/* Main Slide Interactive Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 w-full h-full overflow-hidden bg-slate-950 cursor-${
          activeTool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair'
        }`}
      >
        {/* Reticle / Grid Overlay if enabled */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-10 slide-grid-bg opacity-30" />
        )}

        {/* The Slide Stage (Scaled & Panned) */}
        <div
          style={{
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            transformOrigin: '500px 500px',
            transition: isDragging ? 'none' : 'transform 0.08s ease-out',
          }}
          className="absolute left-1/2 top-1/2 w-[1000px] h-[1000px] shadow-2xl rounded-2xl overflow-hidden border border-slate-800/60 bg-gradient-to-br from-rose-950/20 via-slate-900 to-indigo-950/20"
        >
          {/* Biological Tissue & Cellular Histology SVG Canvas */}
          <svg
            viewBox="0 0 1000 1000"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Eosinophilic Stroma Texture */}
              <pattern id="stromaPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 0,20 Q 10,10 20,20 T 40,20"
                  fill="none"
                  stroke={activeStain === 'H&E' ? '#fda4af' : '#d97706'}
                  strokeWidth="2"
                  opacity="0.4"
                />
                <path
                  d="M 10,0 Q 20,10 30,0 T 50,0"
                  fill="none"
                  stroke={activeStain === 'H&E' ? '#f43f5e' : '#b45309'}
                  strokeWidth="1.5"
                  opacity="0.25"
                />
              </pattern>

              {/* Tumor Cell Nest Pattern */}
              <pattern id="tumorNestPattern" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="15" cy="15" r="10" fill={activeStain === 'H&E' ? '#4338ca' : '#92400e'} opacity="0.8" />
                <circle cx="15" cy="15" r="3.5" fill="#f87171" opacity="0.9" />
                <circle cx="45" cy="18" r="11" fill={activeStain === 'H&E' ? '#3730a3' : '#78350f'} opacity="0.85" />
                <circle cx="45" cy="18" r="4" fill="#f87171" opacity="0.95" />
                <circle cx="28" cy="45" r="12" fill={activeStain === 'H&E' ? '#4f46e5' : '#b45309'} opacity="0.8" />
                <circle cx="28" cy="45" r="3" fill="#ec4899" opacity="0.9" />
              </pattern>

              {/* Radial gradient for realistic whole slide biopsy border */}
              <radialGradient id="biopsyGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fdf2f8" stopOpacity="0.06" />
                <stop offset="70%" stopColor="#fda4af" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
              </radialGradient>

              {/* Heatmap blur filter */}
              <filter id="heatmapBlur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="35" />
              </filter>
            </defs>

            {/* Slide Glass Background */}
            <rect width="1000" height="1000" fill="#0f172a" />
            <rect width="1000" height="1000" fill="url(#biopsyGlow)" />

            {/* Base Biopsy Tissue Specimen Section */}
            <g id="tissue-base">
              {/* Outer Biopsy Core Shape */}
              <path
                d="M 120 280 C 120 180, 240 100, 480 120 C 740 140, 880 220, 890 420 C 900 620, 840 820, 620 880 C 380 940, 150 840, 110 650 C 90 510, 120 380, 120 280 Z"
                fill={activeStain === 'H&E' ? '#ffe4e6' : '#fef3c7'}
                opacity="0.85"
                stroke={activeStain === 'H&E' ? '#f43f5e' : '#d97706'}
                strokeWidth="2"
              />

              {/* Desmoplastic Fibrous Stroma Layer */}
              <path
                d="M 160 210 Q 280 130 560 170 T 830 310 Q 920 540 790 750 T 440 880 Q 210 820 120 590 Z"
                fill="url(#stromaPattern)"
              />

              {/* Malignant Tumor Sheets / Infiltrative Mass */}
              <path
                d="M 220 250 Q 320 180 520 220 T 780 340 Q 860 520 740 690 T 480 820 Q 260 760 180 580 Z"
                fill={activeStain === 'H&E' ? '#312e81' : '#78350f'}
                opacity={activeStain === 'H&E' ? '0.75' : '0.90'}
              />

              {/* High-density Cellular Clusters */}
              <path
                d="M 220 250 Q 320 180 520 220 T 780 340 Q 860 520 740 690 T 480 820 Q 260 760 180 580 Z"
                fill="url(#tumorNestPattern)"
              />

              {/* Glandular / Cribriform Cavities */}
              <circle cx="380" cy="360" r="26" fill={activeStain === 'H&E' ? '#fdf2f8' : '#fffbeb'} stroke="#4338ca" strokeWidth="4" />
              <circle cx="460" cy="390" r="18" fill={activeStain === 'H&E' ? '#fdf2f8' : '#fffbeb'} stroke="#4338ca" strokeWidth="3" />
              <circle cx="590" cy="330" r="22" fill={activeStain === 'H&E' ? '#fdf2f8' : '#fffbeb'} stroke="#4338ca" strokeWidth="4" />
              <circle cx="670" cy="460" r="30" fill={activeStain === 'H&E' ? '#fdf2f8' : '#fffbeb'} stroke="#4338ca" strokeWidth="5" />
              <circle cx="520" cy="590" r="24" fill={activeStain === 'H&E' ? '#fdf2f8' : '#fffbeb'} stroke="#4338ca" strokeWidth="3.5" />
              <circle cx="340" cy="540" r="20" fill={activeStain === 'H&E' ? '#fdf2f8' : '#fffbeb'} stroke="#4338ca" strokeWidth="3" />

              {/* Focal Necrotic Center */}
              <path
                d="M 440 460 Q 520 420 590 470 T 560 560 Q 480 610 420 540 Z"
                fill={activeStain === 'H&E' ? '#f43f5e' : '#b45309'}
                opacity="0.65"
              />

              {/* Lymphoid Aggregates (Dense blue-purple dots) */}
              <ellipse cx="280" cy="380" rx="45" ry="32" fill="#1e1b4b" opacity="0.8" />
              <ellipse cx="690" cy="620" rx="38" ry="28" fill="#1e1b4b" opacity="0.8" />
            </g>

            {/* AI Tumor Probability Heatmap Layer */}
            {showHeatmap && (
              <g
                id="ai-heatmap-layer"
                style={{ opacity: heatmapOpacity }}
                filter="url(#heatmapBlur)"
                className="transition-opacity duration-300"
              >
                {currentCase.heatmapGrid.map((row, rIdx) =>
                  row.map((prob, cIdx) => {
                    if (prob < probabilityCutoff) return null;
                    const cx = (cIdx + 0.5) * 100;
                    const cy = (rIdx + 0.5) * 100;
                    // Color gradient: yellow -> orange -> red
                    const color =
                      prob > 0.85
                        ? '#ef4444' // Bright Red
                        : prob > 0.65
                        ? '#f97316' // Orange
                        : prob > 0.45
                        ? '#eab308' // Yellow
                        : '#22c55e'; // Green
                    return (
                      <circle
                        key={`hm-${rIdx}-${cIdx}`}
                        cx={cx}
                        cy={cy}
                        r={60 * prob}
                        fill={color}
                        opacity={prob * 0.9}
                      />
                    );
                  })
                )}
              </g>
            )}

            {/* AI Tissue Segmentation Polygons */}
            {showSegmentation && (
              <g id="ai-segmentation-layer" className="transition-opacity">
                {currentCase.tissueRegions.map((region) => (
                  <path
                    key={region.id}
                    d={region.path}
                    fill={region.color}
                    fillOpacity="0.18"
                    stroke={region.color}
                    strokeWidth="3.5"
                    strokeDasharray={region.type === 'necrosis' ? '6,4' : 'none'}
                    className="hover:stroke-white transition-all cursor-pointer"
                  >
                    <title>{`${region.name} (${region.coveragePercent}%)`}</title>
                  </path>
                ))}
              </g>
            )}

            {/* AI Detected Cells & Nuclei Markers */}
            {showCells && (
              <g id="ai-cells-layer">
                {filteredCells.map((cell) => {
                  const cx = cell.x * 10;
                  const cy = cell.y * 10;
                  const isMitosis = cell.type === 'mitotic_figure';
                  const isAtypical = cell.type === 'atypical_nucleus';
                  const isLymph = cell.type === 'lymphocyte';
                  const isApoptotic = cell.type === 'apoptotic_body';

                  const strokeColor = isMitosis
                    ? '#f97316' // Orange
                    : isAtypical
                    ? '#ef4444' // Red
                    : isLymph
                    ? '#8b5cf6' // Purple
                    : isApoptotic
                    ? '#06b6d4' // Cyan
                    : '#10b981';

                  return (
                    <g
                      key={cell.id}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => onCellSelect && onCellSelect(cell)}
                    >
                      {/* Cell Boundary Circle */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={Math.max(cell.diameterMicrons * 0.8, 8)}
                        fill={strokeColor}
                        fillOpacity="0.25"
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        className="group-hover:stroke-white group-hover:scale-125 transition-all"
                      />

                      {/* Mitotic Spindle Figure indicator */}
                      {isMitosis && (
                        <path
                          d={`M ${cx - 5} ${cy} L ${cx + 5} ${cy} M ${cx} ${cy - 5} L ${cx} ${cy + 5}`}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      )}

                      {/* Pulsing halo on hover */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={Math.max(cell.diameterMicrons * 1.5, 14)}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        className="opacity-0 group-hover:opacity-100 transition-opacity animate-spin"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Digital Measurement Caliper Line */}
            {measurePoints.length > 0 && (
              <g id="caliper-layer">
                {measurePoints.map((pt, idx) => (
                  <circle
                    key={`m-pt-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r="6"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                ))}
                {measurePoints.length === 2 && (
                  <>
                    <line
                      x1={measurePoints[0].x}
                      y1={measurePoints[0].y}
                      x2={measurePoints[1].x}
                      y2={measurePoints[1].y}
                      stroke="#38bdf8"
                      strokeWidth="3"
                      strokeDasharray="5,5"
                    />
                    {/* Measurement Label Callout */}
                    <rect
                      x={(measurePoints[0].x + measurePoints[1].x) / 2 - 40}
                      y={(measurePoints[0].y + measurePoints[1].y) / 2 - 25}
                      width="80"
                      height="24"
                      rx="4"
                      fill="#0369a1"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                    <text
                      x={(measurePoints[0].x + measurePoints[1].x) / 2}
                      y={(measurePoints[0].y + measurePoints[1].y) / 2 - 9}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                    >
                      {measuredDistanceMicrons} µm
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Manual Pinpoint Counter Markers */}
            {manualCountedCells.map((pin, idx) => (
              <g key={`pin-${idx}`}>
                <circle cx={pin.x} cy={pin.y} r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                <text
                  x={pin.x}
                  y={pin.y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono"
                >
                  {idx + 1}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Dynamic Scale Bar in Viewport (Bottom-Left) */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col items-start bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 shadow-xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-slate-300 mono">{scaleBar.label}</span>
            <span className="text-[10px] text-slate-400">
              ({currentCase.resolutionMpp} µm/px)
            </span>
          </div>
          <div
            style={{ width: `${scaleBar.widthPx}px` }}
            className="h-1.5 bg-cyan-400 rounded-full border border-cyan-200 shadow-sm"
          ></div>
        </div>

        {/* Hovered Cell Inspector Card (Bottom-Right or Floating) */}
        {hoveredCell && (
          <div className="absolute bottom-4 right-4 z-30 w-72 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-cyan-500/40 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                PathAI Cell Detection
              </span>
              <span className="text-[10px] mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                {(hoveredCell.confidence * 100).toFixed(1)}% Conf
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Classification:</span>
                <span className="font-semibold text-slate-200 capitalize">
                  {hoveredCell.type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nuclear Diameter:</span>
                <span className="font-semibold text-amber-400 mono">
                  {hoveredCell.diameterMicrons} µm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slide Coordinates:</span>
                <span className="font-medium text-slate-400 mono">
                  ({hoveredCell.x.toFixed(1)}%, {hoveredCell.y.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Microscope Minimap Navigator (Top-Right) */}
        <div className="absolute top-4 right-4 z-20 w-36 h-36 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-lg p-1.5 shadow-2xl hidden sm:block">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Slide Overview</span>
            <span className="mono text-cyan-400">WSI</span>
          </div>
          <div className="relative w-full h-[100px] bg-slate-900 rounded border border-slate-800/80 overflow-hidden flex items-center justify-center">
            {/* Miniature tissue silhouette */}
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-indigo-500/30"></div>
            </div>
            {/* Viewport Reticle Box */}
            <div
              style={{
                width: `${Math.max(100 / zoom, 12)}%`,
                height: `${Math.max(100 / zoom, 12)}%`,
                transform: `translate(${-pan.x / (zoom * 12)}px, ${-pan.y / (zoom * 12)}px)`,
              }}
              className="absolute border-2 border-cyan-400 bg-cyan-400/20 shadow-sm pointer-events-none transition-all"
            ></div>
          </div>
        </div>

        {/* Active Tool Help Banner */}
        {activeTool === 'measure' && (
          <div className="absolute top-4 left-4 z-20 bg-cyan-950/90 text-cyan-200 border border-cyan-700/60 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-lg">
            <Ruler className="w-3.5 h-3.5 text-cyan-400" />
            <span>Click 2 points on the slide to measure distance in micrometers</span>
            {measurePoints.length > 0 && (
              <button
                onClick={() => setMeasurePoints([])}
                className="ml-2 text-cyan-400 hover:text-white underline text-[11px]"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {activeTool === 'counter' && (
          <div className="absolute top-4 left-4 z-20 bg-emerald-950/90 text-emerald-200 border border-emerald-700/60 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-lg">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Click anywhere to drop mitotic / cell count pin ({manualCountedCells.length} recorded)</span>
            {manualCountedCells.length > 0 && (
              <button
                onClick={() => setManualCountedCells([])}
                className="ml-2 text-emerald-400 hover:text-white underline text-[11px]"
              >
                Reset Pins
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating Control Bar (Overlay Toggles & Sliders) */}
      <div className="border-t border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 z-20 text-xs">
        {/* Layer Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Layers:
          </span>

          {/* Heatmap Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 border transition ${
              showHeatmap
                ? 'bg-rose-950/70 border-rose-600 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {showHeatmap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Tumor Heatmap</span>
          </button>

          {/* Segmentation Toggle */}
          <button
            onClick={() => setShowSegmentation(!showSegmentation)}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 border transition ${
              showSegmentation
                ? 'bg-indigo-950/70 border-indigo-600 text-indigo-300'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {showSegmentation ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Tissue Segments</span>
          </button>

          {/* Cells Toggle */}
          <button
            onClick={() => setShowCells(!showCells)}
            className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 border transition ${
              showCells
                ? 'bg-cyan-950/70 border-cyan-600 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {showCells ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Cell Markers ({currentCase.cells.length})</span>
          </button>

          {/* Cell Filter Dropdown if cells shown */}
          {showCells && (
            <select
              value={selectedCellFilter}
              onChange={(e) => setSelectedCellFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Cell Types</option>
              <option value="mitotic_figure">Mitotic Figures</option>
              <option value="atypical_nucleus">Atypical Nuclei</option>
              <option value="lymphocyte">Lymphocytes (TILs)</option>
              <option value="apoptotic_body">Apoptotic Bodies</option>
            </select>
          )}
        </div>

        {/* Heatmap Transparency & Cutoff Adjusters */}
        {showHeatmap && (
          <div className="flex items-center gap-4 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Opacity:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                className="w-16 h-1 accent-cyan-500 bg-slate-800 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-300 mono w-7">
                {Math.round(heatmapOpacity * 100)}%
              </span>
            </div>

            <div className="h-3 w-[1px] bg-slate-800"></div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Cutoff:</span>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={probabilityCutoff}
                onChange={(e) => setProbabilityCutoff(parseFloat(e.target.value))}
                className="w-16 h-1 accent-rose-500 bg-slate-800 rounded cursor-pointer"
              />
              <span className="text-[10px] text-rose-300 mono w-8">
                &ge;{(probabilityCutoff * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
