import type { ReactNode } from 'react';

interface Props {
  title: string;
  onBack: () => void;
  children: ReactNode;
}

const SubViewLayout = ({ title, onBack, children }: Props) => {
  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-40 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex-none flex items-center h-14 px-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 z-50 pt-safe-top">
        <button
          onClick={onBack}
          className="w-12 h-12 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
        >
          <i className="fas fa-chevron-left text-lg"></i>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold text-slate-900 dark:text-slate-50 pr-12 truncate">
          {title}
        </h1>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="min-h-full pb-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SubViewLayout;
