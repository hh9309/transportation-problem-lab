import React from 'react';
import { Origin, Destination, CostMatrix, AllocationMatrix } from '../types';
import { calculateTotalCost, checkBalance, BIG_M } from '../utils/transportationAlgorithms';
import { Plus, Trash2, Shuffle, RotateCcw, Scale, Check, AlertCircle } from 'lucide-react';

interface MatrixSandboxProps {
  origins: Origin[];
  destinations: Destination[];
  costMatrix: CostMatrix;
  allocation: AllocationMatrix;
  onChangeOrigins: (origins: Origin[]) => void;
  onChangeDestinations: (destinations: Destination[]) => void;
  onChangeCostMatrix: (costs: CostMatrix) => void;
  onBalanceMatrix: () => void;
}

export const MatrixSandbox: React.FC<MatrixSandboxProps> = ({
  origins,
  destinations,
  costMatrix,
  allocation,
  onChangeOrigins,
  onChangeDestinations,
  onChangeCostMatrix,
  onBalanceMatrix,
}) => {
  const { totalSupply, totalDemand, isBalanced, diff } = checkBalance(origins, destinations);
  const totalCost = calculateTotalCost(allocation, costMatrix);

  // Update cost at specific cell [i][j]
  const handleCostChange = (i: number, j: number, value: string) => {
    let newCost = parseInt(value, 10);
    if (isNaN(newCost) || newCost < 0) newCost = 0;
    const newCosts = costMatrix.map((row) => [...row]);
    newCosts[i][j] = newCost;
    onChangeCostMatrix(newCosts);
  };

  // Update origin supply
  const handleSupplyChange = (i: number, value: string) => {
    let val = parseInt(value, 10);
    if (isNaN(val) || val < 0) val = 0;
    const newOrigins = [...origins];
    newOrigins[i] = { ...newOrigins[i], supply: val };
    onChangeOrigins(newOrigins);
  };

  // Update origin name
  const handleOriginNameChange = (i: number, value: string) => {
    const newOrigins = [...origins];
    newOrigins[i] = { ...newOrigins[i], name: value };
    onChangeOrigins(newOrigins);
  };

  // Update destination demand
  const handleDemandChange = (j: number, value: string) => {
    let val = parseInt(value, 10);
    if (isNaN(val) || val < 0) val = 0;
    const newDests = [...destinations];
    newDests[j] = { ...newDests[j], demand: val };
    onChangeDestinations(newDests);
  };

  // Update destination name
  const handleDestNameChange = (j: number, value: string) => {
    const newDests = [...destinations];
    newDests[j] = { ...newDests[j], name: value };
    onChangeDestinations(newDests);
  };

  // Add new origin
  const handleAddOrigin = () => {
    const newId = `s_${Date.now()}`;
    const newName = `产地 S${origins.length + 1}`;
    const newOrigins = [...origins, { id: newId, name: newName, supply: 100 }];
    const newCosts = costMatrix.map((row) => [...row]);
    newCosts.push(new Array(destinations.length).fill(10));
    onChangeOrigins(newOrigins);
    onChangeCostMatrix(newCosts);
  };

  // Remove origin
  const handleRemoveOrigin = (index: number) => {
    if (origins.length <= 1) return;
    const newOrigins = origins.filter((_, idx) => idx !== index);
    const newCosts = costMatrix.filter((_, idx) => idx !== index);
    onChangeOrigins(newOrigins);
    onChangeCostMatrix(newCosts);
  };

  // Add new destination
  const handleAddDestination = () => {
    const newId = `d_${Date.now()}`;
    const newName = `销地 D${destinations.length + 1}`;
    const newDests = [...destinations, { id: newId, name: newName, demand: 100 }];
    const newCosts = costMatrix.map((row) => [...row, 10]);
    onChangeDestinations(newDests);
    onChangeCostMatrix(newCosts);
  };

  // Remove destination
  const handleRemoveDestination = (index: number) => {
    if (destinations.length <= 1) return;
    const newDests = destinations.filter((_, idx) => idx !== index);
    const newCosts = costMatrix.map((row) => row.filter((_, idx) => idx !== index));
    onChangeDestinations(newDests);
    onChangeCostMatrix(newCosts);
  };

  // Randomize costs
  const handleRandomizeCosts = () => {
    const newCosts = origins.map(() =>
      destinations.map(() => Math.floor(Math.random() * 25) + 5)
    );
    onChangeCostMatrix(newCosts);
  };

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            2. 可编辑运输矩阵沙盒 (Editable Transportation Matrix Sandbox)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            实时修改产地产量 a_i、销地需求 b_j 及单位运价 C_ij，观察调运总支出变动。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddOrigin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            添加产地
          </button>
          <button
            onClick={handleAddDestination}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            添加销地
          </button>
          <button
            onClick={handleRandomizeCosts}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            <Shuffle className="w-3.5 h-3.5" />
            随机运价
          </button>
          <button
            onClick={onBalanceMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition shadow-sm"
          >
            <Scale className="w-3.5 h-3.5" />
            补齐产销平衡
          </button>
        </div>
      </div>

      {/* Matrix Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
        <table className="w-full border-collapse text-xs text-slate-800">
          <thead>
            {/* Header Row: Destinations */}
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="p-3 text-left font-bold text-slate-700 bg-slate-200/80 min-w-[140px] border-r border-slate-300">
                产地 / 销地
              </th>
              {destinations.map((dest, j) => (
                <th key={dest.id} className="p-3 text-center font-bold border-r border-slate-300 min-w-[120px]">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <input
                      type="text"
                      value={dest.name}
                      onChange={(e) => handleDestNameChange(j, e.target.value)}
                      className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {destinations.length > 1 && (
                      <button
                        onClick={() => handleRemoveDestination(j)}
                        className="text-slate-400 hover:text-red-500 p-0.5"
                        title="删除销地"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal">销地 D{j + 1}</div>
                </th>
              ))}
              <th className="p-3 text-center font-bold bg-indigo-50/80 text-indigo-900 min-w-[110px]">
                供应量 $a_i$
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Matrix Rows: Origins */}
            {origins.map((origin, i) => (
              <tr key={origin.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition">
                {/* Origin Name & Delete */}
                <td className="p-3 font-semibold bg-slate-50 border-r border-slate-300">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <input
                      type="text"
                      value={origin.name}
                      onChange={(e) => handleOriginNameChange(i, e.target.value)}
                      className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {origins.length > 1 && (
                      <button
                        onClick={() => handleRemoveOrigin(i)}
                        className="text-slate-400 hover:text-red-500 p-0.5"
                        title="删除产地"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal">产地 S{i + 1}</div>
                </td>

                {/* Matrix Cost & Allocation Cells */}
                {destinations.map((dest, j) => {
                  const cost = costMatrix[i]?.[j] ?? 0;
                  const flow = allocation[i]?.[j] ?? 0;
                  const isBlocked = cost >= BIG_M;

                  return (
                    <td
                      key={`cell-${i}-${j}`}
                      className={`p-2 border-r border-slate-300 relative transition ${
                        flow > 0 ? 'bg-emerald-50/80' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        {/* Upper Right Mini Badge: Unit Cost Input */}
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] text-slate-400">运价:</span>
                          <input
                            type="number"
                            value={isBlocked ? 9999 : cost}
                            onChange={(e) => handleCostChange(i, j, e.target.value)}
                            className={`w-14 text-right border rounded px-1 py-0.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 ${
                              isBlocked
                                ? 'bg-red-100 border-red-300 text-red-700'
                                : 'bg-white border-slate-300 text-slate-800 focus:ring-indigo-500'
                            }`}
                          />
                        </div>

                        {/* Allocated Flow Display */}
                        <div className="mt-1 flex items-center justify-center w-full bg-slate-100/80 py-1 px-2 rounded border border-slate-200 font-mono">
                          <span className="text-[10px] text-slate-500 mr-1">运量 x:</span>
                          <span className={`font-bold ${flow > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {flow}
                          </span>
                        </div>
                      </div>
                    </td>
                  );
                })}

                {/* Supply Amount $a_i$ */}
                <td className="p-3 text-center bg-indigo-50/50 font-mono font-bold text-indigo-950">
                  <input
                    type="number"
                    value={origin.supply}
                    onChange={(e) => handleSupplyChange(i, e.target.value)}
                    className="w-20 text-center bg-white border border-indigo-300 rounded px-2 py-1 text-xs font-bold text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
              </tr>
            ))}

            {/* Bottom Row: Demand Amounts $b_j$ */}
            <tr className="bg-amber-50/60 font-bold border-t-2 border-slate-300">
              <td className="p-3 text-slate-900 bg-amber-100/80 border-r border-slate-300">
                需求量 $b_j$
              </td>
              {destinations.map((dest, j) => (
                <td key={`demand-${dest.id}`} className="p-3 text-center border-r border-slate-300 font-mono">
                  <input
                    type="number"
                    value={dest.demand}
                    onChange={(e) => handleDemandChange(j, e.target.value)}
                    className="w-20 text-center bg-white border border-amber-300 rounded px-2 py-1 text-xs font-bold text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </td>
              ))}
              {/* Balance Verification Bottom Right Cell */}
              <td className={`p-3 text-center font-mono font-bold ${
                isBalanced ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
              }`}>
                <div>∑a={totalSupply}</div>
                <div>∑b={totalDemand}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
