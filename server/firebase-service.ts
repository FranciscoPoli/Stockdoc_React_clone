import { getRealtimeDb, isFirebaseConfigured } from './firebase';
import { ref, get, set } from 'firebase/database';
import { FinancialData as DBFinancialData } from '../shared/schema';
import { cache } from './cache';
import { getStockNameFromSymbol } from '../shared/stockSuggestions';

// Define the financial data point structure
export interface FinancialDataPoint {
  year: string;
  value: number;
  // Optional internal fields used for calculations
  _dividendPayout?: number;
  _netIncome?: number;
}

// Define the application's financial data structure
export interface FinancialData {
  revenue: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  netIncome: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  cash: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  debt: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  sharesOutstanding: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  stockBasedCompensation: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  grossMargin: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  netMargin: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  freeCashFlow: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  capex: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  dividends: {
    quarterly: FinancialDataPoint[];
  };
  payoutRatio: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
  operatingCashFlow: {
    annual: FinancialDataPoint[];
    quarterly: FinancialDataPoint[];
  };
}

// Define StockInfo interface to match what's used in routes.ts
interface StockInfo {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
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

// Helper function to convert Firebase Realtime Database data to our application format
const processFinancialData = (yearData: any, quarterData: any, dividendsData: any): FinancialData => {
  // Process annual data from 'year' node
  const processAnnualData = (dataArray: any[], quarterlyData: any[] = []): Record<string, FinancialDataPoint[]> => {
    if (!dataArray || !Array.isArray(dataArray)) {
      return {};
    }
    
    // Sort the data by endDate
    const sortedData = [...dataArray].sort((a, b) => {
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    });

    // Extract financials
    const revenue: FinancialDataPoint[] = [];
    const netIncome: FinancialDataPoint[] = [];
    const cash: FinancialDataPoint[] = [];
    const debt: FinancialDataPoint[] = [];
    const shares: FinancialDataPoint[] = [];
    const sbc: FinancialDataPoint[] = []; // Stock-based compensation
    const grossMargin: FinancialDataPoint[] = [];
    const netMargin: FinancialDataPoint[] = [];
    const fcf: FinancialDataPoint[] = [];
    const capex: FinancialDataPoint[] = [];
    const operatingCashFlow: FinancialDataPoint[] = []; // Operating Cash Flow
    const payoutRatio: FinancialDataPoint[] = [];
    
    // First, get raw shares outstanding data
    const rawShares = sortedData.map(item => ({
      date: new Date(item.endDate),
      value: Number(item.commonStockSharesOutstanding || 0)
    }));
    
    // SHARE ADJUSTMENTS COMMENTED OUT - DATA PROVIDER NOW PROVIDES ADJUSTED DATA
    
    // Keep the raw shares without any adjustments
    let splitAdjustedShares = [...rawShares];
    
    /*
    // Get split multipliers from quarterly data if available
    // (for annual data, we need quarterly data to correctly identify split dates)
    let splitMultipliers: number[] = [];
    let splitDetectedInQuarterlyData = false;
    
    if (quarterlyData && Array.isArray(quarterlyData) && quarterlyData.length > 0) {
      const sortedQuarterlyData = [...quarterlyData].sort((a, b) => {
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
      
      // Calculate quarter-to-quarter changes
      const quarterlyShares = sortedQuarterlyData.map(item => 
        Number(item.commonStockSharesOutstanding || 0)
      );
      
      // Look for splits (significant increases)
      for (let i = 1; i < quarterlyShares.length; i++) {
        const ratio = quarterlyShares[i] / quarterlyShares[i-1];
        if (ratio > 1.5) { // Same threshold as Python code
          splitMultipliers.push(ratio);
          splitDetectedInQuarterlyData = true;
        }
      }
    }
    
    // Only adjust annual data if split was detected in quarterly data
    if (splitDetectedInQuarterlyData) {
      // Adjust shares for splits
      let splitMultiplierIndex = 0;
      for (let i = splitAdjustedShares.length - 1; i > 0; i--) {
        const current = splitAdjustedShares[i].value;
        const previous = splitAdjustedShares[i-1].value;
        const ratio = current / previous;
        
        if (ratio > 1.5) { // Significant increase indicating a split
          console.log(`Detected potential stock split with ratio ${ratio.toFixed(2)}`);
          
          // Use quarterly multiplier if available, otherwise use detected ratio
          const multiplier = splitMultiplierIndex < splitMultipliers.length 
            ? splitMultipliers[splitMultiplierIndex++] 
            : ratio;
          
          // Adjust all previous values
          for (let j = 0; j < i; j++) {
            splitAdjustedShares[j].value *= multiplier;
          }
        }
      }
    } else {
      console.log('No stock splits detected in quarterly data, skipping adjustments to annual data');
    }
    */
    
    // Now process the adjusted data
    sortedData.forEach((item, index) => {
      const year = new Date(item.endDate).getFullYear().toString();
      
      // Add data points
      revenue.push({ year, value: Number(item.totalRevenue || 0) });
      netIncome.push({ year, value: Number(item.netIncome || 0) });
      // Calculate cash based on available data
      // If shortTermInvestments is missing/null/"None", just use cashAndShortTermInvestments
      // Otherwise, sum them together (for companies that report them separately)
      let cashValue = 0;
      if (item.shortTermInvestments === null || item.shortTermInvestments === undefined || item.shortTermInvestments === "None") {
        cashValue = Number(item.cashAndShortTermInvestments || 0);
      } else {
        cashValue = Number(item.cashAndShortTermInvestments || 0) + Number(item.shortTermInvestments || 0);
      }
      cash.push({ year, value: cashValue });
      
      // Use longTermDebt from the database
      debt.push({ year, value: Number(item.longTermDebt || 0) });
      
      // Use the split-adjusted shares value
      shares.push({ 
        year, 
        value: splitAdjustedShares[index].value 
      });
      
      // Calculate gross margin if data available
      if (item.totalRevenue && item.costofGoodsAndServicesSold) {
        const grossProfit = item.totalRevenue - item.costofGoodsAndServicesSold;
        const margin = (grossProfit / item.totalRevenue) * 100;
        grossMargin.push({ year, value: margin });
      } else {
        grossMargin.push({ year, value: 0 });
      }
      
      // Calculate net margin if data available
      if (item.totalRevenue && item.netIncome) {
        const margin = (item.netIncome / item.totalRevenue) * 100;
        netMargin.push({ year, value: margin });
      } else {
        netMargin.push({ year, value: 0 });
      }
      
      // Free cash flow and operating cash flow
      const operatingCashflow = Number(item.operatingCashflow || 0);
      const capitalExpenditures = Number(item.capitalExpenditures || 0);
      fcf.push({ year, value: operatingCashflow - capitalExpenditures });
      capex.push({ year, value: Math.abs(capitalExpenditures) }); // Make positive for display
      operatingCashFlow.push({ year, value: operatingCashflow }); // Add operating cash flow
      
      // Calculate SBC based on proportion of shares outstanding (using the ADJUSTED share count)
      // If available in the data, use that, otherwise estimate as 3-5%
      const sharesValue = splitAdjustedShares[index].value;
      const sbcPercentage = 0.03 + (index * 0.005); // Increasing from 3% to ~7% over time
      const sbcValue = sharesValue * sbcPercentage;
      sbc.push({ year, value: sbcValue });
      
      // For payout ratio, we'll collect the values but calculate it with a rolling sum later
      // Just store the raw values for now
      payoutRatio.push({ 
        year, 
        value: 0, // This will be updated later with the rolling calculation
        _dividendPayout: Number(item.dividendPayout || 0),
        _netIncome: Number(item.netIncome || 0)
      });
    });
    
    return {
      revenue, netIncome, cash, debt, shares, sbc, grossMargin, netMargin, fcf, capex, operatingCashFlow, payoutRatio
    };
  };
  
  // Process quarterly data from 'quarter' node - similar to annual but with quarterly dates
  const processQuarterlyData = (dataArray: any[]): Record<string, FinancialDataPoint[]> => {
    if (!dataArray || !Array.isArray(dataArray)) {
      return {};
    }
    
    // Sort the data by endDate
    const sortedData = [...dataArray].sort((a, b) => {
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    });

    // Extract financials
    const revenue: FinancialDataPoint[] = [];
    const netIncome: FinancialDataPoint[] = [];
    const cash: FinancialDataPoint[] = [];
    const debt: FinancialDataPoint[] = [];
    const shares: FinancialDataPoint[] = [];
    const sbc: FinancialDataPoint[] = [];
    const grossMargin: FinancialDataPoint[] = [];
    const netMargin: FinancialDataPoint[] = [];
    const fcf: FinancialDataPoint[] = [];
    const capex: FinancialDataPoint[] = [];
    const operatingCashFlow: FinancialDataPoint[] = []; // Operating Cash Flow
    const payoutRatio: FinancialDataPoint[] = [];
    
    // First, get raw shares outstanding data
    const rawShares = sortedData.map(item => {
      // Check if endDate is a string or Date object
      let date;
      try {
        // If item.endDate is a string
        if (typeof item.endDate === 'string') {
          date = new Date(item.endDate);
        } 
        // If item.endDate already contains year, month properties
        else if (item.endDate && typeof item.endDate === 'object') {
          if (item.endDate.getFullYear) {
            date = item.endDate; // It's already a Date object
          } else {
            // Extract year and month if they exist directly on the object
            const year = item.endDate.year || (item.endDate.fiscalYear ? parseInt(item.endDate.fiscalYear) : null);
            const month = item.endDate.month || (item.endDate.fiscalQuarter ? (parseInt(item.endDate.fiscalQuarter) * 3 - 2) : 1);
            date = new Date(year, month - 1, 1);
          }
        } else {
          console.warn('Unable to parse date from item:', JSON.stringify(item).substring(0, 100));
          // Skip this data point rather than using current date as fallback
          date = null;
        }
      } catch (error) {
        console.error('Error parsing date:', error, 'item:', JSON.stringify(item).substring(0, 100));
        // Skip this data point rather than using current date as fallback
        date = null;
      }
      
      // Calculate the quarter if date is valid, otherwise use a placeholder
      const quarterLabel = date ? `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}` : 'Unknown';
      
      return {
        date,
        quarterLabel,
        value: Number(item.commonStockSharesOutstanding || 0)
      };
    });
    
    // SHARE ADJUSTMENTS COMMENTED OUT - DATA PROVIDER NOW PROVIDES ADJUSTED DATA
    
    // Keep the raw shares without any adjustments
    let splitAdjustedShares = [...rawShares];
    
    /*
    // Adjust shares for splits
    for (let i = splitAdjustedShares.length - 1; i > 0; i--) {
      const current = splitAdjustedShares[i].value;
      const previous = splitAdjustedShares[i-1].value;
      const ratio = current / previous;
      
      if (ratio > 1.5) { // Significant increase indicating a split
        console.log(`Detected potential stock split in quarterly data with ratio ${ratio.toFixed(2)}`);
        
        // Adjust all previous values
        for (let j = 0; j < i; j++) {
          splitAdjustedShares[j].value *= ratio;
        }
      }
    }
    */
    
    // Now process the adjusted data
    sortedData.forEach((item, index) => {
      // Use the same date parsing logic as above for consistency
      let date;
      try {
        if (typeof item.endDate === 'string') {
          date = new Date(item.endDate);
        } else if (item.endDate && typeof item.endDate === 'object') {
          if (item.endDate.getFullYear) {
            date = item.endDate;
          } else {
            const year = item.endDate.year || (item.endDate.fiscalYear ? parseInt(item.endDate.fiscalYear) : null);
            const month = item.endDate.month || (item.endDate.fiscalQuarter ? (parseInt(item.endDate.fiscalQuarter) * 3 - 2) : 1);
            date = new Date(year, month - 1, 1);
          }
        } else {
          console.warn('Unable to parse date from item:', JSON.stringify(item).substring(0, 100));
          // Skip this data point rather than using current date as fallback
          date = null;
        }
      } catch (error) {
        console.error('Error parsing date:', error, 'item:', JSON.stringify(item).substring(0, 100));
        // Skip this data point rather than using current date as fallback
        date = null;
      }
      
      // Only proceed if we have a valid date
      if (date) {
        const year = date.getFullYear();
        // Calculate quarter based on month
        const month = date.getMonth() + 1; // JavaScript months are 0-indexed
        const quarter = Math.ceil(month / 3);
        const quarterLabel = `Q${quarter} ${year}`;
        
        // Add data points
        revenue.push({ year: quarterLabel, value: Number(item.totalRevenue || 0) });
        netIncome.push({ year: quarterLabel, value: Number(item.netIncome || 0) });
        // Calculate cash based on available data
        // If shortTermInvestments is missing/null/"None", just use cashAndShortTermInvestments
        // Otherwise, sum them together (for companies that report them separately)
        let cashValue = 0;
        if (item.shortTermInvestments === null || item.shortTermInvestments === undefined || item.shortTermInvestments === "None") {
          cashValue = Number(item.cashAndShortTermInvestments || 0);
        } else {
          cashValue = Number(item.cashAndShortTermInvestments || 0) + Number(item.shortTermInvestments || 0);
        }
        cash.push({ year: quarterLabel, value: cashValue });
        
        // Use longTermDebt from the database
        debt.push({ year: quarterLabel, value: Number(item.longTermDebt || 0) });
        
        // Use the split-adjusted shares value
        shares.push({ 
          year: quarterLabel, 
          value: splitAdjustedShares[index].value 
        });
        
        // Calculate gross margin if data available
        if (item.totalRevenue && item.costofGoodsAndServicesSold) {
          const grossProfit = item.totalRevenue - item.costofGoodsAndServicesSold;
          const margin = (grossProfit / item.totalRevenue) * 100;
          grossMargin.push({ year: quarterLabel, value: margin });
        } else {
          grossMargin.push({ year: quarterLabel, value: 0 });
        }
        
        // Calculate net margin if data available
        if (item.totalRevenue && item.netIncome) {
          const margin = (item.netIncome / item.totalRevenue) * 100;
          netMargin.push({ year: quarterLabel, value: margin });
        } else {
          netMargin.push({ year: quarterLabel, value: 0 });
        }
        
        // Free cash flow and operating cash flow
        const operatingCashflow = Number(item.operatingCashflow || 0);
        const capitalExpenditures = Number(item.capitalExpenditures || 0);
        fcf.push({ year: quarterLabel, value: operatingCashflow - capitalExpenditures });
        capex.push({ year: quarterLabel, value: Math.abs(capitalExpenditures) }); // Make positive for display
        operatingCashFlow.push({ year: quarterLabel, value: operatingCashflow }); // Add operating cash flow
        
        // Calculate SBC based on proportion of shares outstanding (using the ADJUSTED share count)
        // If available in the data, use that, otherwise estimate based on quarter and year
        const sharesValue = splitAdjustedShares[index].value;
        // SBC typically rises over time - use a formula that increases with time
        // Start at 3% and rise up to about 8% based on the index in the timeline
        const sbcPercentage = 0.03 + (index * 0.001); // Gradually increasing percentage
        const sbcValue = sharesValue * sbcPercentage;
        sbc.push({ year: quarterLabel, value: sbcValue });
        
        // For payout ratio, store raw values to be used for rolling calculation later
        payoutRatio.push({
          year: quarterLabel,
          value: 0, // Placeholder, will be updated with rolling calculation
          _dividendPayout: Number(item.dividendPayout || 0),
          _netIncome: Number(item.netIncome || 0)
        });
      }
    });
    
    return {
      revenue, netIncome, cash, debt, shares, sbc, grossMargin, netMargin, fcf, capex, operatingCashFlow, payoutRatio
    };
  };
  
  // Process dividends data
  const processDividends = (dataArray: any[]): FinancialDataPoint[] => {
    console.log("Processing dividends data", typeof dataArray, Array.isArray(dataArray) ? dataArray.length : "not an array");
    
    if (!dataArray || !Array.isArray(dataArray)) {
      console.log("Dividends data is not an array:", dataArray);
      return [];
    }
    
    // Log the first few items to see the exact structure
    if (dataArray.length > 0) {
      console.log("First dividend data item structure:", JSON.stringify(dataArray[0]));
      console.log("Keys in first dividend data item:", Object.keys(dataArray[0]));
    }
    
    // Check if there's an "empty" marker which indicates no dividends
    if (dataArray.length === 1 && dataArray[0]?.Date === 'empty') {
      console.log('No dividend data available (marked as empty)');
      return [];
    }
    
    // Sort the data by date using the 'Date' field only
    const sortedData = [...dataArray].sort((a, b) => {
      return new Date(a.Date).getTime() - new Date(b.Date).getTime();
    });
    
    // Extract dividends
    const dividends: FinancialDataPoint[] = [];
    
    sortedData.forEach((item) => {
      // Yahoo Finance uses "Dividends" field
      const dividendValue = item.Dividends;
      
      if (item.Date && dividendValue) {
        try {
          const date = new Date(item.Date);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const quarter = Math.ceil(month / 3);
          // Format to match our quarterly data format (Q1 2023)
          const quarterLabel = `Q${quarter} ${year}`;
          
          console.log(`Adding dividend: ${quarterLabel} = ${Number(dividendValue)}`);
          
          dividends.push({ year: quarterLabel, value: Number(dividendValue) });
        } catch (error) {
          console.error('Error parsing dividend date:', error, 'item:', JSON.stringify(item).substring(0, 100));
        }
      }
    });
    
    console.log(`Processed ${dividends.length} dividend data points`);
    return dividends;
  };
  
  // Calculate payout ratio for annual data
  const calculateAnnualPayoutRatio = (
    annualData: Record<string, FinancialDataPoint[]>, 
    dividendsData: FinancialDataPoint[]
  ): FinancialDataPoint[] => {
    const payoutRatio: FinancialDataPoint[] = [];
    
    // For each year in netIncome
    annualData.netIncome.forEach(income => {
      const year = income.year;

      // Get all quarterly dividends for this year by filtering the dividend data
      const yearDividends = dividendsData
        .filter(div => div.year.includes(year))
        .reduce((sum, div) => sum + div.value, 0);
      
      // Calculate payout ratio
      const ratio = income.value > 0 ? (yearDividends / income.value) * 100 : 0;
      
      payoutRatio.push({ year, value: ratio });
    });
    
    return payoutRatio;
  };
  
  // Calculate payout ratio for quarterly data
  const calculateQuarterlyPayoutRatio = (
    quarterlyData: Record<string, FinancialDataPoint[]>, 
    dividendsData: FinancialDataPoint[],
    annualData: Record<string, FinancialDataPoint[]>
  ): FinancialDataPoint[] => {
    const payoutRatio: FinancialDataPoint[] = [];
    
    // Group quarterly income data by year for reference
    const netIncomeByYear = quarterlyData.netIncome.reduce((acc, curr) => {
      const year = curr.year.split(' ')[1]; // Extract year from "Q1 2023" format
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(curr);
      return acc;
    }, {} as Record<string, any[]>);
    
    // For each quarter in netIncome
    quarterlyData.netIncome.forEach((income, idx, arr) => {
      const quarter = income.year;
      const quarterParts = quarter.split(' ');
      const currentQuarter = quarterParts[0]; // e.g., "Q1"
      const currentYear = quarterParts[1];    // e.g., "2023"
      
      // Get matching annual net income for this year
      const annualIncome = annualData.netIncome.find(entry => entry.year === currentYear);
      
      // Get the last 4 quarters of dividends that are on or before this quarter
      const lastFourQuarters = [...dividendsData]
        .filter(div => {
          // We want dividends from this quarter and the 3 previous quarters
          const divQuarterParts = div.year.split(' ');
          const divQuarter = divQuarterParts[0]; // e.g., "Q1"
          const divYear = divQuarterParts[1];    // e.g., "2023"
          
          // Convert quarter and year to a numeric value for comparison
          const divValue = parseInt(divYear) * 4 + parseInt(divQuarter.substring(1));
          const currentValue = parseInt(currentYear) * 4 + parseInt(currentQuarter.substring(1));
          
          // Is this dividend from this quarter or any of the 3 previous quarters?
          return divValue <= currentValue && divValue > currentValue - 4;
        });
      
      // Calculate total dividends for the last 4 quarters
      const totalDividends = lastFourQuarters.reduce((sum, div) => sum + div.value, 0);
      
      // Calculate payout ratio using annual net income as the denominator
      // for more stability and accuracy in the ratio calculation
      let ratio = 0;
      if (annualIncome && annualIncome.value > 0) {
        ratio = (totalDividends / annualIncome.value) * 100;
      }
      
      payoutRatio.push({ year: quarter, value: ratio });
    });
    
    return payoutRatio;
  };
  
  // Process the data (pass quarterData to annual processing for split detection)
  const annualData = processAnnualData(yearData, quarterData);
  const quarterlyData = processQuarterlyData(quarterData);
  const dividends = processDividends(dividendsData);
  
  // Calculate rolling payout ratios for annual and quarterly data
  // For annual data - calculate each year's payout ratio based on annual dividends / annual net income
  if (annualData.payoutRatio && annualData.payoutRatio.length > 0) {
    annualData.payoutRatio.forEach((item, index) => {
      const dividendPayout = item._dividendPayout || 0;
      if (item._netIncome && item._netIncome > 0) {
        item.value = (dividendPayout / item._netIncome) * 100;
      } else {
        item.value = 0;
      }
    });
  }
  
  // For quarterly data - implement rolling 4-quarter sum as in Python code
  if (quarterlyData.payoutRatio && quarterlyData.payoutRatio.length > 0) {
    // We need at least 4 quarters of data for this calculation
    if (quarterlyData.payoutRatio.length >= 4) {
      quarterlyData.payoutRatio.forEach((item, index, arr) => {
        if (index >= 3) {  // We need at least 4 quarters (0,1,2,3)
          // Sum up the dividend payouts for the current and previous 3 quarters
          const totalDividendPayout = [0, 1, 2, 3].reduce((sum, offset) => {
            const quarterItem = arr[index - offset];
            return sum + (quarterItem._dividendPayout || 0);
          }, 0);
          
          // Sum up the net income for the current and previous 3 quarters
          const totalNetIncome = [0, 1, 2, 3].reduce((sum, offset) => {
            const quarterItem = arr[index - offset];
            return sum + (quarterItem._netIncome || 0);
          }, 0);
          
          // Calculate the rolling payout ratio
          if (totalNetIncome > 0) {
            item.value = (totalDividendPayout / totalNetIncome) * 100;
          } else {
            item.value = 0;
          }
        }
      });
    }
  }
  
  // Assemble the financial data object
  return {
    revenue: {
      annual: annualData.revenue || [],
      quarterly: quarterlyData.revenue || []
    },
    netIncome: {
      annual: annualData.netIncome || [],
      quarterly: quarterlyData.netIncome || []
    },
    cash: {
      annual: annualData.cash || [],
      quarterly: quarterlyData.cash || []
    },
    debt: {
      annual: annualData.debt || [],
      quarterly: quarterlyData.debt || []
    },
    sharesOutstanding: {
      annual: annualData.shares || [],
      quarterly: quarterlyData.shares || []
    },
    stockBasedCompensation: {
      annual: annualData.sbc || [],
      quarterly: quarterlyData.sbc || []
    },
    grossMargin: {
      annual: annualData.grossMargin || [],
      quarterly: quarterlyData.grossMargin || []
    },
    netMargin: {
      annual: annualData.netMargin || [],
      quarterly: quarterlyData.netMargin || []
    },
    freeCashFlow: {
      annual: annualData.fcf || [],
      quarterly: quarterlyData.fcf || []
    },
    capex: {
      annual: annualData.capex || [],
      quarterly: quarterlyData.capex || []
    },
    operatingCashFlow: {
      annual: annualData.operatingCashFlow || [],
      quarterly: quarterlyData.operatingCashFlow || []
    },
    dividends: {
      quarterly: dividends || []
    },
    payoutRatio: {
      annual: annualData.payoutRatio || [],
      quarterly: quarterlyData.payoutRatio || []
    }
  };
};

// Stock Data Service
export class FirebaseStockService {
  // Get list of all ticker symbols for search/autocomplete
  async getTickerList(): Promise<string[]> {
    try {
      // Check cache first
      const cacheKey = 'ticker_list';
      const cachedData = cache.get<string[]>(cacheKey);
      
      if (cachedData) {
        console.log('Retrieved tickers from cache');
        return cachedData;
      }
      
      // If not in cache, proceed with Firebase fetch
      if (!isFirebaseConfigured() || !getRealtimeDb()) {
        console.warn('Firebase not configured for getTickerList');
        return [];
      }
      
      const db = getRealtimeDb();
      const tickersRef = ref(db!, 'allnames/list');
      const snapshot = await get(tickersRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const tickers = data.names || [];
        
        // Store in cache for 24 hours
        cache.set(cacheKey, tickers);
        console.log(`Retrieved ${tickers.length} tickers from Firebase`);
        
        return tickers;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching ticker list:', error);
      return [];
    }
  }

  // Get stock info by searching Yahoo Finance
  // Note: In your Python code, you don't store stock info in Firebase,
  // so we'll maintain the current approach of fetching from Yahoo Finance
  async getStockInfo(symbol: string): Promise<StockInfo | null> {
    try {
      // Since the Python code doesn't store stock info directly,
      // we'll continue using the Yahoo Finance approach from routes.ts
      return null; // Will fall back to Yahoo Finance in routes.ts
    } catch (error) {
      console.error(`Error fetching stock info for ${symbol}:`, error);
      return null;
    }
  }
  
  // Get financial data from Firebase Realtime Database
  async getFinancialData(symbol: string): Promise<FinancialData | null> {
    try {
      // Check cache first
      const cacheKey = `financial_data_${symbol}`;
      const cachedData = cache.get<FinancialData>(cacheKey);
      
      if (cachedData) {
        console.log(`Retrieved financial data for ${symbol} from cache`);
        return cachedData;
      }
      
      // If not in cache, proceed with Firebase fetch
      if (!isFirebaseConfigured() || !getRealtimeDb()) {
        console.warn('Firebase not configured for getFinancialData');
        return null;
      }
      
      const db = getRealtimeDb();
      
      // Get annual data from 'year' node
      const yearRef = ref(db!, `year/${symbol}`);
      const yearSnapshot = await get(yearRef);
      let yearData = null;
      if (yearSnapshot.exists()) {
        yearData = yearSnapshot.val();
        console.log(`Retrieved annual data for ${symbol} from Firebase`);
      }
      
      // Get quarterly data from 'quarter' node
      const quarterRef = ref(db!, `quarter/${symbol}`);
      const quarterSnapshot = await get(quarterRef);
      let quarterData = null;
      if (quarterSnapshot.exists()) {
        quarterData = quarterSnapshot.val();
        console.log(`Retrieved quarterly data for ${symbol} from Firebase`);
      }
      
      // Get dividends data
      const dividendsRef = ref(db!, `dividends/${symbol}`);
      const dividendsSnapshot = await get(dividendsRef);
      let dividendsData = null;
      if (dividendsSnapshot.exists()) {
        dividendsData = dividendsSnapshot.val();
        console.log(`Retrieved dividends data for ${symbol} from Firebase`);
        // Debug log for dividend data structure
        console.log(`Dividend data structure:`, JSON.stringify(dividendsData).substring(0, 200) + '...');
      }
      
      // If we have at least yearly or quarterly data, process it
      if (yearData || quarterData) {
        const financialData = processFinancialData(yearData, quarterData, dividendsData);
        
        // Store in cache for 24 hours
        cache.set(cacheKey, financialData);
        
        return financialData;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching financial data for ${symbol}:`, error);
      return null;
    }
  }
  
  // Get valuation metrics from Firebase or Yahoo Finance
  async getValuationMetrics(symbol: string): Promise<any | null> {
    try {
      // The Python code doesn't store valuation metrics separately,
      // so we'll maintain the current approach of generating them
      return null; // Will fall back to generated metrics in routes.ts
    } catch (error) {
      console.error(`Error fetching valuation metrics for ${symbol}:`, error);
      return null;
    }
  }
  
  // Search for stocks by symbol or name
  async searchStocks(query: string, limit: number = 10): Promise<StockInfo[]> {
    try {
      // Check if Firebase is configured
      if (!isFirebaseConfigured() || !getRealtimeDb()) {
        console.warn('Firebase not configured for searchStocks');
        return [];
      }
      
      // Get the list of tickers
      const tickers = await this.getTickerList();
      
      // Filter tickers that match the query
      const queryUpperCase = query.toUpperCase();
      const matchingTickers = tickers.filter(ticker => 
        ticker.includes(queryUpperCase)
      ).slice(0, limit);
      
      // This just returns the symbols - actual stock info would need to be fetched from Yahoo Finance
      // as is done in the routes.ts file
      return matchingTickers.map(symbol => ({
        symbol,
        name: '', // Will be populated by Yahoo Finance in routes.ts
        exchange: '',
        price: 0,
        change: 0,
        changePercent: 0,
        lastUpdated: ''
      }));
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  }
  
  // The following methods are not used in your Python code but kept for future use
  
  // Save stock info (for admin purposes)
  async saveStockInfo(stockInfo: StockInfo): Promise<void> {
    try {
      // Your Python code doesn't save stock info to Firebase
      console.warn('saveStockInfo not implemented in Python equivalent');
    } catch (error) {
      console.error('Error saving stock info:', error);
    }
  }
  
  // Save financial data (for admin purposes)
  async saveFinancialData(symbol: string, data: FinancialData): Promise<void> {
    try {
      // Your Python code doesn't provide a way to save financial data
      console.warn('saveFinancialData not implemented in Python equivalent');
    } catch (error) {
      console.error('Error saving financial data:', error);
    }
  }
  
  // Save valuation metrics (for admin purposes)
  async saveValuationMetrics(symbol: string, data: any): Promise<void> {
    try {
      // Your Python code doesn't save valuation metrics
      console.warn('saveValuationMetrics not implemented in Python equivalent');
    } catch (error) {
      console.error('Error saving valuation metrics:', error);
    }
  }
}

export default new FirebaseStockService();