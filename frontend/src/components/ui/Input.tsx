import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full group">
        {label && (
          <label className="block text-sm font-semibold text-foreground mb-2 transition-colors duration-200 group-focus-within:text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 glass border border-border/50 rounded-xl
            text-foreground placeholder:text-muted-foreground/60
            focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/50 focus:shadow-glow
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300
            hover:border-border hover:shadow-soft
            ${error ? 'border-destructive/50 focus:ring-destructive/50 focus:border-destructive' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-destructive flex items-center gap-1.5 animate-in">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
