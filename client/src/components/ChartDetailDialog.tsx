import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StockChart from './StockChart';
import { FinancialDataPoint, StockInfo } from '@/types/stock';

interface CAGRData {
  oneYear: number;
  threeYear: number;
  fiveYear: number;
  tenYear: number;
}

interface ChartDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  growthTitle: string;
  data: FinancialDataPoint[];
  symbol: string;
  color: string;
  secondaryData?: FinancialDataPoint[];
  secondaryColor?: string;
  secondaryName?: string;
  primaryName?: string;
  chartType?: "bar" | "line";
  comparisonSeries?: {
    name: string;
    data: FinancialDataPoint[];
    color: string;
    isSecondary?: boolean;
  }[];
  payoutRatio?: number;
  sbcPercentage?: number;
  stockInfo?: StockInfo;
}

// Calculate CAGR (Compound Annual Growth Rate)
const calculateCAGR = (data: FinancialDataPoint[], years: number, isQuarterly: boolean = false): number => {
  if (!data || data.length < years + 1) {
    console.log(`Insufficient data for CAGR calculation. Years: ${years}, Data length: ${data.length}, Type: ${isQuarterly ? 'Quarterly' : 'Annual'}`);
    return 0;
  }
  
  // For quarterly data, use rolling 4-quarter sums (TTM)
  if (isQuarterly) {
    console.log(`--------------------------------------------------`);
    console.log(`QUARTERLY CAGR CALCULATION (${years} year period):`);
    console.log(`--------------------------------------------------`);
    console.log(`Total quarters available: ${data.length}`);
    
    // We need more data points for quarterly calculation
    // 1 year = 4 quarters, 3 years = 12 quarters, 5 years = 20 quarters
    const quartersNeeded = years === 1 ? 4 : (years * 4);
    
    // Need enough quarters for meaningful calculation
    if (data.length < quartersNeeded + 4) {
      console.log(`Not enough quarterly data for ${years}-year CAGR. Need ${quartersNeeded + 4}, have ${data.length}`);
      return 0;
    }
    
    // Calculate TTM (trailing twelve months) for the most recent period
    // End value: sum of the 4 most recent quarters
    let endTTM = 0;
    console.log(`Calculating END TTM (most recent 4 quarters):`);
    for (let i = 0; i < 4; i++) {
      const idx = data.length - 1 - i;
      if (idx >= 0) {
        console.log(`  Quarter ${data[idx].year}: ${data[idx].value}`);
        endTTM += data[idx].value;
      }
    }
    console.log(`END TTM Total: ${endTTM}`);
    
    // Calculate TTM for the starting period
    // Start value: sum of the 4 quarters from the correct starting point
    // For 1 year: we want quarters 5,6,7,8 from the end (indices 4 to 7 from the end)
    // For 3 years: we want quarters 13,14,15,16 from the end (indices 12 to 15 from the end)
    // For 5 years: we want quarters 21,22,23,24 from the end (indices 20 to 23 from the end)
    let startTTM = 0;
    
    // Calculate the correct starting point based on the year period
    let startQtrIdx;
    if (years === 1) {
      // For 1-year CAGR, we compare current TTM to TTM from 1 year ago
      // This means we need quarters 5,6,7,8 from the end
      startQtrIdx = data.length - 8;
      console.log(`Using 1-year look-back: Quarters 5-8 from the end (indices ${startQtrIdx} to ${startQtrIdx+3})`);
    } else {
      // For 3-year and 5-year CAGRs, we use (years * 4) quarters back
      startQtrIdx = data.length - 4 - quartersNeeded;
      console.log(`Using ${years}-year look-back: Quarters ${quartersNeeded+1}-${quartersNeeded+4} from the end (indices ${startQtrIdx} to ${startQtrIdx+3})`);
    }
    
    // Sum up 4 quarters for the start TTM
    console.log(`Calculating START TTM (${years} year ago, 4 quarters):`);
    for (let i = 0; i < 4; i++) {
      const idx = startQtrIdx + i;
      if (idx >= 0 && idx < data.length) {
        console.log(`  Quarter ${data[idx].year}: ${data[idx].value}`);
        startTTM += data[idx].value;
      }
    }
    console.log(`START TTM Total: ${startTTM}`);
    
    // Special case: Handle negative to positive transition
    if (startTTM < 0 && endTTM > 0) {
      // When starting with negative and ending with positive, this is definitely a positive improvement
      // Rather than showing a misleading negative CAGR, we'll calculate a positive CAGR based on the 
      // improvement from the negative value
      console.log(`Detected negative-to-positive transition (${startTTM} to ${endTTM})`);
      
      // We can't use standard CAGR formula for negative base values, so we'll calculate the 
      // improvement as a percentage of the absolute value of the starting point
      const improvement = endTTM - startTTM; // Total improvement (positive)
      const improvementRatio = improvement / Math.abs(startTTM);
      const annualImprovement = improvementRatio / years; // Simple average annual improvement ratio
      
      console.log(`CAGR RESULTS (Negative-to-Positive Special Case):`);
      console.log(`  End Value (latest TTM): ${endTTM}`);
      console.log(`  Start Value (${years} year ago TTM): ${startTTM}`);
      console.log(`  Total Improvement: ${improvement}`);
      console.log(`  Improvement Ratio: ${(improvementRatio * 100).toFixed(2)}%`);
      console.log(`  Annual Improvement: ${(annualImprovement * 100).toFixed(2)}%`);
      console.log(`--------------------------------------------------`);
      
      return annualImprovement; // Return as a decimal
    }
    
    // Avoid division by zero
    if (startTTM === 0) {
      console.log(`Start TTM is zero for ${years}-year CAGR calculation`);
      return 0;
    }
    
    // Special case: If both start and end values are negative
    if (startTTM < 0 && endTTM < 0) {
      // If loss is reducing (improving), we want to show a positive CAGR
      // If loss is increasing (worsening), we want to show a negative CAGR
      
      // Compare absolute values to see if the loss is reducing
      const isImproving = Math.abs(endTTM) < Math.abs(startTTM);
      
      if (isImproving) {
        // Less negative = improvement
        const improvement = Math.abs(startTTM) - Math.abs(endTTM); 
        const improvementRatio = improvement / Math.abs(startTTM);
        const annualImprovement = Math.pow(1 + improvementRatio, 1 / years) - 1;
        
        console.log(`CAGR RESULTS (Negative-to-Less-Negative Special Case):`);
        console.log(`  End Value (latest TTM): ${endTTM}`);
        console.log(`  Start Value (${years} year ago TTM): ${startTTM}`);
        console.log(`  Loss reduction: ${improvement}`);
        console.log(`  Improvement Ratio: ${(improvementRatio * 100).toFixed(2)}%`);
        console.log(`  Annual Improvement: ${(annualImprovement * 100).toFixed(2)}%`);
        console.log(`--------------------------------------------------`);
        
        return annualImprovement; // Return positive CAGR
      } else {
        // More negative = worsening
        const worsening = Math.abs(endTTM) - Math.abs(startTTM);
        const worseningRatio = worsening / Math.abs(startTTM);
        const annualWorsening = Math.pow(1 + worseningRatio, 1 / years) - 1;
        
        console.log(`CAGR RESULTS (Negative-to-More-Negative Special Case):`);
        console.log(`  End Value (latest TTM): ${endTTM}`);
        console.log(`  Start Value (${years} year ago TTM): ${startTTM}`);
        console.log(`  Loss increase: ${worsening}`);
        console.log(`  Worsening Ratio: ${(worseningRatio * 100).toFixed(2)}%`);
        console.log(`  Annual Worsening: ${(annualWorsening * 100).toFixed(2)}%`);
        console.log(`--------------------------------------------------`);
        
        return -annualWorsening; // Return negative CAGR
      }
    }
    
    // Standard case: Calculate normal CAGR for positive values
    const totalGrowth = ((endTTM / startTTM) - 1) * 100;
    const annualCAGR = (Math.pow(endTTM / startTTM, 1 / years) - 1) * 100;
    
    console.log(`CAGR RESULTS (Standard Case):`);
    console.log(`  End Value (latest TTM): ${endTTM}`);
    console.log(`  Start Value (${years} year ago TTM): ${startTTM}`);
    console.log(`  Total Growth: ${totalGrowth.toFixed(2)}%`);
    console.log(`  Annual CAGR: ${annualCAGR.toFixed(2)}%`);
    console.log(`--------------------------------------------------`);
    
    // CAGR = (End Value / Start Value)^(1/years) - 1
    return Math.pow(endTTM / startTTM, 1 / years) - 1;
  } 
  // For annual data, use the similar calculation with special cases for negative values
  else {
    const endValue = data[data.length - 1].value;
    const startValue = data[data.length - 1 - years].value;
    
    // Special case: Handle negative to positive transition
    if (startValue < 0 && endValue > 0) {
      console.log(`Detected negative-to-positive transition (${startValue} to ${endValue})`);
      
      // Calculate the improvement as a percentage of the absolute value
      const improvement = endValue - startValue; 
      const improvementRatio = improvement / Math.abs(startValue);
      const annualImprovement = improvementRatio / years; // Simple average annual improvement
      
      console.log(`Annual CAGR (${years} year) - Negative-to-Positive Case: 
        End Value: ${endValue} 
        Start Value: ${startValue}
        Total Improvement: ${improvement}
        Improvement Ratio: ${(improvementRatio * 100).toFixed(2)}%
        Annual Improvement: ${(annualImprovement * 100).toFixed(2)}%`);
      
      return annualImprovement; // Return as a decimal
    }
    
    // Special case: If both start and end values are negative
    if (startValue < 0 && endValue < 0) {
      // If loss is reducing (improving), we want to show a positive CAGR
      // If loss is increasing (worsening), we want to show a negative CAGR
      
      // Compare absolute values to see if the loss is reducing
      const isImproving = Math.abs(endValue) < Math.abs(startValue);
      
      if (isImproving) {
        // Less negative = improvement
        const improvement = Math.abs(startValue) - Math.abs(endValue);
        const improvementRatio = improvement / Math.abs(startValue);
        const annualImprovement = Math.pow(1 + improvementRatio, 1 / years) - 1;
        
        console.log(`Annual CAGR (${years} year) - Negative-to-Less-Negative Case: 
          End Value: ${endValue} 
          Start Value: ${startValue}
          Loss reduction: ${improvement}
          Improvement Ratio: ${(improvementRatio * 100).toFixed(2)}%
          Annual Improvement: ${(annualImprovement * 100).toFixed(2)}%`);
        
        return annualImprovement; // Return positive CAGR
      } else {
        // More negative = worsening
        const worsening = Math.abs(endValue) - Math.abs(startValue);
        const worseningRatio = worsening / Math.abs(startValue);
        const annualWorsening = Math.pow(1 + worseningRatio, 1 / years) - 1;
        
        console.log(`Annual CAGR (${years} year) - Negative-to-More-Negative Case: 
          End Value: ${endValue} 
          Start Value: ${startValue}
          Loss increase: ${worsening}
          Worsening Ratio: ${(worseningRatio * 100).toFixed(2)}%
          Annual Worsening: ${(annualWorsening * 100).toFixed(2)}%`);
        
        return -annualWorsening; // Return negative CAGR
      }
    }
    
    // Avoid division by zero
    if (startValue === 0) {
      console.log(`Start value is zero for ${years}-year annual CAGR calculation`);
      return 0;
    }
    
    // Standard case: Log for debugging
    console.log(`Annual CAGR (${years} year) - Standard Case: 
      End Value: ${endValue} 
      Start Value: ${startValue}
      Growth: ${(endValue / startValue - 1) * 100}%
      Annual CAGR: ${(Math.pow(endValue / startValue, 1 / years) - 1) * 100}%`);
    
    // CAGR = (End Value / Start Value)^(1/years) - 1
    return Math.pow(endValue / startValue, 1 / years) - 1;
  }
};

const ChartDetailDialog: React.FC<ChartDetailDialogProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  data,
  symbol,
  color,
  secondaryData,
  secondaryColor,
  secondaryName,
  primaryName,
  chartType = "line",
  comparisonSeries = [],
  payoutRatio,
  sbcPercentage,
  stockInfo,
}) => {
  // State to track the selected year range
  const [yearRange, setYearRange] = useState<string>("all");
  
  // Determine if data is quarterly or annual based on the chart title/subtitle
  // Added checking of data points to better determine if it's quarterly
  const hasQuarterlyText = subtitle.toLowerCase().includes('quarterly') || title.toLowerCase().includes('quarterly');
  const hasQuarterlyFormat = data.length > 0 && data[0].year.toString().includes('Q');
  const isQuarterlyData = hasQuarterlyText || hasQuarterlyFormat;
  
  console.log(`Chart "${title}" quarterly check: text=${hasQuarterlyText}, format=${hasQuarterlyFormat}, FINAL=${isQuarterlyData}`);
  
  // Log the data type (quarterly or annual) for debugging
  console.log(`Data type for ${title}: ${isQuarterlyData ? 'QUARTERLY' : 'ANNUAL'}`);
  
  // Log the first few data points for debugging
  if (data.length > 0) {
    console.log(`First 5 data points for ${title}:`);
    data.slice(0, 5).forEach((point, idx) => {
      console.log(`  [${idx}] ${point.year}: ${point.value}`);
    });
    console.log(`Last 5 data points for ${title}:`);
    data.slice(-5).forEach((point, idx) => {
      console.log(`  [${data.length - 5 + idx}] ${point.year}: ${point.value}`);
    });
  }
  
  // Filter data based on selected year range
  const filterDataByYearRange = (data: FinancialDataPoint[], range: string): FinancialDataPoint[] => {
    if (!data || data.length === 0 || range === "all") {
      return data;
    }
    {/*}
    // For annual data or small datasets, return all data
    if (!isQuarterlyData || data.length < 20) {
      return data;
    }
    
    const numYears = parseInt(range.replace("y", ""), 10);
    const quartersPerYear = 4;
    const numQuarters = numYears * quartersPerYear;
    
    // Return only the most recent numQuarters
    return data.slice(-numQuarters);*/}
    
    // Parse the year range (e.g., "5y" -> 5, "10y" -> 10, "15y" -> 15, "20y" -> 20)
    const numYears = parseInt(range.replace("y", ""), 10);

    // Calculate the number of periods based on data frequency
    const periods = isQuarterlyData ? numYears * 4 : numYears;

    // Ensure we don't slice beyond available data
    const startIndex = Math.max(0, data.length - periods);

    // Return the most recent periods of data
    return data.slice(startIndex);
  };
  
  // Filter both primary and comparison data
  const filteredData = filterDataByYearRange(data, yearRange);
  const filteredSecondaryData = secondaryData ? filterDataByYearRange(secondaryData, yearRange) : undefined;
  const filteredComparisonSeries = comparisonSeries.map(series => ({
    ...series,
    data: filterDataByYearRange(series.data, yearRange)
  }));
  
  // Calculate CAGR for primary data series
  const primaryCAGR: CAGRData = {
    oneYear: calculateCAGR(data, 1, isQuarterlyData) * 100,
    threeYear: calculateCAGR(data, 3, isQuarterlyData) * 100,
    fiveYear: data.length >= (isQuarterlyData ? 24 : 6) ? calculateCAGR(data, 5, isQuarterlyData) * 100 : 0,
    tenYear: data.length >= (isQuarterlyData ? 44 : 11) ? calculateCAGR(data, 10, isQuarterlyData) * 100 : 0,
  };

  // Calculate CAGR for secondary data series if available
  const secondaryCAGR: CAGRData | null = secondaryData ? {
    oneYear: calculateCAGR(secondaryData, 1, isQuarterlyData) * 100,
    threeYear: calculateCAGR(secondaryData, 3, isQuarterlyData) * 100,
    fiveYear: secondaryData.length >= (isQuarterlyData ? 24 : 6) ? calculateCAGR(secondaryData, 5, isQuarterlyData) * 100 : 0,
    tenYear: secondaryData.length >= (isQuarterlyData ? 44 : 11) ? calculateCAGR(secondaryData, 10, isQuarterlyData) * 100 : 0,
  } : null;

  // Get CAGR for comparison series
  const comparisonCAGRs = comparisonSeries.map(series => ({
    name: series.name,
    cagr: {
      oneYear: calculateCAGR(series.data, 1, isQuarterlyData) * 100,
      threeYear: calculateCAGR(series.data, 3, isQuarterlyData) * 100,
      fiveYear: series.data.length >= (isQuarterlyData ? 24 : 6) ? calculateCAGR(series.data, 5, isQuarterlyData) * 100 : 0,
      tenYear: series.data.length >= (isQuarterlyData ? 44 : 11) ? calculateCAGR(series.data, 10, isQuarterlyData) * 100 : 0,
    }
  }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-screen flex flex-col p-4 overflow-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold p-0 m-0"> {title} <br />
              <span className="text-muted-foreground text-base font-normal">{subtitle}</span>
            </h3>


            {/* Show tabs based on data type */}
            <div className="flex items-center gap-2">
              <Tabs
                value={yearRange}
                onValueChange={setYearRange}
                className="w-auto"
              >
                <TabsList className="h-9 p-1">
                  <TabsTrigger value="all" className="text-s h-7">
                    All
                  </TabsTrigger>

                  {/* Tabs for quarterly data */}
                  {isQuarterlyData && (
                    <>
                      {data.length >= 80 && (
                        <TabsTrigger value="20y" className="text-s h-7">
                          20Y
                        </TabsTrigger>
                      )}
                      {data.length >= 60 && (
                        <TabsTrigger value="15y" className="text-s h-7">
                          15Y
                        </TabsTrigger>
                      )}
                      {data.length >= 40 && (
                        <TabsTrigger value="10y" className="text-s h-7">
                          10Y
                        </TabsTrigger>
                      )}
                      {data.length >= 20 && (
                        <TabsTrigger value="5y" className="text-s h-7">
                          5Y
                        </TabsTrigger>
                      )}
                    </>
                  )}

                  {/* Tabs for yearly data */}
                  {!isQuarterlyData && (
                    <>
                      {data.length >= 20 && (
                        <TabsTrigger value="20y" className="text-s h-7">
                          20Y
                        </TabsTrigger>
                      )}
                      {data.length >= 15 && (
                        <TabsTrigger value="15y" className="text-s h-7">
                          15Y
                        </TabsTrigger>
                      )}
                      {data.length >= 10 && (
                        <TabsTrigger value="10y" className="text-s h-7">
                          10Y
                        </TabsTrigger>
                      )}
                      {data.length >= 5 && (
                        <TabsTrigger value="5y" className="text-s h-7">
                          5Y
                        </TabsTrigger>
                      )}
                    </>
                  )}
                </TabsList>
              </Tabs>
            </div>
          </div>
          
        
        <div className="flex-1 flex flex-col">
          <div style={{ height: "50vh", width: "100%" }} className="mb-4">
            <div className="w-full h-full border border-border rounded-md p-2 bg-card/50">
              <StockChart
                title=""
                subtitle=""
                growthTitle={title}
                data={filteredData}
                dataFrequency={isQuarterlyData ? "quarterly" : "annual"}
                color={color}
                index={0}
                secondaryData={filteredSecondaryData}
                secondaryColor={secondaryColor}
                secondaryName={secondaryName}
                primaryName={primaryName || symbol}
                chartType={chartType}
                comparisonSeries={filteredComparisonSeries}
                isDetailView={true}
                hideGrowthLabels={false} // Ensure growth lines are visible in detail dialog
                payoutRatio={payoutRatio}
                sbcPercentage={sbcPercentage}
                stockInfo={stockInfo}
              />
            </div>
          </div>
          
          <div className="mt-6 border-t pt-4 pb-4">
            <h3 className="text-lg font-medium mb-3">Compound Annual Growth Rate (CAGR)</h3>
            
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {/* Primary data CAGR */}
              <div className="space-y-2">
                <div className="font-medium">{primaryName || symbol}</div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={primaryCAGR.oneYear >= 0 ? "success" : "destructive"}>
                    1Y: {primaryCAGR.oneYear.toFixed(2)}%
                  </Badge>
                  <Badge variant={primaryCAGR.threeYear >= 0 ? "success" : "destructive"}>
                    3Y: {primaryCAGR.threeYear.toFixed(2)}%
                  </Badge>
                  {data.length >= (isQuarterlyData ? 24 : 6) && (
                    <Badge variant={primaryCAGR.fiveYear >= 0 ? "success" : "destructive"}>
                      5Y: {primaryCAGR.fiveYear.toFixed(2)}%
                    </Badge>
                  )}
                  {data.length >= (isQuarterlyData ? 44 : 11) && (
                    <Badge variant={primaryCAGR.tenYear >= 0 ? "success" : "destructive"}>
                      10Y: {primaryCAGR.tenYear.toFixed(2)}%
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Secondary data CAGR if present */}
              {secondaryCAGR && (
                <div className="space-y-2">
                  <div className="font-medium">{secondaryName || "Secondary"}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={secondaryCAGR.oneYear >= 0 ? "success" : "destructive"}>
                      1Y: {secondaryCAGR.oneYear.toFixed(2)}%
                    </Badge>
                    <Badge variant={secondaryCAGR.threeYear >= 0 ? "success" : "destructive"}>
                      3Y: {secondaryCAGR.threeYear.toFixed(2)}%
                    </Badge>
                    {secondaryData && secondaryData.length >= (isQuarterlyData ? 24 : 6) && (
                      <Badge variant={secondaryCAGR.fiveYear >= 0 ? "success" : "destructive"}>
                        5Y: {secondaryCAGR.fiveYear.toFixed(2)}%
                      </Badge>
                    )}
                    {secondaryData && secondaryData.length >= (isQuarterlyData ? 44 : 11) && (
                      <Badge variant={secondaryCAGR.tenYear >= 0 ? "success" : "destructive"}>
                        10Y: {secondaryCAGR.tenYear.toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Comparison data CAGR if present */}
              {comparisonCAGRs.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="font-medium">{item.name}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={item.cagr.oneYear >= 0 ? "success" : "destructive"}>
                      1Y: {item.cagr.oneYear.toFixed(2)}%
                    </Badge>
                    <Badge variant={item.cagr.threeYear >= 0 ? "success" : "destructive"}>
                      3Y: {item.cagr.threeYear.toFixed(2)}%
                    </Badge>
                    {item.cagr.fiveYear !== 0 && (
                      <Badge variant={item.cagr.fiveYear >= 0 ? "success" : "destructive"}>
                        5Y: {item.cagr.fiveYear.toFixed(2)}%
                      </Badge>
                    )}
                    {item.cagr.tenYear !== 0 && (
                      <Badge variant={item.cagr.tenYear >= 0 ? "success" : "destructive"}>
                        10Y: {item.cagr.tenYear.toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartDetailDialog;