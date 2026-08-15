import React from 'react';
import { 
  Calculator, 
  Grid3X3, 
  GitFork, 
  Table, 
  Layers, 
  BookOpen, 
  Terminal, 
  Sparkles,
  GraduationCap,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export type TabType = 
  | 'model' 
  | 'sandbox' 
  | 'initial' 
  | 'tableau' 
  | 'cases' 
  | 'code_engine' 
  | 'ai_insight' 
  | 'knowledge' 
  | 'export';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isBalanced: boolean;
  totalSupply: number;
  totalDemand: number;
  onBalanceMatrix: () => void;
  onOpenCaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isBalanced,
  totalSupply,
  totalDemand,
  onBalanceMatrix,
  onOpenCaseModal,
}) => {
  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'model', label: '1. 运筹模型', icon: Calculator },
    { id: 'sandbox', label: '2. 交互运价表', icon: Grid3X3 },
    { id: 'initial', label: '3. 初始可行解', icon: GitFork },
    { id: 'tableau', label: '4. 表上作业法', icon: Table },
    { id: 'cases', label: '5. 经典案例', icon: BookOpen },
    { id: 'code_engine', label: '6. 代码引擎', icon: Terminal },
    { id: 'ai_insight', label: '7. AI洞察', icon: Sparkles },
    { id: 'knowledge', label: '8. 知识导引', icon: GraduationCap },
    { id: 'export', label: '9. 方案导出', icon: FileCheck2 },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-600/30">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-100">
                  运输问题与表上作业法实验室
                </h1>
                <span className="bg-indigo-500/20 text-indigo-300 text-[11px] px-2 py-0.5 rounded-full font-mono border border-indigo-500/30">
                  OR Lab v3.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Operations Research Transportation Problem &amp; Simplex Tableau Interactive Workbench
              </p>
            </div>
          </div>

          {/* Balance Indicator & Controls */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isBalanced 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              {isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>产销平衡 (供应 {totalSupply} = 需求 {totalDemand})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>产销不平衡 (供应 {totalSupply} ≠ 需求 {totalDemand})</span>
                  <button
                    onClick={onBalanceMatrix}
                    className="ml-1 px-2 py-0.5 bg-amber-500 text-slate-950 font-semibold rounded text-[11px] hover:bg-amber-400 transition"
                    title="自动补齐虚设产地/销地"
                  >
                    一键平衡
                  </button>
                </>
              )}
            </div>

            <button
              onClick={onOpenCaseModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-sm transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              加载案例
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
