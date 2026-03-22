import React from 'react';
import { List } from 'lucide-react';
import clsx from 'clsx';
import { LogEntry } from '../types';

interface HistoryModuleProps {
  history: LogEntry[];
}

const HistoryModule: React.FC<HistoryModuleProps> = ({ history }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-[0.4] overflow-hidden flex flex-col min-h-[250px]">
      <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
          <List className="w-3.5 h-3.5" /> 记录
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar relative">
        <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-slate-100"></div>
        {history.length === 0 && <div className="text-center text-slate-400 text-xs py-6 relative z-10">暂无记录</div>}
        {history.map((log) => (
          <div key={log.id} className="relative pl-7 z-10">
            <div className={clsx("absolute left-[1px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white", log.type === 'success' ? "border-green-500" : log.type === 'warning' ? "border-orange-500" : "border-indigo-400")}></div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-1 rounded">#{log.iteration}</span>
                <span className="text-[10px] font-bold text-slate-500">{log.phase}</span>
              </div>
              <div className="text-xs font-medium text-slate-700 leading-tight">{log.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryModule;
