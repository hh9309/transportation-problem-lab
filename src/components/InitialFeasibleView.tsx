import React, { useState, useEffect } from 'react';
import { Origin, Destination, CostMatrix, InitialMethod, StepDetail } from '../types';
import {
  solveNorthwestCorner,
  solveLeastCost,
  solveVogel,
  calculateTotalCost,
  getBalancedMatrix,
  BIG_M,
} from '../utils/transportationAlgorithms';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, GitFork, Award, ArrowRight } from 'lucide-react';

interface InitialFeasibleViewProps {
  origins: Origin[];
  destinations: Destination[];
  costMatrix: CostMatrix;
}

export const InitialFeasibleView: React.FC<InitialFeasibleViewProps> = ({
  origins,
  destinations,
  costMatrix,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<InitialMethod>('vogel');
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000);

  // Compute balanced matrix
  const balanced = getBalancedMatrix(origins, destinations, costMatrix);

  // Solve for all 3 algorithms for side-by-side comparison
  const nwResult = solveNorthwestCorner(balanced.origins, balanced.destinations, balanced.costMatrix);
  const lcResult = solveLeastCost(balanced.origins, balanced.destinations, balanced.costMatrix);
  const vamResult = solveVogel(balanced.origins, balanced.destinations, balanced.costMatrix);

  const nwCost = calculateTotalCost(nwResult.allocation, balanced.costMatrix);
  const lcCost = calculateTotalCost(lcResult.allocation, balanced.costMatrix);
  const vamCost = calculateTotalCost(vamResult.allocation, balanced.costMatrix);

  // Get current active method results
  let currentResult = vamResult;
  if (selectedMethod === 'northwest') currentResult = nwResult;
  if (selectedMethod === 'leastCost') currentResult = lcResult;

  const currentSteps = currentResult.steps;
  const currentStep: StepDetail | undefined = currentSteps[stepIndex];

  // Auto playback effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        setStepIndex((prev) => {
          if (prev < currentSteps.length - 1) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, playbackSpeed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, currentSteps.length, playbackSpeed]);

  // Reset step index when method changes
  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
  }, [selectedMethod]);

  const bestCost = Math.min(nwCost, lcCost, vamCost);

  return (
    <div className="space-y-6">
      {/* Top Method Selector & Side-by-Side Comparison Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <GitFork className="w-5 h-5 text-indigo-400" />
              3. 初始基可行解构造算法对比 (Initial Basic Feasible Solution Methods)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              对比西北角法、最小元素法与伏格尔法（VAM）的分步填数逻辑与初始运费质量。
            </p>
          </div>

          {/* Method Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedMethod('northwest')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedMethod === 'northwest'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              西北角法 (Northwest)
            </button>
            <button
              onClick={() => setSelectedMethod('leastCost')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedMethod === 'leastCost'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              最小元素法 (Least Cost)
            </button>
            <button
              onClick={() => setSelectedMethod('vogel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedMethod === 'vogel'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              伏格尔法 (VAM)
            </button>
          </div>
        </div>

        {/* Algorithm Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Northwest Card */}
          <div
            onClick={() => setSelectedMethod('northwest')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              selectedMethod === 'northwest'
                ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/10'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">西北角法</span>
              {nwCost === bestCost && (
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Award className="w-3 h-3" /> 最佳初始
                </span>
              )}
            </div>
            <div className="text-xl font-mono font-bold text-slate-100">¥{nwCost}</div>
            <p className="text-[11px] text-slate-400 mt-2">
              按左上角（西北角）向右下角推移，不考虑运价高低，计算速度最快但成本通常最高。
            </p>
          </div>

          {/* Least Cost Card */}
          <div
            onClick={() => setSelectedMethod('leastCost')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              selectedMethod === 'leastCost'
                ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/10'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">最小元素法</span>
              {lcCost === bestCost && (
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Award className="w-3 h-3" /> 最佳初始
                </span>
              )}
            </div>
            <div className="text-xl font-mono font-bold text-slate-100">¥{lcCost}</div>
            <p className="text-[11px] text-slate-400 mt-2">
              优先分配单位运价最低的单元格，局部贪心搜索，运费优于西北角法。
            </p>
          </div>

          {/* Vogel Card */}
          <div
            onClick={() => setSelectedMethod('vogel')}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              selectedMethod === 'vogel'
                ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/10'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">伏格尔法 (VAM)</span>
              {vamCost === bestCost && (
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Award className="w-3 h-3" /> 最佳初始
                </span>
              )}
            </div>
            <div className="text-xl font-mono font-bold text-slate-100">¥{vamCost}</div>
            <p className="text-[11px] text-slate-400 mt-2">
              计算各行各列最小与次小运价差额（罚码），优先在最大罚值方向填数，极接近最优解。
            </p>
          </div>
        </div>
      </div>

      {/* Step Player Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              分步填数演示 ({selectedMethod === 'northwest' ? '西北角法' : selectedMethod === 'leastCost' ? '最小元素法' : '伏格尔法'})
            </h3>
            <p className="text-xs text-slate-500">
              步骤 {stepIndex + 1} / {currentSteps.length}
            </p>
          </div>

          {/* Player Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStepIndex(0);
                setIsPlaying(false);
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              title="重置步骤"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={stepIndex === 0}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? '暂停' : '自动播放'}</span>
            </button>
            <button
              onClick={() => setStepIndex((prev) => Math.min(currentSteps.length - 1, prev + 1))}
              disabled={stepIndex === currentSteps.length - 1}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-40 transition"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Explanation Banner */}
        {currentStep && (
          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 font-medium">
            <div className="font-bold text-indigo-900 mb-1 flex items-center gap-2">
              <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                Step {currentStep.stepNumber}
              </span>
              <span>{currentStep.description}</span>
            </div>
          </div>
        )}

        {/* Tableau View for Current Step */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-xs text-slate-900">
            <thead>
              <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-300">
                <th className="p-3 text-left font-extrabold text-slate-900 bg-slate-200 min-w-[120px] border-r border-slate-300">
                  产地 \ 销地
                </th>
                {balanced.destinations.map((d, j) => (
                  <th key={d.id} className="p-3 text-center font-extrabold border-r border-slate-300 min-w-[120px]">
                    <div className="text-sm font-extrabold text-slate-900">{d.name}</div>
                    {/* Display VAM Col Penalty if present */}
                    {selectedMethod === 'vogel' && currentStep?.penalties?.colPenalties?.[j] !== undefined && (
                      <div className="text-[11px] text-indigo-900 mt-0.5 font-mono font-extrabold bg-indigo-100 px-1 rounded">
                        列罚码: {currentStep.penalties.colPenalties[j] ?? '-'}
                      </div>
                    )}
                  </th>
                ))}
                <th className="p-3 text-center font-extrabold bg-indigo-100 text-indigo-950 min-w-[110px] border-r border-slate-300">
                  供应量 a<sub>i</sub>
                </th>
                {selectedMethod === 'vogel' && (
                  <th className="p-3 text-center font-extrabold bg-indigo-200 text-indigo-950 min-w-[100px]">
                    行罚码 (VAM)
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {balanced.origins.map((o, i) => (
                <tr key={o.id} className="border-b border-slate-300 hover:bg-slate-50/80 transition">
                  <td className="p-3 font-extrabold text-slate-900 bg-slate-100 border-r border-slate-300">
                    {o.name}
                  </td>

                  {balanced.destinations.map((d, j) => {
                    const cost = balanced.costMatrix[i][j];
                    const allocation = currentStep?.allocation[i]?.[j] || 0;
                    const isSelectedCell =
                      currentStep?.currentCell?.row === i && currentStep?.currentCell?.col === j;

                    return (
                      <td
                        key={`cell-${i}-${j}`}
                        className={`p-2 border-r border-slate-300 text-center relative transition ${
                          isSelectedCell
                            ? 'bg-amber-200 border-2 border-amber-600'
                            : allocation > 0
                            ? 'bg-emerald-50'
                            : ''
                        }`}
                      >
                        <div className="flex flex-col justify-between h-14">
                          <div className="text-[11px] font-mono font-bold text-slate-800 text-right">
                            <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                              c<sub>ij</sub>={cost >= BIG_M ? 'M' : cost}
                            </span>
                          </div>
                          <div
                            className={`text-sm font-mono font-extrabold inline-block my-auto px-1.5 py-0.5 rounded ${
                              allocation > 0
                                ? 'text-emerald-900 bg-emerald-100 border border-emerald-300'
                                : 'text-slate-500'
                            }`}
                          >
                            {allocation}
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  <td className="p-3 text-center font-mono font-extrabold bg-indigo-50 text-indigo-950 border-r border-slate-300">
                    {o.supply}
                  </td>

                  {selectedMethod === 'vogel' && (
                    <td className="p-3 text-center font-mono font-extrabold bg-indigo-100 text-indigo-950">
                      {currentStep?.penalties?.rowPenalties?.[i] ?? '-'}
                    </td>
                  )}
                </tr>
              ))}

              {/* Demand Row b_j */}
              <tr className="bg-indigo-50/90 border-b border-slate-300 font-bold">
                <td className="p-3 text-left font-extrabold text-indigo-950 bg-indigo-100 border-r border-slate-300">
                  需求量 b<sub>j</sub>
                </td>
                {balanced.destinations.map((d) => (
                  <td key={`demand-init-${d.id}`} className="p-3 text-center font-mono font-extrabold text-slate-950 border-r border-slate-300 bg-indigo-50/90">
                    {d.demand}
                  </td>
                ))}
                <td className="p-3 text-center font-mono font-extrabold text-indigo-950 bg-indigo-100 border-r border-slate-300">
                  ∑a<sub>i</sub> = ∑b<sub>j</sub> ({balanced.origins.reduce((sum, o) => sum + o.supply, 0)})
                </td>
                {selectedMethod === 'vogel' && (
                  <td className="p-3 text-center font-mono text-slate-400 bg-indigo-100">
                    —
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
