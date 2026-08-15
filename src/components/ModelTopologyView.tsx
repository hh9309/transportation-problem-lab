import React, { useState } from 'react';
import { Origin, Destination, CostMatrix, AllocationMatrix } from '../types';
import { calculateTotalCost, BIG_M } from '../utils/transportationAlgorithms';
import { Network, Activity, ArrowRight, Info, CheckCircle2 } from 'lucide-react';

interface ModelTopologyViewProps {
  origins: Origin[];
  destinations: Destination[];
  costMatrix: CostMatrix;
  allocation: AllocationMatrix;
}

export const ModelTopologyView: React.FC<ModelTopologyViewProps> = ({
  origins,
  destinations,
  costMatrix,
  allocation,
}) => {
  const [hoveredEdge, setHoveredEdge] = useState<{ originIndex: number; destIndex: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ type: 'origin' | 'dest'; index: number } | null>(null);

  const totalCost = calculateTotalCost(allocation, costMatrix);

  // Active routes count
  let activeRoutes = 0;
  for (let i = 0; i < allocation.length; i++) {
    for (let j = 0; j < allocation[i].length; j++) {
      if (allocation[i][j] > 0) activeRoutes++;
    }
  }

  // Calculate coordinates for SVG network
  const svgWidth = 800;
  const svgHeight = Math.max(origins.length, destinations.length) * 90 + 100;

  const leftX = 140;
  const rightX = svgWidth - 140;

  const getOriginY = (index: number) => {
    const spacing = (svgHeight - 120) / Math.max(origins.length - 1, 1);
    return origins.length === 1 ? svgHeight / 2 : 70 + index * spacing;
  };

  const getDestY = (index: number) => {
    const spacing = (svgHeight - 120) / Math.max(destinations.length - 1, 1);
    return destinations.length === 1 ? svgHeight / 2 : 70 + index * spacing;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Slice: Operations Research Model Formulation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">1. 产销平衡运输问题运筹学数学模型</h2>
            <p className="text-xs text-slate-400">
              Operations Research Standard Linear Programming Model Formulation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-sm">
          {/* Objective Function */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-indigo-400 font-sans font-semibold uppercase tracking-wider block mb-1">
              目标函数 (Objective)
            </span>
            <div className="text-slate-200 font-semibold text-base">
              min Z = ∑<sub>i=1</sub><sup>m</sup> ∑<sub>j=1</sub><sup>n</sup> c<sub>ij</sub> · x<sub>ij</sub>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-2">
              极小化总运输费用，其中 c<sub>ij</sub> 为单位运价，x<sub>ij</sub> 为实际调运量。
            </p>
          </div>

          {/* Supply Constraints */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-emerald-400 font-sans font-semibold uppercase tracking-wider block mb-1">
              产地产能约束 (Supply)
            </span>
            <div className="text-slate-200 font-semibold text-base">
              ∑<sub>j=1</sub><sup>n</sup> x<sub>ij</sub> = a<sub>i</sub>, ∀i = 1...m
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-2">
              每个产地 i 运出的货物总量等于其总供应量 a<sub>i</sub>。
            </p>
          </div>

          {/* Demand Constraints */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-amber-400 font-sans font-semibold uppercase tracking-wider block mb-1">
              销地需求约束 (Demand)
            </span>
            <div className="text-slate-200 font-semibold text-base">
              ∑<sub>i=1</sub><sup>m</sup> x<sub>ij</sub> = b<sub>j</sub>, ∀j = 1...n &amp; x<sub>ij</sub> ≥ 0
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-2">
              每个销地 j 运入的货物总量等于其总需求量 b<sub>j</sub>，且调运量非负。
            </p>
          </div>
        </div>
      </div>

      {/* Main Slice: Interactive Network Topology Graph */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              二分图运力拓扑网络 graph (Bipartite Capacity Network)
            </h3>
            <p className="text-xs text-slate-500">
              悬浮路线或节点以高亮对应干线的单位运价 c<sub>ij</sub> 与分派运量 x<sub>ij</sub>。粗线代表高流量干线。
            </p>
          </div>

          {/* KPI Summary Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-500">当前总运费: </span>
              <span className="font-bold text-indigo-600 font-mono text-sm">¥{totalCost}</span>
            </div>
            <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-500">激活干线: </span>
              <span className="font-bold text-emerald-600 font-mono text-sm">{activeRoutes} 条</span>
            </div>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="mt-4 overflow-x-auto flex justify-center bg-slate-950 rounded-xl p-4 border border-slate-800">
          <svg width={svgWidth} height={svgHeight} className="max-w-full">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="28"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="28"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
              </marker>
            </defs>

            {/* Render Edges */}
            {origins.map((origin, i) => {
              const startY = getOriginY(i);
              return destinations.map((dest, j) => {
                const endY = getDestY(j);
                const flow = allocation[i]?.[j] || 0;
                const unitCost = costMatrix[i]?.[j] || 0;
                const isBlocked = unitCost >= BIG_M;
                const isActive = flow > 0;

                const isEdgeHovered =
                  hoveredEdge?.originIndex === i && hoveredEdge?.destIndex === j;
                const isNodeHovered =
                  (hoveredNode?.type === 'origin' && hoveredNode.index === i) ||
                  (hoveredNode?.type === 'dest' && hoveredNode.index === j);

                const isHighlighted = isEdgeHovered || isNodeHovered;

                // Line stroke weight
                const strokeWidth = isActive ? Math.max(2, Math.min(8, flow / 15)) : 1;
                const strokeColor = isBlocked
                  ? '#ef4444'
                  : isActive
                  ? isHighlighted
                    ? '#34d399'
                    : '#10b981'
                  : isHighlighted
                  ? '#818cf8'
                  : '#334155';

                const midX = (leftX + rightX) / 2;
                const midY = (startY + endY) / 2;

                return (
                  <g
                    key={`edge-${i}-${j}`}
                    onMouseEnter={() => setHoveredEdge({ originIndex: i, destIndex: j })}
                    onMouseLeave={() => setHoveredEdge(null)}
                    className="cursor-pointer transition-all"
                  >
                    <line
                      x1={leftX}
                      y1={startY}
                      x2={rightX}
                      y2={endY}
                      stroke={strokeColor}
                      strokeWidth={isHighlighted ? strokeWidth + 2 : strokeWidth}
                      strokeDasharray={isBlocked ? '4 4' : isActive ? 'none' : '2 2'}
                      opacity={isHighlighted ? 1 : isActive ? 0.85 : 0.25}
                      markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow)'}
                    />

                    {/* Edge Label for Active or Hovered routes */}
                    {(isActive || isHighlighted) && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-36"
                          y="-14"
                          width="72"
                          height="28"
                          rx="6"
                          fill="#0f172a"
                          stroke={isActive ? '#10b981' : '#6366f1'}
                          strokeWidth="1.5"
                        />
                        <text
                          x="0"
                          y="-2"
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {isBlocked ? '禁运 M' : `运价 ¥${unitCost}`}
                        </text>
                        <text
                          x="0"
                          y="10"
                          textAnchor="middle"
                          fill={isActive ? '#34d399' : '#94a3b8'}
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          运量: {flow}
                        </text>
                      </g>
                    )}
                  </g>
                );
              });
            })}

            {/* Render Origins (Left Side Nodes) */}
            {origins.map((origin, i) => {
              const y = getOriginY(i);
              const totalOut = allocation[i]?.reduce((a, b) => a + b, 0) || 0;
              const isHovered = hoveredNode?.type === 'origin' && hoveredNode.index === i;

              return (
                <g
                  key={`origin-${origin.id}`}
                  transform={`translate(${leftX}, ${y})`}
                  onMouseEnter={() => setHoveredNode({ type: 'origin', index: i })}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                >
                  <circle
                    r={isHovered ? 26 : 22}
                    fill="#1e1b4b"
                    stroke={isHovered ? '#818cf8' : '#6366f1'}
                    strokeWidth="3"
                    className="transition-all duration-200 shadow-lg"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    S{i + 1}
                  </text>

                  {/* Label Card */}
                  <text
                    x="-35"
                    y="2"
                    textAnchor="end"
                    fill="#f1f5f9"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {origin.name}
                  </text>
                  <text
                    x="-35"
                    y="18"
                    textAnchor="end"
                    fill="#818cf8"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    供应: {origin.supply} (发: {totalOut})
                  </text>
                </g>
              );
            })}

            {/* Render Destinations (Right Side Nodes) */}
            {destinations.map((dest, j) => {
              const y = getDestY(j);
              let totalIn = 0;
              for (let i = 0; i < origins.length; i++) {
                totalIn += allocation[i]?.[j] || 0;
              }
              const isHovered = hoveredNode?.type === 'dest' && hoveredNode.index === j;

              return (
                <g
                  key={`dest-${dest.id}`}
                  transform={`translate(${rightX}, ${y})`}
                  onMouseEnter={() => setHoveredNode({ type: 'dest', index: j })}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                >
                  <circle
                    r={isHovered ? 26 : 22}
                    fill="#064e3b"
                    stroke={isHovered ? '#34d399' : '#10b981'}
                    strokeWidth="3"
                    className="transition-all duration-200 shadow-lg"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    D{j + 1}
                  </text>

                  {/* Label Card */}
                  <text
                    x="35"
                    y="2"
                    textAnchor="start"
                    fill="#f1f5f9"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {dest.name}
                  </text>
                  <text
                    x="35"
                    y="18"
                    textAnchor="start"
                    fill="#34d399"
                    fontSize="11"
                    fontFamily="monospace"
                  >
                    需求: {dest.demand} (收: {totalIn})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Information Box */}
        {hoveredEdge && (
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>
                选中干线：<strong>{origins[hoveredEdge.originIndex].name}</strong> →{' '}
                <strong>{destinations[hoveredEdge.destIndex].name}</strong>
              </span>
            </div>
            <div className="font-mono space-x-3">
              <span>单位运价 c<sub>ij</sub>: ¥{costMatrix[hoveredEdge.originIndex][hoveredEdge.destIndex] >= BIG_M ? 'M (禁运)' : costMatrix[hoveredEdge.originIndex][hoveredEdge.destIndex]}</span>
              <span>分派运量 x<sub>ij</sub>: {allocation[hoveredEdge.originIndex]?.[hoveredEdge.destIndex] || 0}</span>
              <span className="font-bold text-indigo-700">
                干线总支出: ¥
                {(allocation[hoveredEdge.originIndex]?.[hoveredEdge.destIndex] || 0) *
                  costMatrix[hoveredEdge.originIndex][hoveredEdge.destIndex]}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
