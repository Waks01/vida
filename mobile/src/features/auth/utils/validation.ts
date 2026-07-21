export interface ValidationErrors {
  email?: string;
  password?: string;
  code?: string;
  pin?: string;
}

export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email";
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Password is required";
  if (trimmed.length < 8) return "Password must be at least 8 characters";
  if (trimmed.length > 128) return "Password must be under 128 characters";
  return undefined;
}

export function validateOtpCode(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Code is required";
  if (!/^\d{6}$/.test(trimmed)) return "Enter the 6-digit code";
  return undefined;
}

export function validatePin(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "PIN is required";
  if (trimmed.length < 4) return "PIN must be at least 4 digits";
  if (trimmed.length > 6) return "PIN must be at most 6 digits";
  if (!/^\d+$/.test(trimmed)) return "PIN must contain only digits";
  return undefined;
}

export function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function sanitizePin(value: string): string {
  return value.trim();
}

export function sanitizePassword(value: string): string {
  return value.trim();
}
