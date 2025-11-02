import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={`
        bg-card border border-border rounded-lg p-4 shadow-sm
        ${hover ? 'transition-all duration-200 hover:shadow-md hover:border-primary/50' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
