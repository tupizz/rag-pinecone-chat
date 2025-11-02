import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none relative overflow-hidden group';

  const variants = {
    primary: 'bg-gradient-to-r from-[hsl(262,83%,58%)] to-[hsl(215,90%,60%)] text-white shadow-soft hover:shadow-glow hover:scale-105 active:scale-100',
    secondary: 'glass border border-border/50 text-foreground shadow-soft hover:shadow-lg hover:border-border hover:scale-105 active:scale-100',
    ghost: 'hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-100',
    destructive: 'bg-destructive text-destructive-foreground shadow-soft hover:shadow-lg hover:brightness-110 hover:scale-105 active:scale-100',
  };

  const sizes = {
    sm: 'h-9 px-4 text-sm rounded-lg',
    md: 'h-11 px-6 text-base',
    lg: 'h-14 px-8 text-lg rounded-2xl',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {variant === 'primary' && (
        <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      <span className="relative flex items-center justify-center gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </span>
    </button>
  );
}
