import React, { useState } from 'react';

interface AppLogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  badge?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  showText = true,
  variant = 'dark',
  size = 'md',
  badge
}) => {
  const [imgError, setImgError] = useState(false);

  // Escala balanceada de tamanhos para a imagem aparecer nítida e com proporção ideal sem exigir scroll
  const imgSizeClasses = {
    sm: 'h-8 max-w-[140px]',
    md: 'h-11 max-w-[180px]',
    lg: 'h-20 sm:h-24 max-w-[240px]',
    xl: 'h-24 sm:h-28 max-w-[280px]'
  };

  const textSizes = {
    sm: { title: 'text-lg', subtitle: 'text-[9px]' },
    md: { title: 'text-xl', subtitle: 'text-[10px]' },
    lg: { title: 'text-2xl', subtitle: 'text-xs' },
    xl: { title: 'text-3xl', subtitle: 'text-sm' }
  };

  // Se o arquivo logo.png estiver presente em public/, renderiza a imagem com tamanho destacado
  if (!imgError) {
    return (
      <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
        <img
          src="/logo.png"
          alt="Vetgo Logo"
          className={`${imgSizeClasses[size]} w-auto object-contain drop-shadow-sm transition-transform duration-200`}
          onError={() => setImgError(true)}
        />
        {badge && (
          <span className="text-[10px] uppercase font-black bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs tracking-wider shrink-0 self-center">
            {badge}
          </span>
        )}
      </div>
    );
  }

  // Fallback visual caso a imagem não possa ser carregada
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-600/20">
        V
      </div>
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span
              className={`${textSizes[size].title} font-black tracking-tight leading-none ${
                variant === 'light' ? 'text-white' : 'text-slate-900'
              }`}
            >
              Vet<span className="text-emerald-600">go</span>
            </span>
            {badge && (
              <span className="text-[10px] uppercase font-extrabold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                {badge}
              </span>
            )}
          </div>
          <span
            className={`${textSizes[size].subtitle} font-medium leading-tight mt-0.5 ${
              variant === 'light' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Veterinária onde você precisa
          </span>
        </div>
      )}
    </div>
  );
};
