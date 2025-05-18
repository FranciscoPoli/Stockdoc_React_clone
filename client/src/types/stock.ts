export interface StockInfo {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  earningsDate?: Date | null;
  exDividendDate?: Date | null;
  // Additional metrics from Yahoo Finance
  peRatio?: number | null;
  forwardPE?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;
  volume?: number | null;
  avgVolume?: number | null;
  high52Week?: number | null;
  low52Week?: number | null;
  beta?: number | null;
  roa?: number | null;
  roe?: number | null;
}

export interface ComparisonStock {
  symbol: string;
  name: string;
  color: string;
  isActive: boolean;
}

export interface StockMetric {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: string;
}

export type DataFrequency = "annual" | "quarterly" | "ttm";

export interface FinancialDataPoint {
  year: string;
  value: number;
}

export interface FinancialData {
  revenue: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
  netIncome: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
  cash: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
  debt: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
  sharesOutstanding: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
  stockBasedCompensation: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
  grossMargin: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
  netMargin: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
  freeCashFlow: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
  capex: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
  dividends: {
    quarterly: FinancialDataPoint[];
  };
  payoutRatio: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
    ttm?: FinancialDataPoint[];
  };
}

export interface ValuationMetric {
  date: string;
  price: number;
  pe: number | null;
  ps: number | null;
  pfcf: number | null;
  pocf: number | null;
}

export interface ValuationData {
  symbol: string;
  metrics: ValuationMetric[];
}

export type ValuationMetricType = 'pe' | 'ps' | 'pfcf' | 'pocf';
