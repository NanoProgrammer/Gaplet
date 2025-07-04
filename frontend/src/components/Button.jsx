'use client';
import React from 'react';



export default function GlowButton({
  children,
  variant = 'primary',
  onClick,
}) {
  const base =
    'px-6 py-2 rounded-md text-sm font-semibold transition-all duration-300 ease-in-out transform';

  const variants = {
    primary: `
      bg-[var(--primary)] text-white
      hover:shadow-[0_0_4px_var(--ring)]
      hover:brightness-[1.02]
      hover:scale-[1.01]
    `,
    secondary: `
      bg-[var(--secondary)] text-[var(--primary)]
      hover:bg-[var(--secondary-hover)]/55 hover:shadow-[0_0_2px_var(--secondary-hover)]
      hover:brightness-[1.01] hover:scale-[1.01]
    `,
    ghost: `
      border border-[var(--primary)] text-[var(--primary)] bg-transparent
      hover:bg-[var(--primary)] hover:text-white
      hover:shadow-[0_0_3px_var(--primary)]
      hover:scale-[1.01] hover:brightness-[1.01]
    `,
    danger: `
      bg-[var(--danger)] text-white
      hover:bg-[var(--destructive)]
      hover:shadow-[0_0_4px_var(--danger)]
      hover:scale-[1.01]
    `,
  };

  return (
    <button onClick={onClick} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}
