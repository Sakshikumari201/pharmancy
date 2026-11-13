import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md',
  fullHeight = false
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-slate-400 ${
        fullHeight ? 'min-h-[400px]' : ''
      }`}
    >
      <Loader2 className={`${sizeMap[size]} animate-spin text-emerald-500`} />
      {message && <p className="mt-3 text-sm font-medium animate-pulse">{message}</p>}
    </div>
  );
};
