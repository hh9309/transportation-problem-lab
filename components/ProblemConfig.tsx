import React from 'react';
import { List, Minus, Plus, Calculator, Play, ArrowRight, Zap, FastForward, RotateCcw, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { SolverState } from '../types';

interface ProblemConfigProps {
  problem: any;
  config: { rows: number; cols: number };
  setConfig: React.Dispatch<React.SetStateAction<{ rows: number; cols: number }>>;
  handleGenerate: () => void;
  solver: SolverState;
  isBalanced: boolean;
  totalSupply: number;
  totalDemand: number;
  handleStart: () => void;
  handleNextStep: () => void;
  handleNextIteration: () => void;
  handleAutoSolve: () => void;
  isAutoSolving: boolean;
  setIsAutoSolving: (val: boolean) => void;
  setProblem: (val: any) => void;
  isProcessing: boolean;
}

const ProblemConfig: React.FC<ProblemConfigProps> = ({
  problem,
  config,
  setConfig,
  handleGenerate,
  solver,
  isBalanced,
  totalSupply,
  totalDemand,
  handleStart,
  handleNextStep,
  handleNextIteration,
  handleAutoSolve,
  isAutoSolving,
  setIsAutoSolving,
  setProblem,
  isProcessing
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <List className="w-4 h-4" /> 问题配置
      </h2>
      {!problem ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">产地数 (Rows)</label>
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setConfig(p => ({...p, rows: Math.max(2, p.rows-1)}))} 
                  className="p-2 hover:bg-white rounded"
                >
                  <Minus className="w-3 h-3"/>
                </button>
                <span className="flex-1 text-center font-mono font-bold">{config.rows}</span>
                <button 
                  onClick={() => setConfig(p => ({...p, rows: Math.min(6, p.rows+1)}))} 
                  className="p-2 hover:bg-white rounded"
                >
                  <Plus className="w-3 h-3"/>
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">销地数 (Cols)</label>
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setConfig(p => ({...p, cols: Math.max(2, p.cols-1)}))} 
                  className="p-2 hover:bg-white rounded"
                >
                  <Minus className="w-3 h-3"/>
                </button>
                <span className="flex-1 text-center font-mono font-bold">{config.cols}</span>
                <button 
                  onClick={() => setConfig(p => ({...p, cols: Math.min(6, p.cols+1)}))} 
                  className="p-2 hover:bg-white rounded"
                >
                  <Plus className="w-3 h-3"/>
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={handleGenerate} 
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
          >
            <Calculator className="w-4 h-4" /> 生成随机问题
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-end border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">当前总运费</div>
              <div className="text-2xl font-mono font-bold text-indigo-600">¥ {solver.totalCost}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-1">迭代轮次</div>
              <div className="text-lg font-mono font-bold text-slate-700">{solver.iteration}</div>
            </div>
          </div>
          
          {solver.status === 'input' && !isBalanced && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>运输不平衡！</strong><br/>
                当前总产量 ({totalSupply}) ≠ 总销量 ({totalDemand})。请修改数据使两者相等。
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {solver.status === 'input' ? (
              <button 
                onClick={handleStart} 
                disabled={!isBalanced}
                className={clsx(
                  "w-full py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                  isBalanced ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100" : "bg-slate-300 cursor-not-allowed"
                )}
              >
                <Play className="w-5 h-5 fill-current" /> 开始求解
              </button>
            ) : (
              <>
                {solver.status !== 'optimal' && !isAutoSolving && (
                  <>
                    <button 
                      onClick={handleNextStep} 
                      disabled={isProcessing}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ArrowRight className="w-5 h-5" /> 下一步 (Step)
                    </button>
                    {solver.status === 'ready' && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button 
                          onClick={handleNextIteration} 
                          disabled={isProcessing}
                          className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Zap className="w-3 h-3" /> 下一轮
                        </button>
                        <button 
                          onClick={handleAutoSolve} 
                          disabled={isProcessing}
                          className="py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <FastForward className="w-3 h-3" /> 自动
                        </button>
                      </div>
                    )}
                  </>
                )}
                {isAutoSolving && (
                  <button 
                    onClick={() => setIsAutoSolving(false)} 
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 animate-pulse"
                  >
                    <Minus className="w-4 h-4" /> 停止
                  </button>
                )}
                {!isAutoSolving && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button 
                      onClick={handleGenerate} 
                      className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
                    >
                      <Calculator className="w-3 h-3" /> 重新生成
                    </button>
                    <button 
                      onClick={() => setProblem(null)} 
                      className="py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
                    >
                      <RotateCcw className="w-3 h-3" /> 重置
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemConfig;
