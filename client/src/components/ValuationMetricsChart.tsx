import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';

// Import valuation metric type from types
import { ValuationMetricType } from '../types/stock';

// Define props interface for the component
interface ValuationMetricsChartProps {
  symbol: string;
  comparisonStocks?: ComparisonStock[];
  isLoading?: boolean;
}

// Define interface for each stock that is being compared
interface ComparisonStock {
  symbol: string;
  isActive: boolean;
  color: string;
}

// Data structure for the valuation data
interface ValuationData {
  symbol: string;
  metrics: Array<{
    date: string;
    pe: number | null;
    ps: number | null;
    pfcf: number | null;
    [key: string]: any;
  }>;
}

// Map of symbol to valuation data
interface ValuationChartData {
  [symbol: string]: ValuationData | null;
}

// Interface for metric statistics
interface MetricStats {
  min: number;
  max: number;
  median: number;
}

// Main component
const ValuationMetricsChart: React.FC<ValuationMetricsChartProps> = ({
  symbol,
  comparisonStocks = [],
  isLoading = false
}) => {
  const [activeMetric, setActiveMetric] = useState<ValuationMetricType>('pe');
  const [valuationData, setValuationData] = useState<ValuationChartData>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<[number, number]>([0, 100]); // Default to full range
  const [statsMap, setStatsMap] = useState<Record<string, MetricStats>>({});
  const [chartData, setChartData] = useState<any[]>([]);

  // Labels for the metrics
  const metricLabels = {
    pe: 'Price to Earnings (P/E)',
    ps: 'Price to Sales (P/S)',
    pfcf: 'Price to Free Cash Flow (P/FCF)',
    pocf: 'Price to Operating Cash Flow (P/OCF)'
  };

  // Reset date range when the symbol changes
  useEffect(() => {
    setDateRange([0, 100]); // Reset to full range
  }, [symbol]);

  // Fetch valuation data for the primary symbol and all comparison stocks
  useEffect(() => {
    const fetchValuationData = async () => {
      setLoading(true);
      
      // Create an array of all symbols to fetch
      const allSymbols = [symbol, ...comparisonStocks
        .filter(stock => stock.isActive)
        .map(stock => stock.symbol)];
      
      try {
        // Fetch data for each symbol
        const results = await Promise.all(
          allSymbols.map(async (sym) => {
            try {
              const response = await fetch(`/api/valuation/${sym}`);
              if (!response.ok) {
                console.error(`Failed to fetch valuation data for ${sym}`);
                return { symbol: sym, data: null };
              }
              const data = await response.json();
              return { symbol: sym, data };
            } catch (error) {
              console.error(`Error fetching valuation data for ${sym}:`, error);
              return { symbol: sym, data: null };
            }
          })
        );
        
        // Convert results to a map
        const dataMap = results.reduce((acc, { symbol, data }) => {
          acc[symbol] = data;
          return acc;
        }, {} as ValuationChartData);
        
        setValuationData(dataMap);
      } catch (error) {
        console.error('Error fetching valuation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchValuationData();
  }, [symbol, comparisonStocks]);

  // Memoized array of all dates from all stocks for the date range slider
  const allDates = useMemo(() => {
    // Set to collect unique dates from all stocks
    const datesSet = new Set<string>();
    
    // Add dates from primary stock
    if (valuationData[symbol]?.metrics) {
      valuationData[symbol].metrics
        .filter(point => point[activeMetric] !== null)
        .forEach(point => datesSet.add(point.date));
    }
    
    // Add dates from comparison stocks
    comparisonStocks
      .filter(stock => stock.isActive && valuationData[stock.symbol])
      .forEach(stock => {
        if (valuationData[stock.symbol]?.metrics) {
          valuationData[stock.symbol].metrics
            .filter(point => point[activeMetric] !== null)
            .forEach(point => datesSet.add(point.date));
        }
      });
    
    // Convert to array and sort
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from(datesSet).sort((a, b) => {
      // Handle monthly date format "Jan 2024"
      const aDateParts = a.split(' ');
      const bDateParts = b.split(' ');
      
      // For monthly data like "Jan 2020" vs "Feb 2020"
      if (aDateParts.length === 2 && bDateParts.length === 2) {
        const aMonth = aDateParts[0];
        const bMonth = bDateParts[0];
        const aYear = parseInt(aDateParts[1]);
        const bYear = parseInt(bDateParts[1]);
        
        // First compare years
        if (aYear !== bYear) {
          return aYear - bYear;
        }
        
        // If same year, compare months
        return monthNames.indexOf(aMonth) - monthNames.indexOf(bMonth);
      }
      
      // For quarterly data like "Q1 2020" vs "Q2 2020"
      if (a.includes('Q') && b.includes('Q')) {
        const yearA = a.split(' ')[1];
        const yearB = b.split(' ')[1];
        
        if (yearA !== yearB) {
          return parseInt(yearA) - parseInt(yearB);
        }
        
        const qtrA = parseInt(a.split('Q')[1].split(' ')[0]);
        const qtrB = parseInt(b.split('Q')[1].split(' ')[0]);
        return qtrA - qtrB;
      }
      
      // For annual data or simple dates (fallback)
      return a.localeCompare(b);
    });
  }, [valuationData, symbol, activeMetric, comparisonStocks]);
  
  // Format date display for slider labels
  const formatDateLabel = useCallback((index: number): string => {
    if (!allDates.length) return '';
    
    const maxIndex = allDates.length - 1;
    const percent = index / 100;
    const dataIndex = Math.floor(percent * maxIndex);
    
    return allDates[dataIndex] || '';
  }, [allDates]);
  
  // Format valuation metrics with appropriate precision
  const formatMetricValue = useCallback((value: number): string => {
    if (value === 0) return "0";
    if (value < 0.1) return value.toFixed(2);
    if (value < 1) return value.toFixed(1);
    if (value < 10) return (Math.round(value * 10) / 10).toFixed(1);
    if (value < 100) return value.toFixed(1);
    return Math.round(value).toString();
  }, []);

  // Get the color for a specific symbol
  const getSymbolColor = useCallback((sym: string) => {
    if (sym === symbol && comparisonStocks.length > 0) return "hsl(217, 91%, 60%)"; //Main stock color in Compare mode
    if (sym === symbol) return '#4f46e5'; // Primary color for main symbol
    const compStock = comparisonStocks.find(s => s.symbol === sym);
    return compStock?.color || '#94a3b8'; // Default color if not found
  }, [symbol, comparisonStocks]);

  // Get active stocks (primary + comparison)
  const activeStocks = useMemo(() => {
    return [
      { symbol, color: getSymbolColor(symbol) },
      ...comparisonStocks
        .filter(stock => stock.isActive)
        .map(stock => ({ 
          symbol: stock.symbol, 
          color: getSymbolColor(stock.symbol) 
        }))
    ];
  }, [symbol, comparisonStocks, getSymbolColor]);

  // Prepare chart data and calculate stats for all visible stocks
  useEffect(() => {
    if (!valuationData[symbol]) {
      setChartData([]);
      return;
    }

    // Get all active stock symbols
    const activeSymbols = [
      symbol, 
      ...comparisonStocks
        .filter(stock => stock.isActive)
        .map(stock => stock.symbol)
    ];
    
    // Store all dates from all stocks to build a complete timeline
    const allDatesSet = new Set<string>();
    
    // Collect all dates from all stocks' data
    activeSymbols.forEach(sym => {
      if (valuationData[sym]?.metrics) {
        valuationData[sym].metrics
          .filter(point => point[activeMetric] !== null)
          .forEach(point => allDatesSet.add(point.date));
      }
    });
    
    // Convert to array and sort
    const allDatesArray = Array.from(allDatesSet).sort((a, b) => {
      // Handle monthly date format "Jan 2024"
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Parse the month and year 
      const aDateParts = a.split(' ');
      const bDateParts = b.split(' ');
      
      // For monthly data like "Jan 2020" vs "Feb 2020"
      if (aDateParts.length === 2 && bDateParts.length === 2) {
        const aMonth = aDateParts[0];
        const bMonth = bDateParts[0];
        const aYear = parseInt(aDateParts[1]);
        const bYear = parseInt(bDateParts[1]);
        
        // First compare years
        if (aYear !== bYear) {
          return aYear - bYear;
        }
        
        // If same year, compare months
        return monthNames.indexOf(aMonth) - monthNames.indexOf(bMonth);
      }
      
      // For quarterly data like "Q1 2020" vs "Q2 2020"
      if (a.includes('Q') && b.includes('Q')) {
        const yearA = a.split(' ')[1];
        const yearB = b.split(' ')[1];
        
        if (yearA !== yearB) {
          return parseInt(yearA) - parseInt(yearB);
        }
        
        const qtrA = parseInt(a.split('Q')[1].split(' ')[0]);
        const qtrB = parseInt(b.split('Q')[1].split(' ')[0]);
        return qtrA - qtrB;
      }
      
      // For annual data or simple dates (fallback)
      return a.localeCompare(b);
    });
    
    // Apply date range filter to all dates
    const totalDates = allDatesArray.length;
    const startIndex = Math.floor((dateRange[0] / 100) * (totalDates - 1));
    const endIndex = Math.floor((dateRange[1] / 100) * (totalDates - 1));
    
    // Get the visible dates based on the slider
    const visibleDates = allDatesArray.slice(startIndex, endIndex + 1);
    
    // Initialize the chart data with all visible dates
    const chartDataPoints: Record<string, any>[] = visibleDates.map(date => ({ date }));
    
    // Add data for all stocks
    activeSymbols.forEach(sym => {
      if (valuationData[sym]?.metrics) {
        // Create a map of date to metric value for quick lookup
        const dateToValueMap = new Map<string, number>();
        
        // First pass: collect all valid data points
        valuationData[sym].metrics
          .filter(point => point[activeMetric] !== null)
          .forEach(point => {
            dateToValueMap.set(point.date, point[activeMetric] as number);
          });
          
        // Second pass: apply forward fill for missing values (similar to Python's method='ffill')
        // Only do this when in comparison mode (comparisonStocks.length > 0)
        if (comparisonStocks.length > 0 && dateToValueMap.size > 0) {
          let lastValidValue: number | null = null;
          
          // Sort dates to ensure chronological processing
          const sortedDates = visibleDates.slice().sort((a, b) => {
            // Use the same sorting logic as before
            const aDateParts = a.split(' ');
            const bDateParts = b.split(' ');
            
            // For monthly data like "Jan 2020" vs "Feb 2020"
            if (aDateParts.length === 2 && bDateParts.length === 2) {
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const aMonth = aDateParts[0];
              const bMonth = bDateParts[0];
              const aYear = parseInt(aDateParts[1]);
              const bYear = parseInt(bDateParts[1]);
              
              // First compare years
              if (aYear !== bYear) {
                return aYear - bYear;
              }
              
              // If same year, compare months
              return monthNames.indexOf(aMonth) - monthNames.indexOf(bMonth);
            }
            return a.localeCompare(b);
          });
          
          // Forward fill process
          for (const date of sortedDates) {
            if (dateToValueMap.has(date)) {
              // Update the last valid value
              lastValidValue = dateToValueMap.get(date) as number;
            } else if (lastValidValue !== null) {
              // Forward fill using the last valid value
              dateToValueMap.set(date, lastValidValue);
            }
          }
        }
        
        // Add values to chart data points (now with forward-filled values)
        chartDataPoints.forEach(point => {
          if (dateToValueMap.has(point.date)) {
            point[sym] = dateToValueMap.get(point.date);
          }
        });
      }
    });
    
    // Calculate statistics for each stock based on the visible data
    const newStatsMap: Record<string, MetricStats> = {};
    
    // Calculate stats for all active stocks using only visible data points
    activeSymbols.forEach(sym => {
      if (valuationData[sym]) {
        // Extract values for this symbol from the chart data points
        const metricValues: number[] = [];
        
        chartDataPoints.forEach(point => {
          if (point[sym] !== undefined && point[sym] !== null) {
            metricValues.push(point[sym]);
          }
        });
        
        if (metricValues.length > 0) {
          const min = Math.min(...metricValues);
          const max = Math.max(...metricValues);
          
          // Calculate median - first sort array, then find middle value
          const sortedValues = [...metricValues].sort((a, b) => a - b);
          const mid = Math.floor(sortedValues.length / 2);
          
          // If even length, average the two middle numbers
          const median = sortedValues.length % 2 !== 0
            ? sortedValues[mid]
            : (sortedValues[mid - 1] + sortedValues[mid]) / 2;
          
          newStatsMap[sym] = { min, max, median };
          console.log(`${sym} ${activeMetric} stats: Low: ${min}, Median: ${median}, High: ${max} (from ${metricValues.length} data points)`);
        } else {
          console.log(`${sym} ${activeMetric} stats: No data in selected range`);
        }
      }
    });
    
    // Update the stats map
    setStatsMap(newStatsMap);
    
    // Use the chart data points we've created
    setChartData(chartDataPoints);
    
  }, [valuationData, symbol, activeMetric, dateRange, comparisonStocks]);

  // Custom tooltip for the chart
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Sort payload entries by value (highest values first)
      const sortedPayload = [...payload].sort((a, b) => {
        // Handle null values
        if (a.value === null) return 1;
        if (b.value === null) return -1;
        // Sort in descending order (highest values first)
        return b.value - a.value;
      });
      
      return (
        <div className="bg-background/90 border p-3 rounded-md shadow-md">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 mt-2">
            {sortedPayload.map((entry: any) => (
              <div 
                key={entry.dataKey} 
                className="flex items-center gap-2"
                style={{ color: entry.color }}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span>
                  {entry.dataKey}: {entry.value !== null ? (
                    // Use more precise formatting for valuation metrics in the tooltip
                    entry.value < 1 ? entry.value.toFixed(2) : 
                    entry.value < 100 ? entry.value.toFixed(1) : 
                    Math.round(entry.value).toString()
                  ) : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }, []);



  return (
    <motion.div
      className="bg-card rounded-lg shadow-lg p-6 mt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold">Historical Valuation Metrics</h3>
        
        <Tabs 
          defaultValue="pe" 
          value={activeMetric} 
          onValueChange={(value) => {
            setActiveMetric(value as ValuationMetricType);
            // Reset date range to full range when changing metrics
            setDateRange([0, 100]);
          }}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="pe">P/E</TabsTrigger>
            <TabsTrigger value="ps">P/S</TabsTrigger>
            <TabsTrigger value="pfcf">P/FCF</TabsTrigger>
            <TabsTrigger value="pocf">P/OCF</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading || isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : chartData.length > 0 ? (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 80, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={70}
                interval={Math.max(Math.floor(chartData.length / 15), 3)} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                minTickGap={10}
              />
              <YAxis 
                domain={[0, 'auto']}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value === 0) return "0";
                  // For small values (like valuation ratios), use a fixed precision
                  if (value < 0.1) return value.toFixed(2);
                  if (value < 1) return value.toFixed(1);
                  if (value < 10) return Math.round(value * 10) / 10; // 1 decimal for values under 10
                  return Math.round(value).toString(); // Whole numbers for larger values
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: 20,
                  fontSize: 12,
                  color: "hsl(var(--muted-foreground))"
                }}
                formatter={(value, entry) => {
                  // Find the last valid data point for this symbol to add the value to the legend
                  const lastValidPoint = chartData.length > 0 ? 
                    chartData[chartData.length - 1] : null;
                  
                  const lastValue = lastValidPoint && lastValidPoint[value];
                  
                  // Format the value appropriately
                  const formattedValue = lastValue !== undefined && lastValue !== null ? 
                    (lastValue < 1 ? lastValue.toFixed(2) : 
                     lastValue < 100 ? lastValue.toFixed(1) : 
                     Math.round(lastValue).toString()) : '';
                  
                  // Return formatted legend item
                  return (
                    <span style={{ color: entry.color }}>
                      {value} {formattedValue ? `(${formattedValue})` : ''}
                    </span>
                  );
                }}
              />
              
              {/* Primary line */}
              <Line
                type="monotone"
                dataKey={symbol}
                name={symbol}
                stroke={getSymbolColor(symbol)}
                strokeWidth={3}
                dot={(props) => {
                  if (!props || props.index !== chartData.length - 1) return null;
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill={getSymbolColor(symbol)}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }}
                label={(props) => {
                  if (!props || props.index !== chartData.length - 1) return null;
                  const value = props.value;
                  if (value === undefined || value === null) return null;
                  
                  // Format the value with appropriate precision
                  const formattedValue = value < 1 ? value.toFixed(2) : 
                                        value < 100 ? value.toFixed(1) : 
                                        Math.round(value).toString();
                  
                  return (
                    <g>
                      <text
                        x={props.x + 10}
                        y={props.y + 5}
                        fill={getSymbolColor(symbol)}
                        fontSize={12}
                        fontWeight="bold"
                        textAnchor="start"
                      >
                        {symbol}: {formattedValue}
                      </text>
                    </g>
                  );
                }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
                animationDuration={1500}
              />

              {/* Median reference line - only show in single stock mode */}
              {comparisonStocks.length === 0 && statsMap[symbol] && (
                <ReferenceLine 
                  y={statsMap[symbol].median} 
                  stroke="orange" 
                  strokeDasharray="3 3"
                  label={{
                    value: `Median: ${formatMetricValue(statsMap[symbol].median)}`,
                    position: 'insideBottomLeft',
                    fill: 'orange',
                    fontSize: 12,
                  }}
                />
              )}
              
              {/* Comparison lines */}
              {comparisonStocks
                .filter(stock => stock.isActive && valuationData[stock.symbol])
                .map((stock) => (
                  <Line
                    key={stock.symbol}
                    type="monotone"
                    dataKey={stock.symbol}
                    name={stock.symbol}
                    stroke={stock.color}
                    strokeWidth={3}
                    dot={(props) => {
                      if (!props || props.index !== chartData.length - 1) return null;
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={5}
                          fill={stock.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }}
                    label={(props) => {
                      if (!props || props.index !== chartData.length - 1) return null;
                      const value = props.value;
                      if (value === undefined || value === null) return null;
                      
                      // Format the value with appropriate precision
                      const formattedValue = value < 1 ? value.toFixed(2) : 
                                            value < 100 ? value.toFixed(1) : 
                                            Math.round(value).toString();
                      
                      return (
                        <g>
                          <text
                            x={props.x + 10}
                            y={props.y + 5}
                            fill={stock.color}
                            fontSize={12}
                            fontWeight="bold"
                            textAnchor="start"
                          >
                            {stock.symbol}: {formattedValue}
                          </text>
                        </g>
                      );
                    }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={true}
                    animationDuration={1500}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-96 flex items-center justify-center text-muted-foreground">
          No valuation data available for {symbol}
        </div>
      )}
      
      {/* Stats display */}
      {chartData.length > 0 && (
        <div className="mt-0">
          {/* Metric Statistics - displayed as vertical badges like in the image */}
          <div className="flex flex-col mb-10 gap-2">
            {activeStocks.map((stock) => (
              <div key={stock.symbol} className="w-auto inline-block">
                <div 
                  className="rounded-md px-4 py-2 text-sm border-l-4"
                  style={{ 
                    backgroundColor: `rgba(17, 24, 39, 0.7)`, 
                    borderColor: stock.color,
                    color: "white",
                    width: "fit-content"
                  }}
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: stock.color }}></div>
                    <span style={{ color: stock.color, fontWeight: 500 }}>{stock.symbol}:</span>
                  
                  
                    {statsMap[stock.symbol] ? (
                      <span className="mt-1 ml-5">
                        <span className="text-gray-300">
                          Low: <span className="text-white font-medium">{formatMetricValue(statsMap[stock.symbol].min)}</span>
                        </span>
                        {" | "}
                        <span className="text-gray-300">
                          Median: <span className="text-white font-medium">{formatMetricValue(statsMap[stock.symbol].median)}</span>
                        </span>
                        {" | "}
                        <span className="text-gray-300">
                          High: <span className="text-white font-medium">{formatMetricValue(statsMap[stock.symbol].max)}</span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400 ml-2">No data</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Date range slider */}
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{formatDateLabel(dateRange[0])}</span>
            <span>Date Range</span>
            <span>{formatDateLabel(dateRange[1])}</span>
          </div>
          <Slider
            defaultValue={[0, 100]}
            value={dateRange}
            onValueChange={(value: [number, number]) => setDateRange(value)}
            step={5} // Larger steps for smoother movement
            min={0}
            max={100}
            className="mt-2"
          />
        </div>
      )}
      
      <div className="mt-4 text-sm text-muted-foreground">
        <p>{metricLabels[activeMetric]} - Shows how the stock has been valued historically relative to its {
          activeMetric === 'pe' ? 'earnings' : 
          activeMetric === 'ps' ? 'sales' : 
          activeMetric === 'pfcf' ? 'free cash flow' : 
          'operating cash flow'
        }.</p>
      </div>
    </motion.div>
  );
};

export default ValuationMetricsChart;