import { Origin, Destination, CostMatrix, AllocationMatrix, StepDetail, InitialMethod } from '../types';

export const BIG_M = 999999;

/**
 * Check total supply and demand balance
 */
export function checkBalance(origins: Origin[], destinations: Destination[]) {
  const totalSupply = origins.reduce((acc, o) => acc + (o.supply || 0), 0);
  const totalDemand = destinations.reduce((acc, d) => acc + (d.demand || 0), 0);
  return {
    totalSupply,
    totalDemand,
    isBalanced: totalSupply === totalDemand,
    diff: totalSupply - totalDemand,
  };
}

/**
 * Standardize matrix by adding dummy origin or dummy destination if unbalanced
 */
export function getBalancedMatrix(
  origins: Origin[],
  destinations: Destination[],
  costMatrix: CostMatrix
) {
  const { totalSupply, totalDemand, isBalanced, diff } = checkBalance(origins, destinations);
  let balancedOrigins = origins.map((o) => ({ ...o }));
  let balancedDestinations = destinations.map((d) => ({ ...d }));
  let balancedCosts = costMatrix.map((row) => [...row]);

  if (isBalanced) {
    return { origins: balancedOrigins, destinations: balancedDestinations, costMatrix: balancedCosts, isDummyAdded: false };
  }

  if (diff > 0) {
    // Supply > Demand -> Add Dummy Destination
    balancedDestinations.push({
      id: 'dummy_dest',
      name: '虚设销地 (Dummy)',
      demand: diff,
    });
    balancedCosts = balancedCosts.map((row) => [...row, 0]);
  } else {
    // Supply < Demand -> Add Dummy Origin
    balancedOrigins.push({
      id: 'dummy_origin',
      name: '虚设产地 (Dummy)',
      supply: Math.abs(diff),
    });
    balancedCosts.push(new Array(balancedDestinations.length).fill(0));
  }

  return { origins: balancedOrigins, destinations: balancedDestinations, costMatrix: balancedCosts, isDummyAdded: true };
}

/**
 * Calculate total transportation cost
 */
export function calculateTotalCost(allocation: AllocationMatrix, costMatrix: CostMatrix): number {
  let total = 0;
  for (let i = 0; i < allocation.length; i++) {
    for (let j = 0; j < allocation[i].length; j++) {
      if (allocation[i][j] > 0 && costMatrix[i][j] < BIG_M) {
        total += allocation[i][j] * costMatrix[i][j];
      }
    }
  }
  return total;
}

/**
 * Northwest Corner Method (西北角法)
 */
export function solveNorthwestCorner(
  origins: Origin[],
  destinations: Destination[],
  costMatrix: CostMatrix
): { allocation: AllocationMatrix; steps: StepDetail[] } {
  const m = origins.length;
  const n = destinations.length;
  const allocation: AllocationMatrix = Array.from({ length: m }, () => new Array(n).fill(0));
  const steps: StepDetail[] = [];

  const supply = origins.map((o) => o.supply);
  const demand = destinations.map((d) => d.demand);

  let i = 0;
  let j = 0;
  let stepNum = 1;

  while (i < m && j < n) {
    const qty = Math.min(supply[i], demand[j]);
    allocation[i][j] = qty;
    supply[i] -= qty;
    demand[j] -= qty;

    steps.push({
      stepNumber: stepNum++,
      description: `【西北角法】在单元格 (${origins[i].name}, ${destinations[j].name}) 分配运量 ${qty}。剩余供应量: ${supply[i]}, 剩余需求量: ${demand[j]}。`,
      allocation: allocation.map((r) => [...r]),
      currentCell: { row: i, col: j },
    });

    if (supply[i] === 0 && demand[j] === 0) {
      // Degeneracy prevention when both supply & demand hit 0 simultaneously
      i++;
      if (i < m && j < n) {
        demand[j] = 0; // proceed
      }
    } else if (supply[i] === 0) {
      i++;
    } else {
      j++;
    }
  }

  return { allocation, steps };
}

/**
 * Least Cost Method / Minimum Element Method (最小元素法)
 */
export function solveLeastCost(
  origins: Origin[],
  destinations: Destination[],
  costMatrix: CostMatrix
): { allocation: AllocationMatrix; steps: StepDetail[] } {
  const m = origins.length;
  const n = destinations.length;
  const allocation: AllocationMatrix = Array.from({ length: m }, () => new Array(n).fill(0));
  const steps: StepDetail[] = [];

  const supply = origins.map((o) => o.supply);
  const demand = destinations.map((d) => d.demand);
  const visited: boolean[][] = Array.from({ length: m }, () => new Array(n).fill(false));

  let stepNum = 1;

  while (true) {
    let minCost = Infinity;
    let minRow = -1;
    let minCol = -1;

    for (let i = 0; i < m; i++) {
      if (supply[i] <= 0) continue;
      for (let j = 0; j < n; j++) {
        if (demand[j] <= 0) continue;
        if (!visited[i][j] && costMatrix[i][j] < minCost) {
          minCost = costMatrix[i][j];
          minRow = i;
          minCol = j;
        }
      }
    }

    if (minRow === -1 || minCol === -1) break;

    visited[minRow][minCol] = true;
    const qty = Math.min(supply[minRow], demand[minCol]);
    allocation[minRow][minCol] = qty;
    supply[minRow] -= qty;
    demand[minCol] -= qty;

    steps.push({
      stepNumber: stepNum++,
      description: `【最小元素法】选择当前未填格中最小单位运价 ${minCost >= BIG_M ? 'M' : minCost} 的单元格 (${origins[minRow].name}, ${destinations[minCol].name})，分配运量 ${qty}。`,
      allocation: allocation.map((r) => [...r]),
      currentCell: { row: minRow, col: minCol },
    });
  }

  return { allocation, steps };
}

/**
 * Vogel's Approximation Method (伏格尔法 / VAM)
 */
export function solveVogel(
  origins: Origin[],
  destinations: Destination[],
  costMatrix: CostMatrix
): { allocation: AllocationMatrix; steps: StepDetail[] } {
  const m = origins.length;
  const n = destinations.length;
  const allocation: AllocationMatrix = Array.from({ length: m }, () => new Array(n).fill(0));
  const steps: StepDetail[] = [];

  const supply = origins.map((o) => o.supply);
  const demand = destinations.map((d) => d.demand);
  const rowActive = new Array(m).fill(true);
  const colActive = new Array(n).fill(true);

  let stepNum = 1;

  while (rowActive.some((r) => r) && colActive.some((c) => c)) {
    // Compute Row Penalties
    const rowPenalties: (number | null)[] = new Array(m).fill(null);
    for (let i = 0; i < m; i++) {
      if (!rowActive[i] || supply[i] <= 0) continue;
      const costs: number[] = [];
      for (let j = 0; j < n; j++) {
        if (colActive[j] && demand[j] > 0) {
          costs.push(costMatrix[i][j]);
        }
      }
      costs.sort((a, b) => a - b);
      if (costs.length >= 2) {
        rowPenalties[i] = costs[1] - costs[0];
      } else if (costs.length === 1) {
        rowPenalties[i] = costs[0];
      }
    }

    // Compute Col Penalties
    const colPenalties: (number | null)[] = new Array(n).fill(null);
    for (let j = 0; j < n; j++) {
      if (!colActive[j] || demand[j] <= 0) continue;
      const costs: number[] = [];
      for (let i = 0; i < m; i++) {
        if (rowActive[i] && supply[i] > 0) {
          costs.push(costMatrix[i][j]);
        }
      }
      costs.sort((a, b) => a - b);
      if (costs.length >= 2) {
        colPenalties[j] = costs[1] - costs[0];
      } else if (costs.length === 1) {
        colPenalties[j] = costs[0];
      }
    }

    // Find Maximum Penalty
    let maxPenalty = -1;
    let isRowSelect = true;
    let selectedIndex = -1;

    for (let i = 0; i < m; i++) {
      if (rowPenalties[i] !== null && rowPenalties[i]! > maxPenalty) {
        maxPenalty = rowPenalties[i]!;
        isRowSelect = true;
        selectedIndex = i;
      }
    }

    for (let j = 0; j < n; j++) {
      if (colPenalties[j] !== null && colPenalties[j]! > maxPenalty) {
        maxPenalty = colPenalties[j]!;
        isRowSelect = false;
        selectedIndex = j;
      }
    }

    if (selectedIndex === -1) break;

    // Pick cell with lowest cost in selected row or column
    let targetRow = -1;
    let targetCol = -1;
    let minCost = Infinity;

    if (isRowSelect) {
      targetRow = selectedIndex;
      for (let j = 0; j < n; j++) {
        if (colActive[j] && demand[j] > 0 && costMatrix[targetRow][j] < minCost) {
          minCost = costMatrix[targetRow][j];
          targetCol = j;
        }
      }
    } else {
      targetCol = selectedIndex;
      for (let i = 0; i < m; i++) {
        if (rowActive[i] && supply[i] > 0 && costMatrix[i][targetCol] < minCost) {
          minCost = costMatrix[i][targetCol];
          targetRow = i;
        }
      }
    }

    if (targetRow === -1 || targetCol === -1) break;

    const qty = Math.min(supply[targetRow], demand[targetCol]);
    allocation[targetRow][targetCol] = qty;
    supply[targetRow] -= qty;
    demand[targetCol] -= qty;

    if (supply[targetRow] === 0) rowActive[targetRow] = false;
    if (demand[targetCol] === 0) colActive[targetCol] = false;

    steps.push({
      stepNumber: stepNum++,
      description: `【伏格尔法(VAM)】计算罚码：选择最大罚值 (${isRowSelect ? `产地 ${origins[targetRow].name}` : `销地 ${destinations[targetCol].name}`}, 罚码=${maxPenalty})，在其对应方向填入最小单位运价格 (${origins[targetRow].name}, ${destinations[targetCol].name})，分配运量 ${qty}。`,
      allocation: allocation.map((r) => [...r]),
      currentCell: { row: targetRow, col: targetCol },
      penalties: { rowPenalties, colPenalties },
    });
  }

  return { allocation, steps };
}

/**
 * Check and resolve degeneracy by marking zero-basic cells with EPSILON indicator if basic variables count < m + n - 1
 */
export function getBasicVariablesMask(allocation: AllocationMatrix, m: number, n: number): boolean[][] {
  const isBasic: boolean[][] = Array.from({ length: m }, () => new Array(n).fill(false));
  let count = 0;

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (allocation[i][j] > 0) {
        isBasic[i][j] = true;
        count++;
      }
    }
  }

  // Handle degeneracy: need m + n - 1 basic variables
  const required = m + n - 1;
  if (count < required) {
    const needed = required - count;
    let added = 0;
    // Add non-basic zero allocation cells that don't form a loop
    for (let i = 0; i < m && added < needed; i++) {
      for (let j = 0; j < n && added < needed; j++) {
        if (!isBasic[i][j]) {
          if (!findClosedLoop(isBasic, i, j)) {
            isBasic[i][j] = true;
            added++;
          }
        }
      }
    }
  }

  return isBasic;
}

/**
 * MODI / Potential Method: Compute u_i and v_j potentials
 */
export function calculatePotentials(
  costMatrix: CostMatrix,
  isBasic: boolean[][]
): { u: (number | null)[]; v: (number | null)[] } {
  const m = costMatrix.length;
  const n = costMatrix[0].length;

  const u: (number | null)[] = new Array(m).fill(null);
  const v: (number | null)[] = new Array(n).fill(null);

  u[0] = 0; // Set u1 = 0 as standard reference

  let iterations = 0;

  while (iterations < (m + n) * 2) {
    let changed = false;

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (isBasic[i][j]) {
          if (u[i] !== null && v[j] === null) {
            v[j] = costMatrix[i][j] - u[i]!;
            changed = true;
          } else if (v[j] !== null && u[i] === null) {
            u[i] = costMatrix[i][j] - v[j]!;
            changed = true;
          }
        }
      }
    }

    if (!changed) {
      const unassignedU = u.findIndex((val) => val === null);
      if (unassignedU !== -1) {
        u[unassignedU] = 0;
      } else {
        const unassignedV = v.findIndex((val) => val === null);
        if (unassignedV !== -1) {
          v[unassignedV] = 0;
        } else {
          break; // All assigned
        }
      }
    }
    iterations++;
  }

  for (let i = 0; i < m; i++) if (u[i] === null) u[i] = 0;
  for (let j = 0; j < n; j++) if (v[j] === null) v[j] = 0;

  return { u, v };
}

/**
 * Calculate Reduced Costs / Opportunity Costs (检验数 sigma_ij = c_ij - (u_i + v_j))
 */
export function calculateReducedCosts(
  costMatrix: CostMatrix,
  u: (number | null)[],
  v: (number | null)[],
  isBasic: boolean[][]
): (number | null)[][] {
  const m = costMatrix.length;
  const n = costMatrix[0].length;
  const reducedCosts: (number | null)[][] = Array.from({ length: m }, () => new Array(n).fill(null));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (!isBasic[i][j] && u[i] !== null && v[j] !== null) {
        reducedCosts[i][j] = costMatrix[i][j] - (u[i]! + v[j]!);
      }
    }
  }

  return reducedCosts;
}

/**
 * Find Closed Loop starting from entering cell (enterR, enterC) through basic cells
 */
export function findClosedLoop(
  isBasic: boolean[][],
  enterR: number,
  enterC: number
): { row: number; col: number; sign: '+' | '-' }[] | null {
  const m = isBasic.length;
  const n = isBasic[0].length;

  const trySearch = (startHorizontal: boolean) => {
    const path: { row: number; col: number }[] = [{ row: enterR, col: enterC }];

    function dfs(currR: number, currC: number, moveHorizontal: boolean): boolean {
      if (moveHorizontal) {
        for (let j = 0; j < n; j++) {
          if (j === currC) continue;
          if (j === enterC && currR === enterR) {
            if (path.length >= 4 && path.length % 2 === 0) {
              return true;
            }
          } else if (isBasic[currR][j]) {
            if (!path.some((p) => p.row === currR && p.col === j)) {
              path.push({ row: currR, col: j });
              if (dfs(currR, j, false)) return true;
              path.pop();
            }
          }
        }
      } else {
        for (let i = 0; i < m; i++) {
          if (i === currR) continue;
          if (i === enterR && currC === enterC) {
            if (path.length >= 4 && path.length % 2 === 0) {
              return true;
            }
          } else if (isBasic[i][currC]) {
            if (!path.some((p) => p.row === i && p.col === currC)) {
              path.push({ row: i, col: currC });
              if (dfs(i, currC, true)) return true;
              path.pop();
            }
          }
        }
      }
      return false;
    }

    if (dfs(enterR, enterC, startHorizontal)) {
      return path.map((p, idx) => ({ ...p, sign: (idx % 2 === 0 ? '+' : '-') as '+' | '-' }));
    }
    return null;
  };

  return trySearch(true) || trySearch(false);
}

/**
 * Full Transportation Simplex Solver (表上作业法全拆解引擎)
 */
export function solveTransportationSimplex(
  origins: Origin[],
  destinations: Destination[],
  costMatrix: CostMatrix,
  initialMethod: InitialMethod = 'vogel'
): {
  finalAllocation: AllocationMatrix;
  finalCost: number;
  steps: StepDetail[];
  isBalanced: boolean;
} {
  const balanced = getBalancedMatrix(origins, destinations, costMatrix);
  const m = balanced.origins.length;
  const n = balanced.destinations.length;

  // Step 1: Compute Initial Feasible Solution
  let initialRes: { allocation: AllocationMatrix; steps: StepDetail[] };
  if (initialMethod === 'northwest') {
    initialRes = solveNorthwestCorner(balanced.origins, balanced.destinations, balanced.costMatrix);
  } else if (initialMethod === 'leastCost') {
    initialRes = solveLeastCost(balanced.origins, balanced.destinations, balanced.costMatrix);
  } else {
    initialRes = solveVogel(balanced.origins, balanced.destinations, balanced.costMatrix);
  }

  let allocation = initialRes.allocation.map((r) => [...r]);

  const methodNameMap: Record<InitialMethod, string> = {
    vogel: '伏格尔法 (VAM)',
    leastCost: '最小元素法',
    northwest: '西北角法',
  };

  const steps: StepDetail[] = [];

  // Initial feasible allocation state
  let isBasic = getBasicVariablesMask(allocation, m, n);
  let pots = calculatePotentials(balanced.costMatrix, isBasic);
  let reducedCosts = calculateReducedCosts(balanced.costMatrix, pots.u, pots.v, isBasic);
  let initialCost = calculateTotalCost(allocation, balanced.costMatrix);

  steps.push({
    stepNumber: 1,
    description: `【初始可行调运表】采用 [${methodNameMap[initialMethod]}] 生成初始可行分配表，初始总运费: ¥${initialCost}。接下来直接进行位势计算与检验数 (σ_ij) 最优性判定。`,
    allocation: allocation.map((r) => [...r]),
    uPotentials: pots.u,
    vPotentials: pots.v,
    reducedCosts,
  });

  let isOptimal = false;
  let iteration = 0;
  const maxIterations = 25;

  while (!isOptimal && iteration < maxIterations) {
    iteration++;

    isBasic = getBasicVariablesMask(allocation, m, n);
    pots = calculatePotentials(balanced.costMatrix, isBasic);
    reducedCosts = calculateReducedCosts(balanced.costMatrix, pots.u, pots.v, isBasic);

    // Select entering variable with most negative reduced cost
    let minSigma = -1e-6;
    let enterR = -1;
    let enterC = -1;

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (reducedCosts[i][j] !== null && reducedCosts[i][j]! < minSigma) {
          minSigma = reducedCosts[i][j]!;
          enterR = i;
          enterC = j;
        }
      }
    }

    const currentCost = calculateTotalCost(allocation, balanced.costMatrix);

    if (enterR === -1 || enterC === -1) {
      isOptimal = true;
      if (steps.length > 0) {
        steps[steps.length - 1].isOptimal = true;
      }
      break;
    }

    // Construct Closed Loop for entering cell
    const closedLoop = findClosedLoop(isBasic, enterR, enterC);

    if (!closedLoop || closedLoop.length === 0) {
      isOptimal = true;
      if (steps.length > 0) {
        steps[steps.length - 1].isOptimal = true;
      }
      break;
    }

    // Determine theta = min(x_kl for '-' cells in loop) & Find Leaving Cell
    let theta = Infinity;
    let leaveR = -1;
    let leaveC = -1;

    for (const cell of closedLoop) {
      if (cell.sign === '-') {
        const val = allocation[cell.row][cell.col];
        if (val < theta) {
          theta = val;
          leaveR = cell.row;
          leaveC = cell.col;
        }
      }
    }

    if (theta === Infinity) theta = 0;

    // Record Step: Negative Reduced Cost Alert & Closed Loop Tracing
    steps.push({
      stepNumber: steps.length + 1,
      description: `【第 ${iteration} 轮迭代：检验数判定与闭回路构建】检测到最负检验数 σ_min = ${minSigma} < 0（单元格: ${balanced.origins[enterR].name} → ${balanced.destinations[enterC].name}）。选定其为入基变量，构建闭回路，确定调整量 θ = min{负角顶点} = ${theta}，锁定出基变量 (${balanced.origins[leaveR]?.name || '出基'} → ${balanced.destinations[leaveC]?.name || ''})。`,
      allocation: allocation.map((r) => [...r]),
      uPotentials: pots.u,
      vPotentials: pots.v,
      reducedCosts,
      enteringCell: { row: enterR, col: enterC },
      leavingCell: leaveR !== -1 ? { row: leaveR, col: leaveC } : undefined,
      closedLoop,
      theta,
      phase: 'tracing',
    });

    // Adjust allocation matrix along loop
    for (const cell of closedLoop) {
      if (cell.sign === '+') {
        allocation[cell.row][cell.col] += theta;
      } else {
        allocation[cell.row][cell.col] -= theta;
      }
    }

    const nextIsBasic = getBasicVariablesMask(allocation, m, n);
    const nextPots = calculatePotentials(balanced.costMatrix, nextIsBasic);
    const nextReducedCosts = calculateReducedCosts(balanced.costMatrix, nextPots.u, nextPots.v, nextIsBasic);
    const nextCost = calculateTotalCost(allocation, balanced.costMatrix);
    const costSaved = currentCost - nextCost;

    // Record Step: Allocation Reallocation Execution Result
    steps.push({
      stepNumber: steps.length + 1,
      description: `【第 ${iteration} 轮迭代：闭回路运量重配完成】沿闭回路 (+θ / -θ) 完成运量调整：入基格填入运量 ${theta}，出基格扣减归 0。调运总成本从 ¥${currentCost} 下降至 ¥${nextCost}（节约 ¥${costSaved}）。`,
      allocation: allocation.map((r) => [...r]),
      uPotentials: nextPots.u,
      vPotentials: nextPots.v,
      reducedCosts: nextReducedCosts,
      enteringCell: { row: enterR, col: enterC },
      leavingCell: leaveR !== -1 ? { row: leaveR, col: leaveC } : undefined,
      closedLoop,
      theta,
      phase: 'adjusted',
    });
  }

  const lastStep = steps[steps.length - 1];
  if (lastStep) {
    lastStep.isOptimal = true;
  }

  const finalCost = calculateTotalCost(allocation, balanced.costMatrix);

  return {
    finalAllocation: allocation,
    finalCost,
    steps,
    isBalanced: balanced.isDummyAdded === false,
  };
}
