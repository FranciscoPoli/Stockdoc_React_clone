import { FC } from "react";
import { motion } from "framer-motion";
import { StockInfo } from "../types/stock";

interface StockHeaderProps {
  stockInfo?: StockInfo;
  isLoading: boolean;
}

const StockHeader: FC<StockHeaderProps> = ({ stockInfo, isLoading }) => {
  if (isLoading) {
    return (
      <div className="mb-8 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-muted rounded w-1/4"></div>
      </div>
    );
  }

  if (!stockInfo) {
    return (
      <div className="mb-8">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold mr-3">No stock selected</h1>
        </div>
        <p className="text-muted-foreground mt-1">Please search for a stock symbol</p>
      </div>
    );
  }

  const isPositive = stockInfo.change >= 0;

  return (
    <motion.div 
      className="mb-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold mr-3">{stockInfo.name}</h1>
            <span className="bg-muted px-2 py-1 rounded text-sm font-mono">{stockInfo.symbol}</span>
          </div>
          <div className="flex items-center">
            <p className="text-muted-foreground mt-1">{stockInfo.exchange === "NasdaqGS" || "NasdaqCM" ? "NASDAQ" : stockInfo.exchange}</p>
            {stockInfo.earningsDate && (
              <div className="ml-4 mt-1">
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 px-2 py-1 rounded text-xs font-medium">
                  Earnings: {new Date(stockInfo.earningsDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <div className="flex items-center">
            <span className="text-3xl font-semibold font-mono">
              ${stockInfo.price.toFixed(2)}
            </span>
            <div className={`ml-3 flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              <svg 
                className="h-5 w-5 mr-1" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d={isPositive ? "M12 19V5M5 12L12 5L19 12" : "M12 5V19M5 12L12 19L19 12"} 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-mono">
                {isPositive ? '+' : ''}{stockInfo.change.toFixed(2)} ({stockInfo.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-1 text-right">
            52-week price range: ${stockInfo.low52Week?.toFixed(2)} - ${stockInfo.high52Week?.toFixed(2)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default StockHeader;
