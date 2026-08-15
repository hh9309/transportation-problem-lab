import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Table,
  ArrowRight,
  GitFork,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const KnowledgeGuideView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: '为什么初始可行解中的基变量个数必须刚好等于 m + n - 1 个？',
      a: '运输模型包含 m 个产地约束方程与 n 个销地约束方程，共 m + n 个线性方程。由于 ∑a_i = ∑b_j (总供应等于总需求)，这 m + n 个方程中存在 1 个冗余线性相关约束，因此线性独立方程只有 m + n - 1 个。根据单纯形法理论，基可行解的非零基变量数（包括数值为 0 的退化基变量）必须恰好为 m + n - 1 个。',
    },
    {
      q: '当分配过程中出现退化现象（基变量小于 m + n - 1）时，应该如何处理？',
      a: '当同时满足某个产地和销地需求时，可能导致一次划去行与列，使基变量个数少于 m + n - 1。此时必须在刚被划去的无分配单元格中填入一个极小正数 ε (Epsilon，代表运量为 0 的基变量)，以保证基变量总数为 m + n - 1，从而能够唯一求解位势 u_i 和 v_j 并构造闭回路。',
    },
    {
      q: '什么是位势法 (MODI)？它与单纯形法的检验数有何对应关系？',
      a: '位势法 (MODI) 是运输问题单纯形法的等价表上计算形式。对应单纯形法对偶变量，为每个产地引入行位势 u_i，为每个销地引入列位势 v_j。对所有基变量满足 u_i + v_j = c_ij。非基变量 (i, j) 的检验数 σ_ij = c_ij - (u_i + v_j)。若所有非基变量的 σ_ij ≥ 0，则当前方案已达全局最小运费最优解！',
    },
    {
      q: '为什么伏格尔法 (VAM) 通常比西北角法和最小元素法能更快收敛到最优解？',
      a: '伏格尔法引入了“罚码 (Penalty / Opportunity Cost)”概念——计算每行或每列最小运价与次小运价之差。罚码越大，说明若不优先在该行/列最小运价处分配，未来转而选择次小运价将付出极高的额外成本。因此 VAM 优先满足罚码最大的行或列，构造出的初始解往往非常接近甚至直接就是最优解！',
    },
    {
      q: '如何确定闭回路 (Closed Loop) 的方向与调整量 θ？',
      a: '当选定检验数 σ_ij < 0 最小的非基变量为进基变量 (Entering Variable) 时，从该单元格出发，只能沿着水平和垂直方向在基变量格间转折，最终回到起点，形成唯一的闭合回路。从进基格开始依次标记符号 (+, -, +, - ...)。选择标记为 (-) 的基变量中的最小运量作为调整量 θ。所有 (+) 格运量增加 θ，(-) 格运量减少 θ，离基格运量变为 0。',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">8. 运筹学运输问题与表上作业法知识导引 (Knowledge Guide)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              系统梳理数学模型定义、初解三大算法推导、MODI 位势法定理、闭回路法则与退化处理全景手册。
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Knowledge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Math Formulation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            1. 运输问题数学标准模型
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            设存在 m 个产地 A_1, A_2, ..., A_m，供应量为 a_i；n 个销地 B_1, B_2, ..., B_n，需求量为 b_j。单位运价为 c_ij，决策变量 x_ij 表示从 A_i 到 B_j 的运量。
          </p>

          <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs space-y-1.5 border border-slate-800">
            <div className="text-slate-400">// 目标函数 (Minimization)</div>
            <div>Min Z = ∑(i=1..m) ∑(j=1..n) c_ij * x_ij</div>
            <div className="text-slate-400 mt-2">// 约束条件 (Subject to)</div>
            <div>∑(j=1..n) x_ij = a_i ,  ∀ i = 1..m  (产地供应)</div>
            <div>∑(i=1..m) x_ij = b_j ,  ∀ j = 1..n  (销地需求)</div>
            <div>x_ij ≥ 0 ,  ∀ i, j                 (非负约束)</div>
          </div>
        </div>

        {/* Card 2: Initial Solutions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <GitFork className="w-4 h-4 text-indigo-600" />
            2. 初始基可行解三大求解算法对比
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-indigo-600">西北角法 (Northwest Corner Rule)</span>
              <p className="text-slate-600 mt-1">
                从矩阵左上角 (1,1) 开始按位置顺序分配，完全忽略运价大小。速度最快，但初始解成本通常较高。
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-emerald-600">最小元素法 (Least Cost Method)</span>
              <p className="text-slate-600 mt-1">
                优先选择全矩阵中单位运价 c_ij 最小的单元格分配，采用局部贪心策略。
              </p>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <span className="font-bold text-indigo-900">伏格尔法 (VAM / Vogel's Approximation)</span>
              <p className="text-indigo-950 mt-1">
                计算行/列运价最小与次小的差值（罚码/机会成本），优先向最大罚码对应行/列的最小运价分配。质量极高！
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: MODI Potential Method */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Table className="w-4 h-4 text-indigo-600" />
            3. 位势法 (MODI) 与最优性检验
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed">
            表上作业法的核心是在每轮迭代中判断当前基可行解是否已经达到最优：
          </p>

          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <li><strong>位势方程：</strong>对所有基变量单元格 (x_ij &gt; 0)，解方程 u_i + v_j = c_ij (设定 u_1 = 0)。</li>
            <li><strong>计算检验数：</strong>对所有非基变量单元格，计算检验数 σ_ij = c_ij - (u_i + v_j)。</li>
            <li><strong>最优判定：</strong>若所有非基变量 σ_ij ≥ 0，当前方案即为最优方案；若存在 σ_ij &lt; 0，选择最小者作为进基变量。</li>
          </ol>
        </div>

        {/* Card 4: Closed Loop Adjustment */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Layers className="w-4 h-4 text-indigo-600" />
            4. 闭回路 (Closed Loop) 调整法则
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed">
            从进基变量 ( Entering Variable ) 出发，水平或垂直移动，转折点必须是基变量，最终闭合：
          </p>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-2">
            <div>起点: (进基格, +θ)  →  转折1: (基变量格, -θ)</div>
            <div>                      ↓</div>
            <div>终点: (转折3, -θ)   ←  转折2: (基变量格, +θ)</div>
            <div className="text-emerald-400 mt-2">// 调整量 θ = min(所有带 '-' 号格的运量)</div>
          </div>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <HelpCircle className="w-5 h-5 text-indigo-600" />
          运倾名企面试与考研常见高频问题 (FAQ &amp; Interview Essentials)
        </h3>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200 rounded-xl overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 text-left text-xs font-bold text-slate-800 hover:bg-slate-100 transition"
                >
                  <span>Q{idx + 1}: {faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-indigo-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="p-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
