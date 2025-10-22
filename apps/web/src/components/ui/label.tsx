import { forwardRef } from "react";
import type { LabelHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("block text-sm font-medium text-foreground/80 mb-1", className)}
    {...props}
  />
));
Label.displayName = "Label";
