import { FC } from "react";
import { motion } from "framer-motion";
import { StockMetric } from "../types/stock";

interface MetricsGridProps {
  metrics: StockMetric[];
  isLoading: boolean;
}

const getIconComponent = (icon: string) => {
  switch (icon) {
    case 'funds':
      return (
        <svg 
          className="h-6 w-6 text-primary" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'scales':
      return (
        <svg 
          className="h-6 w-6 text-green-500" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 3V21M9 21H15M17 12H21M3 12H7M3 8L7 12L3 16M21 8L17 12L21 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'currency':
      return (
        <svg 
          className="h-6 w-6 text-purple-500" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 1V23M17 5H9.5C7.01472 5 5 7.01472 5 9.5C5 11.9853 7.01472 14 9.5 14H14.5C16.9853 14 19 16.0147 19 18.5C19 20.9853 16.9853 23 14.5 23H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'line-chart':
      return (
        <svg 
          className="h-6 w-6 text-yellow-500" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 3V19C3 20.1046 3.89543 21 5 21H21M21 15L15.5 9.5L12.5 12.5L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'chart-bar':
      return (
        <svg 
          className="h-6 w-6 text-blue-500" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 13V17M12 9V17M16 5V17M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'chart-line':
      return (
        <svg 
          className="h-6 w-6 text-indigo-500" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 3V19C3 20.1046 3.89543 21 5 21H21M21 7L15 13L9 8L4 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'pie-chart':
      return (
        <svg 
          className="h-6 w-6 text-amber-500" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2V12H22C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'trending-up':
      return (
        <svg 
          className="h-6 w-6 text-emerald-500" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M23 6L13.5 15.5L8.5 10.5L1 18M23 6H17M23 6V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return (
        <svg 
          className="h-6 w-6 text-primary" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
};

const MetricsGrid: FC<MetricsGridProps> = ({ metrics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-card rounded-lg shadow-lg p-5 animate-pulse">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-16"></div>
                <div className="h-8 bg-muted rounded w-24"></div>
              </div>
              <div className="h-10 w-10 bg-muted rounded-lg"></div>
            </div>
            <div className="mt-4">
              <div className="h-4 bg-muted rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((metric, index) => (
        <motion.div 
          key={metric.label}
          className="bg-card rounded-lg shadow-lg p-5 transition-all hover:shadow-xl hover:translate-y-[-2px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-muted-foreground text-sm uppercase tracking-wider">{metric.label}</h3>
              <p className="text-2xl font-mono font-semibold mt-1">{metric.value}</p>
            </div>
            <div className="bg-card p-2 rounded-lg border border-accent">
              {getIconComponent(metric.icon)}
            </div>
          </div>
          <div className={`mt-3 flex items-center text-${
            metric.changeType === 'positive' ? 'green-500' : 
            metric.changeType === 'negative' ? 'red-500' : 'muted-foreground'
          } text-sm`}>
            {metric.changeType !== 'neutral' && (
              <svg 
                className="h-4 w-4 mr-1" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d={metric.changeType === 'positive' ? "M12 19V5M5 12L12 5L19 12" : "M12 5V19M5 12L12 19L19 12"} 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span>{metric.change}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default MetricsGrid;
