import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender } from '../types';
import { biomeService } from '../services/biomeService';
import { getRawDatabase, resetDatabase, logWorkoutImpl } from '../services/toolImpl';
import { AnalyticsDashboard } from './AnalyticsDashboard';

const CHAT_STORAGE_KEY = 'biome_chat_history_v2';

const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Simple Markdown Parser to avoid external dependencies
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    // Split by bold markers (**text**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <div className="whitespace-pre-wrap">
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={index} className="text-biome-accent font-bold">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </div>
    );
};

export const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [dbView, setDbView] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedChat = localStorage.getItem(CHAT_STORAGE_KEY);
    let initialMessages: Message[] = [];

    if (storedChat) {
      try {
        initialMessages = JSON.parse(storedChat);
      } catch (e) {
        console.error("Failed to parse chat history");
      }
    }

    if (initialMessages.length === 0) {
      initialMessages = [{
        id: 'init',
        sender: Sender.BIOME,
        text: "**System Online.**\n\nI am ready to analyze your performance data. Please provide your latest exercise log."
      }];
    }

    setMessages(initialMessages);
    
    if (initialMessages.length > 0) {
      biomeService.startNewSession(initialMessages);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
    
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userText = input;
    setInput('');
    setIsProcessing(true);

    const userMsg: Message = {
      id: generateId(),
      sender: Sender.USER,
      text: userText
    };
    setMessages(prev => [...prev, userMsg]);

    const responseMessages = await biomeService.sendMessage(userText, (toolName, args) => {
      // Optional: Tool callback logic
    });

    setMessages(prev => [...prev, ...responseMessages]);
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fillDemo = () => {
    setInput("I'm training legs today. My last log for **BulgarianSquat** (on 11/28/2025) was: 20KG RS 12 REPS LS 12 REPS - 20KG RS 12 REPS LS 12 REPS, with an RPE of 10. The note was: 'I relax when it gets hard, extreme fatigue'. Tell me what I should do today to safely achieve a new personal best.");
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
    setDbView(null);
    setImportError(null);
  };

  const handleClearHistory = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([{
      id: generateId(),
      sender: Sender.BIOME,
      text: "**System Rebooted.** Memory cleared."
    }]);
    biomeService.startNewSession([]);
    setShowSettings(false);
  };

  const handleFactoryReset = () => {
    if (window.confirm("Are you sure? This will delete all workout logs and chat history.")) {
      resetDatabase();
      localStorage.removeItem(CHAT_STORAGE_KEY);
      window.location.reload();
    }
  };

  const handleViewDb = () => {
    if (dbView) {
      setDbView(null);
    } else {
      const db = getRawDatabase();
      setDbView(JSON.stringify(db, null, 2));
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const csvData = event.target?.result as string;
            if (!csvData) return;

            const lines = csvData.split('\n');
            let successCount = 0;
            let failCount = 0;

            // Simple CSV parser: assume header row, assume columns: Date, Exercise, Weight, Reps, RPE, Notes
            // Or simpler: Exercise, Weight, Reps, RPE, Date
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(',');
                // Expect at least 4 parts
                if (parts.length < 4) {
                    failCount++;
                    continue;
                }

                // Try to map commonly expected formats. 
                // Format A: Exercise, Weight, Reps, RPE, Date, Notes
                const exercise_name = parts[0]?.trim();
                const weight = parseFloat(parts[1]);
                const reps = parseFloat(parts[2]);
                const rpe = parseFloat(parts[3]);
                let date = parts[4]?.trim();
                let notes = parts[5]?.trim() || "Imported via CSV";

                // Basic validation
                if (!exercise_name || isNaN(weight) || isNaN(reps)) {
                    failCount++;
                    continue;
                }

                if (!date || date.length < 5) {
                    date = new Date().toISOString().split('T')[0];
                }

                logWorkoutImpl({
                    exercise_name,
                    weight,
                    reps,
                    rpe: isNaN(rpe) ? 8 : rpe,
                    date,
                    notes
                });
                successCount++;
            }
            
            alert(`Import Complete!\nSuccessful: ${successCount}\nFailed: ${failCount}\n\nPlease refresh visualization.`);
            setShowSettings(false);

        } catch (err) {
            setImportError("Failed to parse CSV. Ensure format: Exercise, Weight, Reps, RPE, Date, Notes");
        }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-biome-panel border-x border-biome-panel shadow-2xl relative overflow-hidden">
      
      {showAnalytics && <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />}

      {showSettings && (
        <div className="absolute top-14 right-4 z-40 w-72 bg-biome-panel border border-gray-700 shadow-xl rounded-lg p-4">
            <h3 className="text-white font-bold mb-3 text-sm font-mono border-b border-gray-800 pb-2">DATA MANAGEMENT</h3>
            <div className="space-y-2">
                <button onClick={handleViewDb} className="w-full text-left text-xs text-gray-300 hover:text-white hover:bg-gray-800 p-2 rounded transition-colors flex items-center gap-2">
                    {dbView ? 'Hide Database' : 'Inspect Database'}
                </button>
                <button onClick={triggerFileUpload} className="w-full text-left text-xs text-biome-accent hover:text-white hover:bg-gray-800 p-2 rounded transition-colors flex items-center gap-2">
                    Import CSV Data
                    <span className="text-[9px] text-gray-500 ml-auto">(Ex, W, R, RPE, Date)</span>
                </button>
                <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleCsvImport}
                />
                <button onClick={handleClearHistory} className="w-full text-left text-xs text-gray-300 hover:text-white hover:bg-gray-800 p-2 rounded transition-colors flex items-center gap-2">
                    Clear Chat History
                </button>
                <button onClick={handleFactoryReset} className="w-full text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 p-2 rounded transition-colors flex items-center gap-2 border border-transparent hover:border-red-900">
                    Factory Reset (Wipe All)
                </button>
            </div>
            {importError && (
                <div className="mt-2 text-[10px] text-red-400 p-2 bg-red-900/20 rounded">
                    {importError}
                </div>
            )}
            {dbView && (
                <div className="mt-3 bg-black/50 p-2 rounded border border-gray-800">
                    <pre className="text-[10px] text-green-400 overflow-x-auto max-h-60">
                        {dbView}
                    </pre>
                </div>
            )}
        </div>
      )}

      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-biome-dark/90 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-biome-accent flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-biome-dark">
                    <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z" clipRule="evenodd" transform="rotate(-90 12 12)" />
                </svg>
            </div>
            <div>
                <h1 className="text-lg font-bold font-mono tracking-tight text-white">BIOME <span className="text-biome-accent text-xs">v2.5</span></h1>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-biome-accent animate-pulse"></span>
                    <span className="text-xs text-biome-dim font-mono">SYSTEM ACTIVE</span>
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={fillDemo} className="hidden sm:block text-xs text-biome-dim hover:text-biome-accent font-mono border border-gray-800 px-2 py-1 rounded transition-colors">
                Load Demo Prompt
            </button>
            <button onClick={() => setShowAnalytics(true)} className="text-xs font-mono bg-gray-900 border border-gray-700 text-biome-accent hover:bg-gray-800 px-3 py-1 rounded transition-colors flex items-center gap-1">
                Visualize
            </button>
            <button onClick={toggleSettings} className={`text-xs font-mono border border-gray-800 px-2 py-1 rounded transition-colors flex items-center gap-1 ${showSettings ? 'bg-gray-800 text-white' : 'text-biome-dim hover:text-white'}`}>
                Database
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" ref={scrollRef}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${msg.sender === Sender.SYSTEM ? 'w-full' : ''}`}>
              
              <div className={`text-xs font-mono mb-1 flex items-center gap-2 ${msg.sender === Sender.USER ? 'justify-end text-biome-dim' : 'text-biome-accent'}`}>
                {msg.sender === Sender.BIOME && <span>&gt; BIOME.AI</span>}
                {msg.sender === Sender.USER && <span>USER</span>}
                {msg.sender === Sender.SYSTEM && <span className="text-yellow-500"># SYSTEM_TOOL</span>}
              </div>

              {msg.sender === Sender.SYSTEM ? (
                 <div className="bg-gray-900/50 border border-gray-800 rounded p-3 text-xs font-mono text-gray-400">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-yellow-500/80">Executing: {msg.toolCall?.name}</span>
                        <span className="text-[10px] opacity-50">{msg.id.slice(0,4)}</span>
                    </div>
                    <div className="opacity-70 truncate">Input: {JSON.stringify(msg.toolCall?.args)}</div>
                 </div>
              ) : (
                <div 
                    className={`p-4 rounded-lg shadow-sm leading-relaxed text-sm ${
                        msg.sender === Sender.USER 
                        ? 'bg-gray-800 text-white rounded-br-none' 
                        : 'bg-biome-dark border border-gray-800 text-gray-200 rounded-bl-none'
                    }`}
                >
                    <SimpleMarkdown text={msg.text} />
                </div>
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
            <div className="flex justify-start">
                <div className="bg-biome-dark border border-gray-800 p-3 rounded-lg rounded-bl-none flex items-center gap-2">
                    <div className="w-2 h-2 bg-biome-accent rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-biome-accent rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-biome-accent rounded-full animate-bounce delay-150"></div>
                </div>
            </div>
        )}
      </div>

      <div className="p-4 bg-biome-dark border-t border-gray-800">
        <div className="relative">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Log your workout or ask for a protocol..."
                className="w-full bg-biome-panel text-white placeholder-gray-600 rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:ring-1 focus:ring-biome-accent resize-none h-14 font-sans text-sm"
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-biome-accent hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-biome-accent text-biome-dark rounded-md flex items-center justify-center transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
            </button>
        </div>
        <div className="mt-2 flex justify-center">
            <span className="text-[10px] text-biome-dim font-mono">POWERED BY GEMINI 2.5 PRO | BIOME METRICS ENGINE</span>
        </div>
      </div>
    </div>
  );
};