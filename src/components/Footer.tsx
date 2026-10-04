import React from 'react';

interface FooterProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export const Footer: React.FC<FooterProps> = ({ className = '', variant = 'light' }) => {
  const isDark = variant === 'dark';

  return (
    <footer
      className={`print:hidden py-3 px-4 text-center transition-colors select-none ${
        isDark
          ? 'bg-slate-950/80 border-t border-slate-800/80 text-slate-400'
          : 'bg-white/60 border-t border-slate-200/80 text-slate-500'
      } ${className}`}
      data-testid="app-footer"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-xs">
        <div className="text-[11px] text-slate-400">
          Vetgo • Gestão Veterinária & Atendimento Volante
        </div>
        <div className="text-[11px] font-medium tracking-wide">
          Powered By <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>NCodes Technologies</strong>
        </div>
      </div>
    </footer>
  );
};
