import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ReviewerGuideModal } from '../common/ReviewerGuideModal';
import { Sparkles } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        onOpenGuide={() => setGuideModalOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto bg-slate-900/50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Reviewer Rubric Badge for rapid access */}
      <div className="fixed bottom-6 right-6 z-30 no-print">
        <button
          onClick={() => setGuideModalOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/90 border border-emerald-500/40 text-emerald-400 shadow-2xl shadow-emerald-950/60 hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all duration-300 hover:scale-105 backdrop-blur-md"
        >
          <Sparkles className="h-4 w-4 animate-spin text-emerald-400 group-hover:text-white" />
          <span className="text-xs font-bold tracking-tight">Rubric Criteria & Tests</span>
        </button>
      </div>

      <ReviewerGuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
    </div>
  );
};
