import { ThermalPrinterDevice } from 'react-native-thermal-pos-printer';
import { getCurrentPrinter } from './api';

export const printText = async (text: string): Promise<void> => {
  const printer = getCurrentPrinter();
  if (!printer) {
    throw new Error('No printer connected.');
  }

  await printer.printText(text);
};

export const printImage = async (imageUri: string): Promise<void> => {
  const printer = getCurrentPrinter();
  if (!printer) {
    throw new Error('No printer connected.');
  }

  await printer.printImage(imageUri);
};

export const printTable = async (rows: string[][]): Promise<void> => {
  const printer = getCurrentPrinter();
  if (!printer) {
    throw new Error('No printer connected.');
  }

  const text = rows.map(row => row.join('\t')).join('\n');
  await printer.printText(text);
};

export const printQrCode = async (data: string): Promise<void> => {
  const printer = getCurrentPrinter();
  if (!printer) {
    throw new Error('No printer connected.');
  }

  await printer.printQRCode(data);
};

export const printBarcode = async (
  data: string,
  type: 'CODE128' | 'CODE39' | 'EAN13' = 'CODE128',
): Promise<void> => {
  const printer = getCurrentPrinter();
  if (!printer) {
    throw new Error('No printer connected.');
  }

  await printer.printBarcode(data, type as any);
};

export const cutPaper = async (): Promise<void> => {
  const printer = getCurrentPrinter();
  if (!printer) {
    throw new Error('No printer connected.');
  }

  await printer.cutPaper();
};

export const getConnectedPrinter = (): ThermalPrinterDevice | null => {
  return getCurrentPrinter();
};
