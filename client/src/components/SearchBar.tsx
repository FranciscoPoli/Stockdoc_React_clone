import { FC, useState, ChangeEvent, useEffect, useRef, ReactNode } from "react";
import { motion } from "framer-motion";
import axios from "axios";

// Define stock suggestion type locally
interface StockSuggestion {
  symbol: string;
  name: string;
}

// Popular stock suggestions 
const STOCK_SUGGESTIONS: StockSuggestion[] = [
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "META", name: "Meta Platforms, Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NFLX", name: "Netflix, Inc." },
  { symbol: "SHOP", name: "Shopify Inc." },
  { symbol: "CRM", name: "Salesforce, Inc." },
  { symbol: "ENPH", name: "Enphase Energy, Inc." },
  { symbol: "ETSY", name: "Etsy, Inc." },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "DOCU", name: "DocuSign, Inc." },
  { symbol: "DBX", name: "Dropbox, Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "QCOM", name: "QUALCOMM Incorporated" },
  { symbol: "AMD", name: "Advanced Micro Devices, Inc." },
  { symbol: "PYPL", name: "PayPal Holdings, Inc." },
  { symbol: "XYZ", name: "Block, Inc." },
  { symbol: "HOOD", name: "Robinhood Markets, Inc." },
  { symbol: "AFRM", name: "Affirm Holdings, Inc." },
  { symbol: "COST", name: "Costco Wholesale Corporation" },
  { symbol: "TGT", name: "Target Corporation" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "SBUX", name: "Starbucks Corporation" },
  { symbol: "DPZ", name: "Domino's Pizza, Inc." },
  { symbol: "CMG", name: "Chipotle Mexican Grill, Inc." },
  { symbol: "TXRH", name: "Texas Roadhouse, Inc." },
  { symbol: "MCD", name: "McDonald's Corporation" },
  { symbol: "KO", name: "The Coca-Cola Company" },
  { symbol: "VICI", name: "VICI Properties Inc." },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "BAC", name: "Bank of America Corporation" },
  { symbol: "MA", name: "Mastercard Incorporated" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "AXP", name: "American Express Company" },
  { symbol: "CAKE", name: "The Cheesecake Factory" },
  { symbol: "XOM", name: "Exxon Mobil Corporation" },
  { symbol: "CVX", name: "Chevron Corporation" },
  { symbol: "PLTR", name: "Palantir Technologies Inc." },
  { symbol: "MELI", name: "MercadoLibre, Inc." },
  { symbol: "DIS", name: "The Walt Disney Company" },
  { symbol: "NKE", name: "Nike, Inc" },
  { symbol: "MNST", name: "Monster Beverage" },
  { symbol: "CELH", name: "Celsius Holdings Inc" },
  { symbol: "SOFI", name: "SoFi Technologies Inc" },
  { symbol: "COIN", name: "Coinbase Global, Inc." },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "UBER", name: "Uber Technologies, Inc." },
  { symbol: "ORCL", name: "Oracle Corporation" },
  { symbol: "ABNB", name: "Airbnb, Inc." },
  { symbol: "ACN", name: "Accenture" },
  { symbol: "TTD", name: "The Trade Desk, Inc." },
  { symbol: "NET", name: "Cloudflare, Inc." },
  { symbol: "CRWD", name: "CrowdStrike Holdings, Inc." },
  { symbol: "IBM", name: "International Business Machines Corporation" },
  { symbol: "INTU", name: "Intuit Inc." },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "SNOW", name: "Snowflake Inc." }
].sort((a, b) => a.symbol.localeCompare(b.symbol));

interface SearchBarProps {
  onSearch: (symbol: string) => void;
  initialSymbol?: string;
  placeholder?: string;
  disabled?: boolean;
  containerClassName?: string;
  useBigMargin?: boolean;
  disableAnimation?: boolean;
  wrapInMotion?: boolean;
  showClearButton?: boolean;
  customTrigger?: ReactNode;
  showDropdownOnFocus?: boolean; // Control whether to show dropdown immediately on focus
}

const SearchBar: FC<SearchBarProps> = ({ 
  onSearch, 
  initialSymbol = "AAPL",
  placeholder = "Search for a stock symbol (e.g., AAPL, MSFT, GOOGL)",
  disabled = false,
  containerClassName = "mb-8",
  useBigMargin = true,
  disableAnimation = false,
  wrapInMotion = true,
  showClearButton = true,
  customTrigger,
  showDropdownOnFocus = true
}) => {
  const [query, setQuery] = useState(initialSymbol);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>(STOCK_SUGGESTIONS);
  const [filteredSuggestions, setFilteredSuggestions] = useState<StockSuggestion[]>(STOCK_SUGGESTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  

  // Filter suggestions based on query
  useEffect(() => {
    if (query.trim() === '') {
      setFilteredSuggestions(suggestions);
    } else {
      const filtered = suggestions.filter(
        stock => 
          stock.symbol.toLowerCase().includes(query.toLowerCase()) || 
          stock.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    }
  }, [query, suggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim().toUpperCase());
      setIsFocused(false);
    }
  };

  const handleSuggestionClick = (symbol: string) => {
    setQuery(symbol);
    onSearch(symbol);
    setIsFocused(false);
  };

  const clearSearch = () => {
    setQuery("");
    setIsFocused(true); // Keep the dropdown open
    inputRef.current?.focus();
  };

  // Create the content of the search bar
  const searchContent = (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg 
            className="h-5 w-5 text-muted-foreground" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        {customTrigger ? (
          customTrigger
        ) : (
          <input 
            ref={inputRef}
            type="text" 
            className="block w-full bg-muted border-transparent rounded-lg pl-10 pr-4 py-3 placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition duration-150"
            placeholder={placeholder} 
            value={query}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            disabled={disabled}
          />
        )}
        
        {query && showClearButton && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button 
              type="button"
              className="text-primary hover:text-primary/90 focus:outline-none transition duration-150" 
              onClick={clearSearch}
              disabled={disabled}
            >
              <svg 
                className="h-5 w-5" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M18 6L6 18M6 6L18 18" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Dropdown suggestions */}
        {isFocused && !disabled && (showDropdownOnFocus || query.trim() !== '') && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-card shadow-lg max-h-96 rounded-md overflow-y-auto border border-border"
          >
            {filteredSuggestions.length > 0 ? (
              <ul className="py-2">
                {filteredSuggestions.map((stock) => (
                  <li 
                    key={stock.symbol}
                    className="px-4 py-2 hover:bg-muted cursor-pointer transition-colors flex justify-between items-center"
                    onClick={() => handleSuggestionClick(stock.symbol)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{stock.symbol}</span>
                      <span className="text-sm text-muted-foreground">{stock.name}</span>
                    </div>
                    <svg 
                      className="h-4 w-4 text-muted-foreground" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M5 12H19M19 12L12 5M19 12L12 19" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No matching stocks found
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );

  // Conditionally wrap in motion.div
  if (wrapInMotion) {
    return (
      <motion.div 
        className={containerClassName}
        initial={disableAnimation ? undefined : { opacity: 0, y: useBigMargin ? 20 : 10 }}
        animate={disableAnimation ? undefined : { opacity: 1, y: 0 }}
        transition={disableAnimation ? undefined : { duration: 0.5 }}
      >
        {searchContent}
      </motion.div>
    );
  } else {
    return <div className={containerClassName}>{searchContent}</div>;
  }
};

export default SearchBar;
