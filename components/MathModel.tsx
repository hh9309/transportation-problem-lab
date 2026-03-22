import React from 'react';
import { FileText } from 'lucide-react';
import { ProblemState } from '../types';

interface MathModelProps {
  problem: ProblemState;
}

const MathModel: React.FC<MathModelProps> = ({ problem }) => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4" /> 数学模型
      </h2>
      <div className="space-y-4 font-mono text-xs">
        <div>
          <div className="text-indigo-600 font-bold mb-1">目标函数 (Min Z):</div>
          <div className="bg-slate-50 p-2 rounded border border-slate-100 break-all">
            Z = {problem.costs.map((row, i) => 
              row.map((cost, j) => `${cost}x${i+1}${j+1}`).join(' + ')
            ).join(' + ')}
          </div>
        </div>
        <div>
          <div className="text-indigo-600 font-bold mb-1">约束条件:</div>
          <div className="space-y-2">
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <div className="text-[10px] text-slate-400 mb-1">产量约束 (Supply):</div>
              {problem.supply.map((s, i) => (
                <div key={i}>Σ x{i+1}j = {s} (j=1..{problem.colCount})</div>
              ))}
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <div className="text-[10px] text-slate-400 mb-1">销量约束 (Demand):</div>
              {problem.demand.map((d, j) => (
                <div key={j}>Σ xi{j+1} = {d} (i=1..{problem.rowCount})</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathModel;
