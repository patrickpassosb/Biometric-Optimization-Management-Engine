import React, { useState, useMemo, useRef, useEffect } from 'react';
import { getRawDatabase } from '../services/toolImpl';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

type MetricType = 'weight' | 'e1rm' | 'volume';

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricType>('e1rm');
  
  const db = getRawDatabase();
  const exercises = Object.keys(db).sort();

  // Process data for the chart
  const chartData = useMemo(() => {
    if (!selectedExercise || !db[selectedExercise]) return [];

    return db[selectedExercise]
      .map(log => {
        const e1rm = log.weight * (1 + log.reps / 30);
        const volume = log.weight * log.reps;
        return {
          date: new Date(log.date),
          rawDate: log.date,
          weight: log.weight,
          reps: log.reps,
          e1rm: e1rm,
          volume: volume,
          value: metric === 'weight' ? log.weight : metric === 'e1rm' ? e1rm : volume
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedExercise, metric, db]);

  if (exercises.length === 0) {
    return (
      <div className="fixed inset-0 bg-biome-dark z-[100] flex flex-col items-center justify-center p-8">
        <p className="text-biome-dim mb-4">No data available.</p>
        <button onClick={onClose} className="text-biome-accent hover:underline">Return to Chat</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-biome-dark z-[100] w-screen h-screen flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-biome-panel shrink-0">
        <h2 className="text-lg font-mono font-bold text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-biome-accent">
            <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
          </svg>
          ANALYTICS
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
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
          
          {/* Controls Overlay (Top) */}
          <div className="absolute top-4 left-4 right-4 z-10 flex flex-col sm:flex-row sm:items-center justify-between pointer-events-none">
             {/* Mobile Selector */}
             <div className="md:hidden pointer-events-auto mb-2 sm:mb-0 w-full sm:w-auto">
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
                 <div className="pointer-events-auto">
                    <h2 className="text-2xl font-bold text-white drop-shadow-md hidden md:block">{selectedExercise}</h2>
                 </div>
                 <div className="flex bg-gray-900/90 backdrop-blur rounded-lg p-1 border border-gray-800 shadow-xl pointer-events-auto self-start sm:self-auto">
                    <button 
                      onClick={() => setMetric('weight')}
                      className={`px-3 py-1 text-xs font-bold rounded ${metric === 'weight' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Weight
                    </button>
                    <button 
                      onClick={() => setMetric('e1rm')}
                      className={`px-3 py-1 text-xs font-bold rounded ${metric === 'e1rm' ? 'bg-biome-accent text-biome-dark' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      E1RM
                    </button>
                    <button 
                      onClick={() => setMetric('volume')}
                      className={`px-3 py-1 text-xs font-bold rounded ${metric === 'volume' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Volume
                    </button>
                 </div>
               </>
             )}
          </div>

          {/* Chart Canvas */}
          <div className="flex-1 w-full h-full bg-gradient-to-b from-gray-900/30 to-biome-dark relative">
             {!selectedExercise ? (
                <div className="flex h-full items-center justify-center text-gray-600 space-y-4 flex-col">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-32 h-32 opacity-20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  <p className="text-lg">Select an exercise to analyze performance metrics.</p>
                </div>
              ) : (
                <ResponsiveSVGChart data={chartData} metric={metric} />
              )}
          </div>

          {/* Stats Footer */}
          {selectedExercise && (
              <div className="absolute bottom-6 left-6 right-6 z-10 grid grid-cols-3 gap-4 max-w-2xl mx-auto pointer-events-none">
                <div className="pointer-events-auto shadow-2xl">
                    <StatCard label="Current Max" value={Math.max(...chartData.map(d => d.value)).toFixed(1)} unit={metric === 'volume' ? 'kg' : 'kg'} />
                </div>
                <div className="pointer-events-auto shadow-2xl">
                    <StatCard label="Initial" value={chartData[0]?.value.toFixed(1) || '0'} unit={metric === 'volume' ? 'kg' : 'kg'} />
                </div>
                <div className="pointer-events-auto shadow-2xl">
                    <StatCard 
                        label="Progress" 
                        value={chartData.length > 1 ? (((chartData[chartData.length-1].value - chartData[0].value) / chartData[0].value) * 100).toFixed(1) : '0'} 
                        unit="%" 
                        trend={true}
                    />
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, unit: string, trend?: boolean }> = ({ label, value, unit, trend }) => (
  <div className="bg-gray-900/90 backdrop-blur border border-gray-800 p-3 rounded-lg">
    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{label}</div>
    <div className={`text-2xl font-mono font-bold ${trend && Number(value) > 0 ? 'text-biome-accent' : trend && Number(value) < 0 ? 'text-biome-warning' : 'text-white'}`}>
        {Number(value) > 0 && trend ? '+' : ''}{value} <span className="text-sm text-gray-600 font-sans font-normal">{unit}</span>
    </div>
  </div>
);

// --- SVG Chart Engine ---

const ResponsiveSVGChart: React.FC<{ data: any[], metric: MetricType }> = ({ data, metric }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        
        const resizeObserver = new ResizeObserver((entries) => {
            requestAnimationFrame(() => {
                if (!entries || entries.length === 0) return;
                const { width, height } = entries[0].contentRect;
                setDimensions({ width, height });
            });
        });
        
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    if (data.length < 2) {
        return <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">Need at least 2 logs to chart progress.</div>;
    }

    // Don't render until we have dimensions
    if (dimensions.width === 0 || dimensions.height === 0) {
        return <div ref={containerRef} className="w-full h-full" />;
    }

    const { width, height } = dimensions;
    const padding = { top: 80, right: 40, bottom: 120, left: 60 };
    
    // Ensure we have drawing space
    const drawWidth = width - padding.left - padding.right;
    const drawHeight = height - padding.top - padding.bottom;

    if (drawWidth <= 0 || drawHeight <= 0) return <div ref={containerRef} className="w-full h-full" />;

    const values = data.map(d => d.value);
    const minVal = Math.min(...values) * 0.95;
    const maxVal = Math.max(...values) * 1.05;
    
    // Normalize coordinates
    const getX = (index: number) => padding.left + (index / (data.length - 1)) * drawWidth;
    const getY = (val: number) => height - padding.bottom - ((val - minVal) / (maxVal - minVal)) * drawHeight;

    const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(" ");
    
    // Fill Area
    const fillPath = `
        M ${getX(0)},${height - padding.bottom} 
        L ${points.replace(/ /g, " L ")} 
        L ${getX(data.length - 1)},${height - padding.bottom} 
        Z
    `;

    return (
        <div ref={containerRef} className="w-full h-full">
            <svg width={width} height={height} className="w-full h-full">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={metric === 'e1rm' ? '#00dc82' : metric === 'volume' ? '#3b82f6' : '#94a3b8'} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={metric === 'e1rm' ? '#00dc82' : metric === 'volume' ? '#3b82f6' : '#94a3b8'} stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {/* Grid Lines (Horizontal) */}
                {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                    const y = (height - padding.bottom) - tick * drawHeight;
                    const val = minVal + tick * (maxVal - minVal);
                    return (
                        <g key={tick}>
                            <line 
                                x1={padding.left} 
                                y1={y} 
                                x2={width - padding.right} 
                                y2={y} 
                                stroke="#334155" 
                                strokeWidth="1" 
                                strokeDasharray="4 4" 
                                opacity="0.5"
                            />
                            <text x={padding.left - 15} y={y + 5} textAnchor="end" className="text-xs fill-gray-500 font-mono">
                                {val.toFixed(0)}
                            </text>
                        </g>
                    );
                })}

                {/* Area Fill */}
                <path d={fillPath} fill="url(#chartGradient)" />

                {/* Main Line */}
                <path 
                    d={`M ${points.replace(/ /g, " L ")}`} 
                    fill="none" 
                    stroke={metric === 'e1rm' ? '#00dc82' : metric === 'volume' ? '#3b82f6' : '#e2e8f0'} 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="drop-shadow-xl"
                />

                {/* Data Points & Tooltips */}
                {data.map((d, i) => {
                    const x = getX(i);
                    const y = getY(d.value);
                    return (
                        <g key={i} className="group cursor-crosshair">
                            {/* Invisible hit area for easier hover */}
                            <circle cx={x} cy={y} r="20" fill="transparent" />
                            
                            <circle cx={x} cy={y} r="6" className="fill-biome-dark stroke-white stroke-2 transition-all group-hover:r-9 group-hover:stroke-biome-accent" />
                            
                            {/* Tooltip */}
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {/* Vertical Guideline */}
                                <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="white" strokeDasharray="2 2" opacity="0.2" />
                                
                                <rect x={x - 60} y={y - 80} width="120" height="60" rx="8" fill="#131316" stroke="#334155" strokeWidth="2" />
                                <text x={x} y={y - 55} textAnchor="middle" className="text-xs fill-gray-400 font-sans">{d.rawDate}</text>
                                <text x={x} y={y - 35} textAnchor="middle" className="text-lg fill-white font-bold font-mono">
                                    {d.value.toFixed(1)} {metric === 'volume' ? 'kg' : 'kg'}
                                </text>
                            </g>

                            {/* X-Axis Labels */}
                            <text x={x} y={height - padding.bottom + 20} textAnchor="middle" className="text-xs fill-gray-500 font-mono">
                                {data.length < 15 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length/8) === 0 
                                    ? new Date(d.rawDate).toLocaleDateString(undefined, {month:'numeric', day:'numeric'}) 
                                    : ''}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};