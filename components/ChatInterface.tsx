import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender } from '../types';
import { biomeService } from '../services/biomeService';
import { getRawDatabase, resetDatabase } from '../services/toolImpl';
import ReactMarkdown from 'react-markdown';

const CHAT_STORAGE_KEY = 'biome_chat_history_v2';

export const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dbView, setDbView] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize from Local Storage on Mount
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
    
    // Resume Biome Service context if we have history
    if (initialMessages.length > 0) {
      biomeService.startNewSession(initialMessages);
    }
  }, []);

  // Persist Messages on Change
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

    // Add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: Sender.USER,
      text: userText
    };
    setMessages(prev => [...prev, userMsg]);

    // Call Service
    const responseMessages = await biomeService.sendMessage(userText, (toolName, args) => {
      // Optional: Add a temporary loading state or specific tool indicator if needed
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
  };

  const handleClearHistory = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([{
      id: crypto.randomUUID(),
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

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-biome-panel border-x border-biome-panel shadow-2xl relative">
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-14 right-4 z-50 w-72 bg-biome-panel border border-gray-700 shadow-xl rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-white font-bold mb-3 text-sm font-mono border-b border-gray-800 pb-2">DATA MANAGEMENT</h3>
            <div className="space-y-2">
                <button onClick={handleViewDb} className="w-full text-left text-xs text-gray-300 hover:text-white hover:bg-gray-800 p-2 rounded transition-colors flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-biome-accent">
                        <path fillRule="evenodd" d="M1 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1V4zm12 4a3 3 0 11-6 0 3 3 0 016 0zM4 9a1 1 0 100-2 1 1 0 000 2zm13-1a1 1 0 11-2 0 1 1 0 012 0zM1.75 14.5a.75.75 0 000 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 00-1.5 0v.784a6.658 6.658 0 01-1.658.905A36.727 36.727 0 011.75 14.5z" clipRule="evenodd" />
                    </svg>
                    {dbView ? 'Hide Database' : 'Inspect Database'}
                </button>
                <button onClick={handleClearHistory} className="w-full text-left text-xs text-gray-300 hover:text-white hover:bg-gray-800 p-2 rounded transition-colors flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-500">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                    Clear Chat History
                </button>
                <button onClick={handleFactoryReset} className="w-full text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 p-2 rounded transition-colors flex items-center gap-2 border border-transparent hover:border-red-900">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M13.5 4.938a7 7 0 11-9.006 1.737c.2-.255.603-.215.832.04a7 7 0 0111 0c.23.255.632.294.832.04a7 7 0 00-3.658-1.817zM10 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Factory Reset (Wipe All)
                </button>
            </div>
            {dbView && (
                <div className="mt-3 bg-black/50 p-2 rounded border border-gray-800">
                    <pre className="text-[10px] text-green-400 overflow-x-auto max-h-60 scrollbar-thin">
                        {dbView}
                    </pre>
                </div>
            )}
        </div>
      )}

      {/* Header */}
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
            <button onClick={fillDemo} className="text-xs text-biome-dim hover:text-biome-accent font-mono border border-gray-800 px-2 py-1 rounded transition-colors">
                Load Demo Prompt
            </button>
            <button onClick={toggleSettings} className={`text-xs font-mono border border-gray-800 px-2 py-1 rounded transition-colors flex items-center gap-1 ${showSettings ? 'bg-gray-800 text-white' : 'text-biome-dim hover:text-white'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h9.5A2.25 2.25 0 0117 4.25v11.5A2.25 2.25 0 0114.75 18h-9.5A2.25 2.25 0 013 15.75V4.25zM6 13a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0-4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm0-4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Database
            </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" ref={scrollRef}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${msg.sender === Sender.SYSTEM ? 'w-full' : ''}`}>
              
              {/* Message Header */}
              <div className={`text-xs font-mono mb-1 flex items-center gap-2 ${msg.sender === Sender.USER ? 'justify-end text-biome-dim' : 'text-biome-accent'}`}>
                {msg.sender === Sender.BIOME && <span>⧖ BIOME.AI</span>}
                {msg.sender === Sender.USER && <span>USER</span>}
                {msg.sender === Sender.SYSTEM && <span className="text-yellow-500">⚡ SYSTEM_TOOL</span>}
              </div>

              {/* Message Bubble */}
              {msg.sender === Sender.SYSTEM ? (
                 <div className="bg-gray-900/50 border border-gray-800 rounded p-3 text-xs font-mono text-gray-400">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-yellow-500/80">Executing: {msg.toolCall?.name}</span>
                        <span className="text-[10px] opacity-50">{msg.id.slice(0,4)}</span>
                    </div>
                    {/* Only show args if technical, otherwise keep clean */}
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
                    <ReactMarkdown 
                        components={{
                            strong: ({node, ...props}) => <span className="font-bold text-biome-accent" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="pl-1" {...props} />
                        }}
                    >
                        {msg.text}
                    </ReactMarkdown>
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

      {/* Input Area */}
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
            <span className="text-[10px] text-biome-dim font-mono">POWERED BY GEMINI 2.5 PRO • BIOME METRICS ENGINE</span>
        </div>
      </div>
    </div>
  );
};