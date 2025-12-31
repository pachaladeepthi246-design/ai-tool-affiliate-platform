import React from 'react';
import { Button } from '@/components/ui/button';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
}

export default function AccessibleButton({
  children,
  ariaLabel,
  loading,
  disabled,
  ...props
}: AccessibleButtonProps) {
  return (
    <Button
      {...props}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      disabled={disabled || loading}
    >
      {loading ? 'Loading...' : children}
    </Button>
  );
}
