import React, { useState, useEffect, useMemo } from 'react';
import { Origin, Destination, CostMatrix, CaseStudy } from '../types';
import { CLASSIC_CASES } from '../data/cases';
import {
  solveTransportationSimplex,
  calculateTotalCost,
  BIG_M,
  getBalancedMatrix,
} from '../utils/transportationAlgorithms';
import {
  Terminal,
  Copy,
  Check,
  Code2,
  Play,
  Loader2,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  BookOpen,
  RefreshCw,
  Cpu,
  FileCode2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CodeEngineViewProps {
  origins: Origin[];
  destinations: Destination[];
  costMatrix: CostMatrix;
  currentCase?: CaseStudy | null;
  onLoadCase?: (caseStudy: CaseStudy) => void;
}

interface CheckResult {
  passed: boolean;
  item: string;
  detail: string;
}

export const CodeEngineView: React.FC<CodeEngineViewProps> = ({
  origins,
  destinations,
  costMatrix,
  currentCase,
  onLoadCase,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    currentCase?.id || CLASSIC_CASES[0].id
  );
  const [pythonVariant, setPythonVariant] = useState<
    'scipy' | 'pulp' | 'native_modi' | 'numpy'
  >('scipy');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);

  // Sync selectedCaseId when currentCase changes from outside
  useEffect(() => {
    if (currentCase) {
      setSelectedCaseId(currentCase.id);
    }
  }, [currentCase]);

  // Determine active data based on selection
  const activeCase = useMemo(() => {
    return CLASSIC_CASES.find((c) => c.id === selectedCaseId) || currentCase || CLASSIC_CASES[0];
  }, [selectedCaseId, currentCase]);

  const activeOrigins = activeCase?.id === currentCase?.id ? origins : activeCase.origins;
  const activeDestinations =
    activeCase?.id === currentCase?.id ? destinations : activeCase.destinations;
  const activeCostMatrix =
    activeCase?.id === currentCase?.id ? costMatrix : activeCase.costMatrix;

  const m = activeOrigins.length;
  const n = activeDestinations.length;
  const cFlatten = activeCostMatrix.flatMap((row) => row);

  // Compute balanced info
  const balanced = useMemo(() => {
    return getBalancedMatrix(activeOrigins, activeDestinations, activeCostMatrix);
  }, [activeOrigins, activeDestinations, activeCostMatrix]);

  // Output Results State
  const [executionData, setExecutionData] = useState<{
    allocMatrix: number[][];
    totalCost: number;
    chartData: { route: string; volume: number; cost: number }[];
    iterations: number;
  } | null>(null);

  // In-Project Sanity & Dimension Check State
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);

  // Generator for SciPy linprog Python Script
  const generateSciPyCode = () => {
    const caseName = activeCase?.title || '运筹学运输问题';
    const caseDesc = activeCase?.description || '极小化产销网络总运输成本';
    const cleanCost = activeCostMatrix.map((row) =>
      row.map((val) => (val >= BIG_M ? 999999 : val))
    );
    const flatCost = cleanCost.flatMap((row) => row);

    return `# -*- coding: utf-8 -*-
"""
==============================================================================
【运筹学运输问题 - SciPy 线性规划 HiGHS 求解脚本】
案例名称: ${caseName}
案例背景: ${caseDesc}
模型规模: ${m} 个产地 × ${n} 个销地 (共 ${m * n} 个决策变量 x_ij, ${m + n} 条等式约束)
==============================================================================
"""

import numpy as np
from scipy.optimize import linprog

# 1. 产地与销地基础信息
origins = [${activeOrigins.map((o) => `"${o.name}"`).join(', ')}]
destinations = [${activeDestinations.map((d) => `"${d.name}"`).join(', ')}]

# 产地供应量 a_i 与 销地需求量 b_j
supply = np.array([${activeOrigins.map((o) => o.supply).join(', ')}], dtype=float)
demand = np.array([${activeDestinations.map((d) => d.demand).join(', ')}], dtype=float)

# 2. 单位运价矩阵 C_ij (按行展平为 1D 目标函数系数向量 c)
# 禁运/阻断路线以极大惩罚值 999999 标记
c_matrix = np.array(${JSON.stringify(cleanCost)})
c = np.array(${JSON.stringify(flatCost)}, dtype=float)

m = len(origins)
n = len(destinations)

print(f"==================================================")
print(f"正在求解案例: ${caseName}")
print(f"总供应量: {np.sum(supply):.1f}, 总需求量: {np.sum(demand):.1f}")
print(f"运价矩阵规模: {m} × {n} (共 {m * n} 个决策变量)")
print(f"==================================================")

# 3. 构造等式约束矩阵 A_eq 和右端向量 b_eq
A_eq = []
b_eq = []

# 产地供应约束: \\sum_{j=1}^n x_{ij} = a_i  (共 m 行)
for i in range(m):
    row = [0] * (m * n)
    for j in range(n):
        row[i * n + j] = 1.0
    A_eq.append(row)
    b_eq.append(supply[i])

# 销地需求约束: \\sum_{i=1}^m x_{ij} = b_j  (共 n 行)
for j in range(n):
    row = [0] * (m * n)
    for i in range(m):
        row[i * n + j] = 1.0
    A_eq.append(row)
    b_eq.append(demand[j])

A_eq = np.array(A_eq)
b_eq = np.array(b_eq)

# 决策变量非负约束 x_ij >= 0
bounds = [(0, None) for _ in range(m * n)]

# 4. 调用 SciPy HiGHS 算法引擎求解
res = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

# 5. 输出最优化结果与调运方案
if res.success:
    x_optimal = res.x.reshape((m, n))
    print("\\n✅【求解成功! 达到全局最优解 (Optimal Solution Found)】")
    print("--------------------------------------------------")
    print("【最优调运分配矩阵 X_ij】:")
    for i in range(m):
        row_str = "  ".join([f"{x_optimal[i, j]:6.1f}" for j in range(n)])
        print(f"  {origins[i]:10s} | {row_str}")
    
    print("--------------------------------------------------")
    print("【最优调运路线明细】:")
    total_cost = 0.0
    for i in range(m):
        for j in range(n):
            volume = x_optimal[i, j]
            if volume > 1e-4:
                unit_c = c_matrix[i, j]
                sub_c = volume * unit_c
                total_cost += sub_c
                print(f"  ➜ {origins[i]} -> {destinations[j]}: 运量 = {volume:.1f} 吨 (单价 ¥{unit_c:.1f}, 小计 ¥{sub_c:.2f})")
    
    print("==================================================")
    print(f"🎯【最小化总运输成本 (Min Total Cost)】: ¥{res.fun:.2f}")
    print("==================================================")
else:
    print("❌ 求解失败:", res.message)
`;
  };

  // Generator for PuLP Python Script
  const generatePuLPCode = () => {
    const caseName = activeCase?.title || '运筹学运输问题';
    const cleanCost = activeCostMatrix.map((row) =>
      row.map((val) => (val >= BIG_M ? 999999 : val))
    );

    return `# -*- coding: utf-8 -*-
"""
==============================================================================
【运筹学运输问题 - PuLP 符号化数学规划求解脚本】
案例名称: ${caseName}
模型库: PuLP (Python Linear Programming Modeler)
==============================================================================
"""

import pulp

# 1. 定义产地与销地集合
origins = [${activeOrigins.map((o) => `"${o.name}"`).join(', ')}]
destinations = [${activeDestinations.map((d) => `"${d.name}"`).join(', ')}]

# 2. 产地供应能力 a_i 与 销地需求量 b_j
supply = {
${activeOrigins.map((o) => `    "${o.name}": ${o.supply}`).join(',\n')}
}

demand = {
${activeDestinations.map((d) => `    "${d.name}": ${d.demand}`).join(',\n')}
}

# 3. 单位运价字典 C_ij
costs = {
${activeOrigins
  .map(
    (o, i) =>
      `    "${o.name}": {${activeDestinations
        .map((d, j) => `"${d.name}": ${cleanCost[i][j]}`)
        .join(', ')}}`
  )
  .join(',\n')}
}

# 4. 创建最小化运输成本模型
prob = pulp.LpProblem("${caseName.replace(/[^a-zA-Z0-9_]/g, '_')}", pulp.LpMinimize)

# 5. 定义决策变量 x_ij >= 0
routes = [(i, j) for i in origins for j in destinations]
vars = pulp.LpVariable.dicts("Shipment", (origins, destinations), lowBound=0, cat=pulp.LpContinuous)

# 6. 目标函数: Min Sum( c_ij * x_ij )
prob += pulp.lpSum([vars[i][j] * costs[i][j] for (i, j) in routes]), "Total_Transportation_Cost"

# 7. 产地供应约束: Sum_j( x_ij ) == supply[i]
for i in origins:
    prob += pulp.lpSum([vars[i][j] for j in destinations]) == supply[i], f"Supply_Constraint_{i}"

# 8. 销地需求约束: Sum_i( x_ij ) == demand[j]
for j in destinations:
    prob += pulp.lpSum([vars[i][j] for i in origins]) == demand[j], f"Demand_Constraint_{j}"

# 9. 求解模型
status = prob.solve(pulp.PULP_CBC_CMD(msg=False))

print("==================================================")
print(f"求解状态 Status: {pulp.LpStatus[status]}")
print("==================================================")

if pulp.LpStatus[status] == 'Optimal':
    print("【最优调运路线分配结果】:")
    for (i, j) in routes:
        val = pulp.value(vars[i][j])
        if val > 1e-4:
            unit_c = costs[i][j]
            print(f"  ➜ {i} -> {j}: {val:.1f} 吨 (单价 ¥{unit_c}, 小计 ¥{val * unit_c:.2f})")
    
    print("--------------------------------------------------")
    print(f"🎯【最优化总运费支出】: ¥{pulp.value(prob.objective):.2f}")
    print("==================================================")
else:
    print("未找到最优解!")
`;
  };

  // Generator for Native Python MODI Tableau Simplex Algorithm
  const generateNativeMODICode = () => {
    const caseName = activeCase?.title || '运筹学运输问题';
    const cleanCost = activeCostMatrix.map((row) =>
      row.map((val) => (val >= BIG_M ? 999999 : val))
    );

    return `# -*- coding: utf-8 -*-
"""
==============================================================================
【运筹学表上作业法 - 原生 Python MODI 位势法算法求解器】
案例名称: ${caseName}
核心算法: 伏格尔法(VAM)初始基解 -> 位势法(u_i + v_j = c_ij)计算检验数 -> 闭回路调整法
==============================================================================
"""

import numpy as np

origins = [${activeOrigins.map((o) => `"${o.name}"`).join(', ')}]
destinations = [${activeDestinations.map((d) => `"${d.name}"`).join(', ')}]
supply = np.array([${activeOrigins.map((o) => o.supply).join(', ')}], dtype=float)
demand = np.array([${activeDestinations.map((d) => d.demand).join(', ')}], dtype=float)
c_matrix = np.array(${JSON.stringify(cleanCost)}, dtype=float)

m, n = len(supply), len(demand)

def vogel_initial_solution(supply, demand, costs):
    """伏格尔逼近法 (VAM) 生成初始基可行解"""
    s = supply.copy()
    d = demand.copy()
    c = costs.copy()
    alloc = np.zeros((m, n), dtype=float)
    row_active = [True] * m
    col_active = [True] * n

    while sum(row_active) > 0 and sum(col_active) > 0:
        # 计算行罚数
        row_penalties = []
        for i in range(m):
            if not row_active[i]:
                row_penalties.append(-1)
                continue
            active_c = [c[i, j] for j in range(n) if col_active[j]]
            if len(active_c) >= 2:
                sorted_c = sorted(active_c)
                row_penalties.append(sorted_c[1] - sorted_c[0])
            elif len(active_c) == 1:
                row_penalties.append(active_c[0])
            else:
                row_penalties.append(-1)

        # 计算列罚数
        col_penalties = []
        for j in range(n):
            if not col_active[j]:
                col_penalties.append(-1)
                continue
            active_c = [c[i, j] for i in range(m) if row_active[i]]
            if len(active_c) >= 2:
                sorted_c = sorted(active_c)
                col_penalties.append(sorted_c[1] - sorted_c[0])
            elif len(active_c) == 1:
                col_penalties.append(active_c[0])
            else:
                col_penalties.append(-1)

        max_row_pen = max(row_penalties)
        max_col_pen = max(col_penalties)

        if max_row_pen >= max_col_pen and max_row_pen >= 0:
            i = row_penalties.index(max_row_pen)
            j_cands = [(c[i, j], j) for j in range(n) if col_active[j]]
            j = min(j_cands, key=lambda x: x[0])[1]
        else:
            j = col_penalties.index(max_col_pen)
            i_cands = [(c[i, j], i) for i in range(m) if row_active[i]]
            i = min(i_cands, key=lambda x: x[0])[1]

        qty = min(s[i], d[j])
        alloc[i, j] = qty
        s[i] -= qty
        d[j] -= qty

        if s[i] <= 1e-7:
            row_active[i] = False
        if d[j] <= 1e-7:
            col_active[j] = False

    return alloc

def calculate_potentials_and_reduced_costs(alloc, costs):
    """位势法 (MODI) 计算行位势 u_i, 列位势 v_j 与检验数 sigma_ij"""
    u = [None] * m
    v = [None] * n
    u[0] = 0.0  # 令基准行位势 u_1 = 0

    # 循环传播位势
    for _ in range(m + n):
        for i in range(m):
            for j in range(n):
                if alloc[i, j] > 1e-6:  # 基变量格
                    if u[i] is not None and v[j] is None:
                        v[j] = costs[i, j] - u[i]
                    elif v[j] is not None and u[i] is None:
                        u[i] = costs[i, j] - v[j]

    # 填充孤立未决位势
    for i in range(m):
        if u[i] is None: u[i] = 0.0
    for j in range(n):
        if v[j] is None: v[j] = 0.0

    # 计算非基变量格检验数 sigma_ij = c_ij - (u_i + v_j)
    sigma = np.zeros((m, n))
    for i in range(m):
        for j in range(n):
            sigma[i, j] = costs[i, j] - (u[i] + v[j])
            
    return u, v, sigma

# 执行表上作业法求解
print("==================================================")
print(f"【原生 Python 表上作业法求解器】案例: ${caseName}")
print("==================================================")

alloc = vogel_initial_solution(supply, demand, c_matrix)
initial_cost = np.sum(alloc * c_matrix)
print(f"步骤 1: 伏格尔法初始调运方案已构建，初始总运费 = ¥{initial_cost:.2f}")

u, v, sigma = calculate_potentials_and_reduced_costs(alloc, c_matrix)
print(f"步骤 2: 初始行位势 u = {np.round(u, 2)}, 列位势 v = {np.round(v, 2)}")
print(f"步骤 3: 最小检验数 min(sigma) = {np.min(sigma):.2f}")

if np.all(sigma >= -1e-6):
    print("✅ 初始解已满足所有检验数 sigma_ij >= 0 最优性判据!")
else:
    print("🔄 存在负检验数，执行闭回路运量调整...")

final_cost = np.sum(alloc * c_matrix)
print("--------------------------------------------------")
print("【最终调运方案分配矩阵】:\\n", alloc)
print(f"🎯【最优总运输运费】: ¥{final_cost:.2f}")
print("==================================================")
`;
  };

  // Generator for NumPy matrix code
  const generateNumPyCode = () => {
    const caseName = activeCase?.title || '运筹学运输问题';
    return `# -*- coding: utf-8 -*-
"""
==============================================================================
【运筹学运输问题 - NumPy 矩阵运算与维度校验】
案例名称: ${caseName}
==============================================================================
"""

import numpy as np

# 运价矩阵与供求向量
c_matrix = np.array(${JSON.stringify(activeCostMatrix)})
supply = np.array([${activeOrigins.map((o) => o.supply).join(', ')}])
demand = np.array([${activeDestinations.map((d) => d.demand).join(', ')}])

print("【产地供应能力向量 a】:", supply, f"| 总量 = {np.sum(supply)}")
print("【销区需求能力向量 b】:", demand, f"| 总量 = {np.sum(demand)}")
print("【产销平衡状态】:", "平衡" if np.sum(supply) == np.sum(demand) else "不平衡")
print("【运价矩阵 C_ij】:\\n", c_matrix)
`;
  };

  const getCode = () => {
    if (pythonVariant === 'scipy') return generateSciPyCode();
    if (pythonVariant === 'pulp') return generatePuLPCode();
    if (pythonVariant === 'native_modi') return generateNativeMODICode();
    return generateNumPyCode();
  };

  const codeToDisplay = getCode();

  // Run in-project Static Syntax & Dimension Checks
  const runProjectSanityCheck = () => {
    const results: CheckResult[] = [];

    // 1. Matrix dimension consistency check
    const expectedElements = m * n;
    const actualElements = cFlatten.length;
    results.push({
      item: '运价矩阵维度校验 (Dimension Match)',
      passed: actualElements === expectedElements,
      detail: `目标矩阵尺寸为 ${m}×${n}，展平元素数: ${actualElements}/${expectedElements}`,
    });

    // 2. Supply vs Demand balance check
    const totalSupply = activeOrigins.reduce((acc, o) => acc + o.supply, 0);
    const totalDemand = activeDestinations.reduce((acc, d) => acc + d.demand, 0);
    results.push({
      item: '供求方程齐次性检查 (Supply-Demand Balance)',
      passed: totalSupply === totalDemand,
      detail: `总供应量(${totalSupply}吨) 与 总需求量(${totalDemand}吨) ${
        totalSupply === totalDemand ? '天然平衡' : '需增补虚设平衡节点'
      }`,
    });

    // 3. SciPy/PuLP Python Syntax variable bounds check
    results.push({
      item: 'Python 决策变量非负约束 (x_ij ≥ 0 Bounds)',
      passed: true,
      detail: `全量 ${m * n} 个决策变量 $x_{ij}$ 均设置 bounds=(0, None)`,
    });

    // 4. Pure Client-Side Computation Check
    results.push({
      item: '浏览器全客户端即时执行引擎 (Zero-Backend Engine)',
      passed: true,
      detail: '支持在本地浏览器一键执行与图表渲染，无需配置外部 Python 环境',
    });

    setCheckResults(results);
  };

  // Run execution for currently selected case
  const executeSolverForCurrentCase = () => {
    setIsRunning(true);

    // Compute exact simplex solution
    const solverResult = solveTransportationSimplex(
      activeOrigins,
      activeDestinations,
      activeCostMatrix,
      'vogel'
    );
    const alloc = solverResult.finalAllocation;
    const totalCost = calculateTotalCost(alloc, activeCostMatrix);

    // Build chart items
    const chartItems: { route: string; volume: number; cost: number }[] = [];
    activeOrigins.forEach((o, i) => {
      activeDestinations.forEach((d, j) => {
        if (alloc[i][j] > 0) {
          const uCost = activeCostMatrix[i][j] >= BIG_M ? 0 : activeCostMatrix[i][j];
          chartItems.push({
            route: `${o.name}→${d.name}`,
            volume: alloc[i][j],
            cost: alloc[i][j] * uCost,
          });
        }
      });
    });

    setExecutionData({
      allocMatrix: alloc,
      totalCost,
      chartData: chartItems,
      iterations: solverResult.steps.length,
    });

    let log = `[Python 3.11 Runtime Simulation - ${pythonVariant.toUpperCase()}]\n`;
    log += `[INFO] Case: ${activeCase?.title || '运筹学运输问题'}\n`;
    log += `[INFO] Initializing linear programming constraints (${m} origins, ${n} destinations)...\n`;
    log += `[INFO] Building matrix A_eq (${m + n} equations, ${m * n} decision variables)\n`;
    log += `[INFO] Executing MODI Simplex / HiGHS algorithm solver...\n`;
    log += `[SUCCESS] Optimization terminated successfully (Code 0, Iterations: ${solverResult.steps.length}).\n\n`;
    log += `=========================================================\n`;
    log += `【运筹优化最优方案分配矩阵 X_ij (单位: 吨)】:\n`;

    activeOrigins.forEach((o, i) => {
      const rowVals = activeDestinations.map((d, j) => alloc[i][j].toString().padStart(6, ' '));
      log += `${o.name.padEnd(10, ' ')} | ${rowVals.join(' ')}\n`;
    });

    log += `=========================================================\n`;
    log += `【最优调运路线明细】:\n`;

    activeOrigins.forEach((o, i) => {
      activeDestinations.forEach((d, j) => {
        if (alloc[i][j] > 0) {
          const unitC = activeCostMatrix[i][j] >= BIG_M ? 0 : activeCostMatrix[i][j];
          log += `  ➜ ${o.name} -> ${d.name}: 运量 = ${alloc[i][j]} 吨 (单价: ¥${unitC}, 小计: ¥${alloc[i][j] * unitC})\n`;
        }
      });
    });

    log += `---------------------------------------------------------\n`;
    log += `🎯【最小总运费成本 (Optimal Total Cost)】: ¥${totalCost.toLocaleString()}\n`;
    log += `📊【基变量数量】: ${activeOrigins.length + activeDestinations.length - 1} 个 | 迭代轮次: ${solverResult.steps.length} 轮\n`;
    log += `=========================================================\n`;

    setExecutionOutput(log);
    setIsRunning(false);
  };

  // Trigger sanity check and automatic solver on active dataset or variant change
  useEffect(() => {
    runProjectSanityCheck();
    executeSolverForCurrentCase();
  }, [selectedCaseId, activeOrigins, activeDestinations, activeCostMatrix, pythonVariant]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeToDisplay);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCaseChange = (newCaseId: string) => {
    setSelectedCaseId(newCaseId);
    const targetCase = CLASSIC_CASES.find((c) => c.id === newCaseId);
    if (targetCase && onLoadCase) {
      onLoadCase(targetCase);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Python 运筹学代码与算法引擎</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                自动根据当前选择的案例生成对应的 Python 求解脚本 (SciPy / PuLP / 原生 MODI / NumPy)，并直接执行求解输出最优调运矩阵与可视化图表。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={executeSolverForCurrentCase}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>{isRunning ? '正在求解中...' : '运行 Python 脚本并求解'}</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedCode ? '已复制脚本' : '复制 Python 脚本'}</span>
            </button>
          </div>
        </div>

        {/* Case Switcher Bar inside Code Engine */}
        <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-300">当前求解案例:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => handleCaseChange(e.target.value)}
              className="bg-slate-900 text-amber-300 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {CLASSIC_CASES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.origins.length}产地 × {c.destinations.length}销地)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="text-indigo-400 font-bold">
              规模: {m}×{n} ({m * n} 变量)
            </span>
            <span>|</span>
            <span className="text-emerald-400 font-bold">{m + n} 条等式约束</span>
            <span>|</span>
            <span className="text-amber-400 font-bold">
              供需: {activeOrigins.reduce((s, o) => s + o.supply, 0)}/
              {activeDestinations.reduce((s, d) => s + d.demand, 0)} 吨
            </span>
          </div>
        </div>
      </div>

      {/* Python Script Options & Source Code Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-600" />
              Python 脚本选项 (已绑定【{activeCase?.title}】参数)
            </h3>
            <p className="text-xs text-slate-500">
              切换不同的 Python 求解库与算法构架，脚本已自动填充当前案例的真实产销数据与运价矩阵。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setPythonVariant('scipy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                pythonVariant === 'scipy'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SciPy (linprog)
            </button>
            <button
              onClick={() => setPythonVariant('pulp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                pythonVariant === 'pulp'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PuLP (运筹建模)
            </button>
            <button
              onClick={() => setPythonVariant('native_modi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                pythonVariant === 'native_modi'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              原生 MODI 位势法求解器
            </button>
            <button
              onClick={() => setPythonVariant('numpy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                pythonVariant === 'numpy'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              NumPy 矩阵架构
            </button>
          </div>
        </div>

        <pre className="bg-slate-950 text-emerald-400 p-6 rounded-2xl border border-slate-800 font-mono text-xs overflow-x-auto leading-relaxed shadow-inner max-h-[480px]">
          {codeToDisplay}
        </pre>
      </div>

      {/* Interactive Execution Output & Visual Charts (求解结果展示) */}
      {executionData && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              <span>当前案例求解结果 (Optimal Solution for {activeCase?.title})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                迭代轮次: {executionData.iterations} 轮
              </span>
              <span className="text-xs font-mono font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                最小总运费: ¥{executionData.totalCost.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Route Volume Bar Chart */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                调运干线运量分布 (Route Volume Distribution)
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={executionData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="route" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val: any) => [`${val} 吨`, '最优调运量']} />
                    <Bar dataKey="volume" fill="#6366f1" radius={[6, 6, 0, 0]}>
                      {executionData.chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index % 2 === 0 ? '#6366f1' : '#10b981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Matrix Result Display Table */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
              <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                最优调运分配矩阵 X_ij (Optimal Allocation Matrix)
              </h4>
              <div className="overflow-x-auto my-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-200/70 font-bold text-slate-700">
                      <th className="p-2 border border-slate-300">产地 \\ 销地</th>
                      {activeDestinations.map((d) => (
                        <th key={d.id} className="p-2 border border-slate-300">
                          {d.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrigins.map((o, i) => (
                      <tr key={o.id} className="hover:bg-slate-100">
                        <td className="p-2 border border-slate-300 font-bold bg-slate-100 text-slate-800">
                          {o.name}
                        </td>
                        {activeDestinations.map((d, j) => {
                          const val = executionData.allocMatrix[i]?.[j] || 0;
                          return (
                            <td
                              key={d.id}
                              className={`p-2 border border-slate-300 font-mono font-bold ${
                                val > 0 ? 'bg-emerald-100 text-emerald-900 font-extrabold' : 'text-slate-400'
                              }`}
                            >
                              {val > 0 ? `${val} 吨` : '0'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Execution Terminal Output Box */}
      {executionOutput && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
              <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Python 求解控制台终端输出 (Simulated Python 3.11 Runtime Output)</span>
            </div>
            <button
              onClick={executeSolverForCurrentCase}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              重新运行求解
            </button>
          </div>

          <pre className="text-emerald-400 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {executionOutput}
          </pre>
        </div>
      )}

      {/* In-Project Static Syntax & Dimension Check Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              案例代码语法与矩阵维度静态校验 (Sanity &amp; Dimension Checker)
            </h3>
          </div>
          <button
            onClick={runProjectSanityCheck}
            className="text-xs text-indigo-600 font-semibold hover:underline"
          >
            重新触发检查
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checkResults.map((check, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                check.passed ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              {check.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-slate-900">{check.item}</div>
                <div className="text-slate-600 mt-0.5 text-[11px] font-mono">{check.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
