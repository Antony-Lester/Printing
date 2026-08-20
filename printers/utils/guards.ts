export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const hasPrinterAddress = (
  value: unknown,
): value is { address: string } =>
  typeof value === 'object' &&
  value !== null &&
  'address' in value &&
  typeof (value as { address?: unknown }).address === 'string';
