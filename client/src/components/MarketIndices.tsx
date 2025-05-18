import { useEffect, useState } from 'react';

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export function MarketIndices() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarketIndices() {
      try {
        setLoading(true);
        console.log('Fetching market indices...');
        const response = await fetch('/api/market-indices');
        console.log('Market indices response:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch market indices: ${response.status} ${response.statusText}`);
        }
        
        let data;
        try {
          const text = await response.text();
          console.log('Raw response:', text);
          data = JSON.parse(text);
          console.log('Market indices data:', data);
          
          if (!Array.isArray(data)) {
            console.error('Expected array but got:', typeof data);
            throw new Error('Invalid data format');
          }
          
          setIndices(data);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Failed to parse market indices data');
        }
      } catch (err) {
        console.error('Error fetching market indices:', err);
        setError('Failed to load market data');
        
        // Fallback to empty array so the component doesn't crash
        setIndices([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMarketIndices();
    
    // Refresh every 5 minutes
    const intervalId = setInterval(fetchMarketIndices, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="h-6 w-16 rounded-full bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return null; // Don't show anything on error
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mr-3">
      {indices.map((index) => (
        <div 
          key={index.symbol}
          className={`w-20 py-0.5 text-xs font-semibold rounded-lg flex flex-col bg-blue-900/20 text-center whitespace-nowrap border border-white/20
            ${index.changePercent >= 0 
              ? 'text-green-500' 
              : 'text-red-500'}`}
          
        >
          <span className="text-muted-foreground">{index.name}</span>
          <span>
            {index.changePercent > 0 ? "+" : ""}
            {(index.changePercent * 100).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}