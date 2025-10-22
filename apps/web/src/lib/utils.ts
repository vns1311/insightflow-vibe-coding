import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function formatRelative(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (Math.abs(days) < 1) {
    return "Today";
  }
  if (days === 1) return "Yesterday";
  if (days > 1) return `${days} days ago`;
  return date.toLocaleString();
}
