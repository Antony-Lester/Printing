const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const debugLog = (
  scope: string,
  message: string,
  details?: Record<string, unknown>,
): void => {
  if (details) {
    console.log(`[${scope}] ${message}`, safeStringify(details));
    return;
  }

  console.log(`[${scope}] ${message}`);
};
