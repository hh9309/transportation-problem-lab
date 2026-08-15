import React, { useState, useMemo } from 'react';
import { CaseStudy, Origin, Destination, CostMatrix } from '../types';
import { CLASSIC_CASES } from '../data/cases';
import {
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Play,
  Layers,
  Sparkles,
  Search,
  Filter,
  Truck,
  TrendingDown,
  Building2,
  Warehouse,
  Scale,
  ShieldAlert,
  Network,
  Cpu,
} from 'lucide-react';

interface ClassicCasesViewProps {
  origins?: Origin[];
  destinations?: Destination[];
  costMatrix?: CostMatrix;
  currentCaseId?: string;
  onLoadCase: (caseStudy: CaseStudy) => void;
  onApplyVariant?: (
    newOrigins: Origin[],
    newDestinations: Destination[],
    newCosts: CostMatrix,
    variantCase?: CaseStudy
  ) => void;
}

export const ClassicCasesView: React.FC<ClassicCasesViewProps> = ({
  currentCaseId,
  onLoadCase,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Categories list extracted from cases
  const categories = useMemo(() => {
    const cats = Array.from(new Set(CLASSIC_CASES.map((c) => c.category)));
    return ['all', ...cats];
  }, []);

  // Filtered cases
  const filteredCases = useMemo(() => {
    return CLASSIC_CASES.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.background.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">5. 运筹学经典案例</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  九大标杆案例库
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                精选 9 大运筹学经典产销调运标杆场景（含平衡性大宗能源/新能源零部件/冷链物流、产销不平衡、多级中转物流、禁运 Big-M、弹性需求、干线上限及综合多模态供应链），支持一键载入参数并即刻进入表上作业法与代码引擎求解。
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              分类筛选:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {cat === 'all' ? `全部案例 (${CLASSIC_CASES.length})` : cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索案例名称 / 关键字..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Overview Tips */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>点击任一案例卡片底部的「一键载入案例参数并求解」，将自动同步全局产销数据并无缝切换至【表上作业法】</span>
        </div>
        <span className="text-xs font-mono text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shrink-0">
          共收录 {CLASSIC_CASES.length} 个经典案例 (当前显示 {filteredCases.length} 个)
        </span>
      </div>

      {/* Classic Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCases.map((item) => {
          const isCurrent = currentCaseId === item.id;
          const totalSupply = item.origins.reduce((s, o) => s + o.supply, 0);
          const totalDemand = item.destinations.reduce((s, d) => s + d.demand, 0);
          const isBalanced = totalSupply === totalDemand;

          return (
            <div
              key={item.id}
              className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between group ${
                isCurrent
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10'
                  : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div>
                {/* Header Tag Bar */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                      {item.category}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        当前工作区案例
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    {item.origins.length} 产地 × {item.destinations.length} 销地
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{item.description}</p>

                {/* Dimensions & Balance Metrics Badge */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-500 block mb-0.5">供需平衡性</span>
                    <span
                      className={`font-mono font-bold ${
                        isBalanced ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {isBalanced ? '✓ 产销平衡' : `不平衡 (差额 ${Math.abs(totalSupply - totalDemand)})`}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-500 block mb-0.5">总调运量</span>
                    <span className="font-mono font-bold text-indigo-600">
                      ∑ = {Math.max(totalSupply, totalDemand)} 吨
                    </span>
                  </div>
                </div>

                {/* Background & Notes */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-2 mb-4">
                  <div>
                    <strong className="text-slate-900">现实业务场景：</strong>
                    {item.background}
                  </div>
                  {item.notes && (
                    <div className="text-indigo-900 bg-indigo-50/60 p-2 rounded-lg border border-indigo-100 font-medium text-[11px] leading-tight">
                      <strong>模型核心特色：</strong>
                      {item.notes}
                    </div>
                  )}
                </div>

                {/* Mini Origin / Destination Overview */}
                <div className="space-y-2 mb-4 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <Warehouse className="w-3.5 h-3.5 text-indigo-500" />
                    <span>产地供应: </span>
                    <span className="font-mono text-slate-500 font-normal">
                      {item.origins.map((o) => `${o.name}(${o.supply})`).join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>销地需求: </span>
                    <span className="font-mono text-slate-500 font-normal">
                      {item.destinations.map((d) => `${d.name}(${d.demand})`).join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onLoadCase(item)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition mt-2 transform group-hover:scale-[1.02]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                一键载入案例参数并求解 (转至表上作业法)
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
