/**
 * This file is the single source of truth for stock suggestions/names throughout the application.
 * Any changes to the stock list should be made ONLY in this file.
 */

export interface StockSuggestion {
  symbol: string;
  name: string;
}

/**
 * Official list of supported stocks with their proper company names.
 * This list is used by both client and server components.
 */
export const STOCK_SUGGESTIONS: StockSuggestion[] = [
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
];

/**
 * Alias for backward compatibility - in case any components are still using the old name
 */
export const FALLBACK_SUGGESTIONS = STOCK_SUGGESTIONS;

/**
 * Helper function to get a stock's company name from its symbol
 * @param symbol The stock symbol to look up (e.g., AAPL)
 * @returns The company name, or "${symbol} Corporation" if not found
 */
export function getStockNameFromSymbol(symbol: string): string {
  const stock = STOCK_SUGGESTIONS.find(s => s.symbol === symbol);
  return stock?.name || `${symbol} Corporation`;
}