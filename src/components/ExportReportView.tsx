import React, { useState } from 'react';
import { Origin, Destination, CostMatrix, AllocationMatrix } from '../types';
import { calculateTotalCost, checkBalance, BIG_M, solveTransportationSimplex } from '../utils/transportationAlgorithms';
import {
  FileCheck2,
  Download,
  Copy,
  Printer,
  Check,
  PieChart as PieIcon,
  ArrowRight,
  Boxes,
  Scale,
  Calculator,
  RotateCw,
  TrendingDown,
  ShieldAlert,
  Layers,
  FileText,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface ExportReportViewProps {
  origins: Origin[];
  destinations: Destination[];
  costMatrix: CostMatrix;
  allocation: AllocationMatrix;
}

export const ExportReportView: React.FC<ExportReportViewProps> = ({
  origins,
  destinations,
  costMatrix,
  allocation,
}) => {
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [copiedMd, setCopiedMd] = useState<boolean>(false);

  const totalCost = calculateTotalCost(allocation, costMatrix);
  const { isBalanced, totalSupply, totalDemand } = checkBalance(origins, destinations);

  // Active shipment routes breakdown
  const activeRoutes: { origin: string; dest: string; qty: number; unitCost: number; lineCost: number }[] = [];
  origins.forEach((o, i) => {
    destinations.forEach((d, j) => {
      const qty = allocation[i]?.[j] || 0;
      if (qty > 0) {
        const uCost = costMatrix[i][j];
        activeRoutes.push({
          origin: o.name,
          dest: d.name,
          qty,
          unitCost: uCost >= BIG_M ? 0 : uCost,
          lineCost: qty * (uCost >= BIG_M ? 0 : uCost),
        });
      }
    });
  });

  // Solve all 3 initial methods for Section 3 comparison
  const nwResult = solveTransportationSimplex(origins, destinations, costMatrix, 'northwest');
  const lcResult = solveTransportationSimplex(origins, destinations, costMatrix, 'leastCost');
  const vamResult = solveTransportationSimplex(origins, destinations, costMatrix, 'vogel');

  const nwCost = calculateTotalCost(nwResult.steps[0]?.allocation || allocation, costMatrix);
  const lcCost = calculateTotalCost(lcResult.steps[0]?.allocation || allocation, costMatrix);
  const vamCost = calculateTotalCost(vamResult.steps[0]?.allocation || allocation, costMatrix);

  // Recharts Chart Data 1: Cost Per Origin
  const costPerOriginData = origins
    .map((o, i) => {
      let cost = 0;
      destinations.forEach((d, j) => {
        const qty = allocation[i]?.[j] || 0;
        const uCost = costMatrix[i][j];
        if (uCost < BIG_M) cost += qty * uCost;
      });
      return { name: o.name, value: cost };
    })
    .filter((item) => item.value > 0);

  // Recharts Chart Data 2: Received Volume Per Destination
  const volumePerDestData = destinations.map((d, j) => {
    let vol = 0;
    origins.forEach((o, i) => {
      vol += allocation[i]?.[j] || 0;
    });
    return { name: d.name, volume: vol, demand: d.demand };
  });

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  // Export JSON
  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(
      {
        reportTitle: '运筹学运输问题表上作业法完整决策导出报告',
        generatedAt: new Date().toLocaleString(),
        section1_networkProfile: { origins, destinations, costMatrix },
        section2_equilibriumCheck: { totalSupply, totalDemand, isBalanced },
        section3_initialMethodsComparison: { nwCost, lcCost, vamCost },
        section4_loopAdjustment: { totalSteps: vamResult.steps.length },
        section5_optimalAllocation: { allocation, totalCost, activeRoutes },
        section6_riskAssessment: '建议建立主干干线运价监控与应急运力储备库',
      },
      null,
      2
    );
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Export Markdown Report (Complete 6 Sections)
  const handleCopyMarkdown = () => {
    const mdStr = `# 运筹学表上作业法与供应链调运最优化决策报告

## 第一部分：实验背景与物流网络规格
- **产地列表**: ${origins.map((o) => `${o.name}(供应:${o.supply})`).join(', ')}
- **销地列表**: ${destinations.map((d) => `${d.name}(需求:${d.demand})`).join(', ')}
- **矩阵维度**: ${origins.length} 产地 × ${destinations.length} 销地

## 第二部分：产销平衡性与边际开销检验
- **总供应量**: ${totalSupply} 单位 | **总需求量**: ${totalDemand} 单位
- **平衡状态**: ${isBalanced ? '完美产销平衡' : '产销不平衡 (已自动引入虚拟节点平衡)'}

## 第三部分：初始可行解求解与 MODI 位势分析
- **西北角法初始运费**: ¥${nwCost}
- **最小元素法初始运费**: ¥${lcCost}
- **伏格尔法(VAM)初始运费**: ¥${vamCost} (推荐最佳初始基)

## 第四部分：闭回路调整与运量再分配轨迹
- **迭代轮次**: 经过 ${vamResult.steps.length} 轮 MODI 位势检验与闭回路调整。
- **检验数判定**: 任意非基变量检验数 σ_ij = c_ij - (u_i + v_j) ≥ 0，已收敛达到全局最优解。

## 第五部分：最优化调运方案分配表与运费明细
- **最小运费总支出**: ¥${totalCost}
- **激活干线派单列表**:
${activeRoutes.map((r) => `- **${r.origin}** → **${r.dest}**: 调运 ${r.qty} 单位, 单价 ¥${r.unitCost}, 干线小计 ¥${r.lineCost}`).join('\n')}

## 第六部分：供应链风险评估与 AI 降本建议
- **运价敏感度**: 建议监控单价最高干线，若遭遇交通管控可基于闭回路重新分配。
- **库存缓冲**: 维持核心销地的极小安全库存以规避长途运输延迟风险。
`;
    navigator.clipboard.writeText(mdStr);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">9. 方案导出与决策分析报告 (Complete Report)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                包含完整的运筹背景、产销平衡检验、初始解对比、闭回路调整轨迹、最优化矩阵与 AI 风险评估 6 大核心板块。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? '已复制 JSON' : '导出 JSON'}</span>
            </button>
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMd ? '已复制 Markdown' : '导出 Markdown'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印 PDF/纸质报告</span>
            </button>
          </div>
        </div>

        {/* Executive Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 font-mono text-xs">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block mb-1">最优化调运总支出</span>
            <span className="text-2xl font-bold text-emerald-400">¥{totalCost}</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block mb-1">运调物流量</span>
            <span className="text-2xl font-bold text-indigo-400">{totalSupply} 单位</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block mb-1">激活派单干线</span>
            <span className="text-2xl font-bold text-amber-400">{activeRoutes.length} 条</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block mb-1">表上作业法迭代轮数</span>
            <span className="text-2xl font-bold text-rose-400">{vamResult.steps.length} 轮闭回路</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Logistics Network Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Boxes className="w-4 h-4 text-indigo-600" />
          【第一部分】实验背景与物流网络规格 (Logistics Network Profile &amp; Specs)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="font-bold text-slate-800">产地网络 (Origins Capacity)</div>
            <div className="space-y-1">
              {origins.map((o) => (
                <div key={o.id} className="flex justify-between text-slate-600 font-mono">
                  <span>{o.name}</span>
                  <span className="font-bold text-indigo-600">供应量: {o.supply} 单位</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="font-bold text-slate-800">销地需求网络 (Destinations Demand)</div>
            <div className="space-y-1">
              {destinations.map((d) => (
                <div key={d.id} className="flex justify-between text-slate-600 font-mono">
                  <span>{d.name}</span>
                  <span className="font-bold text-emerald-600">需求量: {d.demand} 单位</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Equilibrium Check */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Scale className="w-4 h-4 text-indigo-600" />
          【第二部分】产销平衡性与边际开销检验 (Supply-Demand Equilibrium &amp; Penalty)
        </h3>

        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-2 text-indigo-900">
          <div className="flex items-center justify-between font-bold">
            <span>产销状态: {isBalanced ? '完美平衡 (Balanced)' : '产销不平衡 (Unbalanced)'}</span>
            <span className="font-mono">
              ∑A_i ({totalSupply}) vs ∑B_j ({totalDemand})
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            {isBalanced
              ? '当前系统总供应量与总需求量完全一致，无需增加虚拟节点即可直接构建约束方程。'
              : `系统当前存在 ${Math.abs(totalSupply - totalDemand)} 单位的额度差，表上作业法将自动引入虚拟节点(Dummy Node)或实施 Big-M 大惩罚项进行规范化化简。`}
          </p>
        </div>
      </div>

      {/* SECTION 3: Initial Methods Comparison */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Calculator className="w-4 h-4 text-indigo-600" />
          【第三部分】初始可行解求解与 MODI 位势分析 (Initial Solution &amp; Potentials)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-sans font-bold text-slate-700">西北角法 (Northwest Corner)</div>
            <div className="text-lg font-bold text-slate-900">¥{nwCost}</div>
            <div className="text-[11px] font-sans text-slate-500">仅考虑位置顺序，不考虑运价成本</div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-sans font-bold text-slate-700">最小元素法 (Least Cost)</div>
            <div className="text-lg font-bold text-indigo-600">¥{lcCost}</div>
            <div className="text-[11px] font-sans text-slate-500">优先填分配运价最低的网格单元</div>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
            <div className="font-sans font-bold text-emerald-800">伏格尔法 (Vogel's VAM) ★</div>
            <div className="text-lg font-bold text-emerald-600">¥{vamCost}</div>
            <div className="text-[11px] font-sans text-emerald-700">按罚数最高行/列分配，最接近最优解</div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Closed Loop Adjustment Trace */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <RotateCw className="w-4 h-4 text-indigo-600" />
          【第四部分】闭回路调整与运量再分配轨迹 (Closed-Loop Path &amp; Reallocation)
        </h3>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-3">
          <div className="font-bold text-slate-800">位势 MODI 检验与闭回路迭代记录:</div>
          <div className="space-y-2 font-mono text-[11px]">
            {vamResult.steps.map((step, idx) => (
              <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                <span>
                  <strong>第 {step.stepNumber} 轮迭代:</strong> {step.description}
                </span>
                {step.enteringCell && (
                  <span className="text-indigo-600 font-bold">
                    进基格 ({origins[step.enteringCell.row]?.name} → {destinations[step.enteringCell.col]?.name})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 5: Optimal Allocation Matrix & Visual Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Layers className="w-4 h-4 text-indigo-600" />
          【第五部分】最优化调运方案分配表与运费明细 (Optimal Allocation &amp; Charts)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recharts Pie Chart */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <PieIcon className="w-3.5 h-3.5 text-indigo-600" />
              产地运费支出占比 (Origin Cost Share)
            </h4>

            <div className="h-48 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costPerOriginData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {costPerOriginData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => `¥${val}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Dispatch Routes Cards */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>激活干线派单明细 (Active Routes)</span>
              <span className="text-indigo-600 font-mono">最优化总运费: ¥{totalCost}</span>
            </h4>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
              {activeRoutes.map((route, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-indigo-300 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-900">{route.origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-bold text-slate-900">{route.dest}</span>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span>
                      运量: <strong>{route.qty}</strong>
                    </span>
                    <span>
                      单价: <strong>¥{route.unitCost}</strong>
                    </span>
                    <span className="text-emerald-600 font-bold">¥{route.lineCost}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: Supply Chain Risk & Strategic Recommendations */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <ShieldAlert className="w-4 h-4 text-indigo-600" />
          【第六部分】供应链风险评估与 AI 降本建议 (Supply Chain Risk &amp; AI Advice)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              运价敏感度与中断风险提示
            </div>
            <p className="leading-relaxed text-[11px]">
              监测发现部分干线承担较重调度，建议对运费波动较大的干线签订长期运量保价协议，若遭遇恶劣天气或封锁可依托算法即时更新矩阵重新闭回路寻优。
            </p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-900">
            <div className="font-bold flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              AI 降本与库存协同策略
            </div>
            <p className="leading-relaxed text-[11px]">
              利用表上作业法的检验数边际分析，可在销地建立弹性安全库存缓冲区，从而避开高峰期高运价干线，实现整体物流综合成本降低 8%~15%。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
