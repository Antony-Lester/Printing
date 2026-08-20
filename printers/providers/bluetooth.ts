import { PermissionsAndroid, Platform } from 'react-native';
import {
  ReactNativePosPrinter,
  ThermalPrinterDevice,
} from 'react-native-thermal-pos-printer';
import { PrinterDevice, PrinterProvider, PrinterStatus } from '../types';

const toPrinterDevice = (device: ThermalPrinterDevice): PrinterDevice => ({
  id: device.getAddress() || device.getName() || 'bluetooth-device',
  name: device.getName() || 'Unknown Bluetooth printer',
  address: device.getAddress() || 'unknown-address',
  transport: 'bluetooth',
  connected: device.isConnected(),
});

const ensureBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const requiredPermissions =
    Number(Platform.Version) >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const results = await PermissionsAndroid.requestMultiple(requiredPermissions);
  return Object.values(results).every(
    result => result === PermissionsAndroid.RESULTS.GRANTED,
  );
};

export class BluetoothPrinterProvider implements PrinterProvider {
  transport = 'bluetooth' as const;

  private currentDevice: ThermalPrinterDevice | null = null;

  async discover(): Promise<PrinterDevice[]> {
    const hasPermission = await ensureBluetoothPermissions();
    if (!hasPermission) {
      return [];
    }

    const devices = await ReactNativePosPrinter.getDeviceList();
    return devices.map(toPrinterDevice);
  }

  async connect(device: PrinterDevice): Promise<PrinterDevice> {
    const connected = await ReactNativePosPrinter.connectPrinter(
      device.address,
    );
    this.currentDevice = connected;
    return toPrinterDevice(connected);
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
