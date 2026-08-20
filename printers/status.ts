import { getCurrentPrinter, isPrinterConnected } from './api';

export const getPrinterConnectionStatus = async (): Promise<{
  connected: boolean;
  printer: ReturnType<typeof getCurrentPrinter>;
}> => {
  const printer = getCurrentPrinter();
  const connected = await isPrinterConnected();

  return {
    connected,
    printer,
  };
};
