import React from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { ComparisonStock } from '../types/stock';

interface ComparisonControlsProps {
  comparisonStocks: ComparisonStock[];
  onToggle: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

const ComparisonControls: React.FC<ComparisonControlsProps> = ({
  comparisonStocks,
  onToggle,
  onRemove
}) => {
  // Only show the component if there are comparison stocks (even if they're all inactive)
  if (comparisonStocks.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="fixed left-4 top-1/3 z-50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-card/90 backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden">
        <div className="p-3 bg-muted/60 border-b">
          <h3 className="text-xs font-medium">Comparison Stocks</h3>
        </div>
        <div className="p-2 space-y-2">
          {comparisonStocks.map((stock) => (
            <div 
              key={stock.symbol}
              className="flex items-center justify-between rounded-md p-2 transition-colors cursor-pointer hover:bg-muted/50"
              style={{
                backgroundColor: stock.isActive ? `${stock.color}20` : 'transparent',
                borderColor: stock.isActive ? stock.color : 'transparent',
                borderLeft: `3.5px solid ${stock.color}`,
                borderTop: `1px solid ${stock.color}`,
              }}
              onClick={() => onToggle(stock.symbol)}
              title={stock.isActive ? "Click to hide" : "Click to show"}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stock.color }}
                />
                <span className="text-sm font-medium">{stock.symbol}</span>
              </div>
              <div className="flex items-center">
                {stock.isActive ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Check className="h-4 w-4 text-muted-foreground opacity-50" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ComparisonControls;