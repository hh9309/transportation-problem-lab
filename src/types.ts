export interface Origin {
  id: string;
  name: string;
  supply: number;
}

export interface Destination {
  id: string;
  name: string;
  demand: number;
}

export type CostMatrix = number[][]; // [originIndex][destinationIndex]
export type AllocationMatrix = number[][]; // [originIndex][destinationIndex]

export type InitialMethod = 'northwest' | 'leastCost' | 'vogel';

export interface StepDetail {
  stepNumber: number;
  description: string;
  allocation: AllocationMatrix;
  currentCell?: { row: number; col: number };
  penalties?: {
    rowPenalties?: (number | null)[];
    colPenalties?: (number | null)[];
  };
  uPotentials?: (number | null)[];
  vPotentials?: (number | null)[];
  reducedCosts?: (number | null)[][];
  closedLoop?: { row: number; col: number; sign: '+' | '-' }[];
  theta?: number;
  enteringCell?: { row: number; col: number };
  leavingCell?: { row: number; col: number };
  isOptimal?: boolean;
  phase?: 'tracing' | 'adjusted';
}

export interface CaseStudy {
  id: string;
  title: string;
  category: string;
  description: string;
  background: string;
  origins: Origin[];
  destinations: Destination[];
  costMatrix: CostMatrix;
  upperBounds?: number[][]; // for capacity bounds
  notes?: string;
}

export interface SolverResult {
  initialAllocation: AllocationMatrix;
  initialCost: number;
  finalAllocation: AllocationMatrix;
  finalCost: number;
  steps: StepDetail[];
  isBalanced: boolean;
  totalSupply: number;
  totalDemand: number;
}
