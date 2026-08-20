import {
  ReactNativePosPrinter,
  ThermalPrinterDevice,
  type ConnectionOptions,
} from 'react-native-thermal-pos-printer';

export const connectPrinter = async (
  address: string,
  options?: ConnectionOptions,
): Promise<ThermalPrinterDevice> => {
  return ReactNativePosPrinter.connectPrinter(address, options);
};

export const disconnectPrinter = async (): Promise<void> => {
  await ReactNativePosPrinter.disconnectPrinter();
};

export const getCurrentPrinter = (): ThermalPrinterDevice | null => {
  return ReactNativePosPrinter.getCurrentDevice();
};

export const isPrinterConnected = async (): Promise<boolean> => {
  return ReactNativePosPrinter.isConnected();
};

export const ensurePrinterConnection = async (
  address: string,
  options?: ConnectionOptions,
): Promise<ThermalPrinterDevice> => {
  const currentPrinter = getCurrentPrinter();

  if (currentPrinter && currentPrinter.getAddress() === address) {
    const connected = await isPrinterConnected();
    if (connected) {
      return currentPrinter;
    }
  }

  return connectPrinter(address, options);
};
