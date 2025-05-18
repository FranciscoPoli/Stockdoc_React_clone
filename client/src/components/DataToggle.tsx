import { FC, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { DataFrequency } from "../types/stock";

interface DataToggleProps {
  dataFrequency: DataFrequency;
  onToggle: (frequency?: DataFrequency) => void;
}

const DataToggle: FC<DataToggleProps> = ({ dataFrequency, onToggle }) => {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (backgroundRef.current) {
      if (dataFrequency === 'quarterly') {
        backgroundRef.current.style.transform = 'translateX(100%)';
      } else if (dataFrequency === 'ttm') {
        backgroundRef.current.style.transform = 'translateX(200%)';
      } else {
        backgroundRef.current.style.transform = 'translateX(0%)';
      }
    }
  }, [dataFrequency]);

  return (
    <motion.div 
      className="my-10 w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex flex-col items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2"></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
             
            </p>
          </div>
          
          <div className="flex justify-center">
            <div className="relative inline-flex rounded-lg shadow-md bg-muted">
              <div 
                ref={backgroundRef}
                className="absolute top-0 left-0 w-1/3 h-full bg-primary rounded-lg transition-transform duration-300 shadow-lg"
                style={{ zIndex: 0 }}
              ></div>
              <button 
                className={`relative px-6 py-3 text-sm font-medium rounded-l-lg bg-transparent text-center ${
                  dataFrequency === 'annual' ? 'text-white' : 'text-muted-foreground'
                } z-10 transition-colors duration-300`}
                onClick={() => onToggle('annual')}
                data-active={dataFrequency === 'annual'}
              >
                Annual
              </button>
              <button 
                className={`relative px-6 py-3 text-sm font-medium bg-transparent text-center ${
                  dataFrequency === 'quarterly' ? 'text-white' : 'text-muted-foreground'
                } z-10 transition-colors duration-300`}
                onClick={() => onToggle('quarterly')}
                data-active={dataFrequency === 'quarterly'}
              >
                Quarterly
              </button>
              <button 
                className={`relative px-6 py-3 text-sm font-medium rounded-r-lg bg-transparent text-center mr-2 ${
                  dataFrequency === 'ttm' ? 'text-white' : 'text-muted-foreground'
                } z-10 transition-colors duration-300`}
                onClick={() => onToggle('ttm')}
                data-active={dataFrequency === 'ttm'}
              >
                TTM
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DataToggle;
