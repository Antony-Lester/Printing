export const serializePrinterDevice = (
  value: unknown,
): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
};

export const formatPrinterError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown printer error.';
};
