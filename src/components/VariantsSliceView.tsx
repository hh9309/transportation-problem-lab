import React, { useState } from 'react';
import { Origin, Destination, CostMatrix } from '../types';
import { Layers, ShieldAlert, ArrowRightLeft, Scale, ArrowRight, Check } from 'lucide-react';

interface VariantsSliceViewProps {
  origins: Origin[];
  destinations: Destination[];
  costMatrix: CostMatrix;
  onApplyVariant: (newOrigins: Origin[], newDestinations: Destination[], newCosts: CostMatrix) => void;
}

export const VariantsSliceView: React.FC<VariantsSliceViewProps> = ({
  origins,
  destinations,
  costMatrix,
  onApplyVariant,
}) => {
  const [activeSlice, setActiveSlice] = useState<'unbalanced' | 'forbidden' | 'transshipment' | 'bounded'>('unbalanced');

  const totalSupply = origins.reduce((acc, o) => acc + o.supply, 0);
  const totalDemand = destinations.reduce((acc, d) => acc + d.demand, 0);

  // Apply Dummy Node for Unbalanced
  const handleApplyUnbalanced = () => {
    const diff = totalSupply - totalDemand;
    if (diff === 0) return;

    if (diff > 0) {
      // Supply > Demand -> Add Dummy Dest
      const newDests = [
        ...destinations,
        { id: `dummy_d_${Date.now()}`, name: '虚设销地 (Dummy)', demand: diff },
      ];
      const newCosts = costMatrix.map((row) => [...row, 0]);
      onApplyVariant(origins, newDests, newCosts);
    } else {
      // Supply < Demand -> Add Dummy Origin
      const newOrigins = [
        ...origins,
        { id: `dummy_s_${Date.now()}`, name: '虚设产地 (Dummy)', supply: Math.abs(diff) },
      ];
      const newCosts = [...costMatrix.map((row) => [...row]), new Array(destinations.length).fill(0)];
      onApplyVariant(newOrigins, destinations, newCosts);
    }
  };

  // Apply Forbidden Route (Block first route S1 -> D1 with Big M)
  const handleApplyForbidden = () => {
    const newCosts = costMatrix.map((row, i) =>
      row.map((cost, j) => (i === 0 && j === 0 ? 999999 : cost))
    );
    onApplyVariant(origins, destinations, newCosts);
  };

  return (
    <div className="space-y-6">
      {/* Header Slice */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">5. 产销不平衡与变体转换切片 (Variants Reformulation Slices)</h2>
            <p className="text-xs text-slate-400">
              一键将非标准运输问题（不平衡、禁运、中转、流量上限）标准化切片为经典表上作业法矩阵。
            </p>
          </div>
        </div>

        {/* Slice Selector Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <button
            onClick={() => setActiveSlice('unbalanced')}
            className={`p-3 rounded-xl border text-left transition ${
              activeSlice === 'unbalanced'
                ? 'bg-indigo-600 border-indigo-400 text-white font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Scale className="w-4 h-4 mb-2" />
            <div className="text-xs font-bold">1. 产销不平衡转换</div>
            <div className="text-[11px] opacity-80 mt-1">虚设产地/销地补齐差额</div>
          </button>

          <button
            onClick={() => setActiveSlice('forbidden')}
            className={`p-3 rounded-xl border text-left transition ${
              activeSlice === 'forbidden'
                ? 'bg-indigo-600 border-indigo-400 text-white font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4 mb-2" />
            <div className="text-xs font-bold">2. 禁运与受限路线 (Big-M)</div>
            <div className="text-[11px] opacity-80 mt-1">赋予极大运价 M 屏蔽干线</div>
          </button>

          <button
            onClick={() => setActiveSlice('transshipment')}
            className={`p-3 rounded-xl border text-left transition ${
              activeSlice === 'transshipment'
                ? 'bg-indigo-600 border-indigo-400 text-white font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 mb-2" />
            <div className="text-xs font-bold">3. 中转物流网络</div>
            <div className="text-[11px] opacity-80 mt-1">对角线叠加容量 T 等价化</div>
          </button>

          <button
            onClick={() => setActiveSlice('bounded')}
            className={`p-3 rounded-xl border text-left transition ${
              activeSlice === 'bounded'
                ? 'bg-indigo-600 border-indigo-400 text-white font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4 mb-2" />
            <div className="text-xs font-bold">4. 线路流量上限限制</div>
            <div className="text-[11px] opacity-80 mt-1">带容量约束 x_ij ≤ U_ij 拆分</div>
          </button>
        </div>
      </div>

      {/* Slice Details */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {activeSlice === 'unbalanced' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              产销不平衡转换原理与切片 (Unbalanced Reformulation)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              当 $\sum a_i \neq \sum b_j$ 时，表上作业法无法直接迭代。运筹学标准解法为引入运价记为 0 的虚设节点（Dummy Node）：
            </p>
            <ul className="text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <li>• <strong>当总供应 &gt; 总需求 (∑ a_i &gt; ∑ b_j)</strong>：新增“虚设销地”，其需求量 b_dummy = ∑ a_i - ∑ b_j，单位运价均设为 0。</li>
              <li>• <strong>当总供应 &lt; 总需求 (∑ a_i &lt; ∑ b_j)</strong>：新增“虚设产地”，其供应量 a_dummy = ∑ b_j - ∑ a_i，单位运价均设为 0。</li>
            </ul>

            <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="text-xs text-indigo-950">
                当前矩阵平衡状态：
                <strong>
                  {totalSupply === totalDemand
                    ? '已产销平衡'
                    : `不平衡 (差额 ${Math.abs(totalSupply - totalDemand)})`}
                </strong>
              </div>
              {totalSupply !== totalDemand && (
                <button
                  onClick={handleApplyUnbalanced}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  一键应用虚设节点
                </button>
              )}
            </div>
          </div>
        )}

        {activeSlice === 'forbidden' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              禁运与受限路线切片 (Forbidden Routes with Big-M)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              由于道路检修、桥梁限重或政治关税限制，某些产地到销地的干线无法通行。运筹学中赋予该干线极大的单位运价 c_ij = M = 999999：
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
              <div>• 算法在寻找最小运价或最优闭回路时，会将包含 $M$ 的单元格判为极其不经济，从而自动避免向该线路分派运量。</div>
              <div>• 若最终求得的最优解中仍包含 $M$ 单元格，说明该运输问题无可行解。</div>
            </div>

            <button
              onClick={handleApplyForbidden}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow transition"
            >
              一键封锁第一条干线 (赋予 $c_{11} = M$)
            </button>
          </div>
        )}

        {activeSlice === 'transshipment' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              中转物流网络转换切片 (Transshipment Network Model)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              在包含中间枢纽仓/转运中心的多级供应链中，货物可从产地经由中转仓到达销地。通过设置足够大的缓冲容量 $T = \sum a_i$，将所有中转节点既看作产地又看作销地：
            </p>

            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto">
              <div>中转节点 k 供应量设为: a_k' = T</div>
              <div>中转节点 k 需求量设为: b_k' = T</div>
              <div>中转自身对角线运价 c_kk = 0</div>
            </div>
          </div>
        )}

        {activeSlice === 'bounded' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              带容量上限干线限制 (Bounded Variables x_ij ≤ U_ij)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              当部分交通管道或桥梁存在流量上限限制 x_ij ≤ U_ij 时，可以通过上界表上作业法或将变量拆分为 x_ij = U_ij - x_ij' 进行标准化转换。
            </p>
          </div>
        )}
      </div>

      {/* Practical Operational Case Module (最下方实战案例与操作指南模块) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                变体转换实战案例与一步步操作指南 (Interactive Case Showcase &amp; Workflow)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                结合真实物流场景，示范如何对不同变体进行标准化转化并在实验室中加载测试。
              </p>
            </div>
          </div>
        </div>

        {/* Case Cards Grid based on selected slice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Case 1: Unbalanced Grain Case */}
          <div className={`p-5 rounded-2xl border transition ${
            activeSlice === 'unbalanced' ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-md">
                案例一：粮油储备调拨 (产销不平衡)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">∑ Supply (750) &gt; ∑ Demand (600)</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              <strong>背景：</strong>华东3个中央储备库 (A1=300t, A2=200t, A3=250t) 调向4个受灾销区 (B1=180t, B2=220t, B3=200t)。总供应量 750 吨 &gt; 总需求量 600 吨，过剩 150 吨。
            </p>

            <div className="space-y-2 mb-4 text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-mono">
              <div className="font-bold text-slate-900 font-sans border-b border-slate-100 pb-1">操作转化步骤：</div>
              <div>1. 在销地列表新增补齐节点: <span className="text-indigo-600 font-bold">"虚设销地 (Dummy)"</span></div>
              <div>2. 设定 Dummy 需求量: <span className="text-indigo-600 font-bold">b_dummy = 750 - 600 = 150 吨</span></div>
              <div>3. 矩阵添加新列，运价均赋值: <span className="text-indigo-600 font-bold">c_i,dummy = 0</span></div>
            </div>

            <button
              onClick={() => {
                const sampleOrigins = [
                  { id: 'grain_a1', name: '中央储备库 A1', supply: 300 },
                  { id: 'grain_a2', name: '中央储备库 A2', supply: 200 },
                  { id: 'grain_a3', name: '中央储备库 A3', supply: 250 },
                ];
                const sampleDests = [
                  { id: 'dest_b1', name: '受灾销区 B1', demand: 180 },
                  { id: 'dest_b2', name: '受灾销区 B2', demand: 220 },
                  { id: 'dest_b3', name: '受灾销区 B3', demand: 200 },
                ];
                const sampleCosts = [
                  [10, 15, 20],
                  [12, 8, 14],
                  [18, 16, 9],
                ];
                onApplyVariant(sampleOrigins, sampleDests, sampleCosts);
                setActiveSlice('unbalanced');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>一键加载“粮油储备调拨”案例至工作台</span>
            </button>
          </div>

          {/* Case 2: Emergency Relief Forbidden Route */}
          <div className={`p-5 rounded-2xl border transition ${
            activeSlice === 'forbidden' ? 'border-red-500 bg-red-50/20 shadow-sm' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-md">
                案例二：应急物资道路塌方 (干线禁运)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">c_12 = Big-M (999999)</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              <strong>背景：</strong>应急救灾调度中，仓库 A1 向 灾区 B2 发货的主干道国道发生塌方滑坡，交通管制禁止通行。需要强制屏蔽干线 A1 → B2。
            </p>

            <div className="space-y-2 mb-4 text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-mono">
              <div className="font-bold text-slate-900 font-sans border-b border-slate-100 pb-1">操作转化步骤：</div>
              <div>1. 定位受封锁干线单元格: <span className="text-red-600 font-bold">(仓库 A1, 灾区 B2)</span></div>
              <div>2. 将原单位运价 (如 12) 修改为极大值: <span className="text-red-600 font-bold">c_12 = 999999 (Big M)</span></div>
              <div>3. MODI 算法在检验数分析时会自动剔除包含 M 的进基基变量</div>
            </div>

            <button
              onClick={() => {
                const sampleOrigins = [
                  { id: 'relief_a1', name: '应急总库 A1', supply: 250 },
                  { id: 'relief_a2', name: '应急副库 A2', supply: 250 },
                ];
                const sampleDests = [
                  { id: 'relief_b1', name: '灾区 B1', demand: 150 },
                  { id: 'relief_b2', name: '塌方受阻灾区 B2', demand: 180 },
                  { id: 'relief_b3', name: '灾区 B3', demand: 170 },
                ];
                const sampleCosts = [
                  [15, 999999, 22], // A1->B2 is blocked with Big M
                  [18, 12, 10],
                ];
                onApplyVariant(sampleOrigins, sampleDests, sampleCosts);
                setActiveSlice('forbidden');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>一键加载“道路塌方禁运”案例至工作台</span>
            </button>
          </div>

          {/* Case 3: Express Transshipment Network */}
          <div className={`p-5 rounded-2xl border transition ${
            activeSlice === 'transshipment' ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-md">
                案例三：快递枢纽仓中转 (Transshipment)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">T = ∑a_i = 500</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              <strong>背景：</strong>快递包裹从制造基地 (A1, A2) 出发，可直达或经由武汉航空转运中心 (Hub H) 中转分拨后运达终端网点 (B1, B2)。
            </p>

            <div className="space-y-2 mb-4 text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-mono">
              <div className="font-bold text-slate-900 font-sans border-b border-slate-100 pb-1">操作转化步骤：</div>
              <div>1. 计算网络总运量上限: <span className="text-indigo-600 font-bold">T = 200 + 300 = 500 万件</span></div>
              <div>2. 将中转枢纽 H 同时加入产地行与销地列，供应/需求均设为 T</div>
              <div>3. 枢纽自身存储运价: <span className="text-indigo-600 font-bold">c_HH = 0</span>，构建扩充矩阵</div>
            </div>

            <button
              onClick={() => {
                const sampleOrigins = [
                  { id: 'fact_a1', name: '华南工厂 A1', supply: 200 },
                  { id: 'fact_a2', name: '华东工厂 A2', supply: 300 },
                  { id: 'hub_h', name: '武汉转运枢纽 H (产地)', supply: 500 },
                ];
                const sampleDests = [
                  { id: 'store_b1', name: '华北网点 B1', demand: 250 },
                  { id: 'store_b2', name: '西南网点 B2', demand: 250 },
                  { id: 'hub_h_d', name: '武汉转运枢纽 H (销地)', demand: 500 },
                ];
                const sampleCosts = [
                  [25, 30, 8],
                  [20, 18, 6],
                  [10, 12, 0],
                ];
                onApplyVariant(sampleOrigins, sampleDests, sampleCosts);
                setActiveSlice('transshipment');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>一键加载“快递枢纽中转”案例至工作台</span>
            </button>
          </div>

          {/* Case 4: Power Line Bounded Capacity */}
          <div className={`p-5 rounded-2xl border transition ${
            activeSlice === 'bounded' ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-md">
                案例四：特高压输电干线容量上限 (Bounded)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">x_12 ≤ U_12 (100MW)</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed mb-4">
              <strong>背景：</strong>火力发电厂 A1 向变电站 B2 输电，中间物理输电网干线存在最大热稳定容量限制 100 兆瓦 (MW)。
            </p>

            <div className="space-y-2 mb-4 text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-mono">
              <div className="font-bold text-slate-900 font-sans border-b border-slate-100 pb-1">操作转化步骤：</div>
              <div>1. 设变换变量: <span className="text-indigo-600 font-bold">x_12' = 100 - x_12</span></div>
              <div>2. 拆分或增加容量上界影子节点与辅助虚设列</div>
              <div>3. 调整 A1 剩余发电量与 B2 接收端电量平衡</div>
            </div>

            <button
              onClick={() => {
                const sampleOrigins = [
                  { id: 'power_a1', name: '火电厂 A1 (200MW)', supply: 200 },
                  { id: 'power_a2', name: '风电场 A2 (250MW)', supply: 250 },
                ];
                const sampleDests = [
                  { id: 'sub_b1', name: '工业区变电站 B1', demand: 180 },
                  { id: 'sub_b2', name: '限容变电站 B2 (100MW)', demand: 170 },
                  { id: 'sub_spill', name: '调峰电站/蓄能', demand: 100 },
                ];
                const sampleCosts = [
                  [8, 12, 0],
                  [10, 9, 0],
                ];
                onApplyVariant(sampleOrigins, sampleDests, sampleCosts);
                setActiveSlice('bounded');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>一键加载“特高压输电限容”案例至工作台</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
