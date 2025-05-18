import React, { useState } from 'react';
import {
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceDot
} from 'recharts';
import ChartDetailDialog from './ChartDetailDialog';
import { DataFrequency, FinancialDataPoint, StockInfo } from '../types/stock';
import { formatValue } from '@/lib/utils';
import { Expand } from 'lucide-react';

// Enhanced chart with detailed views and better formatting
interface ComparisonSeries {
  name: string;
  data: FinancialDataPoint[];
  color: string;
  isSecondary?: boolean;
}

interface ChartProps {
  title: string;
  subtitle: string;
  growthTitle: string;
  data: FinancialDataPoint[];
  dataFrequency: DataFrequency;
  color: string;
  index: number;
  secondaryData?: FinancialDataPoint[];
  secondaryColor?: string;
  secondaryName?: string;
  primaryName?: string;
  chartType?: "bar" | "line";
  comparisonSeries?: ComparisonSeries[];
  isDetailView?: boolean;
  payoutRatio?: number;
  hideGrowthLabels?: boolean;
  sbcPercentage?: number;
  stockInfo?: StockInfo;
}

const StockChart: React.FC<ChartProps> = ({
  title,
  subtitle,
  growthTitle,
  data,
  dataFrequency,
  color,
  index,
  secondaryData,
  secondaryColor,
  secondaryName,
  primaryName,
  chartType = "bar",
  comparisonSeries = [],
  isDetailView = false,
  payoutRatio,
  hideGrowthLabels = false,
  sbcPercentage,
  stockInfo
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // For normal view, limit the data points to the latest 20
  // In detail view, show all data points
  const limitedData = isDetailView ? data : (data.length > 20 ? data.slice(-20) : data);
  const limitedSecondaryData = isDetailView ? secondaryData : (secondaryData && secondaryData.length > 20 ? secondaryData.slice(-20) : secondaryData);
  const limitedComparisonSeries = isDetailView ? comparisonSeries : comparisonSeries.map(series => ({
    ...series,
    data: series.data.length > 20 ? series.data.slice(-20) : series.data
  }));
  
  // Create a combined dataset that respects the actual years
  const combinedTimeSeries: {[year: string]: any} = {};
  
  // First, gather all possible years from all data sources
  const allYears = new Set<string>();
  
  // Add years from primary data
  limitedData.forEach(point => allYears.add(point.year));
  
  // Add years from secondary data if available
  if (limitedSecondaryData) {
    limitedSecondaryData.forEach(point => allYears.add(point.year));
  }
  
  // Add years from comparison series
  limitedComparisonSeries.forEach(series => {
    series.data.forEach(point => allYears.add(point.year));
  });
  
  // Convert to array and sort chronologically
  const sortedYears = Array.from(allYears).sort((a, b) => {
    // Handle both numeric years (like "2020") and quarter notations (like "Q1 2020")
    const yearA = a.includes('Q') ? a.split(' ')[1] : a;
    const yearB = b.includes('Q') ? b.split(' ')[1] : b;
    
    // If years are the same, sort by quarter if present
    if (yearA === yearB && a.includes('Q') && b.includes('Q')) {
      const qtrA = parseInt(a.split('Q')[1].split(' ')[0]);
      const qtrB = parseInt(b.split('Q')[1].split(' ')[0]);
      return qtrA - qtrB;
    }
    
    return parseInt(yearA) - parseInt(yearB);
  });
  
  // Initialize entries for all years to ensure proper ordering
  sortedYears.forEach(year => {
    combinedTimeSeries[year] = {
      name: year
    };
  });
  
  // Add primary data with growth percentages
  limitedData.forEach((point, idx, arr) => {
    // Calculate growth percentage from previous year if available
    let growthPercentage = null;
    if (idx > 0 && arr[idx - 1].value !== 0) {
      growthPercentage = ((point.value - arr[idx - 1].value) / Math.abs(arr[idx - 1].value)) * 100;
    }
    
    if (combinedTimeSeries[point.year]) {
      combinedTimeSeries[point.year].value = point.value;
      combinedTimeSeries[point.year].growthPercentage = growthPercentage;
    }
  });
  
  // Add secondary data based on actual years
  if (limitedSecondaryData) {
    limitedSecondaryData.forEach(point => {
      if (combinedTimeSeries[point.year]) {
        combinedTimeSeries[point.year].secondaryValue = point.value;
      }
    });
  }
  
  // Add comparison series data based on actual years
  limitedComparisonSeries.forEach((series, seriesIdx) => {
    series.data.forEach(point => {
      if (combinedTimeSeries[point.year]) {
        if (series.isSecondary) {
          combinedTimeSeries[point.year][`comp${seriesIdx}Secondary`] = point.value;
        } else {
          combinedTimeSeries[point.year][`comp${seriesIdx}`] = point.value;
        }
      }
    });
  });
  
  // Convert the combined timeline back to an array for the chart
  // Only include years that have at least the primary data or comparison data
  const chartData = Object.entries(combinedTimeSeries)
    .filter(([year, data]: [string, any]) => {
      // Include if it has primary data
      if (data.value !== undefined) return true;
      
      // Include if it has any comparison data
      for (let i = 0; i < limitedComparisonSeries.length; i++) {
        if (data[`comp${i}`] !== undefined || data[`comp${i}Secondary`] !== undefined) {
          return true;
        }
      }
      
      return false;
    })
    .map(([year, data]) => data);

  // Chart styling
  const tooltipStyle = {
    backgroundColor: "hsl(var(--background))",
    borderColor: "hsl(var(--border))",
    borderRadius: "8px",
    fontSize: isDetailView ? "15px" : "13px",
    padding: "12px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
  };
  
  const chartMargins = {
    top: 20,
    right: 30,
    left: 30,
    bottom: 20
  };
  
  // Format y-axis values for better readability
  const formatYAxisTick = (value: any) => {
    // Special case for dividend values - show more decimal places
    if (growthTitle === "Dividends") {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      // Only show 2 decimal places on the axis for clarity
      return numValue.toFixed(2);
    }
    // Apply better formatting for axis labels - always use formatValue for consistency
    return formatValue(value, false); // Never use currency symbol on axis
  };
  
  // Custom formatter for tooltip values - abbreviate large numbers
  const formatTooltipValue = (value: any, isPercentage = false) => {
    // Use our utility function for large numbers (e.g. 1.5M, 3.2B)
    let isFinancialValue = ["Revenue", "Net Income", "Cash", "Debt", "Free Cash Flow", "Capex", "Cash vs Debt", "Capital Expenditures"].includes(title);
    
    // Always use better formatting for all views (main and detail)
    if (isPercentage) {
      // For percentage values, format as percentage
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return numValue.toLocaleString(undefined, { 
        minimumFractionDigits: 1,
        maximumFractionDigits: 1 
      });
    } else if (growthTitle === "Dividends") {
      // Special case for dividend values - show more decimal places as they can be very small
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return numValue.toLocaleString(undefined, { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    } else if (isFinancialValue) {
      return formatValue(value, true); // With currency symbol
    } else if (title === "Shares Outstanding" || title === "Stock-Based Compensation") {
      return formatValue(value, false); // Without currency symbol
    } else {
      // For other values, use our robust formatter
      return formatValue(value, false);
    }
  };
  
  // Adjust margins for detail view
  const detailChartMargins = {
    top: 30,
    right: 50,
    left: 50,
    bottom: 40
  };

  const renderBarChart = () => (
    <ComposedChart
      data={chartData}
      margin={isDetailView ? detailChartMargins : chartMargins}
    >
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
      <XAxis 
        dataKey="name" 
        axisLine={false} 
        tickLine={false}
        interval={chartData.length > 15 ? (isDetailView ? 1 : 3) : 0}
        angle={chartData.length > 15 ? -45 : 0}
        textAnchor={chartData.length > 15 ? "end" : "middle"}
        height={chartData.length > 15 ? 60 : 30}
        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isDetailView ? 14 : 12 }}
      />
      <YAxis 
        axisLine={false} 
        tickLine={false} 
        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isDetailView ? 14 : 12 }}
        width={isDetailView ? 60 : 35}
        tickFormatter={formatYAxisTick}
      />
      <Tooltip
        contentStyle={tooltipStyle}
        cursor={{ fill: "rgba(255,255,255,0.05)" }}
        formatter={(value: number, name: string, props: any) => {
          // Add growth percentage for Revenue and Net Income
          
          // Special case for Growth % to avoid showing currency sign
          if (name === "Growth %") {
            return formatTooltipValue(value, true) + '%';
          }
          return formatTooltipValue(value);
        }}
      />
      {(secondaryData || comparisonSeries.length > 0) && (
        <Legend
          wrapperStyle={{ 
            fontSize: isDetailView ? 14 : 12, 
            color: "hsl(var(--muted-foreground))",
            padding: isDetailView ? '10px 0' : '5px 0'
          }}
        />
      )}
      
      {/* Add a right-side Y-axis for growth percentages */}
      {(growthTitle === "Revenue" || growthTitle === "Net Income") && 
       (isDetailView || !hideGrowthLabels) && 
       comparisonSeries.length === 0 && (
        <YAxis 
          yAxisId="right"
          orientation="right"
          axisLine={{ stroke: 'rgba(255, 153, 0, 0.9)' }}
          tickLine={false}
          tick={{ fill: "rgba(255, 153, 0, 0.9)", fontSize: isDetailView ? 12 : 10 }}
          width={isDetailView ? 50 : 40}
          tickFormatter={(value) => `${value.toFixed(2)}%`}
          domain={['dataMin - 10', 'dataMax + 10']}
        />
       )}
      
      {/* Primary data */}
      <Bar
        dataKey="value"
        name={primaryName || title}
        fill={color}
        radius={[4, 4, 0, 0]}
        isAnimationActive={true}
        animationDuration={1500}
      />
      
      {/* Secondary data */}
      {secondaryData && secondaryColor && (
        <Bar
          dataKey="secondaryValue"
          name={secondaryName || "Secondary"}
          fill={secondaryColor}
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationDuration={1500}
        />
      )}
      
      {/* Comparison series */}
      {comparisonSeries.filter(series => !series.isSecondary).map((series, idx) => (
        <Bar
          key={`primary-${series.name}`}
          dataKey={`comp${comparisonSeries.indexOf(series)}`}
          name={series.name}
          fill={series.color}
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationDuration={1500}
          opacity={0.8}
        />
      ))}
      
      {/* Secondary comparison series */}
      {comparisonSeries.filter(series => series.isSecondary).map((series, idx) => (
        <Bar
          key={`secondary-${series.name}`}
          dataKey={`comp${comparisonSeries.indexOf(series)}Secondary`}
          name={`${series.name} (Secondary)`}
          fill={series.color}
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationDuration={1500}
          opacity={0.8}
        />
      ))}
      
      {/* Growth percentage line - added after bars so it appears on top */}
      {(growthTitle === "Revenue" || growthTitle === "Net Income") && 
       (isDetailView || !hideGrowthLabels) && 
       comparisonSeries.length === 0 && (
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="growthPercentage"
          name="Growth %"
          stroke="rgba(255, 153, 0, 0.9)"
          strokeWidth={isDetailView ? 4 : 3}
          dot={false}
          activeDot={{ r: isDetailView ? 8 : 6 }}
          isAnimationActive={true}
          animationDuration={1500}
        />
       )}
    </ComposedChart>
  );

  const renderLineChart = () => (
    <LineChart
      data={chartData}
      margin={isDetailView ? detailChartMargins : chartMargins}
    >
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
      <XAxis 
        dataKey="name" 
        axisLine={false} 
        tickLine={false}
        interval={chartData.length > 15 ? (isDetailView ? 1 : 3) : 0}
        angle={chartData.length > 15 ? -45 : 0}
        textAnchor={chartData.length > 15 ? "end" : "middle"}
        height={chartData.length > 15 ? 60 : 30}
        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isDetailView ? 14 : 12 }}
      />
      <YAxis 
        axisLine={false} 
        tickLine={false} 
        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isDetailView ? 14 : 12 }}
        width={isDetailView ? 60 : 35}
        tickFormatter={formatYAxisTick}
      />
      <Tooltip
        contentStyle={tooltipStyle}
        cursor={{ stroke: "rgba(255,255,255,0.2)" }}
        formatter={(value: number, name: string, props: any) => {
          // Add growth percentage for Revenue and Net Income
          
          // Special case for Growth % to avoid showing currency sign
          if (name === "Growth %") {
            return formatTooltipValue(value, true) + '%';
          }
          return formatTooltipValue(value);
        }}
        // Sort tooltip items by value for Gross and Net margin charts
        itemSorter={(item: any) => {
          // Only apply sorting to Gross Margin and Net Margin charts
          // Check both title and growthTitle to handle empty title in ChartDetailDialog
          if (title === "Gross Margin" || title === "Net Margin" || 
              growthTitle === "Gross Margin" || growthTitle === "Net Margin") {
            // Return negative value to sort in descending order (highest value first)
            return item.value !== undefined ? -item.value : 0;
          }
          // For other charts, preserve original order
          return 0;
        }}
      />
      {(secondaryData || comparisonSeries.length > 0) && (
        <Legend
          wrapperStyle={{ 
            fontSize: isDetailView ? 14 : 12, 
            color: "hsl(var(--muted-foreground))",
            padding: isDetailView ? '10px 0' : '5px 0'
          }}
        />
      )}
      
      {/* Add a right-side Y-axis for growth percentages */}
      

      {/* Primary data */}
      <Line
        type="monotone"
        dataKey="value"
        name={primaryName || title}
        stroke={color}
        strokeWidth={isDetailView ? 4 : 3}
        dot={false}
        activeDot={{ r: isDetailView ? 8 : 6 }}
        isAnimationActive={true}
        animationDuration={1500}
      />
      
      {/* Secondary data */}
      {secondaryData && secondaryColor && (
        <Line
          type="monotone"
          dataKey="secondaryValue"
          name={secondaryName || "Secondary"}
          stroke={secondaryColor}
          strokeWidth={isDetailView ? 3.5 : 3}
          dot={false}
          activeDot={{ r: isDetailView ? 7 : 6 }}
          isAnimationActive={true}
          animationDuration={1500}
        />
      )}
      
      {/* Comparison series - primary */}
      {comparisonSeries.filter(series => !series.isSecondary).map((series, idx) => (
        <Line
          key={`primary-${series.name}`}
          type="monotone"
          dataKey={`comp${comparisonSeries.indexOf(series)}`}
          name={series.name}
          stroke={series.color}
          strokeWidth={isDetailView ? 3 : 2}
          dot={false}
          activeDot={{ r: isDetailView ? 6 : 5 }}
          isAnimationActive={true}
          animationDuration={1500}
        />
      ))}
      
      {/* Comparison series - secondary */}
      {comparisonSeries.filter(series => series.isSecondary).map((series, idx) => (
        <Line
          key={`secondary-${series.name}`}
          type="monotone"
          dataKey={`comp${comparisonSeries.indexOf(series)}Secondary`}
          name={`${series.name} (Secondary)`}
          stroke={series.color}
          strokeWidth={isDetailView ? 2.5 : 2}
          strokeDasharray="3 3"
          dot={false}
          activeDot={{ r: isDetailView ? 6 : 5 }}
          isAnimationActive={true}
          animationDuration={1500}
        />
      ))}
      
      {/* Growth percentage line - added after other lines so it appears on top */}
      
    </LineChart>
  );

  return (
    <>
      {/* Detail Dialog - always use the full, non-limited data */}
      {!isDetailView && (
        <ChartDetailDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title={title}
          subtitle={subtitle}
          growthTitle={title}
          data={data} 
          symbol={primaryName || ''}
          color={color}
          secondaryData={secondaryData}
          secondaryColor={secondaryColor}
          secondaryName={secondaryName}
          primaryName={primaryName}
          chartType={chartType}
          comparisonSeries={comparisonSeries}
          payoutRatio={payoutRatio}
          sbcPercentage={sbcPercentage}
          stockInfo={stockInfo}
        />
      )}
      
      {/* Chart container */}
      <div 
        className={`bg-card rounded-lg shadow-sm p-4 overflow-hidden relative group ${isDetailView ? '' : 'cursor-pointer hover:shadow-md transition-shadow duration-300'}`}
        onClick={() => !isDetailView && setIsDialogOpen(true)}
        style={{ height: isDetailView ? 400 : 300 }}
      >
        {!isDetailView && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Expand className="w-5 h-5 text-gray-500" />
          </div>
        )}
        <div className="mb-2 flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>   
            <p className="text-muted-foreground text-sm">{subtitle}</p>                 
          </div>
          
          {/* Payout ratio badge for Dividends chart */}
          {growthTitle === "Dividends" && payoutRatio !== undefined && data.length !== 0 && (
            <div className="flex items-center gap-2">
              <div className="bg-amber-100 text-amber-800 py-1 px-3 rounded text-xs font-semibold">
                Payout: {payoutRatio.toFixed(1)}%
              </div>
              {growthTitle === "Dividends" && stockInfo?.exDividendDate && (
                <div className="bg-green-100 text-green-700 py-1 px-3 rounded text-xs font-semibold">
                  Ex-Div: {new Date(stockInfo.exDividendDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                </div>
              )}
            </div>
          )}

          {/* If no dividend data show message */}
          {growthTitle === "Dividends" && data.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              {primaryName} pays no dividends.
            </div>
          )}
          
          {/* SBC percentage badge for SBC chart - commented out due to missing data */}
          {/* 
          {title === "Stock-Based Compensation" && sbcPercentage !== undefined && (
            <div className="bg-orange-100 text-orange-700 py-1 px-3 rounded-full text-xs font-semibold">
              {sbcPercentage.toFixed(1)}% of Revenue
            </div>
          )}
          */}
                  
        </div>
        
        <ResponsiveContainer width="100%" height={isDetailView ? 400 : 230}>
          {chartType === "bar" ? renderBarChart() : renderLineChart()}
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default StockChart;