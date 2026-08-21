import {
  ReactNativePosPrinter,
  ThermalPrinterDevice,
} from 'react-native-thermal-pos-printer';
import { PrinterDevice, PrinterProvider, PrinterStatus } from '../types';
import { getDevices, toProcessedPrinterDevice } from '../devices';

export class BluetoothPrinterProvider implements PrinterProvider {
  transport = 'bluetooth' as const;

  private currentDevice: ThermalPrinterDevice | null = null;

  async discover(): Promise<PrinterDevice[]> {
    return getDevices();
  }

  async connect(device: PrinterDevice): Promise<PrinterDevice> {
    const connected = await ReactNativePosPrinter.connectPrinter(
      device.address,
    );
    this.currentDevice = connected;
    return toProcessedPrinterDevice(connected);
  }

  async disconnect(): Promise<void> {
    await ReactNativePosPrinter.disconnectPrinter();
    this.currentDevice = null;
  }

  async isConnected(): Promise<boolean> {
    return this.currentDevice ? this.currentDevice.isConnected() : false;
  }

  async getStatus(): Promise<PrinterStatus> {
    if (!this.currentDevice) {
      throw new Error('No Bluetooth printer connected.');
    }

    return this.currentDevice.getStatus();
  }

  async printText(text: string): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Bluetooth printer connected.');
    }

    await this.currentDevice.printText(text);
  }

  async printImage(imageUri: string): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Bluetooth printer connected.');
    }

    await this.currentDevice.printImage(imageUri);
  }

  async printTable(rows: string[][]): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Bluetooth printer connected.');
    }

    const text = rows.map(row => row.join('\t')).join('\n');
    await this.currentDevice.printText(text);
  }

  async printQrCode(data: string): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Bluetooth printer connected.');
    }

    await this.currentDevice.printQRCode(data);
  }

  async printBarcode(data: string, type = 'CODE128'): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Bluetooth printer connected.');
    }

    await this.currentDevice.printBarcode(data, type as any);
  }

  async cutPaper(): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Bluetooth printer connected.');
    }

    await this.currentDevice.cutPaper();
  }
}
