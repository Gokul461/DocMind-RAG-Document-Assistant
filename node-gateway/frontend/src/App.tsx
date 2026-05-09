import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UploadPanel } from './components/Upload/UploadPanel';
import { DocumentList } from './components/Documents/DocumentList';
import { ChatPanel } from './components/Chat/ChatPanel';
import { BrainCircuit } from 'lucide-react';

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <div className="h-screen flex flex-col bg-gray-950 font-sans">
        
        {/* Header */}
        <header className="h-14 flex items-center gap-3 px-6 bg-gray-900 border-b border-gray-800 shrink-0">
          <BrainCircuit className="w-6 h-6 text-indigo-400" />

          <span className="text-lg font-bold text-white tracking-tight">
            DocMind
          </span>

          <span className="text-xs text-gray-500 font-normal ml-1">
            RAG Document Assistant
          </span>

          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

            <span className="text-xs text-gray-500">
              AI service connected
            </span>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar */}
          <aside className="w-80 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
            <UploadPanel />

            <div className="border-t border-gray-800" />

            <DocumentList />
          </aside>

          {/* Chat Section */}
          <main className="flex-1 flex flex-col overflow-hidden bg-gray-950">
            <ChatPanel />
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}