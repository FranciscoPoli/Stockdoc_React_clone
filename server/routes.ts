import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import yahooFinance from "yahoo-finance2";
import firebaseStockService from "./firebase-service";
import { initializeAdminSDK, isFirebaseConfigured, getRealtimeDb } from "./firebase";
import { cache } from "./cache";
import { getStockNameFromSymbol } from "../shared/stockSuggestions";
import { ref, get } from "firebase/database";

// Type definitions for stock data
interface StockData {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

// We no longer use mock data - real data comes from Yahoo Finance

// We no longer generate mock financial data - all data must come from Firebase

export async function registerRoutes(app: Express): Promise<Server> {
  // We no longer need the /api/tickers endpoint as we use hardcoded stock suggestions
  
  // Market indices endpoint
  app.get("/api/market-indices", async (req, res) => {
    try {
      console.log("Received request for market indices");
      
      // Define the symbols for market indices and commodities
      const symbols = ['SPY', 'QQQ', '^DJI', 'BTC-USD', 'GC=F', 'CL=F']; // SPY, QQQ, Dow Jones, Bitcoin, Gold, Oil
      
      // Check cache first
      const cacheKey = `market_indices_data`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        console.log(`Retrieved market indices data from cache`);
        return res.json(cachedData);
      }
      
      // Real implementation with Yahoo Finance API
      console.log('Fetching real market data from Yahoo Finance...');
      const indices = [];
      
      for (const symbol of symbols) {
        try {
          console.log(`Fetching data for ${symbol} from Yahoo Finance...`);
          const yahooData = await yahooFinance.quoteSummary(symbol, {
            modules: ['price', 'summaryDetail']
          });
          
          // Extract the relevant data
          const index = {
            symbol,
            name: getMarketIndexName(symbol),
            price: yahooData.price?.regularMarketPrice || 0,
            change: yahooData.price?.regularMarketChange || 0,
            changePercent: yahooData.price?.regularMarketChangePercent || 0,
          };
          
          console.log(`Got data for ${symbol}:`, index);
          indices.push(index);
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error);
          // Continue with other symbols even if one fails
        }
      }
      
      
      // Store in cache (short expiry as market data changes frequently)
      cache.set(cacheKey, indices, 5 * 60 * 1000); // 5 minutes
      
      return res.json(indices);
    } catch (error) {
      console.error("Error fetching market indices:", error);
      res.status(500).json({ 
        message: "Failed to get market indices data",
        error: String(error)
      });
    }
  });

  // Helper function to get friendly names for market indices
  function getMarketIndexName(symbol: string): string {
    switch (symbol) {
      case 'SPY': return 'S&P 500';
      case 'QQQ': return 'Nasdaq';
      case '^DJI': return 'Dow';
      case 'BTC-USD': return 'Bitcoin';
      case 'GC=F': return 'Gold';
      case 'CL=F': return 'Oil';
      default: return symbol;
    }
  }
  
  // Earnings data endpoint
  app.get("/api/earnings/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      // Check cache first
      const cacheKey = `earnings_${symbol}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        console.log(`Retrieved earnings data for ${symbol} from cache`);
        return res.json(cachedData);
      }
      
      // If not in cache, proceed with Firebase fetch
      if (!isFirebaseConfigured() || !getRealtimeDb) {
        return res.status(500).json({
          message: "Firebase not configured for earnings data"
        });
      }
      
      const db = getRealtimeDb();
      const earningsRef = ref(db!, `earningsQuarter/${symbol}`);
      const snapshot = await get(earningsRef);
      
      if (snapshot.exists()) {
        const earningsData = snapshot.val();
        console.log(`Retrieved earnings data for ${symbol} from Firebase`);
        
        // Store in cache for 24 hours
        cache.set(cacheKey, earningsData);
        
        return res.json(earningsData);
      }
      
      return res.status(404).json({ 
        message: `Earnings data not found for ${req.params.symbol}`
      });
    } catch (error) {
      console.error(`Error fetching earnings data for ${req.params.symbol}:`, error);
      return res.status(500).json({ 
        message: "Error fetching earnings data",
        error: (error as Error).message
      });
    }
  });

  // Stock API endpoints
  app.get("/api/stock/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      // Check cache first
      const cacheKey = `stock_info_${symbol}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        console.log(`Retrieved stock data for ${symbol} from cache`);
        return res.json(cachedData);
      }
      
      // If not in cache, try to get data from Firebase if it's configured
      if (isFirebaseConfigured()) {
        try {
          const firebaseStockData = await firebaseStockService.getStockInfo(symbol);
          if (firebaseStockData) {
            console.log(`Retrieved stock data for ${symbol} from Firebase`);
            // Store in cache
            cache.set(cacheKey, firebaseStockData);
            return res.json(firebaseStockData);
          }
        } catch (firebaseError) {
          console.error(`Error fetching Firebase data for ${symbol}:`, firebaseError);
          // Continue to fallback methods
        }
      }
      
      // Process any stock symbol - no need to pre-validate
      
      // Try to get real data from Yahoo Finance
      try {
        const yahooData: any = await yahooFinance.quoteSummary(symbol, {
          modules: ['price', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'calendarEvents']
        });
        
        // Create enhanced stock data with Yahoo Finance data
        const stock = {
          symbol,
          name: getStockNameFromSymbol(symbol), // Use our more reliable stock name list
          exchange: yahooData?.price?.exchangeName || "NASDAQ",
          price: yahooData?.price?.regularMarketPrice || 0,
          change: yahooData?.price?.regularMarketChange || 0,
          changePercent: yahooData?.price?.regularMarketChangePercent * 100 || 0,
          earningsDate: yahooData?.calendarEvents?.earnings?.earningsDate?.[0] || null,
          exDividendDate: yahooData?.calendarEvents?.exDividendDate || null,
          lastUpdated: new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'EST'
          }),
          // Additional metrics from Yahoo Finance
          peRatio: yahooData?.summaryDetail?.trailingPE || null,
          forwardPE: yahooData?.summaryDetail?.forwardPE || null,
          dividendYield: yahooData?.summaryDetail?.dividendYield ? (yahooData.summaryDetail.dividendYield * 100) : 0,
          marketCap: yahooData?.summaryDetail?.marketCap || null,
          volume: yahooData?.summaryDetail?.volume || null,
          avgVolume: yahooData?.summaryDetail?.averageVolume || null,
          high52Week: yahooData?.summaryDetail?.fiftyTwoWeekHigh || null,
          low52Week: yahooData?.summaryDetail?.fiftyTwoWeekLow || null,
          beta: yahooData?.summaryDetail?.beta || null,
          // Additional metrics
          roa: yahooData?.financialData?.returnOnAssets ? (yahooData.financialData.returnOnAssets * 100) : null,
          roe: yahooData?.financialData?.returnOnEquity ? (yahooData.financialData.returnOnEquity * 100) : null,
        };
        
        // Store in cache
        cache.set(cacheKey, stock, 5 * 60 * 1000);
        console.log(`Saved stock data for ${symbol} to cache`);
        
        // If Firebase is configured, store this data for future use
        if (isFirebaseConfigured()) {
          try {
            await firebaseStockService.saveStockInfo(stock);
            console.log(`Saved stock data for ${symbol} to Firebase`);
          } catch (saveError) {
            console.error(`Error saving stock data to Firebase:`, saveError);
          }
        }
        
        return res.json(stock);
      } catch (yahooError) {
        console.error(`Error fetching Yahoo Finance data for ${symbol}:`, yahooError);
        
        // Return an error response if Yahoo Finance fails
        return res.status(404).json({ 
          message: `Unable to fetch data for ${symbol} from Yahoo Finance`, 
          error: String(yahooError) 
        });
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error in stock data endpoint:", error);
      res.status(500).json({ 
        message: `Failed to get stock data for ${req.params.symbol}`,
        error: error.message
      });
    }
  });

  app.get("/api/financial/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      // Clear cache if testing dividend fixes
      if (req.query.nocache === "true") {
        console.log(`Clearing cache for financial data ${symbol}`);
        cache.delete(`financial_data_${symbol}`);
      }
      
      // Check cache first
      const cacheKey = `financial_data_${symbol}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        console.log(`Retrieved financial data for ${symbol} from cache`);
        return res.json(cachedData);
      }
      
      // If not in cache, try to get data from Firebase if it's configured
      if (isFirebaseConfigured()) {
        try {
          const firebaseFinancialData = await firebaseStockService.getFinancialData(symbol);
          if (firebaseFinancialData) {
            console.log(`Retrieved financial data for ${symbol} from Firebase`);
            // Store in cache
            cache.set(cacheKey, firebaseFinancialData);
            return res.json(firebaseFinancialData);
          }
        } catch (firebaseError) {
          console.error(`Error fetching financial data from Firebase for ${symbol}:`, firebaseError);
          // Continue to fallback methods
        }
      }
      
      // Return error response if financial data is not found in Firebase
      return res.status(404).json({ 
        message: `Financial data for ${symbol} not found. Try again later.`
      });
    } catch (err) {
      const error = err as Error;
      console.error("Error in financial data endpoint:", error);
      res.status(500).json({ 
        message: `Failed to get financial data for ${req.params.symbol}`,
        error: error.message
      });
    }
  });

  // New endpoint for valuation metrics history
  app.get("/api/valuation/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      
      // Check cache first
      const cacheKey = `valuation_metrics_${symbol}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        console.log(`Retrieved valuation metrics for ${symbol} from cache`);
        return res.json(cachedData);
      }
      
      // If not in cache, try to get valuation data from Firebase if it's configured
      if (isFirebaseConfigured()) {
        try {
          const firebaseValuationData = await firebaseStockService.getValuationMetrics(symbol);
          if (firebaseValuationData) {
            console.log(`Retrieved valuation metrics for ${symbol} from Firebase`);
            // Store in cache
            cache.set(cacheKey, firebaseValuationData);
            return res.json(firebaseValuationData);
          }
        } catch (firebaseError) {
          console.error(`Error fetching valuation metrics from Firebase for ${symbol}:`, firebaseError);
          // Continue to fallback methods
        }
      }
      
      // Get the financial data for calculations from Firebase only
      let financialData;
      
      // Try to get financial data from Firebase
      if (isFirebaseConfigured()) {
        try {
          financialData = await firebaseStockService.getFinancialData(symbol);
          if (!financialData) {
            return res.status(404).json({ 
              message: `Financial data for ${symbol} not found in Firebase. Try again later.`
            });
          }
        } catch (error) {
          return res.status(404).json({ 
            message: `Error retrieving financial data for ${symbol}. Try again later.`,
            error: String(error)
          });
        }
      } else {
        return res.status(500).json({ 
          message: 'Firebase not configured. Unable to retrieve financial data.'
        });
      }
      
      // Try to get historical price data from Yahoo Finance
      let historicalPrices: Array<{ date: Date; close: number }> = [];
      try {
        // Get historical price data back to 2005 to match our earliest financial data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(2005); // Go back to 2005 to match our earliest financial data
        
        const queryOptions = {
          period1: startDate, // Date object
          period2: endDate,   // Date object
          interval: "1mo" as const  // Explicitly type as a literal
        };
        
        const yahooData: any = await yahooFinance.historical(symbol, queryOptions);
        
        // Process the Yahoo Finance data and ensure all dates are Date objects
        historicalPrices = yahooData.map((item: any) => ({
          date: new Date(item.date),
          close: item.close
        }));
      } catch (err) {
        console.error(`Error fetching Yahoo Finance data for ${symbol}:`, err);
        // Return error if Yahoo Finance historical data cannot be retrieved
        return res.status(404).json({ 
          message: `Unable to fetch historical price data for ${symbol} from Yahoo Finance`, 
          error: String(err) 
        });
      }
      
      // Use quarterly financial data for more granular metrics
      const revenueData = financialData.revenue.quarterly;
      const earningsData = financialData.netIncome.quarterly;
      const fcfData = financialData.freeCashFlow.quarterly;
      const operatingCashFlowData = financialData.operatingCashFlow?.quarterly || [];
      
      // Process financial quarter data to align with price data
      // Create formatted quarter data for matching with price dates
      const quarterData = revenueData.map(quarter => {
        const quarterStr = quarter.year; // Already in "Q1 2020" format
        return {
          quarter: quarterStr,
          index: revenueData.indexOf(quarter)
        };
      });
      
      // Helper function to convert quarter string (e.g. "Q1 2020") to date
      const quarterToDate = (quarterStr: string): Date => {
        const parts = quarterStr.split(' ');
        const quarterNum = parseInt(parts[0].substring(1)); // Extract number after Q
        const year = parseInt(parts[1]);
        return new Date(year, (quarterNum - 1) * 3 + 2, 15); // Middle of last month in quarter
      };
      
      // Convert historicalPrices to quarterly points by finding the closest financial quarter
      const findClosestQuarter = (priceDate: Date): number => {
        // If we don't have any quarterly data, we can't match
        if (quarterData.length === 0) return -1;
        
        // Find the financial quarter that this price date belongs to
        const priceYear = priceDate.getFullYear();
        const priceMonth = priceDate.getMonth();
        const priceQuarter = Math.floor(priceMonth / 3) + 1;
        const priceDateQuarterString = `Q${priceQuarter} ${priceYear}`;
        
        // Check if this exact quarter exists in our financial data
        const exactMatch = quarterData.find(q => q.quarter === priceDateQuarterString);
        if (exactMatch) return exactMatch.index;
        
        // No exact match, find the closest quarter to this price date
        // For prices before our earliest financial data, return the earliest quarter
        const oldestQuarter = quarterData[0];
        const oldestQuarterDate = quarterToDate(oldestQuarter.quarter);
        
        if (priceDate < oldestQuarterDate) {
          // If price is from before our earliest financial data, use the first quarter
          return 0;
        }
        
        // For more recent dates, find the latest quarter that's before the price date
        let latestQuarterIndex = -1;
        let latestQuarterDate = new Date(0); // Jan 1, 1970
        
        for (const q of quarterData) {
          const quarterDate = quarterToDate(q.quarter);
          
          // Only consider quarters that come before our price date
          if (quarterDate <= priceDate && quarterDate > latestQuarterDate) {
            latestQuarterDate = quarterDate;
            latestQuarterIndex = q.index;
          }
        }
        
        // If we didn't find a match, use the earliest quarter
        if (latestQuarterIndex === -1) {
          return 0;
        }
        
        return latestQuarterIndex;
      };
      
      // Sort historical prices by date (oldest to newest)
      historicalPrices.sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
      
      // Use all monthly price points instead of one per quarter for more granular visualization
      const monthlyPrices: Array<{ date: Date; close: number, quarterIndex: number, monthLabel: string }> = [];
      
      historicalPrices.forEach(pricePoint => {
        const date = pricePoint.date as Date;
        
        // Find the corresponding quarterly financial data for this price point
        const quarterIndex = findClosestQuarter(date as Date);
        
        // Only include price points that have corresponding financial data
        if (quarterIndex >= 0) {
          // Format month label
          const year = date.getFullYear();
          const month = date.getMonth();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthLabel = `${monthNames[month]} ${year}`;
          
          monthlyPrices.push({
            date: date as Date,
            close: pricePoint.close,
            quarterIndex,
            monthLabel
          });
        }
      });
      
      // Create a map of month labels to price points for valuation metrics
      const monthlyValuationData = new Map<string, { idx: number, price: number, date: Date }>();
      
      monthlyPrices.forEach((pricePoint: { date: Date; close: number; quarterIndex: number; monthLabel: string; }) => {
        const idx = pricePoint.quarterIndex;
        
        // Skip if no valid financial data
        if (idx >= revenueData.length || idx < 0) return;
        
        // Use month label as the key for more granular data points
        const monthLabel = pricePoint.monthLabel;
        
        // Store each monthly price point with its corresponding financial quarter index
        monthlyValuationData.set(monthLabel, { 
          idx, 
          price: pricePoint.close,
          date: pricePoint.date
        });
      });
      
      // Now create the valuation metrics from monthly price data
      const valuationMetrics = Array.from(monthlyValuationData.entries()).map(([monthLabel, { idx, price }]) => {
        // Calculate trailing 4-quarter sums for TTM (trailing twelve months) metrics
        const trailingQuarters = 4;
        let trailingRevenue = 0;
        let trailingEarnings = 0;
        let trailingFCF = 0;
        
        // Track how many quarters we were able to include
        let quartersIncluded = 0;
        
        // Sum the last 4 quarters 
        let trailingOperatingCF = 0;
        for (let j = 0; j < trailingQuarters; j++) {
          const dataIdx = idx - j;
          if (dataIdx >= 0) {
            trailingRevenue += revenueData[dataIdx].value;
            trailingEarnings += earningsData[dataIdx].value;
            trailingFCF += fcfData[dataIdx].value;
            
            // Add operating cash flow if available
            if (operatingCashFlowData[dataIdx]) {
              trailingOperatingCF += operatingCashFlowData[dataIdx].value;
            }
            
            quartersIncluded++;
          }
        }
        
        // Only calculate ratios if we have a full 4 quarters of data for proper TTM metrics
        let pe = null;
        let ps = null;
        let pfcf = null;
        let pocf = null; // Price to Operating Cash Flow
        
        if (quartersIncluded === 4) {
          // Calculate market cap (price * shares outstanding)
          const sharesOutstanding = financialData.sharesOutstanding.quarterly[idx].value;
          
          // Calculate standard Price/Metric ratios
          pe = trailingEarnings > 0 ? price / (trailingEarnings / sharesOutstanding) : null;
          ps = trailingRevenue > 0 ? price / (trailingRevenue / sharesOutstanding) : null;
          pfcf = trailingFCF > 0 ? price / (trailingFCF / sharesOutstanding) : null;
          pocf = trailingOperatingCF > 0 ? price / (trailingOperatingCF / sharesOutstanding) : null;
        }

        return {
          date: monthLabel, // Now using month labels (Jan 2024, Feb 2024, etc.)
          price,
          pe,
          ps,
          pfcf,
          pocf
        };
      }).filter(metric => metric !== null) as any[];
      
      // Sort the metrics by date (from oldest to newest)
      valuationMetrics.sort((a, b) => {
        // Extract month and year from the date strings (format: "Jan 2024")
        const aMonthYear = a.date.split(' ');
        const bMonthYear = b.date.split(' ');
        
        const aMonth = aMonthYear[0];
        const aYear = parseInt(aMonthYear[1]);
        const bMonth = bMonthYear[0];
        const bYear = parseInt(bMonthYear[1]);
        
        // First compare years
        if (aYear !== bYear) return aYear - bYear;
        
        // If years are the same, compare months
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
      });

      const valuationData = {
        symbol,
        metrics: valuationMetrics
      };
      
      // Store in cache
      cache.set(cacheKey, valuationData);
      console.log(`Saved valuation metrics for ${symbol} to cache`);
      
      // If Firebase is configured, store this data for future use
      if (isFirebaseConfigured()) {
        try {
          await firebaseStockService.saveValuationMetrics(symbol, valuationData);
          console.log(`Saved valuation metrics for ${symbol} to Firebase`);
        } catch (saveError) {
          console.error(`Error saving valuation metrics to Firebase:`, saveError);
        }
      }

      res.json(valuationData);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error in valuation metrics endpoint:", error);
      res.status(500).json({ 
        message: `Failed to get valuation metrics for ${req.params.symbol}`,
        error: error.message
      });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}

// Function removed - using simple fallback instead
