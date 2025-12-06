import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender } from '../types';
import { biomeService } from '../services/biomeService';
import ReactMarkdown from 'react-markdown';

export const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: Sender.BIOME,
      text: "**System Online.**\n\nI am ready to analyze your performance data. Please provide your latest exercise log."
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      // Currently handled by the isProcessing state and the SYSTEM messages returned
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

  // Pre-fill for demo purposes if empty
  const fillDemo = () => {
    setInput("I'm training legs today. My last log for **BulgarianSquat** (on 11/28/2025) was: 20KG RS 12 REPS LS 12 REPS - 20KG RS 12 REPS LS 12 REPS, with an RPE of 10. The note was: 'I relax when it gets hard, extreme fatigue'. Tell me what I should do today to safely achieve a new personal best.");
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-biome-panel border-x border-biome-panel shadow-2xl">
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
        <button onClick={fillDemo} className="text-xs text-biome-dim hover:text-biome-accent font-mono border border-gray-800 px-2 py-1 rounded transition-colors">
            Load Demo Data
        </button>
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