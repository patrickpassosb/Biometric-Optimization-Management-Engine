import React from 'react';
import { ChatInterface } from './components/ChatInterface';

const App: React.FC = () => {
  const hasApiKey = !!process.env.API_KEY;

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-mono">
        <div className="max-w-md w-full border border-red-900 bg-red-950/20 p-8 rounded-lg text-center">
          <div className="text-red-500 text-4xl mb-4">⚠</div>
          <h1 className="text-xl font-bold mb-2">System Failure</h1>
          <p className="text-gray-400 text-sm mb-6">
            Critical component missing: <code className="bg-red-900/40 px-1 py-0.5 rounded">API_KEY</code>
          </p>
          <p className="text-xs text-gray-500">
            Please verify the environment configuration. The Biometric Engine cannot initialize without a valid Gemini API Key.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-biome-dark text-biome-text font-sans selection:bg-biome-accent selection:text-biome-dark flex flex-col">
      <main className="flex-1 w-full h-full">
        <ChatInterface />
      </main>
    </div>
  );
};

export default App;