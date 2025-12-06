import React, { useState, useMemo, useRef, useEffect } from 'react';
import { getRawDatabase } from '../services/toolImpl';
import { WorkoutLog } from '../types';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

type MetricType = 'weight' | 'e1rm' | 'volume';

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricType>('e1rm');
  const [db, setDb] = useState<Record<string, WorkoutLog[]>>({});
  
  useEffect(() => {
    setDb(getRawDatabase());
    const handleUpdate = () => {
      setDb(getRawDatabase());
    };
    window.addEventListener('biome-db-updated', handleUpdate);
    return () => window.removeEventListener('biome-db-updated', handleUpdate);
  }, []);

  const exercises = Object.keys(db).sort();

  useEffect(() => {
    if (!selectedExercise && exercises.length > 0) {
      if (exercises.includes("Bench Press")) setSelectedExercise("Bench Press");
      else setSelectedExercise(exercises[0]);
    }
  }, [exercises, selectedExercise]);

  const chartData = useMemo(() => {
    if (!selectedExercise || !db[selectedExercise]) return [];

    const data = db[selectedExercise]
      .map(log => {
        const e1rm = log.weight * (1 + log.reps / 30);
        const volume = log.weight * log.reps;
        return {
          date: new Date(log.date), // Ensure date object
          rawDate: log.date,
          weight: log.weight,
          reps: log.reps,
          e1rm: e1rm,
          volume: volume,
          value: metric === 'weight' ? log.weight : metric === 'e1rm' ? e1rm : volume
        };
      });

    // CRITICAL FIX: Sort by date timestamp to prevent "looping" lines
    return data.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedExercise, metric, db]);

  // Calculate stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const start = chartData[0].value;
    const current = chartData[chartData.length - 1].value;
    
    // Avoid division by zero
    const change = start !== 0 ? ((current - start) / start) * 100 : 0;
    const isPositive = change >= 0;

    return {
        start: start.toFixed(1),
        current: current.toFixed(1),
        change: change.toFixed(1),
        isPositive
    };
  }, [chartData]);

  if (exercises.length === 0) {
    return (
      <div className="fixed inset-0 bg-biome-dark z-[100] flex flex-col items-center justify-center p-8 text-white">
        <p className="text-gray-400 mb-4">No data available.</p>
        <button onClick={onClose} className="text-biome-accent hover:underline">Return to Chat</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-biome-dark z-[100] w-screen h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-biome-panel shrink-0">
        <h2 className="text-lg font-mono font-bold text-white flex items-center gap-2">
          ANALYTICS
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
          CLOSE
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-800 overflow-y-auto bg-black/20 p-2 hidden md:block shrink-0">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Exercises</h3>
          <div className="space-y-1">
            {exercises.map(ex => (
              <button
                key={ex}
                onClick={() => setSelectedExercise(ex)}
                className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                  selectedExercise === ex 
                    ? 'bg-biome-accent text-biome-dark' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col h-full relative">
          
          <div className="absolute top-4 left-4 right-4 z-10 flex flex-col sm:flex-row sm:items-start justify-between pointer-events-none gap-4">
             {/* Mobile Selector */}
             <div className="md:hidden pointer-events-auto w-full">
                <select 
                  className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 shadow-xl focus:outline-none focus:border-biome-accent"
                  value={selectedExercise || ''}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                >
                  <option value="" disabled>Select Exercise</option>
                  {exercises.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
             </div>

             {selectedExercise && (
               <>
                 <div className="pointer-events-auto flex flex-col">
                    <h2 className="text-3xl font-bold text-white drop-shadow-md hidden md:block">{selectedExercise}</h2>
                    
                    {/* Stats Bar */}
                    {stats && (
                        <div className="flex items-center gap-6 mt-2 bg-black/40 p-2 rounded backdrop-blur border border-white/5">
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase">Start</div>
                                <div className="text-lg font-mono font-bold text-gray-300">{stats.start}</div>
                            </div>
                            <div className="w-px h-8 bg-gray-700"></div>
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase">Current</div>
                                <div className="text-lg font-mono font-bold text-white">{stats.current}</div>
                            </div>
                            <div className="w-px h-8 bg-gray-700"></div>
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase">Change</div>
                                <div className={`text-lg font-mono font-bold ${stats.isPositive ? 'text-biome-accent' : 'text-biome-warning'}`}>
                                    {stats.isPositive ? '+' : ''}{stats.change}%
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
                 
                 <div className="flex bg-gray-900/90 backdrop-blur rounded-lg p-1 border border-gray-800 shadow-xl pointer-events-auto self-start sm:self-auto mt-2 sm:mt-0">
                    <button onClick={() => setMetric('weight')} className={`px-4 py-2 text-xs font-bold rounded ${metric === 'weight' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Weight</button>
                    <button onClick={() => setMetric('e1rm')} className={`px-4 py-2 text-xs font-bold rounded ${metric === 'e1rm' ? 'bg-biome-accent text-biome-dark' : 'text-gray-500 hover:text-gray-300'}`}>E1RM</button>
                    <button onClick={() => setMetric('volume')} className={`px-4 py-2 text-xs font-bold rounded ${metric === 'volume' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Volume</button>
                 </div>
               </>
             )}
          </div>

          <div className="flex-1 w-full h-full bg-gradient-to-b from-gray-900/30 to-biome-dark relative pt-24 sm:pt-0">
             {!selectedExercise ? (
                <div className="flex h-full items-center justify-center text-gray-600 space-y-4 flex-col">
                  <p className="text-lg">Select an exercise to analyze.</p>
                </div>
              ) : (
                <ResponsiveSVGChart data={chartData} metric={metric} />
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ResponsiveSVGChart: React.FC<{ data: any[], metric: MetricType }> = ({ data, metric }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        
        const resizeObserver = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const entry = entries[0];
            const { width, height } = entry.contentRect;
            requestAnimationFrame(() => {
                setDimensions({ width, height });
            });
        });
        
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    if (dimensions.width === 0 || dimensions.height === 0) {
        return <div ref={containerRef} className="w-full h-full" />;
    }

    if (data.length === 0) {
        return <div ref={containerRef} className="w-full h-full flex items-center justify-center text-gray-500">No data points found.</div>;
    }

    const { width, height } = dimensions;
    const padding = { top: 120, right: 60, bottom: 60, left: 60 };
    
    const drawWidth = width - padding.left - padding.right;
    const drawHeight = height - padding.top - padding.bottom;

    if (drawWidth <= 0 || drawHeight <= 0) return <div ref={containerRef} className="w-full h-full" />;

    const values = data.map(d => d.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    
    // SCALE FIX:
    // If the difference is very small (e.g. 7.0 to 7.0), force a small range so it doesn't break
    if (minVal === maxVal) {
        minVal = minVal * 0.9;
        maxVal = maxVal * 1.1;
        // If values are 0, force a 0-10 range
        if (minVal === 0) { minVal = 0; maxVal = 10; }
    } else {
        // Add 10% padding to top and bottom for visual comfort
        const paddingRange = (maxVal - minVal) * 0.1;
        minVal = minVal - paddingRange;
        maxVal = maxVal + paddingRange;
    }

    // Guard against NaN
    if (isNaN(minVal) || isNaN(maxVal)) {
        minVal = 0;
        maxVal = 100;
    }

    const getX = (index: number) => {
        if (data.length <= 1) return padding.left + drawWidth / 2;
        return padding.left + (index / (data.length - 1)) * drawWidth;
    };
    
    const getY = (val: number) => {
        if (maxVal === minVal) return padding.top + drawHeight / 2;
        return height - padding.bottom - ((val - minVal) / (maxVal - minVal)) * drawHeight;
    };

    let linePath = "";
    let areaPath = "";

    if (data.length > 1) {
        const pointsArray = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
        linePath = `M ${pointsArray.join(" L ")}`;
        areaPath = `M ${getX(0)},${height - padding.bottom} L ${pointsArray.join(" L ")} L ${getX(data.length - 1)},${height - padding.bottom} Z`;
    } else if (data.length === 1) {
        const x = getX(0);
        const y = getY(data[0].value);
        linePath = `M ${x-20},${y} L ${x+20},${y}`;
    }

    let chartColor = '#94a3b8';
    if (metric === 'e1rm') chartColor = '#00dc82';
    else if (metric === 'volume') chartColor = '#3b82f6';

    const ySteps = 4;
    const yLabels = [];
    for (let i = 0; i <= ySteps; i++) {
        const fraction = i / ySteps;
        const val = minVal + (maxVal - minVal) * fraction;
        yLabels.push({ value: val, y: getY(val) });
    }

    return (
        <div ref={containerRef} className="w-full h-full">
            <svg width={width} height={height} className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {/* Grid Lines */}
                {yLabels.map((label, i) => (
                    <g key={i}>
                        <line 
                            x1={padding.left} 
                            y1={label.y} 
                            x2={width - padding.right} 
                            y2={label.y} 
                            stroke="#334155" 
                            strokeWidth="1" 
                            strokeDasharray="4 4" 
                            opacity="0.3"
                        />
                        <text 
                            x={padding.left - 10} 
                            y={label.y + 4} 
                            textAnchor="end" 
                            className="text-[10px] fill-gray-500 font-mono"
                        >
                            {label.value.toFixed(1)}
                        </text>
                    </g>
                ))}

                {/* Area */}
                {data.length > 1 && <path d={areaPath} fill="url(#chartGradient)" />}

                {/* Line */}
                <path 
                    d={linePath} 
                    fill="none" 
                    stroke={chartColor} 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />

                {/* Points */}
                {data.map((d, i) => {
                    const x = getX(i);
                    const y = getY(d.value);
                    const dateStr = new Date(d.rawDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    // Logic to avoid overlapping labels: always show first/last, others only if spaced enough
                    const showLabel = i === 0 || i === data.length - 1 || data.length < 8;
                    
                    return (
                        <g key={i} className="group">
                            <circle cx={x} cy={y} r="6" fill="#131316" stroke={chartColor} strokeWidth="3" />
                            
                            <g className={`transition-opacity duration-200 pointer-events-none ${showLabel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <text x={x} y={y - 15} textAnchor="middle" className="text-xs fill-white font-bold font-mono drop-shadow-md">
                                    {d.value.toFixed(1)}
                                </text>
                                <text x={x} y={y + 20} textAnchor="middle" className="text-[10px] fill-gray-400 font-mono">
                                    {dateStr}
                                </text>
                            </g>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};