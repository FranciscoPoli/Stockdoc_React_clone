import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataFrequency, StockInfo, FinancialData, StockMetric, ComparisonStock, FinancialDataPoint } from "../types/stock";

// Chart color palette for comparisons
const COMPARISON_COLORS = [
  "#10b981", // emerald-500
  "#f97316", // orange-500
  "#8b5cf6", // violet-500
];

export function useStockData(initialSymbol: string = "AAPL") {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [dataFrequency, setDataFrequency] = useState<DataFrequency>("annual");
  const [comparisonStocks, setComparisonStocks] = useState<ComparisonStock[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Query for basic stock info
  const { 
    data: stockInfo, 
    isLoading: isLoadingStockInfo, 
    error: stockInfoError 
  } = useQuery({ 
    queryKey: [`/api/stock/${symbol}`],
    enabled: !!symbol,
  });

  // Query for financial data
  const {
    data: rawFinancialData,
    isLoading: isLoadingFinancialData,
    error: financialDataError,
  } = useQuery({
    queryKey: [`/api/financial/${symbol}`],
    enabled: !!symbol,
  });
  
  // Process and generate TTM data from quarterly data
  const financialData = useMemo(() => {
    if (!rawFinancialData) return undefined;
    
    const processedData = { ...rawFinancialData } as FinancialData;
    
    // Metrics that are flows (cumulative over time) - should be summed for TTM
    const sumMetrics = [
      'revenue', 'netIncome', 'stockBasedCompensation', 'freeCashFlow', 'capex', 'payoutRatio'
    ];
    
    // Metrics that are stocks (point-in-time measures) - should use most recent value for TTM
    const latestValueMetrics = [
      'cash', 'debt', 'sharesOutstanding'
    ];
    
    // Metrics that are percentages - should be averaged for TTM
    const averageMetrics = [
      'grossMargin', 'netMargin'
    ];
    
    // Generate TTM data by summing 4 quarters at a time for flow metrics
    sumMetrics.forEach(metric => {
      // Use a type assertion to handle indexing with string keys
      const metricData = (processedData as any)[metric];
      if (metricData && metricData.quarterly && metricData.quarterly.length > 3) {
        const quarterlyData = metricData.quarterly;
        const ttmData: FinancialDataPoint[] = [];
        
        // Process TTM data by summing 4 quarters at a time
        for (let i = 3; i < quarterlyData.length; i++) {
          const ttmValue = quarterlyData[i].value + 
                          quarterlyData[i-1].value + 
                          quarterlyData[i-2].value + 
                          quarterlyData[i-3].value;
          
          const quarterLabel = quarterlyData[i].year;
          ttmData.push({
            year: quarterLabel,
            value: ttmValue
          });
        }
        
        // Add the TTM data to the metric
        metricData.ttm = ttmData;
      }
    });
    
    // For stock metrics (point-in-time values), use the latest quarter's value
    latestValueMetrics.forEach(metric => {
      // Use a type assertion to handle indexing with string keys
      const metricData = (processedData as any)[metric];
      if (metricData && metricData.quarterly && metricData.quarterly.length > 3) {
        const quarterlyData = metricData.quarterly;
        const ttmData: FinancialDataPoint[] = [];
        
        // Process TTM data by using the current quarter's value
        for (let i = 3; i < quarterlyData.length; i++) {
          // For stock metrics, just use the latest quarter's value
          const ttmValue = quarterlyData[i].value;
          
          const quarterLabel = quarterlyData[i].year;
          ttmData.push({
            year: quarterLabel,
            value: ttmValue
          });
        }
        
        // Add the TTM data to the metric
        metricData.ttm = ttmData;
      }
    });
    
    // For margin metrics, calculate an average for TTM values
    averageMetrics.forEach(metric => {
      // Use a type assertion to handle indexing with string keys
      const metricData = (processedData as any)[metric];
      if (metricData && metricData.quarterly && metricData.quarterly.length > 3) {
        const quarterlyData = metricData.quarterly;
        const ttmData: FinancialDataPoint[] = [];
        
        // Calculate average across 4 quarters instead of summing
        for (let i = 3; i < quarterlyData.length; i++) {
          // For margins, we take an average for TTM
          const ttmValue = (quarterlyData[i].value + 
                           quarterlyData[i-1].value + 
                           quarterlyData[i-2].value + 
                           quarterlyData[i-3].value) / 4;
          
          const quarterLabel = quarterlyData[i].year;
          ttmData.push({
            year: quarterLabel,
            value: ttmValue
          });
        }
        
        // Add the TTM data to the metric
        metricData.ttm = ttmData;
      }
    });
    
    return processedData;
  }, [rawFinancialData]);
  
  // Query for comparison stocks - using useQueries instead of map with useQuery
  // This fixes the "Rendered more hooks than during the previous render" error
  const comparisonQueriesResult = useQuery({
    queryKey: ['comparison-stocks', comparisonStocks.map(s => s.symbol).join(',')],
    enabled: comparisonStocks.length > 0,
    queryFn: async () => {
      // Fetch all comparison stock data in parallel
      const results = await Promise.all(
        comparisonStocks.map(async (stock) => {
          if (!stock.isActive || !stock.symbol) {
            return { symbol: stock.symbol, data: null };
          }
          
          try {
            const response = await fetch(`/api/financial/${stock.symbol}`);
            if (!response.ok) throw new Error(`Failed to fetch ${stock.symbol}`);
            const data = await response.json();
            return { symbol: stock.symbol, data };
          } catch (err) {
            console.error(`Error fetching data for ${stock.symbol}:`, err);
            return { symbol: stock.symbol, data: null };
          }
        })
      );
      
      return results;
    }
  });
  
  // Transform the query result into the format expected by the application
  const comparisonQueries = comparisonStocks.map(stock => {
    const result = comparisonQueriesResult.data?.find(r => r.symbol === stock.symbol);
    
    // Process TTM data for comparison stocks too
    let processedData = result?.data;
    if (processedData) {
      const processed = { ...processedData } as FinancialData;
      
      // Metrics that are flows (cumulative over time) - should be summed for TTM
      const sumMetrics = [
        'revenue', 'netIncome', 'stockBasedCompensation', 'freeCashFlow', 'capex', 'payoutRatio'
      ];
      
      // Metrics that are stocks (point-in-time measures) - should use most recent value for TTM
      const latestValueMetrics = [
        'cash', 'debt', 'sharesOutstanding'
      ];
      
      // Metrics that are percentages - should be averaged for TTM
      const averageMetrics = [
        'grossMargin', 'netMargin'
      ];
      
      // Generate TTM data by summing 4 quarters at a time for flow metrics
      sumMetrics.forEach(metric => {
        // Use a type assertion to handle indexing with string keys
        const metricData = (processed as any)[metric];
        if (metricData && metricData.quarterly && metricData.quarterly.length > 3) {
          const quarterlyData = metricData.quarterly;
          const ttmData: FinancialDataPoint[] = [];
          
          // Process TTM data by summing 4 quarters at a time
          for (let i = 3; i < quarterlyData.length; i++) {
            const ttmValue = quarterlyData[i].value + 
                            quarterlyData[i-1].value + 
                            quarterlyData[i-2].value + 
                            quarterlyData[i-3].value;
            
            const quarterLabel = quarterlyData[i].year;
            ttmData.push({
              year: quarterLabel,
              value: ttmValue
            });
          }
          
          // Add the TTM data to the metric
          metricData.ttm = ttmData;
        }
      });
      
      // For stock metrics (point-in-time values), use the latest quarter's value
      latestValueMetrics.forEach(metric => {
        // Use a type assertion to handle indexing with string keys
        const metricData = (processed as any)[metric];
        if (metricData && metricData.quarterly && metricData.quarterly.length > 3) {
          const quarterlyData = metricData.quarterly;
          const ttmData: FinancialDataPoint[] = [];
          
          // Process TTM data by using the current quarter's value
          for (let i = 3; i < quarterlyData.length; i++) {
            // For stock metrics, just use the latest quarter's value
            const ttmValue = quarterlyData[i].value;
            
            const quarterLabel = quarterlyData[i].year;
            ttmData.push({
              year: quarterLabel,
              value: ttmValue
            });
          }
          
          // Add the TTM data to the metric
          metricData.ttm = ttmData;
        }
      });
      
      // For margin metrics, calculate an average for TTM values
      averageMetrics.forEach(metric => {
        // Use a type assertion to handle indexing with string keys
        const metricData = (processed as any)[metric];
        if (metricData && metricData.quarterly && metricData.quarterly.length > 3) {
          const quarterlyData = metricData.quarterly;
          const ttmData: FinancialDataPoint[] = [];
          
          // Calculate average across 4 quarters instead of summing
          for (let i = 3; i < quarterlyData.length; i++) {
            // For margins, we take an average for TTM
            const ttmValue = (quarterlyData[i].value + 
                           quarterlyData[i-1].value + 
                           quarterlyData[i-2].value + 
                           quarterlyData[i-3].value) / 4;
            
            const quarterLabel = quarterlyData[i].year;
            ttmData.push({
              year: quarterLabel,
              value: ttmValue
            });
          }
          
          // Add the TTM data to the metric
          metricData.ttm = ttmData;
        }
      });
      
      processedData = processed;
    }
    
    return {
      symbol: stock.symbol,
      data: processedData || null,
      isLoading: comparisonQueriesResult.isLoading,
      error: comparisonQueriesResult.error,
      color: stock.color
    };
  });

  // Calculate metrics based on financial data and Yahoo Finance information
  const metrics: StockMetric[] = (stockInfo && financialData) ? (() => {
    const info = stockInfo as StockInfo;
    const data = financialData as FinancialData;

    // Calculate YoY revenue growth by comparing same quarter year-over-year
    const quarterlyRevenueData = data.revenue.quarterly;
    const quarterlyEarningsData = data.netIncome.quarterly;
    
    const mostRecentQuarterRevenue = quarterlyRevenueData[quarterlyRevenueData.length - 1];
    const mostRecentQuarterEarnings = quarterlyEarningsData[quarterlyEarningsData.length - 1];
    
    // Extract quarter number (Q1, Q2, Q3, Q4) from the quarter string
    const getQuarterNumber = (quarterStr: string): string => {
      // Extract Q1, Q2, Q3, Q4 from strings like "Q1 2024"
      return quarterStr.split(' ')[0];
    };
    
    // Find the same quarter from previous year
    const currentQuarterNumberRevenue = getQuarterNumber(mostRecentQuarterRevenue.year);
    const currentQuarterNumberEarnings = getQuarterNumber(mostRecentQuarterEarnings.year);
    let sameQuarterLastYearRevenue = null;
    let sameQuarterLastYearEarnings = null;
    
    // Look for the same quarter from the previous year (approx 4 quarters back)
    // Start from 4 quarters back and search in case the exact quarter isn't there
    for (let i = 1; i <= 6; i++) { // Search within a window to be safe
      const idxRevenue = quarterlyRevenueData.length - 1 - i;
      if (idxRevenue >= 0 && getQuarterNumber(quarterlyRevenueData[idxRevenue].year) === currentQuarterNumberRevenue) {
        sameQuarterLastYearRevenue = quarterlyRevenueData[idxRevenue];
        break;
      }
    }

    for (let i = 1; i <= 6; i++) { // Search within a window to be safe
      const idxEarnings = quarterlyEarningsData.length - 1 - i;
      if (idxEarnings >= 0 && getQuarterNumber(quarterlyEarningsData[idxEarnings].year) === currentQuarterNumberEarnings) {
        sameQuarterLastYearEarnings = quarterlyEarningsData[idxEarnings];
        break;
      }
    }
    
    // Calculate YoY revenue growth (comparing same quarter year-over-year)
    const currentQuarterlyRevenue = mostRecentQuarterRevenue.value;
    const previousYearSameQuarterRevenue = sameQuarterLastYearRevenue?.value || 0;
    
    // Calculate revenue YoY growth with special handling for negative values
    let revenueYoYGrowth = 0;
    let revenueYoYDescription = '';
    
    if (sameQuarterLastYearRevenue) {
      // Special case: Handle negative to positive transition
      if (previousYearSameQuarterRevenue < 0 && currentQuarterlyRevenue > 0) {
        // When starting with negative and ending with positive, this is definitely a positive improvement
        // Rather than showing a misleading negative percentage, we'll calculate improvement
        const improvement = currentQuarterlyRevenue - previousYearSameQuarterRevenue;
        const improvementRatio = improvement / Math.abs(previousYearSameQuarterRevenue);
        revenueYoYGrowth = improvementRatio * 100;
        revenueYoYDescription = 'Turned positive';
      } 
      // Special case: If both values are negative
      else if (previousYearSameQuarterRevenue < 0 && currentQuarterlyRevenue < 0) {
        // If loss is reducing (improving), we want to show a positive percentage
        // If loss is increasing (worsening), we want to show a negative percentage
        const isImproving = Math.abs(currentQuarterlyRevenue) < Math.abs(previousYearSameQuarterRevenue);
        
        if (isImproving) {
          // Less negative = improvement
          const improvement = Math.abs(previousYearSameQuarterRevenue) - Math.abs(currentQuarterlyRevenue);
          const improvementRatio = improvement / Math.abs(previousYearSameQuarterRevenue);
          revenueYoYGrowth = improvementRatio * 100;
          revenueYoYDescription = 'Reduced loss';
        } else {
          // More negative = worsening
          const worsening = Math.abs(currentQuarterlyRevenue) - Math.abs(previousYearSameQuarterRevenue);
          const worseningRatio = worsening / Math.abs(previousYearSameQuarterRevenue);
          revenueYoYGrowth = -worseningRatio * 100;
          revenueYoYDescription = 'Increased loss';
        }
      }
      // Standard case: Normal calculation for positive values and positive-to-negative transitions
      else {
        revenueYoYGrowth = ((currentQuarterlyRevenue - previousYearSameQuarterRevenue) / Math.abs(previousYearSameQuarterRevenue)) * 100;
        revenueYoYDescription = revenueYoYGrowth >= 0 ? 'Growth' : 'Decline';
      }
    }

    // Calculate earnings YoY growth with special handling for negative values
    const currentQuarterlyEarnings = mostRecentQuarterEarnings.value;
    const previousYearSameQuarterEarnings = sameQuarterLastYearEarnings?.value || 0;
    
    let earningsYoYGrowth = 0;
    let earningsYoYDescription = '';
    
    if (sameQuarterLastYearEarnings) {
      // Special case: Handle negative to positive transition
      if (previousYearSameQuarterEarnings < 0 && currentQuarterlyEarnings > 0) {
        // When starting with negative and ending with positive, this is definitely a positive improvement
        const improvement = currentQuarterlyEarnings - previousYearSameQuarterEarnings;
        const improvementRatio = improvement / Math.abs(previousYearSameQuarterEarnings);
        earningsYoYGrowth = improvementRatio * 100;
        earningsYoYDescription = 'Turned profitable';
      } 
      // Special case: If both values are negative
      else if (previousYearSameQuarterEarnings < 0 && currentQuarterlyEarnings < 0) {
        // If loss is reducing (improving), we want to show a positive percentage
        // If loss is increasing (worsening), we want to show a negative percentage
        const isImproving = Math.abs(currentQuarterlyEarnings) < Math.abs(previousYearSameQuarterEarnings);
        
        if (isImproving) {
          // Less negative = improvement
          const improvement = Math.abs(previousYearSameQuarterEarnings) - Math.abs(currentQuarterlyEarnings);
          const improvementRatio = improvement / Math.abs(previousYearSameQuarterEarnings);
          earningsYoYGrowth = improvementRatio * 100;
          earningsYoYDescription = 'Reduced loss';
        } else {
          // More negative = worsening
          const worsening = Math.abs(currentQuarterlyEarnings) - Math.abs(previousYearSameQuarterEarnings);
          const worseningRatio = worsening / Math.abs(previousYearSameQuarterEarnings);
          earningsYoYGrowth = -worseningRatio * 100;
          earningsYoYDescription = 'Increased loss';
        }
      }
      // Standard case: Normal calculation for positive values and positive-to-negative transitions
      else {
        earningsYoYGrowth = ((currentQuarterlyEarnings - previousYearSameQuarterEarnings) / Math.abs(previousYearSameQuarterEarnings)) * 100;
        earningsYoYDescription = earningsYoYGrowth >= 0 ? 'Growth' : 'Decline';
      }
    }
    
    // Format growth percentages
    const yoyGrowthFormattedRevenue = `${revenueYoYGrowth >= 0 ? '+' : ''}${revenueYoYGrowth.toFixed(2)}%`;
    const yoyGrowthFormattedEarnings = `${earningsYoYGrowth >= 0 ? '+' : ''}${earningsYoYGrowth.toFixed(2)}%`;

    // Use Yahoo Finance data if available, otherwise calculate using our financial data
    const peRatio = info.peRatio !== undefined && info.peRatio !== null
      ? info.peRatio
      : (info.price / (data.netIncome.annual[0].value / data.sharesOutstanding.annual[0].value));
    
    const marketCap = info.marketCap !== undefined && info.marketCap !== null
      ? info.marketCap
      : (info.price * data.sharesOutstanding.annual[0].value * 1000000000);

    // Calculate FCF Yield using rolling 4-quarter sum of Free Cash Flow
    let fcfYield = 0;
    if (data.freeCashFlow.quarterly && data.freeCashFlow.quarterly.length >= 4) {
      const quarterlyFCFData = data.freeCashFlow.quarterly;
      const latestFourQuartersFCF = [0, 1, 2, 3].reduce((sum, offset) => {
        const quarterItem = quarterlyFCFData[quarterlyFCFData.length - 1 - offset];
        return sum + quarterItem.value;
      }, 0);
      
      // Calculate FCF Yield as (TTM FCF / Market Cap) * 100
      fcfYield = marketCap > 0 ? (latestFourQuartersFCF / marketCap) * 100 : 0;
    }
    
    return [
      {
        label: "Market Cap",
        value: formatCurrency(marketCap, true),
        change: `${info.changePercent >= 0 ? '+' : ''}${info.changePercent.toFixed(2)}% Today`,
        changeType: info.changePercent >= 0 ? "positive" : "negative",
        icon: "funds",
      },
      {
        label: "P/E Ratio",
        value: peRatio !== null ? peRatio.toFixed(2) : "N/A",
        change: info.forwardPE ? `Forward P/E: ${info.forwardPE.toFixed(2)}` : "No forward data",
        changeType: (info.forwardPE && info.peRatio) 
          ? (info.forwardPE < info.peRatio ? "positive" : "negative") 
          : "neutral",
        icon: "scales",
      },
      {
        label: "Revenue YoY",
        // Always show the calculated value regardless of whether values are positive or negative
        value: yoyGrowthFormattedRevenue,
        // Show both the last year value and the description of what happened (turned positive, reduced loss, etc.)
        change: `${revenueYoYDescription} (Last Year: ${formatCurrency(previousYearSameQuarterRevenue, true)})`,
        changeType: revenueYoYGrowth >= 0 ? "positive" : "negative",
        icon: "chart-bar",
      },
      {
        label: "Earnings YoY",
        // Always show the calculated value regardless of whether values are positive or negative
        value: yoyGrowthFormattedEarnings,
        // Show both the last year value and the description of what happened (turned profitable, reduced loss, etc.)
        change: `${earningsYoYDescription} (Last Year: ${formatCurrency(previousYearSameQuarterEarnings, true)})`,
        changeType: earningsYoYGrowth >= 0 ? "positive" : "negative",
        icon: "chart-line",
      },
      {
        label: "Dividend Yield",
        value: info.dividendYield !== undefined && info.dividendYield !== null 
          ? `${info.dividendYield.toFixed(2)}%` 
          : "N/A",
        change: "Annual payout",
        changeType: "neutral",
        icon: "currency",
      },
      {
        label: "ROE",
        value: info.roe !== undefined && info.roe !== null ? `${info.roe.toFixed(2)}%` : "N/A",
        change: "Return on Equity",
        changeType: info.roe && info.roe > 15 ? "positive" : (info.roe && info.roe > 0 ? "neutral" : "negative"),
        icon: "pie-chart",
      },
      {
        label: "ROA",
        value: info.roa !== undefined && info.roa !== null ? `${info.roa.toFixed(2)}%` : "N/A",
        change: "Return on Assets",
        changeType: info.roa && info.roa > 5 ? "positive" : (info.roa && info.roa > 0 ? "neutral" : "negative"),
        icon: "trending-up",
      },
      {
        label: "FCF Yield",
        value: fcfYield > 0 ? `${fcfYield.toFixed(2)}%` : "N/A",
        change: "Free Cash Flow / Market Cap",
        changeType: fcfYield > 5 ? "positive" : (fcfYield > 0 ? "neutral" : "negative"),
        icon: "trending-up",
      }
    ];
  })() : [];

  const isLoading = isLoadingStockInfo || isLoadingFinancialData;
  const error = stockInfoError || financialDataError;

  const toggleDataFrequency = (frequency?: DataFrequency) => {
    if (frequency) {
      setDataFrequency(frequency);
    } else {
      // Cycle through options if no specific frequency is provided
      setDataFrequency(prev => {
        if (prev === "annual") return "quarterly";
        if (prev === "quarterly") return "ttm";
        return "annual";
      });
    }
  };

  // Handle comparison functions
  const openCompareModal = () => {
    setIsCompareModalOpen(true);
  };

  const closeCompareModal = () => {
    setIsCompareModalOpen(false);
  };

  const addComparisonStock = async (stockSymbol: string) => {
    // Don't add if already in the list or it's the current main stock
    if (
      stockSymbol === symbol || 
      comparisonStocks.some(s => s.symbol === stockSymbol) ||
      comparisonStocks.length >= 3
    ) {
      return;
    }

    try {
      // Fetch stock info to get the name
      const response = await fetch(`/api/stock/${stockSymbol}`);
      if (!response.ok) throw new Error('Stock not found');
      
      const stockData = await response.json();
      
      // Find the first unused color index
      const usedColorIndices = comparisonStocks.map(
        stock => COMPARISON_COLORS.indexOf(stock.color)
      );
      
      let colorIndex = 0;
      while (usedColorIndices.includes(colorIndex) && colorIndex < COMPARISON_COLORS.length) {
        colorIndex++;
      }
      
      // Fallback to modulo if all colors are used (shouldn't happen with our limit of 3)
      if (colorIndex >= COMPARISON_COLORS.length) {
        colorIndex = comparisonStocks.length % COMPARISON_COLORS.length;
      }
      
      // Add to comparison list with a color
      const newStock: ComparisonStock = {
        symbol: stockSymbol,
        name: stockData.name,
        color: COMPARISON_COLORS[colorIndex],
        isActive: true
      };
      
      setComparisonStocks(prev => [...prev, newStock]);
    } catch (error) {
      console.error('Error adding comparison stock:', error);
    }
  };

  const removeComparisonStock = (stockSymbol: string) => {
    setComparisonStocks(prev => prev.filter(stock => stock.symbol !== stockSymbol));
  };

  const toggleComparisonStock = (stockSymbol: string) => {
    setComparisonStocks(prev => 
      prev.map(stock => 
        stock.symbol === stockSymbol 
          ? { ...stock, isActive: !stock.isActive } 
          : stock
      )
    );
  };

  return {
    symbol,
    setSymbol,
    stockInfo: stockInfo as StockInfo | undefined,
    financialData: financialData as FinancialData | undefined,
    dataFrequency,
    toggleDataFrequency,
    metrics,
    isLoading,
    error,
    // Comparison related
    comparisonStocks,
    comparisonQueries,
    isCompareModalOpen,
    openCompareModal,
    closeCompareModal,
    addComparisonStock,
    removeComparisonStock,
    toggleComparisonStock
  };
}

function formatCurrency(value: number, abbr = false): string {
  if (abbr) {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value <= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value <= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value <= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    }
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
