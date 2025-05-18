import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Line, ResponsiveContainer, TooltipProps,
  ReferenceLine, ComposedChart
} from 'recharts';
import { formatValue } from '../lib/utils';
import { useIsMobile } from '../hooks/use-mobile';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

/**
 * ProjectionCalculator Component
 * 
 * This component provides a 5-year projection calculator for stock prices based on either:
 * 
 * Earnings Mode:
 * 1. Current TTM EPS (Trailing Twelve Months Earnings Per Share)
 * 2. Expected EPS growth rate
 * 3. Future P/E multiple
 * 
 * Free Cash Flow Mode:
 * 1. Current TTM FCF per Share (Trailing Twelve Months Free Cash Flow per Share)
 * 2. Expected FCF growth rate
 * 3. Future P/FCF multiple
 * 
 * Both modes include:
 * - Desired annual return for entry price calculation
 * - Smooth progression projection using CAGR
 * 
 * It will attempt to fetch quarterly earnings data from Firebase if available,
 * but will also work with user-provided inputs when actual data isn't accessible.
 * 
 * The calculator visualizes:
 * - Projected stock price for next 5 years
 * - Expected CAGR from current price
 * - Required entry price to achieve desired return
 */

// Import StockInfo interface or define it here
interface StockInfo {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  peRatio?: number | null;
  forwardPE?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;
  [key: string]: any; // Allow for other properties
}

interface EarningsQuarterData {
  quarter?: string;    // Used in older format
  endDate?: string;    // Used in newer format (ISO date string)
  reportedEPS: number;
  estimatedEPS?: number | string;
  reportDate?: string;
  reportedDate?: string;
  surprisePercentage?: string;
  reportTime?: string;
  [key: string]: any;
}

interface StockMetric {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

interface ProjectionCalculatorProps {
  symbol: string;
  currentPrice: number;
  stockInfo?: StockInfo;
  metrics: StockMetric[];
}

const ProjectionCalculator: React.FC<ProjectionCalculatorProps> = ({
  symbol,
  currentPrice,
  stockInfo,
  metrics = [],
}) => {
  const isMobile = useIsMobile();
  
  // Mode toggle between Earnings and FCF
  const [projectionMode, setProjectionMode] = useState<'earnings' | 'fcf'>('earnings');
  
  // Find the metrics for this stock
  const earningsMetric = metrics.find(m => m.label === "Earnings YoY");
  const fcfYieldMetric = metrics.find(m => m.label === "FCF Yield");
  
  // State for display values - Earnings
  const [currentEPS, setCurrentEPS] = useState<number | null>(null);
  const [earningsGrowthYoY, setEarningsGrowthYoY] = useState<number | null>(null);
  
  // State for display values - FCF
  const [currentFCFPerShare, setCurrentFCFPerShare] = useState<number | null>(null);
  const [fcfGrowthYoY, setFcfGrowthYoY] = useState<number | null>(null);
  const [pfcfRatio, setPfcfRatio] = useState<number | null>(null);
  
  // State for form inputs - Earnings
  const [ttmEPS, setTtmEPS] = useState<number | null>(null);
  const [epsGrowthRate, setEpsGrowthRate] = useState<number>(15);
  const [peMultiple, setPeMultiple] = useState<number>(22);
  
  // State for form inputs - FCF
  const [ttmFCFPerShare, setTtmFCFPerShare] = useState<number | null>(null);
  const [fcfGrowthRate, setFcfGrowthRate] = useState<number>(15);
  const [pfcfMultiple, setPfcfMultiple] = useState<number>(22);
  
  // Common state for both modes
  const [desiredReturn, setDesiredReturn] = useState<number>(15);
  
  // State for calculation results
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [calculatedReturn, setCalculatedReturn] = useState<number | null>(null);
  const [entryPriceForDesiredReturn, setEntryPriceForDesiredReturn] = useState<number | null>(null);
  
  // Helper function to extract growth value from metric
  const getEarningsGrowthFromMetric = (metric: StockMetric | undefined): number | null => {
    if (!metric) return null;
    
    // Extract numeric value from formatted string like "+12.34%"
    const rawValue = metric.value.replace(/[+%]/g, '');
    const numericValue = parseFloat(rawValue);
    
    console.log("Found Earnings YoY metric:", metric);
    console.log("Raw value:", rawValue);
    console.log("Parsed numeric value:", numericValue);
    
    return isNaN(numericValue) ? null : numericValue;
  };

  // Initialize with some reasonable values and fetch data if available
  useEffect(() => {
    console.log("ProjectionCalculator useEffect running with symbol:", symbol);
    console.log("Metrics available:", metrics.length);
    
    // Get earnings growth from metrics
    const growthFromMetrics = getEarningsGrowthFromMetric(earningsMetric);
    if (growthFromMetrics !== null) {
      console.log(`Using earnings growth from metrics: ${growthFromMetrics}%`);
      setEarningsGrowthYoY(growthFromMetrics);
      setEpsGrowthRate(Math.round(growthFromMetrics));
    }
    
    // Set initial PE multiple based on current stock info or default to 20
    if (stockInfo?.peRatio) {
      setPeMultiple(Math.round(stockInfo.peRatio));
    }
    
    // Calculate FCF data if we have stock info and market cap
    if (stockInfo?.price && stockInfo?.marketCap) {
      console.log("Calculating FCF metrics from stock data...");
      
      // Step 1: Fetch the financial data to get FCF values
      const fetchFinancialData = async () => {
        try {
          const response = await fetch(`/api/financial/${symbol}`);
          
          // Define ttmFCF outside the response.ok condition so it's accessible everywhere
          let ttmFCF = 0;
          
          if (response.ok) {
            const financialData = await response.json();
            console.log(`Received financial data for ${symbol}`, financialData);
            
            if (financialData.freeCashFlow?.quarterly && financialData.freeCashFlow.quarterly.length > 0) {
              // Get the last 4 quarters of FCF data
              const quarterlyFCFData = financialData.freeCashFlow.quarterly;
              
              // Calculate TTM FCF by summing the latest 4 quarters
              if (quarterlyFCFData.length >= 4) {
                // Calculate TTM FCF here
                for (let i = 0; i < 4; i++) {
                  ttmFCF += quarterlyFCFData[quarterlyFCFData.length - 1 - i].value;
                  console.log(`FCF Q${i+1}: ${quarterlyFCFData[quarterlyFCFData.length - 1 - i].year} = ${quarterlyFCFData[quarterlyFCFData.length - 1 - i].value}`);
                }
                console.log(`TTM FCF: ${ttmFCF}`);
                
                // Get shares outstanding for calculating per share metrics
                let sharesOutstanding = 0;
                if (financialData.sharesOutstanding?.quarterly && 
                    financialData.sharesOutstanding.quarterly.length > 0) {
                  // Use the most recent quarter's shares outstanding
                  sharesOutstanding = financialData.sharesOutstanding.quarterly[
                    financialData.sharesOutstanding.quarterly.length - 1
                  ].value;
                  console.log(`Shares Outstanding: ${sharesOutstanding}`);
                } else if (stockInfo.marketCap && stockInfo.price) {
                  // Estimate shares outstanding from market cap and price
                  sharesOutstanding = stockInfo.marketCap / stockInfo.price;
                  console.log(`Estimated Shares Outstanding from Market Cap: ${sharesOutstanding}`);
                }
                
                if (sharesOutstanding > 0) {
                  // Calculate FCF Per Share
                  //const fcfPerShare = ttmFCF / sharesOutstanding;
                  const fcfPerShare = stockInfo.price / (stockInfo.marketCap / ttmFCF); // Using Yahoo marketcap formula instead of shares outstanding
                  console.log(`FCF Per Share: ${fcfPerShare}`);

                  
                  // Calculate P/FCF ratio
                  const priceFcfRatio = stockInfo.price / fcfPerShare;
                  
                  console.log(`P/FCF: ${priceFcfRatio}`);
                  
                  // Calculate FCF growth by comparing with same quarter previous year
                  let fcfGrowth = 0;
                  if (quarterlyFCFData.length >= 8) {
                    const latestQuarterFCF = quarterlyFCFData[quarterlyFCFData.length - 1].value;
                    
                    // Try to find the same quarter from previous year (4-5 quarters back)
                    // This approach handles the quarter labeling format in the data
                    const currentQuarterYear = quarterlyFCFData[quarterlyFCFData.length - 1].year;
                    // Safely extract the quarter label (Q1, Q2, Q3, Q4)
                    const currentQuarterLabel = currentQuarterYear.includes(' ') ? 
                                               currentQuarterYear.split(' ')[0] : // e.g. "Q1" from "Q1 2023"
                                               'Q1'; // Default fallback
                    let sameQuarterLastYearFCF = null;
                    
                    for (let i = 4; i < Math.min(8, quarterlyFCFData.length); i++) {
                      const compareQuarterYear = quarterlyFCFData[quarterlyFCFData.length - 1 - i].year;
                      // Safely extract the quarter label
                      const compareQuarterLabel = compareQuarterYear.includes(' ') ?
                                                 compareQuarterYear.split(' ')[0] :
                                                 'Q1'; // Default fallback
                      
                      if (compareQuarterLabel === currentQuarterLabel) {
                        sameQuarterLastYearFCF = quarterlyFCFData[quarterlyFCFData.length - 1 - i].value;
                        break;
                      }
                    }
                    
                    if (sameQuarterLastYearFCF !== null && sameQuarterLastYearFCF !== 0) {
                      fcfGrowth = ((latestQuarterFCF - sameQuarterLastYearFCF) / Math.abs(sameQuarterLastYearFCF)) * 100;
                      console.log(`FCF YoY Growth: ${fcfGrowth.toFixed(2)}%`);
                    }
                  }
                  
                  // Update state with FCF metrics
                  setCurrentFCFPerShare(parseFloat(fcfPerShare.toFixed(2)));
                  setTtmFCFPerShare(parseFloat(fcfPerShare.toFixed(2)));
                  setPfcfRatio(parseFloat(priceFcfRatio.toFixed(2)));
                  setPfcfMultiple(Math.round(priceFcfRatio));
                  
                  if (fcfGrowth !== 0) {
                    setFcfGrowthYoY(parseFloat(fcfGrowth.toFixed(2)));
                    setFcfGrowthRate(Math.round(fcfGrowth));
                  }
                }
              }
            }
          } else {
            console.log(`Error fetching financial data: ${response.status}`);
            
            // If ttmFCF is available and stock data is available, use your original formula
            if (ttmFCF > 0 && stockInfo && stockInfo.price && stockInfo.marketCap) {
              // Your original formula:
              const fallbackFCFPerShare = stockInfo.price / (stockInfo.marketCap / ttmFCF);
              const pfcfValue = stockInfo.marketCap / ttmFCF;
              
              console.log(`Using calculated FCF per share: ${fallbackFCFPerShare.toFixed(2)}`);
              console.log(`Using calculated P/FCF: ${pfcfValue.toFixed(2)}`);
              
              setCurrentFCFPerShare(parseFloat(fallbackFCFPerShare.toFixed(2)));
              setTtmFCFPerShare(parseFloat(fallbackFCFPerShare.toFixed(2)));
              setPfcfRatio(parseFloat(pfcfValue.toFixed(2)));
              setPfcfMultiple(Math.round(pfcfValue));
            } else if (stockInfo && stockInfo.price) {
              // Fallback to default P/FCF of 20 if we don't have ttmFCF or market cap
              const defaultPFCF = 20;
              const fallbackFCFPerShare = stockInfo.price / defaultPFCF;
              console.log(`Using default P/FCF of ${defaultPFCF} with FCF per share: ${fallbackFCFPerShare.toFixed(2)}`);
              
              setCurrentFCFPerShare(parseFloat(fallbackFCFPerShare.toFixed(2)));
              setTtmFCFPerShare(parseFloat(fallbackFCFPerShare.toFixed(2)));
              setPfcfRatio(defaultPFCF);
              setPfcfMultiple(defaultPFCF);
            }
          }
        } catch (error) {
          console.error("Error fetching financial data:", error);
          
          // Also provide fallback in case of error
          if (ttmFCF > 0 && stockInfo && stockInfo.price && stockInfo.marketCap) {
            // Your original formula:
            const fallbackFCFPerShare = stockInfo.price / (stockInfo.marketCap / ttmFCF);
            const pfcfValue = stockInfo.marketCap / ttmFCF;
            
            console.log(`Error handler: Using calculated FCF per share: ${fallbackFCFPerShare.toFixed(2)}`);
            console.log(`Error handler: Using calculated P/FCF: ${pfcfValue.toFixed(2)}`);
            
            setCurrentFCFPerShare(parseFloat(fallbackFCFPerShare.toFixed(2)));
            setTtmFCFPerShare(parseFloat(fallbackFCFPerShare.toFixed(2)));
            setPfcfRatio(parseFloat(pfcfValue.toFixed(2)));
            setPfcfMultiple(Math.round(pfcfValue));
          } else if (stockInfo && stockInfo.price) {
            // Fallback to default P/FCF of 20 if we don't have ttmFCF or market cap
            const defaultPFCF = 20;
            const fallbackFCFPerShare = stockInfo.price / defaultPFCF;
            console.log(`Error fallback: Using default P/FCF of ${defaultPFCF}`);
            
            setCurrentFCFPerShare(parseFloat(fallbackFCFPerShare.toFixed(2)));
            setTtmFCFPerShare(parseFloat(fallbackFCFPerShare.toFixed(2)));
            setPfcfRatio(defaultPFCF);
            setPfcfMultiple(defaultPFCF);
          }
        }
      };
      
      fetchFinancialData();
    }
    
    // Try to fetch actual earnings data first, then fall back to estimated EPS if needed
    const fetchEarningsData = async () => {
      try {
        console.log(`Fetching earnings data for ${symbol}...`);
        const response = await fetch(`/api/earnings/${symbol}`);
        
        if (response.ok) {
          const data = await response.json() as EarningsQuarterData[];
          console.log(`Received ${data.length} quarters of earnings data`, data);
          
          // Sort data by date (handling both 'quarter' and 'endDate' formats)
          const sortedData = [...data].sort((a, b) => {
            // Handle data that has endDate format (like "2024-03-31T00:00:00.000000000")
            if (a.endDate && b.endDate) {
              return new Date(b.endDate).getTime() - new Date(a.endDate).getTime(); // Descending by date
            }
            
            // Handle data that has quarter format (like "Q1 2023")
            if (a.quarter && b.quarter) {
              // Extract year and quarter
              const [aQ, aYear] = a.quarter.split(' ');
              const [bQ, bYear] = b.quarter.split(' ');
              
              // Compare years first
              if (aYear !== bYear) {
                return parseInt(bYear) - parseInt(aYear); // Descending by year
              }
              
              // Then compare quarters (Q1, Q2, Q3, Q4)
              return parseInt(bQ.substring(1)) - parseInt(aQ.substring(1)); // Descending by quarter
            }
            
            // Fallback for mixed data
            return 0;
          });
          
          // Log the sorted quarters in a readable format
          console.log("Sorted quarters data:", sortedData.map(q => {
            if (q.quarter) return q.quarter;
            if (q.endDate && typeof q.endDate === 'string') {
              try {
                const date = new Date(q.endDate);
                // Format as YYYY-MM-DD
                return date.toISOString().split('T')[0];
              } catch (e) {
                console.log("Invalid date format:", q.endDate);
                return "Invalid date";
              }
            }
            return null;
          }));
          
          // Calculate TTM EPS from the most recent 4 quarters
          if (sortedData.length >= 4) {
            // Current 4 quarters (TTM)
            let currentTtmEarnings = 0;
            let validQuartersCount = 0;
            
            // Debug the first record's structure
            if (sortedData.length > 0 && sortedData[0]) {
              console.log("First earnings record structure:", JSON.stringify(sortedData[0]));
            }
            
            for (let i = 0; i < 4; i++) {
              if (sortedData[i]) {
                // Handle both number and string formats for reportedEPS
                let eps = 0;
                const reportedEPS = sortedData[i].reportedEPS;
                if (typeof reportedEPS === 'number') {
                  eps = reportedEPS;
                } else if (typeof reportedEPS === 'string') {
                  eps = parseFloat(reportedEPS);
                }
                
                if (!isNaN(eps)) {
                  currentTtmEarnings += eps;
                  validQuartersCount++;
                  
                  // Determine the quarter label (e.g., "Q1 2023" or a date string)
                  let quarterLabel = 'Unknown';
                  try {
                    if (sortedData[i].quarter) {
                      quarterLabel = String(sortedData[i].quarter);
                    } else if (sortedData[i].endDate) {
                      const endDateStr = String(sortedData[i].endDate);
                      const date = new Date(endDateStr);
                      if (!isNaN(date.getTime())) {
                        quarterLabel = date.toISOString().split('T')[0];
                      }
                    }
                  } catch (error) {
                    console.error("Error formatting quarter label:", error);
                  }
                    
                  console.log(`Current TTM Quarter ${i+1}: ${quarterLabel} = ${eps}`);
                }
              }
            }
            
            if (validQuartersCount > 0) {
              const formattedEPS = parseFloat(currentTtmEarnings.toFixed(2));
              setCurrentEPS(formattedEPS);
              setTtmEPS(formattedEPS);
              console.log(`Current TTM total from ${validQuartersCount} quarters: ${currentTtmEarnings}`);
            }
            
            // Calculate YoY earnings growth if we have at least 8 quarters of data
            {/*if (sortedData.length >= 8) {
              // Previous 4 quarters (prior year TTM)
              let previousTtmEarnings = 0;
              let validPreviousQuarters = 0;
              
              for (let i = 4; i < 8; i++) {
                if (sortedData[i]) {
                  // Handle both number and string formats for reportedEPS
                  let eps = 0;
                  const reportedEPS = sortedData[i].reportedEPS;
                  if (typeof reportedEPS === 'number') {
                    eps = reportedEPS;
                  } else if (typeof reportedEPS === 'string') {
                    eps = parseFloat(reportedEPS);
                  }
                  
                  if (!isNaN(eps)) {
                    previousTtmEarnings += eps;
                    validPreviousQuarters++;
                    
                    let quarterLabel = 'Unknown';
                    if (sortedData[i].quarter) {
                      quarterLabel = sortedData[i].quarter;
                    } else if (sortedData[i].endDate && typeof sortedData[i].endDate === 'string') {
                      quarterLabel = new Date(sortedData[i].endDate).toISOString().split('T')[0];
                    }
                      
                    console.log(`Previous TTM Quarter ${i-3}: ${quarterLabel} = ${eps}`);
                  }
                }
              }
              console.log(`Previous TTM total: ${previousTtmEarnings}`);
              
              if (previousTtmEarnings > 0) {
                const growth = ((currentTtmEarnings / previousTtmEarnings) - 1) * 100;
                console.log(`Calculated YoY growth: ${growth.toFixed(1)}%`);
                setEarningsGrowthYoY(parseFloat(growth.toFixed(1)));
                
                // Set default growth rate if valid growth is calculated
                if (!isNaN(growth) && isFinite(growth)) {
                  setEpsGrowthRate(Math.round(growth));
                }
              }
            }*/}
          }
        } else {
          console.log(`Error fetching earnings data: ${response.status}`);
          const errorData = await response.json();
          console.log(errorData);
          
          // Reset earnings growth YoY when no data is available
          setEarningsGrowthYoY(null);
          
          // FALLBACK: Calculate estimated EPS from price and P/E ratio
          console.log("No earnings data available, using price/PE estimate instead");
          if (stockInfo?.price && stockInfo?.peRatio && stockInfo.peRatio > 0) {
            const estimatedEPS = stockInfo.price / stockInfo.peRatio;
            const formattedEPS = parseFloat(estimatedEPS.toFixed(2));
            setCurrentEPS(formattedEPS);
            setTtmEPS(formattedEPS);
            console.log(`Estimated EPS from price/PE: $${estimatedEPS.toFixed(2)}`);
          } else if (currentPrice > 0) {
            // If no P/E ratio, use current price and default P/E of 20 as fallback
            const fallbackEPS = currentPrice / 20;
            const formattedEPS = parseFloat(fallbackEPS.toFixed(2));
            setCurrentEPS(formattedEPS);
            setTtmEPS(formattedEPS);
            console.log(`Estimated EPS using default PE of 20: $${fallbackEPS.toFixed(2)}`);
          }
        }
      } catch (error) {
        console.error("Error fetching earnings data:", error);
        // Reset earnings growth YoY when error occurs
        setEarningsGrowthYoY(null);
        
        // FALLBACK: Calculate estimated EPS from price and P/E ratio
        console.log("Error fetching earnings data, using price/PE estimate instead");
        if (stockInfo?.price && stockInfo?.peRatio && stockInfo.peRatio > 0) {
          const estimatedEPS = stockInfo.price / stockInfo.peRatio;
          const formattedEPS = parseFloat(estimatedEPS.toFixed(2));
          setCurrentEPS(formattedEPS);
          setTtmEPS(formattedEPS);
          console.log(`Estimated EPS from price/PE: $${estimatedEPS.toFixed(2)}`);
        } else if (currentPrice > 0) {
          // If no P/E ratio, use current price and default P/E of 20 as fallback
          const fallbackEPS = currentPrice / 20;
          const formattedEPS = parseFloat(fallbackEPS.toFixed(2));
          setCurrentEPS(formattedEPS);
          setTtmEPS(formattedEPS);
          console.log(`Estimated EPS using default PE of 20: $${fallbackEPS.toFixed(2)}`);
        }
      }
    };
    
    if (symbol) {
      fetchEarningsData();
    }
  }, [symbol, stockInfo, currentPrice, metrics, earningsMetric]);
  
  // Calculate projection when inputs change
  useEffect(() => {
    // Determine which mode's inputs to use
    const isEarningsMode = projectionMode === 'earnings';
    
    // Validate that we have the required data for the selected mode
    if (isEarningsMode && (ttmEPS === null || !ttmEPS || currentPrice <= 0)) return;
    if (!isEarningsMode && (ttmFCFPerShare === null || !ttmFCFPerShare || currentPrice <= 0)) return;
    
    // Calculate 5-year projection
    const projectionYears = 5;
    const projectionData = [];
    
    // Get the appropriate values based on the selected mode
    const growthRate = isEarningsMode ? epsGrowthRate : fcfGrowthRate;
    const multiple = isEarningsMode ? peMultiple : pfcfMultiple;
    const perShareValue = isEarningsMode ? ttmEPS || 0 : ttmFCFPerShare || 0;
    const metricLabel = isEarningsMode ? 'eps' : 'fcf';
    
    // Initialize with current value (guaranteed to be a number at this point)
    let projectedValue = perShareValue;
    
    // Add current year data
    const currentYear = new Date().getFullYear();
    projectionData.push({
      year: `${currentYear}`,
      price: currentPrice,
      [metricLabel]: projectedValue
    });
    
    // Calculate final price using growth and multiple
    // We'll still use the value × multiple calculation for the end point
    let projectedFinalValue = perShareValue;
    for (let i = 1; i <= projectionYears; i++) {
      projectedFinalValue = projectedFinalValue * (1 + growthRate / 100);
    }
    const finalPrice = projectedFinalValue * multiple;
    
    // Calculate CAGR
    const yearsHeld = projectionYears;
    const cagr = (Math.pow(finalPrice / currentPrice, 1 / yearsHeld) - 1) * 100;
    
    // Calculate entry price needed for desired return
    const entryPriceNeeded = finalPrice / Math.pow(1 + desiredReturn / 100, yearsHeld);
    
    // Now, instead of using Value × Multiple for each year, use the CAGR to create a smooth line
    // This applies the same annual return rate to each projection point
    for (let i = 1; i <= projectionYears; i++) {
      // Still calculate the per-share metric for displaying in tooltips
      // perShareValue is guaranteed to be a number because of the || 0 fallback
      projectedValue = perShareValue * Math.pow(1 + growthRate / 100, i);
      
      // Use the CAGR to calculate a smooth price progression
      const projectedPrice = currentPrice * Math.pow(1 + cagr / 100, i);
      
      projectionData.push({
        year: `${currentYear + i}`,
        price: projectedPrice,
        [metricLabel]: projectedValue
      });
    }
    
    setProjectionData(projectionData);
    setCalculatedReturn(cagr);
    setEntryPriceForDesiredReturn(entryPriceNeeded);
  }, [
    projectionMode, 
    // Earnings mode dependencies
    ttmEPS, 
    epsGrowthRate, 
    peMultiple, 
    // FCF mode dependencies
    ttmFCFPerShare,
    fcfGrowthRate,
    pfcfMultiple,
    // Common dependencies
    desiredReturn, 
    currentPrice
  ]);
  
  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const isEarningsMode = projectionMode === 'earnings';
      const multiple = isEarningsMode ? peMultiple : pfcfMultiple;
      const multipleLabel = isEarningsMode ? 'P/E' : 'P/FCF';
      
      return (
        <div className="custom-tooltip bg-background p-2 rounded-md border border-border shadow-md">
          <p className="font-medium">{payload[0].payload.year}</p>
          <p className="text-primary">Price: ${payload[0].value?.toFixed(2)}</p>
          {isEarningsMode ? (
            <p className="text-muted-foreground">EPS: ${payload[0].payload.eps?.toFixed(2)}</p>
          ) : (
            <p className="text-muted-foreground">FCF per Share: ${payload[0].payload.fcf?.toFixed(2)}</p>
          )}
          <p className="text-muted-foreground">{multipleLabel}: {multiple}</p>
        </div>
      );
    }
    return null;
  };
  
  // Handle input changes with proper decimal handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<any>>, isFloat = false) => {
    const inputValue = e.target.value;
    
    // For float values (like EPS), allow decimal typing
    if (isFloat) {
      // Check if it's a valid input format for decimal or negative sign
      // Allow for incomplete inputs like: "-", "-.", "1.", etc.
      const isValidDecimalInput = /^-?\d*\.?\d*$/.test(inputValue);
      
      if (inputValue === '' || inputValue === '.' || inputValue === '-' || inputValue === '-.') {
        // Empty, just a decimal point, just a negative, or negative with decimal - keep as string
        setter(inputValue);
      } else if (isValidDecimalInput) {
        // Is it a complete number or still being typed?
        if (inputValue.endsWith('.') || inputValue.endsWith('.0') || inputValue === '-0') {
          // User is still typing - keep as string
          setter(inputValue);
        } else if (!isNaN(parseFloat(inputValue))) {
          // Complete valid number - convert to number
          setter(parseFloat(inputValue));
        }
      }
    } else {
      // For integers, handle negative signs and empty inputs
      if (inputValue === '' || inputValue === '-') {
        setter(inputValue);
      } else {
        const parsedValue = parseInt(inputValue);
        // Use null check instead of || 0 to properly handle negative zero
        setter(isNaN(parsedValue) ? 0 : parsedValue);
      }
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-lg p-4 sm:p-6 mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">5-Year Projection Calculator</h2>
        <ToggleGroup 
          type="single" 
          value={projectionMode}
          onValueChange={(value) => value && setProjectionMode(value as 'earnings' | 'fcf')}
          className="border border-border rounded-lg"
        >
          <ToggleGroupItem value="earnings" className="text-sm px-4">
            Earnings
          </ToggleGroupItem>
          <ToggleGroupItem value="fcf" className="text-sm px-4">
            Free Cash Flow
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Top information section with two side by side boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-6">
        {/* Left Box - Current Metrics */}
        <div className="bg-blue-900/20 p-4 rounded-xl">
          <h3 className="text-lg font-medium mb-4">Stock Metrics</h3>
          <div className="flex flex-row justify-between">
            {projectionMode === 'earnings' ? (
              // Earnings mode metrics
              <>
                <div className="flex flex-col items-start">
                  <h4 className="text-muted-foreground">Current EPS (TTM):</h4>
                  <p className="text-lg font-medium">${currentEPS || '—'}</p>
                </div>
                <div className="flex flex-col items-start">
                  <h4 className="text-muted-foreground">P/E (TTM):</h4>
                  <p className="text-lg font-medium">{stockInfo?.peRatio ? formatValue(stockInfo.peRatio, false) : '—'}</p>
                </div>
                <div className="flex flex-col items-start">
                  <h4 className="text-muted-foreground">EPS Growth (YoY):</h4>
                  <p className="text-lg font-medium">
                    {earningsMetric ? earningsMetric.value : (earningsGrowthYoY !== null ? `${earningsGrowthYoY.toFixed(1)}%` : '—')}
                  </p>
                </div>
              </>
            ) : (
              // FCF mode metrics
              <>
                <div className="flex flex-col items-start">
                  <h4 className="text-muted-foreground">FCF per Share (TTM):</h4>
                  <p className="text-lg font-medium">${currentFCFPerShare || '—'}</p>
                </div>
                <div className="flex flex-col items-start">
                  <h4 className="text-muted-foreground">P/FCF (TTM):</h4>
                  <p className="text-lg font-medium">{pfcfRatio ? formatValue(pfcfRatio, false) : '—'}</p>
                </div>
                <div className="flex flex-col items-start">
                  <h4 className="text-muted-foreground">FCF Growth (YoY):</h4>
                  <p className="text-lg font-medium">
                    {fcfGrowthYoY !== null ? fcfGrowthYoY > 0 ? `+${fcfGrowthYoY.toFixed(1)}%` : `${fcfGrowthYoY.toFixed(1)}%` : '—'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Right Box - Calculation Results */}
        <div className="bg-blue-900/20 p-4 rounded-xl">
          <h3 className="text-lg font-medium mb-4">Calculation Results</h3>
          <div className="flex flex-row space-x-24">
            
            <div className="flex flex-col items-start">
              <h4 className="text-muted-foreground">Annual Return from today's price:</h4>
              <p className={`text-lg font-medium ${calculatedReturn !== null && calculatedReturn >= desiredReturn ? 'text-green-500' : 'text-red-600'}`}>
                {calculatedReturn !== null ? calculatedReturn.toFixed(2) + '%' : 'N/A'}
              </p>
            </div>
            <div className="flex flex-col items-start">
              <h4 className="text-muted-foreground">Entry Price for {desiredReturn}% Return:</h4>
              <p className="text-lg font-medium">
                {entryPriceForDesiredReturn !== null
                  ? '$' + entryPriceForDesiredReturn.toFixed(2)
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout for assumptions and chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left Column - Assumptions */}
        <div>
          <h3 className="text-lg font-medium mb-4 mt-4">Assumptions</h3>
          
          {projectionMode === 'earnings' ? (
            // Earnings mode form inputs
            <>
              <div className="mb-4 mt-5">
                <Label htmlFor="ttmEPS">EPS (TTM)</Label>
                <div className="flex items-center mt-2">
                  <span className="mr-2">$</span>
                  <Input
                    id="ttmEPS"
                    type="text"
                    value={ttmEPS !== null ? (typeof ttmEPS === 'string' ? ttmEPS : String(ttmEPS)) : ''}
                    onChange={(e) => handleInputChange(e, setTtmEPS, true)}
                    className="bg-muted border-muted-foreground/20"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  The Earnings Per Share over the last 12 months.
                </p>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="epsGrowth">EPS Growth Rate</Label>
                <div className="flex items-center mt-2">
                  <Input
                    id="epsGrowth"
                    type="text"
                    value={String(epsGrowthRate).replace(/^0+/, '')}
                    onChange={(e) => handleInputChange(e, setEpsGrowthRate, true)}
                    className="bg-muted border-muted-foreground/20"
                  />
                  <span className="ml-2">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your assumption of the company's expected yearly EPS growth
                  rate as a percentage (e.g., 10 for 10% per year)
                </p>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="peMultiple">P/E Multiple</Label>
                <Input
                  id="peMultiple"
                  type="text"
                  value={String(peMultiple).replace(/^0+/, '')}
                  onChange={(e) => handleInputChange(e, setPeMultiple, true)}
                  className="bg-muted border-muted-foreground/20 mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The P/E ratio you consider appropriate for the stock to trade at.
                </p>
              </div>
            </>
          ) : (
            // FCF mode form inputs
            <>
              <div className="mb-4 mt-5">
                <Label htmlFor="ttmFCFPerShare">FCF Per Share (TTM)</Label>
                <div className="flex items-center mt-2">
                  <span className="mr-2">$</span>
                  <Input
                    id="ttmFCFPerShare"
                    type="text"
                    value={ttmFCFPerShare !== null ? (typeof ttmFCFPerShare === 'string' ? ttmFCFPerShare : String(ttmFCFPerShare)) : ''}
                    onChange={(e) => handleInputChange(e, setTtmFCFPerShare, true)}
                    className="bg-muted border-muted-foreground/20"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  The Free Cash Flow Per Share over the last 12 months.
                </p>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="fcfGrowth">FCF Growth Rate</Label>
                <div className="flex items-center mt-2">
                  <Input
                    id="fcfGrowth"
                    type="text"
                    value={String(fcfGrowthRate).replace(/^0+/, '')}
                    onChange={(e) => handleInputChange(e, setFcfGrowthRate, true)}
                    className="bg-muted border-muted-foreground/20"
                  />
                  <span className="ml-2">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your assumption of the company's expected yearly FCF growth
                  rate as a percentage (e.g., 10 for 10% per year)
                </p>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="pfcfMultiple">P/FCF Multiple</Label>
                <Input
                  id="pfcfMultiple"
                  type="text"
                  value={String(pfcfMultiple).replace(/^0+/, '')}
                  onChange={(e) => handleInputChange(e, setPfcfMultiple, true)}
                  className="bg-muted border-muted-foreground/20 mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The P/FCF ratio you consider appropriate for the stock to trade at.
                </p>
              </div>
            </>
          )}
          
          {/* Common input for both modes */}
          <div className="mb-4">
            <Label htmlFor="desiredReturn">Desired Return</Label>
            <div className="flex items-center mt-2">
              <Input
                id="desiredReturn"
                type="text"
                value={String(desiredReturn).replace(/^0+/, '')}
                onChange={(e) => handleInputChange(e, setDesiredReturn, true)}
                className="bg-muted border-muted-foreground/20"
              />
              <span className="ml-2">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This is the annualized return you aim to achieve from the stock.
            </p>
          </div>
        </div>
        
        {/* Right Column - Chart */}
        <div>
          <h3 className="text-lg font-medium mb-4 mt-4">Price Projection</h3>
          
          <div className="h-[500px] mt-2">
            {projectionData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={projectionData}
                  margin={isMobile 
                    ? { top: 5, right: 20, left: 10, bottom: 50 }
                    : { top: 20, right: 20, left: 10, bottom: 30 }
                  }
                >
                  <CartesianGrid 
                    vertical={false}
                    horizontal={true} 
                    strokeDasharray="0" 
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis 
                    dataKey="year"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `$${value}`}
                    tick={{ fontSize: 12 }}
                    width={65}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Entry price reference line */}
                  {entryPriceForDesiredReturn !== null && (
                    <ReferenceLine 
                      y={entryPriceForDesiredReturn} 
                      stroke="orange" 
                      strokeDasharray="3 3" 
                      strokeWidth={1.5} 
                      ifOverflow="extendDomain"
                      label={{
                        value: `Entry Price: $${entryPriceForDesiredReturn.toFixed(2)}`,
                        position: 'insideBottomLeft',
                        fill: 'orange',
                        fontSize: 12,
                      }}
                    />
                  )}
                  
                  {/* Main price projection line - changes color based on mode */}
                  <Line
                    type="monotone"
                    dataKey="price"
                    name={projectionMode === 'earnings' ? 'Earnings-Based Projection' : 'FCF-Based Projection'}
                    stroke={projectionMode === 'earnings' ? '#10b981' : '#3b82f6'}
                    strokeWidth={2}
                    dot={{ 
                      r: 6, 
                      fill: projectionMode === 'earnings' ? '#10b981' : '#3b82f6', 
                      strokeWidth: 0 
                    }}
                    activeDot={{ 
                      r: 8, 
                      fill: projectionMode === 'earnings' ? '#10b981' : '#3b82f6' 
                    }}
                    isAnimationActive={true}
                    key={`${projectionMode}-price-line`}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectionCalculator;