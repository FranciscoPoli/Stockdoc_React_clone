import { FC } from "react";
import StockChart from "./StockChart";
import { FinancialData, DataFrequency, StockInfo } from "../types/stock";

interface ComparisonDataItem {
  symbol: string;
  data?: any;
  color: string;
}

// Initialize global window property to store ex-dividend dates
declare global {
  interface Window {
    stockExDividendDates?: {[symbol: string]: Date | null};
  }
}

interface ChartsGridProps {
  financialData?: FinancialData;
  dataFrequency: DataFrequency;
  isLoading: boolean;
  comparisonData?: ComparisonDataItem[];
  currentSymbol?: string;
  stockInfo?: StockInfo;
}

const ChartsGrid: FC<ChartsGridProps> = ({
  financialData,
  dataFrequency,
  isLoading,
  comparisonData = [],
  currentSymbol = "AAPL",
  stockInfo
}) => {
  const mainStockColor = "#10b981"; // emerald-500

  // Ensure data arrays exist or use empty arrays as fallback
  const getDataArray = (data: any) => data?.[dataFrequency] || [];

  const revenueComparisons = comparisonData.map((stock, index) => ({
    name: stock.symbol,
    data: getDataArray(stock.financialData?.revenue),
    color: stock.color
  }));

  const netIncomeComparisons = comparisonData.map((stock, index) => ({
    name: stock.symbol,
    data: getDataArray(stock.financialData?.netIncome),
    color: stock.color
  }));

  const cashComparisons = comparisonData.map((stock, index) => ({
    name: stock.symbol,
    data: getDataArray(stock.financialData?.cash),
    color: stock.color
  }));

  const debtComparisons = comparisonData.map((stock, index) => ({
    name: stock.symbol,
    data: getDataArray(stock.financialData?.debt),
    color: stock.color
  }));

  const sharesComparisons = comparisonData.map((stock, index) => ({
    name: stock.symbol,
    data: getDataArray(stock.financialData?.sharesOutstanding),
    color: stock.color
  }));

  // Commented out SBC comparisons as it's not available in the database
  // const sbcComparisons = findComparisonData('stockBasedCompensation');
  const grossMarginComparisons = comparisonData.map((stock, index) => ({
    name: stock.symbol,
    data: getDataArray(stock.financialData?.grossMargin),
    color: stock.color
  }));

  const netMarginComparisons = comparisonData.map((stock, index) => ({
    name: stock.symbol,
    data: getDataArray(stock.financialData?.netMargin),
    color: stock.color
  }));

  const fcfComparisons = comparisonData.map((stock, index) => ({
    name: stock.symbol,
    data: getDataArray(stock.financialData?.freeCashFlow),
    color: stock.color
  }));

  const capexComparisons = comparisonData.map((stock, index) => ({
    name: stock.symbol,
    data: getDataArray(stock.financialData?.capex),
    color: stock.color
  }));

  // Check if we're in comparison mode
  const isCompareMode = comparisonData.length > 0;

  // For charts that already have two metrics in normal mode,
  // separate them in compare mode to avoid overcrowding
  if (isCompareMode) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StockChart
          title="Revenue"
          subtitle="USD"
          data={getDataArray(financialData?.revenue)}
          dataFrequency={dataFrequency}
          color={mainStockColor}
          index={0}
          primaryName={currentSymbol}
          comparisonSeries={revenueComparisons}
          hideGrowthLabels={true} // Don't show growth lines in comparison mode
        />

        <StockChart
          title="Net Income"
          subtitle="USD"
          data={getDataArray(financialData?.netIncome)}
          dataFrequency={dataFrequency}
          color={mainStockColor}
          index={1}
          primaryName={currentSymbol}
          comparisonSeries={netIncomeComparisons}
          hideGrowthLabels={true} // Don't show growth lines in comparison mode
        />

        {/* Split Cash and Debt into separate charts in compare mode */}
        <StockChart
          title="Cash & Short Term Investments"
          subtitle="USD"
          data={getDataArray(financialData?.cash)}
          dataFrequency={dataFrequency}
          color={mainStockColor}
          index={2}
          primaryName={currentSymbol}
          comparisonSeries={cashComparisons}
        />

        <StockChart
          title="Long Term Debt"
          subtitle="USD"
          data={getDataArray(financialData?.debt)}
          dataFrequency={dataFrequency}
          color={mainStockColor} 
          index={3}
          primaryName={currentSymbol}
          comparisonSeries={debtComparisons}
        />

        {/* Shares Outstanding chart is not shown in comparison mode */}

        {/* Split Gross and Net margins into separate charts in compare mode */}
        <StockChart
          title="Gross Margin"
          subtitle="Percentage (%)"
          data={getDataArray(financialData?.grossMargin)}
          dataFrequency={dataFrequency}
          color={mainStockColor}
          index={5}
          chartType="line"
          primaryName={currentSymbol}
          comparisonSeries={grossMarginComparisons}
        />

        <StockChart
          title="Net Margin"
          subtitle="Percentage (%)"
          data={getDataArray(financialData?.netMargin)}
          dataFrequency={dataFrequency}
          color={mainStockColor}
          index={6}
          chartType="line"
          primaryName={currentSymbol}
          comparisonSeries={netMarginComparisons}
        />

        <StockChart
          title="Free Cash Flow"
          subtitle="USD"
          data={getDataArray(financialData?.freeCashFlow)}
          dataFrequency={dataFrequency}
          color={mainStockColor}
          index={7}
          primaryName={currentSymbol}
          comparisonSeries={fcfComparisons}
        />

        <StockChart
          title="Capex"  // Changed to match the isFinancialValue check in formatTooltipValue
          subtitle="USD"
          data={getDataArray(financialData?.capex)}
          dataFrequency={dataFrequency}
          color={mainStockColor} //"hsl(345, 82%, 45%)" // Dark red
          index={8}
          primaryName={currentSymbol}
          comparisonSeries={capexComparisons}
          chartType="bar"
        />

        {/* Dividends chart is not shown in comparison mode */}
      </div>
    );
  }

  // Normal mode (no comparisons)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <StockChart
        title="Revenue"
        subtitle="USD"
        growthTitle="Revenue"
        data={getDataArray(financialData?.revenue)}
        dataFrequency={dataFrequency}
        color="hsl(345, 82%, 45%)" // Dark red "hsl(217, 91%, 60%)" // Primary blue
        index={0}
        primaryName={currentSymbol}
        comparisonSeries={revenueComparisons}
      />

      <StockChart
        title="Net Income"
        subtitle="USD"
        growthTitle="Net Income"
        data={getDataArray(financialData?.netIncome)}
        dataFrequency={dataFrequency}
        color="hsl(152, 76%, 40%)" // Green
        index={1}
        primaryName={currentSymbol}
        comparisonSeries={netIncomeComparisons}
      />

      <StockChart
        title="Cash vs Debt"
        subtitle="USD"
        data={getDataArray(financialData?.cash)}
        dataFrequency={dataFrequency}
        color="hsl(265, 89%, 60%)" // Purple "hsl(217, 91%, 60%)" // Primary blue
        secondaryData={getDataArray(financialData?.debt)}
        secondaryColor="hsl(28, 96%, 50%)" // Orange "hsl(0, 84%, 60%)" // Red
        primaryName="Cash"
        secondaryName="Debt"
        index={2}
      />

      <StockChart
        title="Shares Outstanding"
        subtitle="Shares"
        data={getDataArray(financialData?.sharesOutstanding)}
        dataFrequency={dataFrequency}
        color="hsl(265, 89%, 60%)" // Purple
        // Commented out SBC data since it's not available in the database
        // secondaryData={financialData.stockBasedCompensation[dataFrequency]}
        // secondaryColor="hsl(28, 96%, 55%)" // Orange for SBC
        index={3}
        primaryName="Shares Outstanding"
        // secondaryName="Stock Based Comp"
        chartType="bar"
        // Commented out SBC percentage calculation
        // sbcPercentage={
        //   financialData.stockBasedCompensation[dataFrequency]?.length > 0 && 
        //   financialData.sharesOutstanding[dataFrequency]?.length > 0 ? 
        //   (financialData.stockBasedCompensation[dataFrequency].slice(-1)[0].value / 
        //    financialData.sharesOutstanding[dataFrequency].slice(-1)[0].value) * 100 : 
        //   undefined
        // }
      />

      <StockChart
        title="Gross & Net Margins"
        subtitle="Percentage (%)"
        data={getDataArray(financialData?.grossMargin)}
        dataFrequency={dataFrequency}
        color="hsl(38, 92%, 50%)" // Yellow/Orange
        secondaryData={getDataArray(financialData?.netMargin)}
        secondaryColor="hsl(330, 81%, 60%)" // Pink
        primaryName="Gross Margin"
        secondaryName="Net Margin"
        index={4}
        chartType="line"
      />

      <StockChart
        title="Free Cash Flow"
        subtitle="USD"
        data={getDataArray(financialData?.freeCashFlow)}
        dataFrequency={dataFrequency}
        color="hsl(152, 76%, 40%)" // Green
        index={5}
        primaryName={currentSymbol}
        comparisonSeries={fcfComparisons}
      />

      <StockChart
        title="Capex"  // Changed to match the isFinancialValue check in formatTooltipValue
        subtitle="USD"
        data={getDataArray(financialData?.capex)}
        dataFrequency={dataFrequency}
        color="hsl(345, 82%, 45%)" // Dark red
        index={6}
        primaryName={currentSymbol}
        comparisonSeries={capexComparisons}
        chartType="bar"
      />

      {/* Dividends chart with fixed quarterly frequency */}
      {financialData?.dividends && (
        <StockChart
          title="Dividends"
          subtitle="Per Share"
          growthTitle="Dividends"
          data={financialData.dividends.quarterly}
          dataFrequency="quarterly" // Always use quarterly data
          color="hsl(265, 89%, 60%)" // Purple
          index={7}
          primaryName={currentSymbol}
          chartType="bar"
          // Pass payout ratio as badge data (using your Python calculation method)
          payoutRatio={
            // Sum of last 4 quarters of dividend payout divided by sum of last 4 quarters of net income
            financialData.payoutRatio?.quarterly?.slice(-1)[0]?.value ||
            (financialData.dividends?.quarterly?.slice(-4)
              .reduce((sum, div) => sum + (div.value * financialData.sharesOutstanding.quarterly.slice(-1)[0].value), 0) * 100 / 
              financialData.netIncome.quarterly.slice(-4)
                .reduce((sum, income) => sum + income.value, 0))
          }
          stockInfo={stockInfo}
        />
      )}
    </div>
  );
};

export default ChartsGrid;