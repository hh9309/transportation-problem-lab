import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { Origin, Destination, CostMatrix, InitialMethod, StepDetail, CaseStudy } from '../types';
import { CLASSIC_CASES } from '../data/cases';
import {
  solveTransportationSimplex,
  calculateTotalCost,
  getBalancedMatrix,
  BIG_M,
  findClosedLoop,
  getBasicVariablesMask,
} from '../utils/transportationAlgorithms';
import {
  Table,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  CheckCircle2,
  Zap,
  Sparkles,
  TrendingDown,
  Scale,
  Compass,
  Award,
  DollarSign,
  PackageCheck,
  List,
  Info,
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

interface TableauSolverViewProps {
  origins: Origin[];
  destinations: Destination[];
  costMatrix: CostMatrix;
  currentCase?: CaseStudy | null;
  onLoadCase?: (caseStudy: CaseStudy) => void;
}

// 运筹学经典平衡型运输问题独立例题 (Independent Textbook Balanced Transportation Problem Examples)
const TEXTBOOK_BALANCED_1 = {
  id: 'tb1',
  title: '例题 1：运筹学教材标准平衡调运模型 (3×4)',
  desc: '3大发货中心（产量 50, 60, 40 吨，总产量 150 吨）调运至 4大销区（需求 30, 40, 50, 30 吨，总需求 150 吨）。产销完全平衡 (∑a_i = ∑b_j = 150 吨)，展现 MODI 位势法完整收敛。',
  origins: [
    { id: 'tb1_o1', name: '华东发货仓 (A1)', supply: 50 },
    { id: 'tb1_o2', name: '华北发货仓 (A2)', supply: 60 },
    { id: 'tb1_o3', name: '华南发货仓 (A3)', supply: 40 },
  ],
  destinations: [
    { id: 'tb1_d1', name: '上海销区 (B1)', demand: 30 },
    { id: 'tb1_d2', name: '北京销区 (B2)', demand: 40 },
    { id: 'tb1_d3', name: '广州销区 (B3)', demand: 50 },
    { id: 'tb1_d4', name: '成都销区 (B4)', demand: 30 },
  ],
  costMatrix: [
    [16, 13, 22, 17],
    [14, 12, 18, 15],
    [19, 20, 13, 12],
  ],
};

const TEXTBOOK_BALANCED_2 = {
  id: 'tb2',
  title: '例题 2：清华《运筹学》表上作业法经典例题 (3×4)',
  desc: '3个基地（产量 7, 9, 18 吨，总产量 34 吨）调运至 4个销区（需求 3, 6, 5, 20 吨，总需求 34 吨）。产销完全平衡 (∑a_i = ∑b_j = 34 吨)。',
  origins: [
    { id: 'tb2_o1', name: '基地 A1', supply: 7 },
    { id: 'tb2_o2', name: '基地 A2', supply: 9 },
    { id: 'tb2_o3', name: '基地 A3', supply: 18 },
  ],
  destinations: [
    { id: 'tb2_d1', name: '销区 B1', demand: 3 },
    { id: 'tb2_d2', name: '销区 B2', demand: 6 },
    { id: 'tb2_d3', name: '销区 B3', demand: 5 },
    { id: 'tb2_d4', name: '销区 B4', demand: 20 },
  ],
  costMatrix: [
    [3, 11, 3, 10],
    [1, 9, 2, 8],
    [7, 4, 10, 5],
  ],
};

const initialMethodNames: Record<InitialMethod, string> = {
  vogel: '伏格尔法 (Vogel Approximation)',
  northwest: '西北角法 (North-West Corner Rule)',
  leastCost: '最小元素法 (Minimum Cost Method)',
};

export const TableauSolverView: React.FC<TableauSolverViewProps> = ({
  origins,
  destinations,
  costMatrix,
  currentCase,
  onLoadCase,
}) => {
  const [initialMethod, setInitialMethod] = useState<InitialMethod>('vogel');
  const [exampleMode, setExampleMode] = useState<string>('current');
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1500);
  const [isInitialSectionExpanded, setIsInitialSectionExpanded] = useState<boolean>(true);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);

  // Selected non-basic cell for custom path feasibility verification
  const [selectedVerifyCell, setSelectedVerifyCell] = useState<{ row: number; col: number } | null>(null);

  // Active dataset selection
  const activeData = useMemo(() => {
    if (exampleMode === 'textbook_1') return TEXTBOOK_BALANCED_1;
    if (exampleMode === 'textbook_2') return TEXTBOOK_BALANCED_2;
    const classicFound = CLASSIC_CASES.find((c) => c.id === exampleMode);
    if (classicFound) return classicFound;
    return {
      id: currentCase?.id || 'current',
      title: currentCase?.title || '当前工作区运输模型',
      desc: currentCase?.description || '同步工作区中的实时产销数据与运价矩阵。',
      origins,
      destinations,
      costMatrix,
    };
  }, [exampleMode, origins, destinations, costMatrix, currentCase]);

  const activeOrigins = activeData.origins;
  const activeDestinations = activeData.destinations;
  const activeCostMatrix = activeData.costMatrix;

  const balanced = getBalancedMatrix(activeOrigins, activeDestinations, activeCostMatrix);
  const result = solveTransportationSimplex(activeOrigins, activeDestinations, activeCostMatrix, initialMethod);

  const steps = result.steps;
  const initialStep: StepDetail = steps[0] || {
    stepNumber: 0,
    allocation: balanced.costMatrix.map((r) => r.map(() => 0)),
    isOptimal: false,
    description: '初始方案构建',
  };
  const currentStep: StepDetail = steps[stepIndex] || steps[0];
  const finalOptimalStep: StepDetail = steps[steps.length - 1] || steps[0];

  // Auto playback for auto solving mode
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        setStepIndex((prev) => {
          if (prev < steps.length - 1) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, steps.length, speed]);

  useEffect(() => {
    setSelectedVerifyCell(null);
  }, [stepIndex]);

  // When external dataset or currentCase changes, reset state
  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
    setSelectedVerifyCell(null);
    setExampleMode('current');
    if (currentCase?.title) {
      setLoadNotice(`✓ 已成功载入案例【${currentCase.title}】！初始运输问题表已重置并生成初始方案。`);
    }
  }, [initialMethod, currentCase, origins, destinations, costMatrix]);

  const currentCost = calculateTotalCost(currentStep.allocation, balanced.costMatrix);
  const initialCost = steps[0] ? calculateTotalCost(steps[0].allocation, balanced.costMatrix) : currentCost;
  const finalOptimalCost = calculateTotalCost(finalOptimalStep.allocation, balanced.costMatrix);

  // Initial Step Calculations for the dedicated initial table view
  const initialBasicVarsCount = useMemo(() => {
    let count = 0;
    initialStep.allocation?.forEach((row) => {
      row.forEach((val) => {
        if (val > 0) count++;
      });
    });
    return count;
  }, [initialStep.allocation]);

  // Reset to initial transportation table handler
  const handleResetToInitial = () => {
    setIsPlaying(false);
    setSelectedVerifyCell(null);
    setStepIndex(0);
    setLoadNotice(`✓ 运输问题表已重置为初始状态！展示【${initialMethodNames[initialMethod]}】生成的初始基可行调运方案。`);
  };

  // Get current step basic variables mask for loop finding
  const currentIsBasicMask = useMemo(() => {
    return getBasicVariablesMask(
      currentStep.allocation,
      balanced.origins.length,
      balanced.destinations.length
    );
  }, [currentStep.allocation, balanced]);

  // Non-basic reduced cost details for current step
  const nonBasicReducedCostDetails = useMemo(() => {
    const details: Array<{
      originName: string;
      destName: string;
      row: number;
      col: number;
      unitCost: number;
      uVal: number;
      vVal: number;
      sigma: number;
      isNegative: boolean;
    }> = [];

    const uPots = currentStep.uPotentials || [];
    const vPots = currentStep.vPotentials || [];

    balanced.origins.forEach((o, i) => {
      balanced.destinations.forEach((d, j) => {
        const alloc = currentStep.allocation[i]?.[j] || 0;
        if (alloc === 0) {
          const cVal = balanced.costMatrix[i][j];
          if (cVal >= BIG_M) return;
          const uVal = uPots[i] ?? 0;
          const vVal = vPots[j] ?? 0;
          const sigma = currentStep.reducedCosts?.[i]?.[j] ?? cVal - (uVal + vVal);
          details.push({
            originName: o.name,
            destName: d.name,
            row: i,
            col: j,
            unitCost: cVal,
            uVal,
            vVal,
            sigma,
            isNegative: sigma < 0,
          });
        }
      });
    });

    return details;
  }, [currentStep, balanced]);

  const hasNegativeSigma = nonBasicReducedCostDetails.some((d) => d.isNegative);
  const minNegativeSigmaItem = nonBasicReducedCostDetails.reduce((minItem, item) => {
    if (item.isNegative && (!minItem || item.sigma < minItem.sigma)) return item;
    return minItem;
  }, null as (typeof nonBasicReducedCostDetails)[0] | null);

  // Compute all negative reduced cost candidate routes (σ_ij < 0)
  const negativeCandidateRoutes = useMemo(() => {
    const list: Array<{
      row: number;
      col: number;
      originName: string;
      destName: string;
      unitCost: number;
      uVal: number;
      vVal: number;
      sigma: number;
      theta: number;
      potentialSavings: number;
      loop: { row: number; col: number; sign: '+' | '-' }[] | null;
    }> = [];

    const uPots = currentStep.uPotentials || [];
    const vPots = currentStep.vPotentials || [];

    balanced.origins.forEach((o, i) => {
      balanced.destinations.forEach((d, j) => {
        const alloc = currentStep.allocation[i]?.[j] || 0;
        if (alloc === 0) {
          const cVal = balanced.costMatrix[i][j];
          if (cVal >= BIG_M) return;
          const uVal = uPots[i] ?? 0;
          const vVal = vPots[j] ?? 0;
          const sigma = currentStep.reducedCosts?.[i]?.[j] ?? cVal - (uVal + vVal);

          if (sigma < 0) {
            const rawLoop = findClosedLoop(currentIsBasicMask, i, j);
            let signedLoop: { row: number; col: number; sign: '+' | '-' }[] | null = null;
            let theta = 0;

            if (rawLoop) {
              signedLoop = rawLoop.map((node, idx) => ({
                ...node,
                sign: (idx % 2 === 0 ? '+' : '-') as '+' | '-',
              }));
              const negs = signedLoop.filter((n) => n.sign === '-');
              if (negs.length > 0) {
                theta = Math.min(...negs.map((n) => currentStep.allocation[n.row]?.[n.col] || 0));
              }
            }

            list.push({
              row: i,
              col: j,
              originName: o.name,
              destName: d.name,
              unitCost: cVal,
              uVal,
              vVal,
              sigma,
              theta,
              potentialSavings: theta * Math.abs(sigma),
              loop: signedLoop,
            });
          }
        }
      });
    });

    return list;
  }, [currentStep, currentIsBasicMask, balanced]);

  // Active loop info for selectedVerifyCell OR current step entering cell
  const activeLoopInfo = useMemo(() => {
    let targetRow = selectedVerifyCell?.row;
    let targetCol = selectedVerifyCell?.col;

    if (targetRow === undefined || targetCol === undefined) {
      if (currentStep.enteringCell) {
        targetRow = currentStep.enteringCell.row;
        targetCol = currentStep.enteringCell.col;
      } else if (minNegativeSigmaItem) {
        targetRow = minNegativeSigmaItem.row;
        targetCol = minNegativeSigmaItem.col;
      } else if (negativeCandidateRoutes.length > 0) {
        targetRow = negativeCandidateRoutes[0].row;
        targetCol = negativeCandidateRoutes[0].col;
      }
    }

    if (targetRow === undefined || targetCol === undefined) return null;

    const uPots = currentStep.uPotentials || [];
    const vPots = currentStep.vPotentials || [];
    const uVal = uPots[targetRow] ?? 0;
    const vVal = vPots[targetCol] ?? 0;
    const cVal = balanced.costMatrix[targetRow][targetCol];
    const sigma = currentStep.reducedCosts?.[targetRow]?.[targetCol] ?? cVal - (uVal + vVal);

    let loop: { row: number; col: number; sign: '+' | '-' }[] | null = null;
    if (
      currentStep.enteringCell?.row === targetRow &&
      currentStep.enteringCell?.col === targetCol &&
      currentStep.closedLoop &&
      currentStep.closedLoop.length > 0
    ) {
      loop = currentStep.closedLoop;
    } else {
      const rawLoop = findClosedLoop(currentIsBasicMask, targetRow, targetCol);
      if (rawLoop) {
        loop = rawLoop.map((node, idx) => ({
          ...node,
          sign: (idx % 2 === 0 ? '+' : '-') as '+' | '-',
        }));
      }
    }

    if (!loop || loop.length === 0) return null;

    const negNodes = loop.filter((n) => n.sign === '-');
    const theta =
      currentStep.enteringCell?.row === targetRow &&
      currentStep.enteringCell?.col === targetCol &&
      currentStep.theta !== undefined
        ? currentStep.theta
        : negNodes.length > 0
        ? Math.min(...negNodes.map((n) => currentStep.allocation[n.row]?.[n.col] || 0))
        : 0;

    const potentialSavings = theta * (sigma < 0 ? Math.abs(sigma) : 0);

    return {
      row: targetRow,
      col: targetCol,
      originName: balanced.origins[targetRow]?.name || `A${targetRow + 1}`,
      destName: balanced.destinations[targetCol]?.name || `B${targetCol + 1}`,
      unitCost: cVal,
      uVal,
      vVal,
      sigma,
      theta,
      potentialSavings,
      loop,
    };
  }, [selectedVerifyCell, currentStep, currentIsBasicMask, balanced, minNegativeSigmaItem, negativeCandidateRoutes]);

  // DOM Table Measurement Refs for Exact SVG Closed Loop Overlay
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const [cellCoords, setCellCoords] = useState<Record<string, { x: number; y: number }>>({});
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 1000, height: 600 });

  // Measure exact cell center positions inside the DOM table
  const updateCellCoordinates = useCallback(() => {
    if (!tableContainerRef.current) return;
    const containerRect = tableContainerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    setContainerSize({
      width: containerRect.width,
      height: containerRect.height,
    });

    const newCoords: Record<string, { x: number; y: number }> = {};
    for (let i = 0; i < balanced.origins.length; i++) {
      for (let j = 0; j < balanced.destinations.length; j++) {
        const key = `${i}_${j}`;
        const cellEl = cellRefs.current[key];
        if (cellEl) {
          const cellRect = cellEl.getBoundingClientRect();
          newCoords[key] = {
            x: cellRect.left - containerRect.left + cellRect.width / 2,
            y: cellRect.top - containerRect.top + cellRect.height / 2,
          };
        }
      }
    }
    setCellCoords(newCoords);
  }, [balanced.origins.length, balanced.destinations.length]);

  useLayoutEffect(() => {
    updateCellCoordinates();
    const timer = setTimeout(updateCellCoordinates, 50);
    return () => clearTimeout(timer);
  }, [stepIndex, selectedVerifyCell, updateCellCoordinates, activeData]);

  useEffect(() => {
    if (!tableContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      updateCellCoordinates();
    });
    observer.observe(tableContainerRef.current);
    return () => observer.disconnect();
  }, [updateCellCoordinates]);

  const m = balanced.origins.length;
  const n = balanced.destinations.length;
  const totalCols = n + 3;
  const totalRows = m + 3;

  const getCellCenterFallback = (r: number, c: number) => {
    const x = ((c + 1.5) / totalCols) * containerSize.width;
    const y = ((r + 1.5) / totalRows) * containerSize.height;
    return { x, y };
  };

  const displayLoop = activeLoopInfo?.loop || currentStep.closedLoop;

  let svgPathD = '';
  let loopNodeCoords: Array<{
    x: number;
    y: number;
    sign: '+' | '-';
    row: number;
    col: number;
    index: number;
  }> = [];

  if (displayLoop && displayLoop.length > 0) {
    loopNodeCoords = displayLoop.map((node, idx) => {
      const key = `${node.row}_${node.col}`;
      const pt = cellCoords[key] || getCellCenterFallback(node.row, node.col);
      return { ...pt, sign: node.sign, row: node.row, col: node.col, index: idx };
    });

    svgPathD = loopNodeCoords.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      return `${acc} L ${pt.x} ${pt.y}`;
    }, '');
    svgPathD += ` Z`;
  }

  const loopSegments = useMemo(() => {
    if (!loopNodeCoords || loopNodeCoords.length === 0) return [];

    return loopNodeCoords.map((pt, i) => {
      const nextPt = loopNodeCoords[(i + 1) % loopNodeCoords.length];
      const dx = nextPt.x - pt.x;
      const dy = nextPt.y - pt.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len;
      const uy = dy / len;

      const nodeRadius = 24;
      const startX = pt.x + ux * nodeRadius;
      const startY = pt.y + uy * nodeRadius;
      const endX = nextPt.x - ux * (nodeRadius + 4);
      const endY = nextPt.y - uy * (nodeRadius + 4);

      const midX = (pt.x + nextPt.x) / 2;
      const midY = (pt.y + nextPt.y) / 2;

      const nx = -uy;
      const ny = ux;

      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      return {
        fromIndex: i,
        toIndex: (i + 1) % loopNodeCoords.length,
        fromSign: pt.sign,
        toSign: nextPt.sign,
        fromRow: pt.row,
        fromCol: pt.col,
        toRow: nextPt.row,
        toCol: nextPt.col,
        startX,
        startY,
        endX,
        endY,
        midX,
        midY,
        nx,
        ny,
        ux,
        uy,
        dx,
        dy,
        len,
        angle,
      };
    });
  }, [loopNodeCoords]);

  // Breakdown of active routes for final result module
  const optimalRoutesList = useMemo(() => {
    const list: Array<{
      originName: string;
      destName: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }> = [];

    finalOptimalStep.allocation.forEach((row, i) => {
      row.forEach((qty, j) => {
        if (qty > 0) {
          const cVal = balanced.costMatrix[i][j];
          list.push({
            originName: balanced.origins[i]?.name || `A${i + 1}`,
            destName: balanced.destinations[j]?.name || `B${j + 1}`,
            quantity: qty,
            unitCost: cVal >= BIG_M ? 0 : cVal,
            totalCost: cVal >= BIG_M ? 0 : qty * cVal,
          });
        }
      });
    });

    return list;
  }, [finalOptimalStep, balanced]);

  return (
    <div className="space-y-6 pb-16">
      {/* Dynamic Load Notice Banner */}
      {loadNotice && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-emerald-950 shadow-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold">{loadNotice}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleResetToInitial}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg shadow transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>查看初始运输问题表与方案</span>
            </button>
            <button
              onClick={() => setLoadNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs px-2 py-1 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Example / Initial Method Selector */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-amber-500 rounded-2xl text-slate-950 shadow-lg">
              <Table className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
                  表上作业法 (Transportation Simplex) 可视化求解中心
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  位势法 (MODI) + 闭回路法 (Closed Loop)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                表上作业法是求解运输问题的专用单纯形法。通过构造初始基可行解，位势法解出 u<sub>i</sub>, v<sub>j</sub> 算空格检验数 Δ<sub>ij</sub>，最负者入基构建闭回路，按 θ 调整运量直达全局最优解。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Quick Reset to Initial Table */}
            <button
              onClick={handleResetToInitial}
              className="px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
              title="一键重置运输问题表至初始基可行方案状态 (Step 1)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>重置初始运输问题表</span>
            </button>

            {/* Quick Case Switcher Dropdown / Mode buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-[11px] font-bold text-slate-400 px-2 font-mono">案例选择:</span>
              <select
                value={exampleMode}
                onChange={(e) => {
                  const val = e.target.value;
                  setExampleMode(val);
                  const foundCase = CLASSIC_CASES.find((c) => c.id === val);
                  if (foundCase && onLoadCase) {
                    onLoadCase(foundCase);
                  }
                }}
                className="bg-slate-900 text-slate-200 font-bold text-xs py-1 px-2 rounded-lg border border-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="current">
                  {currentCase ? `[当前载入] ${currentCase.title}` : '工作区当前矩阵参数'}
                </option>
                <option value="textbook_1">经典例题 1 (3×4 标准平衡)</option>
                <option value="textbook_2">清华例题 2 (3×4 教材例题)</option>
                <optgroup label="6 大经典运筹标杆案例">
                  {CLASSIC_CASES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.origins.length}×{c.destinations.length})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Dataset Description & Initial Method Setup */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
          <div className="md:col-span-8 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-200 text-xs">{activeData.title}</h4>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-mono text-[10px]">
                  {balanced.origins.length} 产地 × {balanced.destinations.length} 销地 (基变量数 m+n-1={balanced.origins.length + balanced.destinations.length - 1})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{activeData.desc}</p>
            </div>
          </div>

          <div className="md:col-span-4 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-amber-300 block mb-1">选择初始方案构建算法:</span>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
              {(['vogel', 'northwest', 'leastCost'] as const).map((method) => (
                <button
                  key={`init-m-${method}`}
                  onClick={() => {
                    setInitialMethod(method);
                    setStepIndex(0);
                    setIsPlaying(false);
                    setLoadNotice(`已切换为【${initialMethodNames[method]}】，已重置初始运输问题表并给出初始基可行解！`);
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-center transition font-bold ${
                    initialMethod === method
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {method === 'vogel' ? '伏格尔法' : method === 'northwest' ? '西北角法' : '最小元素法'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模块 1：表上作业法 (Transportation Simplex) 标准求解算法流程图           */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-amber-300 pb-2 border-b border-slate-800">
          <span className="flex items-center gap-2 text-sm font-extrabold text-slate-100">
            <Compass className="w-4 h-4 text-amber-400" />
            表上作业法 (Transportation Simplex) 标准求解算法流程图
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            当前迭代状态: Step {stepIndex + 1} / {steps.length} {currentStep.isOptimal ? '🎉 (达到全局最优解)' : ''}
          </span>
        </div>

        {/* 5-Step OR Transportation Simplex Algorithm Flowchart */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Flowchart Step 1 */}
          <div className={`p-3 rounded-xl border transition ${stepIndex === 0 ? 'bg-indigo-950/90 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400/50' : 'bg-slate-950/70 border-slate-800 text-slate-400'}`}>
            <div className="flex items-center justify-between font-bold mb-1 text-indigo-300">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-[11px] text-indigo-300">1</span>
                <span>初始方案求解</span>
              </span>
              <span className="text-[10px] text-amber-300 font-mono">({initialMethodNames[initialMethod].split(' ')[0]})</span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">
              运用 [{initialMethodNames[initialMethod]}] 分配初始调运量，获得 m+n-1 个基变量格。
            </p>
          </div>

          {/* Flowchart Step 2 */}
          <div className={`p-3 rounded-xl border transition ${stepIndex === 0 ? 'bg-indigo-950/80 border-indigo-400 text-white shadow-md' : 'bg-slate-950/70 border-slate-800 text-slate-400'}`}>
            <div className="flex items-center justify-between font-bold mb-1 text-cyan-300">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-[11px] text-cyan-300">2</span>
                <span>基变量数检查</span>
              </span>
              <span className="text-[10px] text-cyan-300 font-mono font-bold">m+n-1={m + n - 1}</span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">
              验证非零调运格数是否等于 m+n-1，确保无退化现象。
            </p>
          </div>

          {/* Flowchart Step 3 */}
          <div className={`p-3 rounded-xl border transition ${stepIndex > 0 && hasNegativeSigma ? 'bg-amber-950/90 border-amber-400 text-white shadow-lg ring-1 ring-amber-400/50' : 'bg-slate-950/70 border-slate-800 text-slate-400'}`}>
            <div className="flex items-center justify-between font-bold mb-1 text-amber-300">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-[11px] text-amber-300">3</span>
                <span>位势法算检验数</span>
              </span>
              <span className="text-[10px] text-amber-300 font-mono">u<sub>i</sub>+v<sub>j</sub>=c<sub>ij</sub></span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">
              解位势 u<sub>i</sub>, v<sub>j</sub>，求非基格检验数 Δ<sub>ij</sub> = c<sub>ij</sub> - (u<sub>i</sub> + v<sub>j</sub>)。
            </p>
          </div>

          {/* Flowchart Step 4 */}
          <div className={`p-3 rounded-xl border transition ${currentStep.isOptimal ? 'bg-emerald-950/90 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400/50' : 'bg-rose-950/80 border-rose-400 text-white shadow-md'}`}>
            <div className="flex items-center justify-between font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${currentStep.isOptimal ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300' : 'bg-rose-500/20 border border-rose-400 text-rose-300'}`}>4</span>
                <span className={currentStep.isOptimal ? 'text-emerald-300' : 'text-rose-300'}>最优性判定</span>
              </span>
              <span className="text-[10px] font-mono font-bold">{currentStep.isOptimal ? '✓ 全Δ≥0' : '✗ 存Δ<0'}</span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">
              {currentStep.isOptimal ? '所有空格检验数非负，已达全局最优解！' : '存在负检验数 (Δ<0)，选最小负检验数进基并构闭回路。'}
            </p>
          </div>

          {/* Flowchart Step 5 */}
          <div className={`p-3 rounded-xl border transition ${currentStep.isOptimal ? 'bg-emerald-950/90 border-emerald-400 text-white shadow-lg' : 'bg-indigo-950/90 border-indigo-400 text-white shadow-lg'}`}>
            <div className="flex items-center justify-between font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${currentStep.isOptimal ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300' : 'bg-indigo-500/20 border border-indigo-400 text-indigo-300'}`}>5</span>
                <span className={currentStep.isOptimal ? 'text-emerald-300' : 'text-indigo-300'}>
                  {currentStep.isOptimal ? '输出最优解' : '闭回路调整 ➔ 返回3'}
                </span>
              </span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">
              {currentStep.isOptimal
                ? `求解完成！最低总运费 Z = ¥${currentCost}。`
                : `按 x' = x ± θ 进行运量重配，再返回 Step 3 重新检验。`}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模块 1.5：初始运输问题与初始基可行解调运方案表                            */}
      {/* 载入经典案例后立即重置并清晰展示初始调运方案                              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border-2 border-indigo-200 p-6 shadow-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-200 shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  初始运输问题表与初始基可行调运方案 (Initial Transportation Tableau & Feasible Allocation)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-100 text-indigo-800 border border-indigo-300">
                  初始构建法: {initialMethodNames[initialMethod].split(' ')[0]}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                根据载入案例参数（供需量与运价矩阵），通过【{initialMethodNames[initialMethod]}】确定的初始基可行方案。基变量格数满足 m+n-1={m + n - 1}，初始调运总成本 Z₀ = ¥{initialCost}。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Reset to Initial Step */}
            <button
              onClick={handleResetToInitial}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重置为初始运输问题表</span>
            </button>

            {/* Toggle Section Expansion */}
            <button
              onClick={() => setIsInitialSectionExpanded(!isInitialSectionExpanded)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              {isInitialSectionExpanded ? '收起初始方案表' : '展开初始方案表'}
            </button>
          </div>
        </div>

        {/* Initial Metrics Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50">
            <span className="text-slate-500 text-[11px] block mb-0.5">初始方案总运费 Z₀</span>
            <div className="text-indigo-700 font-extrabold text-lg font-mono">¥{initialCost}</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">∑ c_ij × x_ij^(0)</div>
          </div>

          <div className="p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/50">
            <span className="text-slate-500 text-[11px] block mb-0.5">基变量格数 (Non-zero Cells)</span>
            <div className="text-cyan-700 font-extrabold text-lg font-mono">
              {initialBasicVarsCount} / {m + n - 1} 个
            </div>
            <div className="text-[10px] text-emerald-600 font-mono mt-0.5 font-bold">
              {initialBasicVarsCount === m + n - 1 ? '✓ 满足无退化基变量条件' : '⚠️ 退化基 (需补零格)'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
            <span className="text-slate-500 text-[11px] block mb-0.5">产销平衡状态</span>
            <div className="text-amber-700 font-extrabold text-lg font-mono">
              {balanced.origins.reduce((s, o) => s + o.supply, 0)} = {balanced.destinations.reduce((s, d) => s + d.demand, 0)} 吨
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {origins.reduce((s, o) => s + o.supply, 0) === destinations.reduce((s, d) => s + d.demand, 0)
                ? '天然产销平衡'
                : '非平衡问题 (已自动补齐虚设节点)'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
            <span className="text-slate-500 text-[11px] block mb-0.5">初始方案算法切换</span>
            <div className="flex items-center gap-1 font-mono text-[10px] font-bold">
              {(['vogel', 'northwest', 'leastCost'] as const).map((mKey) => (
                <button
                  key={`init-sw-${mKey}`}
                  onClick={() => {
                    setInitialMethod(mKey);
                    setStepIndex(0);
                    setIsPlaying(false);
                  }}
                  className={`px-1.5 py-1 rounded border transition flex-1 text-center ${
                    initialMethod === mKey
                      ? 'bg-emerald-600 text-white border-emerald-500 font-extrabold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {mKey === 'vogel' ? '伏格尔' : mKey === 'northwest' ? '西北角' : '最小元'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Initial Transportation Tableau Matrix View */}
        {isInitialSectionExpanded && (
          <div className="space-y-4 animate-fadeIn">
            <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm">
              <table className="w-full border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-3 border-r border-slate-700 font-sans font-extrabold text-left">
                      产地 (Origins) \ 销地 (Dests)
                    </th>
                    {balanced.destinations.map((d, j) => (
                      <th key={`init-tbl-th-d-${j}`} className="p-3 border-r border-slate-700 text-center font-bold">
                        <div className="font-sans text-slate-100">{d.name}</div>
                        <div className="text-[11px] text-amber-300 font-mono mt-0.5">需求 b_{j + 1} = {d.demand}</div>
                      </th>
                    ))}
                    <th className="p-3 border-r border-slate-700 text-center font-sans font-extrabold bg-slate-800 text-amber-300">
                      总产量 (Supply)
                    </th>
                    <th className="p-3 text-center font-sans font-extrabold bg-indigo-950 text-indigo-300">
                      初始行位势 u<sub>i</sub><sup>(0)</sup>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {balanced.origins.map((o, i) => {
                    const uPot = initialStep.uPotentials?.[i] ?? 0;
                    return (
                      <tr key={`init-tbl-row-${i}`} className="hover:bg-indigo-50/20 transition">
                        <td className="p-3 border-r border-slate-200 font-sans font-extrabold text-slate-900 bg-slate-50">
                          <div>{o.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono font-normal">供应 a_{i + 1} = {o.supply}</div>
                        </td>

                        {balanced.destinations.map((d, j) => {
                          const unitCost = balanced.costMatrix[i][j];
                          const allocQty = initialStep.allocation[i]?.[j] || 0;
                          const isBasic = allocQty > 0;
                          const vPot = initialStep.vPotentials?.[j] ?? 0;
                          const sigma = unitCost >= BIG_M ? 0 : unitCost - (uPot + vPot);

                          return (
                            <td
                              key={`init-tbl-cell-${i}-${j}`}
                              className={`p-3 border-r border-slate-200 text-center relative transition ${
                                isBasic ? 'bg-indigo-50/90 font-extrabold ring-1 ring-inset ring-indigo-300' : 'bg-white'
                              }`}
                            >
                              {/* Top Right Unit Cost Badge */}
                              <div className="absolute top-1 right-1.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-mono text-slate-700">
                                c_{i + 1}{j + 1}={unitCost >= BIG_M ? 'M' : unitCost}
                              </div>

                              {/* Cell Content: Initial Allocation vs Reduced Cost */}
                              <div className="pt-2.5 pb-1">
                                {isBasic ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-block px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold font-mono text-sm shadow-xs">
                                      x_{i + 1}{j + 1} = {allocQty} 吨
                                    </span>
                                    <div className="text-[10px] text-indigo-700 font-mono">
                                      费用: ¥{allocQty * (unitCost >= BIG_M ? 0 : unitCost)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="py-1">
                                    <span className="text-slate-400 font-mono text-xs block">空格 (x=0)</span>
                                    <span
                                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                        sigma < 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      Δ_{i + 1}{j + 1} = {sigma}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Supply Cell */}
                        <td className="p-3 border-r border-slate-200 text-center font-bold bg-slate-50 text-slate-900 font-mono">
                          {o.supply}
                        </td>

                        {/* Initial Row Potential Cell */}
                        <td className="p-3 text-center font-bold bg-indigo-50 text-indigo-900 font-mono">
                          u_{i + 1} = {uPot}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary & Col Potentials Rows */}
                  <tr className="bg-slate-100 font-extrabold text-slate-800">
                    <td className="p-3 border-r border-slate-300 font-sans text-slate-900">
                      总需求量 (Demand)
                    </td>
                    {balanced.destinations.map((d, j) => (
                      <td key={`init-tbl-sum-d-${j}`} className="p-3 border-r border-slate-300 text-center font-mono">
                        {d.demand}
                      </td>
                    ))}
                    <td className="p-3 border-r border-slate-300 text-center bg-amber-100 text-amber-900 font-mono">
                      ∑ = {balanced.origins.reduce((s, o) => s + o.supply, 0)}
                    </td>
                    <td className="p-3 text-center bg-indigo-100 text-indigo-900 text-[10px]">
                      令 u₁ = 0
                    </td>
                  </tr>

                  <tr className="bg-indigo-50 font-extrabold text-indigo-950">
                    <td className="p-3 border-r border-slate-300 font-sans text-indigo-900">
                      初始列位势 v<sub>j</sub><sup>(0)</sup>
                    </td>
                    {balanced.destinations.map((d, j) => {
                      const vPot = initialStep.vPotentials?.[j] ?? 0;
                      return (
                        <td key={`init-tbl-vpot-${j}`} className="p-3 border-r border-slate-300 text-center font-mono text-indigo-900">
                          v_{j + 1} = {vPot}
                        </td>
                      );
                    })}
                    <td className="p-3 border-r border-slate-300 text-center text-[10px] text-slate-500">
                      初始位势基
                    </td>
                    <td className="p-3 text-center text-[10px] font-mono text-indigo-900">
                      v_j = c_ij - u_i
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quick Actions after Viewing Initial Scheme */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>
                  <strong>初始调运方案推导完毕：</strong>您可以点击右侧按钮进行<strong>单步迭代、自动演进或一键直达最优解</strong>。
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setSelectedVerifyCell(null);
                    setStepIndex(1);
                  }}
                  disabled={steps.length <= 1}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 transition"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>开始第 1 轮换基调整 (Step 2)</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedVerifyCell(null);
                    setStepIndex(0);
                    setIsPlaying(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>从初始方案自动求解</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 模块 2：表上作业法求解运算矩阵表 (Transportation Tableau Matrix)          */}
      {/* 包含内置的：自动迭代直至最优解 + 分步求解功能                           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-300 p-6 shadow-md space-y-4">
        {/* Module Header Bar containing Title, Status, and Direct Solving Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-extrabold text-slate-900">
                表上作业法求解运算矩阵表 (Transportation Tableau Matrix)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              <span className="font-bold text-indigo-600">分步演示模式：</span>直观对比西北角法与最小元素法生成初始分配；动态推演位势（设 u<sub>1</sub>=0，依据基变量实时解出 u<sub>i</sub>, v<sub>j</sub> 并高亮显示）；自动计算非基变量检验数 σ<sub>ij</sub> = c<sub>ij</sub> - (u<sub>i</sub> + v<sub>j</sub>)；当出现负检验数时，系统自动描绘最优化闭回路并标注 “+ / -” 节点，清晰呈现运量 θ 的换基转移过程。<br />
              <span className="font-bold text-emerald-600">自动计算模式：</span>支持秒级完成多轮闭回路迭代，直观输出最优运量分布矩阵与最小总运费 (min Z)。
            </p>
          </div>

          {/* Integrated Controls in Module Header */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 bg-slate-50 p-2 rounded-xl border border-slate-200">
            {/* Step Solving Button */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setSelectedVerifyCell(null);
                setStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
              }}
              disabled={currentStep.isOptimal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition"
              title="完成一次完整迭代：算位势u,v→算检验数Δ→找最小负Δ进基→闭回路调整"
            >
              <SkipForward className="w-4 h-4" />
              <span>分步求解 (单步完整迭代)</span>
            </button>

            {/* Auto Solving Button */}
            <button
              onClick={() => {
                setSelectedVerifyCell(null);
                if (isPlaying) {
                  setIsPlaying(false);
                } else if (currentStep.isOptimal) {
                  setStepIndex(0);
                  setIsPlaying(true);
                } else {
                  setIsPlaying(true);
                }
              }}
              className={`px-3.5 py-2 font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? '暂停自动演进' : '自动迭代直至最优解'}</span>
            </button>

            {/* Jump to Final Optimal Step directly */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setSelectedVerifyCell(null);
                setStepIndex(steps.length - 1);
              }}
              disabled={stepIndex === steps.length - 1}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 text-slate-950 font-extrabold text-xs rounded-lg shadow-sm hover:from-amber-400 hover:to-indigo-500 disabled:opacity-40 flex items-center gap-1 transition"
            >
              <Zap className="w-3.5 h-3.5 text-amber-200 fill-current" />
              <span>一键直达最优解</span>
            </button>

            {/* Reset Step */}
            <button
              onClick={() => {
                setIsPlaying(false);
                setSelectedVerifyCell(null);
                setStepIndex(0);
              }}
              disabled={stepIndex === 0 && !isPlaying}
              className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-30 text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置</span>
            </button>

            {/* Speed Control */}
            <div className="flex items-center gap-1 bg-slate-200/80 px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-slate-600">
              <span>速度:</span>
              {[2000, 1500, 800].map((sp) => (
                <button
                  key={`sp-btn-${sp}`}
                  onClick={() => setSpeed(sp)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    speed === sp ? 'bg-amber-500 text-slate-950 font-extrabold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sp === 2000 ? '慢' : sp === 1500 ? '中' : '快'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Vogel Multi-Step Iteration Tip Banner */}
        {initialMethod === 'vogel' && steps.length <= 2 && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>演示提示：</strong> 当前使用伏格尔法生成的初始分配已极其接近或直接达成最优解 (仅需 {steps.length - 1} 步)。若需观摩完整的 <strong>4 轮闭回路绘制、偶/奇点 (+θ / -θ) 标注与运量重配</strong> 演进过程，建议一键切换初始方法：
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setInitialMethod('northwest')}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-lg shadow transition flex items-center gap-1"
              >
                <span>切换至【西北角法】 (4 轮换基演示)</span>
              </button>
              <button
                onClick={() => setInitialMethod('leastCost')}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] rounded-lg transition"
              >
                <span>切换至【最小元素法】</span>
              </button>
            </div>
          </div>
        )}

        {/* 4-Step Iteration Summary Banner */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-white space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-bold">
            <span className="text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              当前 Step {stepIndex + 1} 完整演算步骤推导:
            </span>
            <span className="text-[11px] font-mono text-slate-300">
              当前调运总成本 Z = <span className="text-amber-300 font-extrabold">¥{currentCost}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Step 1: Potentials */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-indigo-500/30 font-sans">
              <span className="font-bold text-indigo-300 block mb-0.5">① 位势求解 (u<sub>i</sub>, v<sub>j</sub>)</span>
              <p className="text-[11px] text-slate-400 leading-tight">
                令 u<sub>1</sub> = 0，据基变量格 u<sub>i</sub> + v<sub>j</sub> = c<sub>ij</sub> 得：
              </p>
              <p className="text-[10px] font-mono text-indigo-200 mt-1">
                u=[{currentStep.uPotentials?.join(',')}] | v=[{currentStep.vPotentials?.join(',')}]
              </p>
            </div>

            {/* Step 2: Reduced Costs */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-cyan-500/30 font-sans">
              <span className="font-bold text-cyan-300 block mb-0.5">② 算空格检验数 Δ<sub>ij</sub></span>
              <p className="text-[11px] text-slate-400 leading-tight">
                对所有非基格计算 Δ<sub>ij</sub> = c<sub>ij</sub> - (u<sub>i</sub> + v<sub>j</sub>)：
              </p>
              <p className="text-[10px] font-mono mt-1 font-bold">
                {hasNegativeSigma ? (
                  <span className="text-rose-400">
                    最小负检验数 = {minNegativeSigmaItem?.sigma} ({minNegativeSigmaItem?.originName}→{minNegativeSigmaItem?.destName})
                  </span>
                ) : (
                  <span className="text-emerald-400">✓ 所有 Δ<sub>ij</sub> ≥ 0 (达成全局最优)</span>
                )}
              </p>
            </div>

            {/* Step 3: Entering Variable */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-amber-500/30 font-sans">
              <span className="font-bold text-amber-300 block mb-0.5">③ 选最小负 Δ 换基</span>
              <p className="text-[11px] text-slate-400 leading-tight">
                {hasNegativeSigma
                  ? `选取负检验数最小的空格入基，构建闭回路。`
                  : `已无负检验数，无需换基！`}
              </p>
              {hasNegativeSigma && minNegativeSigmaItem && (
                <p className="text-[10px] font-mono text-amber-300 font-extrabold mt-1">
                  入基格: [{minNegativeSigmaItem.originName} → {minNegativeSigmaItem.destName}]
                </p>
              )}
            </div>

            {/* Step 4: Closed Loop Adjustment */}
            <div className="p-2.5 bg-slate-950 rounded-lg border border-emerald-500/30 font-sans">
              <span className="font-bold text-emerald-300 block mb-0.5">④ 闭回路调整 (偶点+θ / 奇点-θ)</span>
              <p className="text-[11px] text-slate-400 leading-tight">
                {hasNegativeSigma
                  ? `偶点加 θ，奇点减 θ，极限调整量 θ = min{奇点运量}`
                  : `方案已收敛，无运量重配需求。`}
              </p>
              {hasNegativeSigma && activeLoopInfo && (
                <p className="text-[10px] font-mono text-emerald-300 font-extrabold mt-1">
                  θ = {activeLoopInfo.theta} 吨 | 预估降本: -¥{activeLoopInfo.potentialSavings}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Legend bar explaining Even/Odd Closed Loop Node Colors */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-sans">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-extrabold text-slate-700 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              闭回路顶点标注图例:
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              偶点 (正顶点 +θ 增运量)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
              奇点 (负顶点 -θ 减运量)
            </span>
          </div>

          {negativeCandidateRoutes.length > 0 && (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-slate-600 font-bold font-sans">负检验数比对:</span>
              {negativeCandidateRoutes.map((route) => {
                const isSelected =
                  selectedVerifyCell?.row === route.row && selectedVerifyCell?.col === route.col;

                return (
                  <button
                    key={`matrix-neg-route-${route.row}-${route.col}`}
                    onClick={() => setSelectedVerifyCell({ row: route.row, col: route.col })}
                    className={`px-2 py-0.5 rounded font-bold border transition ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    [{route.originName}→{route.destName}] Δ={route.sigma}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* DOM Table Matrix Wrapper with Exact SVG Closed Loop Overlay */}
        <div ref={tableContainerRef} className="relative overflow-x-auto rounded-xl border border-slate-300 shadow-inner">
          {/* SVG Overlay for Vector Closed Loop Path & Direction Arrows */}
          {displayLoop && displayLoop.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
              <defs>
                <linearGradient id="loopLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
                </linearGradient>

                <radialGradient id="plusVertexGrad">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </radialGradient>

                <radialGradient id="minusVertexGrad">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#be123c" />
                </radialGradient>

                <filter id="svgGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Arrowhead markers for loop directional flow - refined & sleek size */}
                <marker
                  id="loopArrowGreen"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 L 2 5 z" fill="#10b981" />
                </marker>

                <marker
                  id="loopArrowRose"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 L 2 5 z" fill="#f43f5e" />
                </marker>
              </defs>

              {/* Base closed loop path */}
              <path
                d={svgPathD}
                fill="none"
                stroke="url(#loopLineGrad)"
                strokeWidth="5"
                opacity="0.18"
                filter="url(#svgGlow)"
              />

              {/* Directed Segment Lines with Arrow Markers & Midpoint Badges */}
              {loopSegments.map((seg, idx) => (
                <g key={`loop-directed-segment-${idx}`}>
                  {/* Glowing background line */}
                  <line
                    x1={seg.startX}
                    y1={seg.startY}
                    x2={seg.endX}
                    y2={seg.endY}
                    stroke="#f59e0b"
                    strokeWidth="3"
                    opacity="0.25"
                    filter="url(#svgGlow)"
                  />
                  {/* Directed dashed line with arrow marker */}
                  <line
                    x1={seg.startX}
                    y1={seg.startY}
                    x2={seg.endX}
                    y2={seg.endY}
                    stroke={seg.fromSign === '+' ? '#10b981' : '#f43f5e'}
                    strokeWidth="1.8"
                    strokeDasharray="4,3"
                    className="animate-dash-line"
                    markerEnd={seg.fromSign === '+' ? 'url(#loopArrowGreen)' : 'url(#loopArrowRose)'}
                  />
                  {/* Segment Direction Badge with Arrow & Flow Tag */}
                  <g transform={`translate(${seg.midX + seg.nx * 12}, ${seg.midY + seg.ny * 12})`}>
                    <rect
                      x="-26"
                      y="-9"
                      width="52"
                      height="18"
                      rx="5"
                      fill="#020617"
                      stroke={seg.fromSign === '+' ? '#10b981' : '#f43f5e'}
                      strokeWidth="1"
                      opacity="0.95"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {seg.fromSign === '+' ? '➔ 偶点+θ' : '➔ 奇点-θ'}
                    </text>
                  </g>
                </g>
              ))}

              <path
                d={svgPathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4,3"
                className="animate-dash-line"
                opacity="0.7"
              />

              {/* Loop Node Corners with Glowing Pulse Rings */}
              {loopNodeCoords.map((pt) => {
                const isEvenNode = pt.sign === '+';
                const isSelected =
                  currentStep.enteringCell?.row === pt.row &&
                  currentStep.enteringCell?.col === pt.col;

                return (
                  <g key={`loop-node-svg-${pt.index}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? '18' : '14'}
                      fill={isEvenNode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}
                      stroke={isEvenNode ? '#10b981' : '#f43f5e'}
                      strokeWidth="1.2"
                    >
                      <animate
                        attributeName="r"
                        values={isSelected ? '16;22;16' : '12;17;12'}
                        dur="1.8s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? '12' : '10'}
                      fill={isEvenNode ? 'url(#plusVertexGrad)' : 'url(#minusVertexGrad)'}
                      stroke="#ffffff"
                      strokeWidth="1.8"
                      filter="url(#svgGlow)"
                    />

                    <text
                      x={pt.x}
                      y={pt.y + 3.5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="900"
                      fontFamily="sans-serif"
                      pointerEvents="none"
                    >
                      {isEvenNode ? '偶' : '奇'}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          <table className="w-full border-collapse bg-white text-xs font-mono">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <th className="p-3 border-r border-slate-300 text-center font-extrabold w-32">
                  产地 \ 销地
                </th>
                {balanced.destinations.map((d, j) => (
                  <th key={`dest-head-${j}`} className="p-3 border-r border-slate-300 text-center font-extrabold">
                    <span className="block text-slate-900 font-sans">{d.name}</span>
                    <span className="text-[10px] text-indigo-600 block mt-0.5">需求 b<sub>{j + 1}</sub> = {d.demand}</span>
                  </th>
                ))}
                <th className="p-3 border-r border-slate-300 text-center font-extrabold bg-slate-200 text-slate-800 w-28">
                  供应量 a<sub>i</sub>
                </th>
                <th className="p-3 text-center font-extrabold bg-indigo-100 text-indigo-900 w-28">
                  行位势 u<sub>i</sub>
                </th>
              </tr>
            </thead>
            <tbody>
              {balanced.origins.map((o, i) => {
                const uPotential = currentStep.uPotentials?.[i];

                return (
                  <tr key={`origin-row-${i}`} className="border-b border-slate-300 hover:bg-slate-50">
                    <td className="p-3 border-r border-slate-300 font-extrabold text-slate-800 bg-slate-50 font-sans">
                      <div>{o.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">产量: {o.supply}</div>
                    </td>

                    {balanced.destinations.map((d, j) => {
                      const cost = balanced.costMatrix[i][j];
                      const alloc = currentStep.allocation[i]?.[j] || 0;
                      const reducedCost = currentStep.reducedCosts?.[i]?.[j];
                      const isBasicCell = alloc > 0;

                      const prevStep = stepIndex > 0 ? steps[stepIndex - 1] : null;
                      const prevAlloc = prevStep ? prevStep.allocation[i]?.[j] || 0 : alloc;
                      const isAllocChanged = stepIndex > 0 && prevAlloc !== alloc;

                      const isEntering =
                        currentStep.enteringCell?.row === i &&
                        currentStep.enteringCell?.col === j;

                      const isLeaving =
                        currentStep.leavingCell?.row === i &&
                        currentStep.leavingCell?.col === j;

                      const isLoopNode = displayLoop?.some((node) => node.row === i && node.col === j);
                      const loopNode = displayLoop?.find((node) => node.row === i && node.col === j);

                      const isSelectedForVerify =
                        selectedVerifyCell?.row === i && selectedVerifyCell?.col === j;

                      let cellAnimClass = '';
                      if (isLoopNode && loopNode) {
                        cellAnimClass =
                          loopNode.sign === '+'
                            ? 'bg-emerald-100/90 border-2 border-emerald-600 ring-2 ring-emerald-400 shadow-md font-extrabold'
                            : 'bg-rose-100/90 border-2 border-rose-600 ring-2 ring-rose-400 shadow-md font-extrabold';
                      } else if (isSelectedForVerify) {
                        cellAnimClass = 'ring-2 ring-amber-400 bg-amber-100/90 border-2 border-amber-500 z-20 shadow-md';
                      } else if (isEntering) {
                        cellAnimClass = 'animate-enter-glow bg-amber-200 border-2 border-amber-600';
                      } else if (isLeaving) {
                        cellAnimClass = 'bg-rose-100/80 border-2 border-rose-500 shadow-2xs';
                      } else if (reducedCost !== undefined && reducedCost !== null && reducedCost < 0) {
                        cellAnimClass = 'bg-rose-50 hover:bg-rose-100 border-2 border-rose-400 cursor-pointer shadow-2xs';
                      } else if (isBasicCell) {
                        cellAnimClass = 'bg-emerald-50/80';
                      } else {
                        cellAnimClass = 'hover:bg-slate-100/90 cursor-pointer';
                      }

                      return (
                        <td
                          key={`tableau-cell-${i}-${j}`}
                          ref={(el) => {
                            cellRefs.current[`${i}_${j}`] = el;
                          }}
                          onClick={() => {
                            if (!isBasicCell && cost < BIG_M) {
                              if (selectedVerifyCell?.row === i && selectedVerifyCell?.col === j) {
                                setSelectedVerifyCell(null);
                              } else {
                                setSelectedVerifyCell({ row: i, col: j });
                              }
                            }
                          }}
                          title={
                            !isBasicCell
                              ? `点击非基变量单元格 [${o.name} → ${d.name}] 绘制闭回路与(+/-)方向`
                              : undefined
                          }
                          className={`p-2 border-r border-slate-300 text-center relative transition ${cellAnimClass}`}
                        >
                          <div className="flex flex-col justify-between h-16">
                            {/* Top right unit cost c_ij & Role Tags */}
                            <div className="flex justify-between items-center gap-1">
                              {/* Closed Loop Node Indicator Tag (偶点 / 奇点) */}
                              {isLoopNode && loopNode ? (
                                <span className={`text-[9px] font-extrabold font-sans px-1.5 py-0.5 rounded text-white shadow flex items-center gap-0.5 ${
                                  loopNode.sign === '+' ? 'bg-emerald-600 ring-1 ring-emerald-300' : 'bg-rose-600 ring-1 ring-rose-300'
                                }`}>
                                  <span className="font-mono text-[10px] font-black">{loopNode.sign === '+' ? '(+)' : '(-)'}</span>
                                  <span>{loopNode.sign === '+' ? '偶点' : '奇点'}</span>
                                </span>
                              ) : isEntering ? (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded shadow ring-1 ring-amber-300 animate-pulse">
                                  ★ 入基
                                </span>
                              ) : isLeaving ? (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-600 text-white rounded shadow ring-1 ring-rose-300 animate-pulse">
                                  ✖ 出基
                                </span>
                              ) : <span />}

                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200/80 border border-slate-300 text-slate-700 rounded shrink-0">
                                {cost >= BIG_M ? 'M' : `¥${cost}`}
                              </span>
                            </div>

                            {/* Center Allocation x_ij or Reduced Cost sigma_ij */}
                            <div className="my-auto flex flex-col items-center justify-center gap-0.5">
                              {isBasicCell ? (
                                <>
                                  <div className="inline-block px-2 py-1 bg-emerald-600 text-white font-extrabold text-sm rounded-lg shadow-2xs">
                                    x = {alloc}
                                  </div>
                                  {isAllocChanged && (
                                    <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 animate-bounce shadow">
                                      {prevAlloc} ➔ {alloc} ({alloc > prevAlloc ? `+${alloc - prevAlloc}` : `-${prevAlloc - alloc}`})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div
                                    className={`text-xs font-mono font-extrabold inline-block px-1.5 py-0.5 rounded transition ${
                                      reducedCost !== undefined &&
                                      reducedCost !== null &&
                                      reducedCost < 0
                                        ? 'text-rose-950 font-extrabold bg-rose-200 border border-rose-500 shadow-2xs animate-pulse'
                                        : isSelectedForVerify
                                        ? 'text-amber-950 bg-amber-200 border border-amber-500'
                                        : 'text-slate-800 bg-slate-100 border border-slate-300'
                                    }`}
                                  >
                                    Δ = {reducedCost ?? (cost - ((uPotential ?? 0) + (currentStep.vPotentials?.[j] ?? 0)))}
                                  </div>
                                  {isAllocChanged && (
                                    <span className="text-[9px] font-mono font-extrabold px-1 py-0.2 rounded bg-rose-200 text-rose-950 shadow">
                                      归零: {prevAlloc} ➔ 0
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    <td className="p-3 border-r border-slate-300 text-center font-extrabold bg-slate-100 text-slate-900">
                      {o.supply}
                    </td>

                    <td className="p-3 text-center font-extrabold bg-indigo-50/80 text-indigo-900">
                      u<sub>{i + 1}</sub> = {uPotential ?? 0}
                    </td>
                  </tr>
                );
              })}

              {/* Bottom Row: Demand & Column Potentials v_j */}
              <tr className="bg-slate-100 border-b border-slate-300 font-extrabold">
                <td className="p-3 border-r border-slate-300 text-center font-sans text-slate-800">
                  需求量 b<sub>j</sub>
                </td>
                {balanced.destinations.map((d, j) => (
                  <td key={`demand-val-${j}`} className="p-3 border-r border-slate-300 text-center text-slate-900">
                    {d.demand}
                  </td>
                ))}
                <td className="p-3 border-r border-slate-300 text-center bg-slate-200 text-slate-900">
                  ∑ = {balanced.origins.reduce((s, o) => s + o.supply, 0)}
                </td>
                <td className="p-3 text-center bg-slate-200 text-slate-500 text-[10px]">
                  表上作业法
                </td>
              </tr>

              <tr className="bg-indigo-100 text-indigo-950 font-extrabold">
                <td className="p-3 border-r border-slate-300 text-center font-sans text-indigo-900">
                  列位势 v<sub>j</sub>
                </td>
                {balanced.destinations.map((d, j) => {
                  const vPot = currentStep.vPotentials?.[j];
                  return (
                    <td key={`v-pot-${j}`} className="p-3 border-r border-slate-300 text-center text-indigo-900">
                      v<sub>{j + 1}</sub> = {vPot ?? 0}
                    </td>
                  );
                })}
                <td className="p-3 border-r border-slate-300 text-center bg-indigo-200 text-indigo-900 text-[10px]">
                  位势法解系统
                </td>
                <td className="p-3 text-center bg-indigo-200 text-indigo-900 text-[10px]">
                  u<sub>1</sub> = 0 设定
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模块：运输问题最优解表 (Optimal Solution Tableau Table)                      */}
      {/* 在表上表示出最后的最优解调运方案与最优检验数                                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border-2 border-emerald-500/80 shadow-xl overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-300 shadow-2xs">
              <Table className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  运输问题最优解表 (Transportation Problem Optimal Solution Tableau)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ✓ 最优调运方案已收敛
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                表上作业法最终最优调运矩阵。翠绿单元格为基变量最优调运量 <span className="font-mono font-bold text-emerald-700">x<sub>ij</sub><sup>*</sup></span>，空格展示非负最优检验数 <span className="font-mono font-bold text-slate-700">Δ<sub>ij</sub><sup>*</sup> ≥ 0</span>。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3.5 py-1.5 bg-slate-900 text-amber-300 font-extrabold text-xs font-mono rounded-xl border border-slate-700 shadow-sm flex items-center gap-1.5">
              <span>最优最低总运费 min Z =</span>
              <span className="text-sm font-black text-amber-400">¥{finalOptimalCost}</span>
            </span>
          </div>
        </div>

        {/* Optimal Tableau Matrix */}
        <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-inner">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800 text-white font-extrabold">
                <th className="p-3 border-r border-slate-700 text-center font-sans w-36">
                  产地 (Origins) \ 销区 (Destinations)
                </th>
                {balanced.destinations.map((d, j) => (
                  <th key={`opt-table-dest-head-${j}`} className="p-3 border-r border-slate-700 text-center font-extrabold">
                    <span className="block text-slate-100 font-sans">{d.name}</span>
                    <span className="text-[10px] text-indigo-300 block mt-0.5">需求量 b<sub>{j + 1}</sub> = {d.demand}</span>
                  </th>
                ))}
                <th className="p-3 border-r border-slate-700 text-center font-extrabold bg-slate-900 text-slate-200 w-28">
                  供应量 a<sub>i</sub>
                </th>
                <th className="p-3 text-center font-extrabold bg-indigo-950 text-indigo-200 w-28">
                  最优行位势 u<sub>i</sub><sup>*</sup>
                </th>
              </tr>
            </thead>
            <tbody>
              {balanced.origins.map((o, i) => {
                const uPot = finalOptimalStep.uPotentials?.[i] ?? 0;
                const rowAllocTotal = finalOptimalStep.allocation[i]?.reduce((sum, val) => sum + val, 0) || 0;

                return (
                  <tr key={`opt-table-origin-row-${i}`} className="border-b border-slate-300 hover:bg-slate-50/80 transition">
                    <td className="p-3 border-r border-slate-300 font-extrabold text-slate-800 bg-slate-50 font-sans">
                      <div>{o.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">产量: {o.supply} 吨</div>
                    </td>

                    {balanced.destinations.map((d, j) => {
                      const cost = balanced.costMatrix[i][j];
                      const optAlloc = finalOptimalStep.allocation[i]?.[j] || 0;
                      const optReducedCost = finalOptimalStep.reducedCosts?.[i]?.[j] ?? (cost - (uPot + (finalOptimalStep.vPotentials?.[j] ?? 0)));
                      const isBasicCell = optAlloc > 0;

                      return (
                        <td
                          key={`opt-tableau-cell-${i}-${j}`}
                          className={`p-2.5 border-r border-slate-300 text-center relative transition ${
                            isBasicCell
                              ? 'bg-emerald-50/90 border-2 border-emerald-500/80 shadow-2xs'
                              : 'bg-slate-50/60 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex flex-col justify-between h-16">
                            {/* Top row: Unit cost c_ij and Basic Tag */}
                            <div className="flex justify-between items-center gap-1">
                              {isBasicCell ? (
                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-600 text-white rounded shadow-2xs flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>最优基变量</span>
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-400 font-mono">
                                  空格
                                </span>
                              )}

                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200/90 border border-slate-300 text-slate-700 rounded shrink-0">
                                {cost >= BIG_M ? 'M' : `¥${cost}`}
                              </span>
                            </div>

                            {/* Center: Optimal allocation or non-negative reduced cost */}
                            <div className="my-auto flex flex-col items-center justify-center gap-0.5">
                              {isBasicCell ? (
                                <>
                                  <div className="inline-block px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-sm rounded-lg shadow-sm">
                                    x<sub>{i + 1}{j + 1}</sub><sup>*</sup> = {optAlloc} 吨
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-emerald-800">
                                    运费: ¥{optAlloc * (cost >= BIG_M ? 0 : cost)}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="text-xs font-mono font-extrabold inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700">
                                    Δ<sub>{i + 1}{j + 1}</sub><sup>*</sup> = {optReducedCost} ≥ 0
                                  </div>
                                  <span className="text-[9px] font-medium text-slate-400">
                                    （未分配运量）
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    {/* Supply summary */}
                    <td className="p-3 border-r border-slate-300 text-center font-extrabold bg-slate-100 text-slate-900 font-mono">
                      <div className="text-xs">{rowAllocTotal} / {o.supply} 吨</div>
                      {rowAllocTotal === o.supply && (
                        <div className="text-[9px] text-emerald-600 font-sans font-bold mt-0.5">✓ 产量供尽</div>
                      )}
                    </td>

                    {/* Row Potential u_i */}
                    <td className="p-3 text-center font-extrabold bg-indigo-50 text-indigo-900 font-mono">
                      u<sub>{i + 1}</sub><sup>*</sup> = {uPot}
                    </td>
                  </tr>
                );
              })}

              {/* Bottom Row: Demand & Column Potentials */}
              <tr className="bg-slate-100 border-b border-slate-300 font-extrabold">
                <td className="p-3 border-r border-slate-300 text-center font-sans text-slate-800">
                  需求量 b<sub>j</sub>
                </td>
                {balanced.destinations.map((d, j) => {
                  const colAllocTotal = finalOptimalStep.allocation.reduce((sum, row) => sum + (row[j] || 0), 0);
                  return (
                    <td key={`opt-demand-val-${j}`} className="p-3 border-r border-slate-300 text-center text-slate-900 font-mono">
                      <div className="text-xs">{colAllocTotal} / {d.demand} 吨</div>
                      {colAllocTotal === d.demand && (
                        <div className="text-[9px] text-emerald-600 font-sans font-bold mt-0.5">✓ 需求满足</div>
                      )}
                    </td>
                  );
                })}
                <td className="p-3 border-r border-slate-300 text-center bg-slate-200 text-slate-900 font-mono text-xs">
                  ∑ = {balanced.origins.reduce((s, o) => s + o.supply, 0)} 吨
                </td>
                <td className="p-3 text-center bg-slate-200 text-emerald-700 font-sans font-extrabold text-[11px]">
                  产销完全平衡
                </td>
              </tr>

              <tr className="bg-indigo-100 text-indigo-950 font-extrabold">
                <td className="p-3 border-r border-slate-300 text-center font-sans text-indigo-900">
                  最优列位势 v<sub>j</sub><sup>*</sup>
                </td>
                {balanced.destinations.map((d, j) => {
                  const vPot = finalOptimalStep.vPotentials?.[j] ?? 0;
                  return (
                    <td key={`opt-v-pot-${j}`} className="p-3 border-r border-slate-300 text-center text-indigo-900 font-mono">
                      v<sub>{j + 1}</sub><sup>*</sup> = {vPot}
                    </td>
                  );
                })}
                <td className="p-3 border-r border-slate-300 text-center bg-indigo-200 text-indigo-900 text-[10px]">
                  MODI 最优位势系统
                </td>
                <td className="p-3 text-center bg-indigo-200 text-indigo-900 text-[10px] font-mono">
                  u<sub>1</sub><sup>*</sup> = 0
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模块 3：表上作业法最优解输出模块 (Optimal Solution Result Output Module)    */}
      {/* 当所有检验数非负 (Δ_ij ≥ 0) 时输出最优解                                */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border-2 border-emerald-500/60 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-900/60">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/40 shadow-inner">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-100">
                  表上作业法最优解输出模块 (Transportation Simplex Optimal Solution Output)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {currentStep.isOptimal ? '✓ 已达成全局最优解' : `迭代演进中 (Step ${stepIndex + 1}/${steps.length})`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {currentStep.isOptimal
                  ? '经过位势法与闭回路迭代演进，所有非基变量检验数均满足 Δ_ij ≥ 0，证明已达成最低运费最优调运方案。'
                  : '当所有的检验数非负时即输出最优解。若有负检验数，已自动选取负检验数最小者进行换基迭代。'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setIsPlaying(false);
                setStepIndex(steps.length - 1);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>载入最优步矩阵</span>
            </button>
          </div>
        </div>

        {/* Core Financial & Optimization Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/40 flex items-center justify-between shadow-md">
            <div>
              <span className="text-slate-400 text-[11px] font-medium block">最优化最低总运费 Z<sub>opt</sub></span>
              <span className="text-amber-300 text-xl font-extrabold font-mono">¥{finalOptimalCost}</span>
            </div>
            <DollarSign className="w-6 h-6 text-amber-400 opacity-80" />
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-md">
            <div>
              <span className="text-slate-400 text-[11px] font-medium block">初始可行方案运费 Z₀</span>
              <span className="text-slate-200 text-xl font-extrabold font-mono">¥{initialCost}</span>
            </div>
            <Scale className="w-6 h-6 text-indigo-400 opacity-80" />
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/40 flex items-center justify-between shadow-md">
            <div>
              <span className="text-slate-400 text-[11px] font-medium block">累计优化降本金额 ΔZ</span>
              <span className="text-emerald-400 text-xl font-extrabold font-mono">
                -¥{Math.max(0, initialCost - finalOptimalCost)}
              </span>
            </div>
            <TrendingDown className="w-6 h-6 text-emerald-400 opacity-80" />
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between shadow-md">
            <div>
              <span className="text-slate-400 text-[11px] font-medium block">优化降本幅度 (%)</span>
              <span className="text-cyan-300 text-xl font-extrabold font-mono">
                {initialCost > 0 ? ((Math.max(0, initialCost - finalOptimalCost) / initialCost) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <PackageCheck className="w-6 h-6 text-cyan-400 opacity-80" />
          </div>
        </div>

        {/* Optimal Shipping Route Allocation Breakdown Table */}
        <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-1.5 text-amber-300">
              <List className="w-4 h-4 text-amber-400" /> 最优调运干线与运量分配明细 (Optimal Allocation Breakdown):
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              生效调运干线数: {optimalRoutesList.length} 条
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <th className="p-2.5 font-bold">序号</th>
                  <th className="p-2.5 font-bold">发货地 (Origin)</th>
                  <th className="p-2.5 font-bold">销区 (Destination)</th>
                  <th className="p-2.5 font-bold text-center">最优运量 x<sub>ij</sub> (吨)</th>
                  <th className="p-2.5 font-bold text-center">单位运价 c<sub>ij</sub></th>
                  <th className="p-2.5 font-bold text-right">线路运费小计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {optimalRoutesList.map((route, idx) => (
                  <tr key={`opt-route-${idx}`} className="hover:bg-slate-900/60 transition">
                    <td className="p-2.5 text-slate-500 font-bold">{idx + 1}</td>
                    <td className="p-2.5 font-sans font-extrabold text-slate-200">{route.originName}</td>
                    <td className="p-2.5 font-sans font-extrabold text-indigo-300">{route.destName}</td>
                    <td className="p-2.5 text-center font-extrabold text-emerald-400 font-mono">
                      <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 rounded">
                        {route.quantity} 吨
                      </span>
                    </td>
                    <td className="p-2.5 text-center text-slate-300 font-mono">¥{route.unitCost}</td>
                    <td className="p-2.5 text-right font-extrabold text-amber-300 font-mono">
                      ¥{route.totalCost}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900/90 font-extrabold text-slate-200 border-t-2 border-slate-800">
                  <td colSpan={3} className="p-2.5 font-sans text-right text-slate-400">
                    调运总量与运费总额汇总:
                  </td>
                  <td className="p-2.5 text-center text-emerald-300">
                    {optimalRoutesList.reduce((s, r) => s + r.quantity, 0)} 吨
                  </td>
                  <td className="p-2.5 text-center text-slate-500">-</td>
                  <td className="p-2.5 text-right text-amber-300 font-mono text-sm">
                    ¥{finalOptimalCost}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Optimality Verification & Potentials Summary */}
        <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-extrabold text-emerald-300 block">
                定理验证结论: ∀ Δ<sub>ij</sub> = c<sub>ij</sub> - (u<sub>i</sub> + v<sub>j</sub>) ≥ 0 判定成立！
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                所有空格检验数均非负，证明任何非基变量入基均会导致总成本增加或保持不变，该调运方案确为全局最优解。
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-300">
            <span className="p-2 bg-slate-900 rounded border border-slate-800">
              最终行位势 u: [{finalOptimalStep.uPotentials?.join(', ')}]
            </span>
            <span className="p-2 bg-slate-900 rounded border border-slate-800">
              最终列位势 v: [{finalOptimalStep.vPotentials?.join(', ')}]
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
