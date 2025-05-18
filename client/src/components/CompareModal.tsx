import React, { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Check, Trash2 } from "lucide-react";
import { ComparisonStock } from "../types/stock";
import SearchBar from "./SearchBar";

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onToggle: (symbol: string) => void;
  comparisonStocks: ComparisonStock[];
}

interface StockSuggestion {
  symbol: string;
  name: string;
}

const CompareModal: React.FC<CompareModalProps> = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  onRemove,
  onToggle,
  comparisonStocks 
}) => {
  const [initialSymbol, setInitialSymbol] = useState("");
  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  {/*// Reset the search and blur the input when the modal is opened or when a new stock is added
  useEffect(() => {
    if (isOpen) {
      setInitialSymbol("");
      
      // We need to wait a bit for the modal to fully render before trying to blur
      setTimeout(() => {
        // Find the input element in the search bar and blur it
        if (searchBarRef.current) {
          const inputElement = searchBarRef.current.querySelector('input');
          if (inputElement) {
            inputRef.current = inputElement;
            inputElement.blur();
          }
        }
      }, 50);
    }
  }, [isOpen, comparisonStocks.length]); */}

  const handleClearAll = () => {
    // Remove all stocks
    comparisonStocks.forEach(stock => {
      onRemove(stock.symbol);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compare Stocks</DialogTitle>
          <DialogDescription>
            Add stock symbols to compare with the primary stock. You can add up to 3 symbols.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative flex items-center gap-2 mt-2">
          <div className="relative flex-1" ref={searchBarRef}>
            <SearchBar
              initialSymbol={initialSymbol}
              onSearch={onAdd}
              placeholder="Add stock symbol (e.g. MSFT)"
              disabled={comparisonStocks.length >= 3}
              containerClassName=""
              useBigMargin={false}
              disableAnimation={true}
              wrapInMotion={false}
              showDropdownOnFocus={false}
              showClearButton={true}
            />
          </div>
        </div>
        
        {comparisonStocks.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            No stocks added for comparison yet
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            {comparisonStocks.map((stock) => (
              <div 
                key={stock.symbol} 
                className="flex items-center justify-between rounded-md border p-3"
                style={{
                  borderColor: stock.isActive ? stock.color : 'transparent',
                  background: stock.isActive ? `${stock.color}10` : undefined
                }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stock.color }}
                  />
                  <span className="font-medium">{stock.symbol}</span>
                  <span className="text-sm text-muted-foreground">{stock.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onToggle(stock.symbol)}
                  >
                    {stock.isActive ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Check className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-destructive"
                    onClick={() => onRemove(stock.symbol)}
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <DialogFooter className="sm:justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
            
            {comparisonStocks.length > 0 && (
              <Button
                type="button"
                variant="destructive"
                className="bg-destructive hover:bg-destructive text-destructive-foreground"
                onClick={handleClearAll}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
            
          {comparisonStocks.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {comparisonStocks.length}/3 stocks added
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompareModal;