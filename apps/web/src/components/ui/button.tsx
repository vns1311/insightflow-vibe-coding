import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", type = "button", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";
    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default: "bg-primary text-primary-foreground shadow-subtle hover:bg-primary/90",
      secondary: "border border-border bg-background/90 text-foreground shadow-subtle hover:bg-accent",
      ghost: "text-foreground hover:bg-accent/60",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, "px-4 py-2", variants[variant], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
