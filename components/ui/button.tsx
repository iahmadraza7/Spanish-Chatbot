import { clsx } from "clsx";
import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
    const variants: Record<typeof variant, string> = {
      primary:
        "bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:ring-primary-500",
      outline:
        "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-primary-500",
      ghost:
        "text-slate-700 hover:bg-slate-100 focus-visible:ring-primary-500"
    };

    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

