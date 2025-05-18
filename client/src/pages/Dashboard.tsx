import { FC } from "react";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import StockHeader from "../components/StockHeader";
import DataToggle from "../components/DataToggle";
import MetricsGrid from "../components/MetricsGrid";
import ChartsGrid from "../components/ChartsGrid";
import CompareModal from "../components/CompareModal";
import ComparisonControls from "../components/ComparisonControls";
import ValuationMetricsChart from "../components/ValuationMetricsChart";
import ProjectionCalculator from "../components/ProjectionCalculator";
import { useStockData } from "../hooks/useStockData";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";


const Dashboard: FC = () => {
  const { toast } = useToast();
  const {
    symbol,
    setSymbol,
    stockInfo,
    financialData,
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
  } = useStockData();

  const handleSearch = (newSymbol: string) => {
    if (newSymbol !== symbol) {
      setSymbol(newSymbol);
      if (error) {
        toast({
          title: "Error fetching stock data",
          description: "Please try a different symbol",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="min-h-screen font-sans text-foreground bg-background">
      <Navbar 
        onCompareClick={openCompareModal} 
        hasComparisons={comparisonStocks.length} 
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SearchBar onSearch={handleSearch} initialSymbol={symbol} />
        <StockHeader stockInfo={stockInfo} isLoading={isLoading} />
        {/* Separator above metrics grid */}
        <Separator className="my-6 bg-border opacity-100 h-[2px]" />
        {/* Metrics grid */}
        <MetricsGrid metrics={metrics} isLoading={isLoading} />
        {/* Separator below metrics grid */}
        <Separator className="my-6 bg-border opacity-100 h-[2px]" />
        <DataToggle dataFrequency={dataFrequency} onToggle={toggleDataFrequency} />
        <ChartsGrid 
          financialData={financialData}
          dataFrequency={dataFrequency}
          isLoading={isLoading}
          currentSymbol={symbol}
          comparisonData={comparisonQueries.filter(q => q.data && comparisonStocks.find(s => s.symbol === q.symbol)?.isActive)}
          stockInfo={stockInfo} // Added stockInfo prop
        />
        <Separator className="my-6 bg-border opacity-100 h-[2px]" />
        <ValuationMetricsChart 
          symbol={symbol}
          comparisonStocks={comparisonStocks.filter(stock => stock.isActive)}
          isLoading={isLoading}
        />
        <Separator className="my-6 bg-border opacity-100 h-[2px]" />
        <ProjectionCalculator
          symbol={symbol}
          currentPrice={stockInfo?.price || 0}
          stockInfo={stockInfo}
          metrics={metrics}
        />
      </main>

      {/* Floating comparison controls - always show if there are any stocks (active or inactive) */}
      {comparisonStocks.length > 0 && (
        <ComparisonControls
          comparisonStocks={comparisonStocks}
          onToggle={toggleComparisonStock}
          onRemove={removeComparisonStock}
        />
      )}

      <CompareModal 
        isOpen={isCompareModalOpen}
        onClose={closeCompareModal}
        onAdd={addComparisonStock}
        onRemove={removeComparisonStock}
        onToggle={toggleComparisonStock}
        comparisonStocks={comparisonStocks}
      />
    </div>
  );
};

export default Dashboard;