import {
  PrinterActionName,
  PrinterActionResult,
  PrinterDevice,
  PrinterProvider,
} from './types';
import { printerProviderManager } from './provider-manager';
import { debugLog } from './logger';

let activeProvider: PrinterProvider | null = null;
let activeDevice: PrinterDevice | null = null;

export const printerCore = {
  getSelectedDevice(): PrinterDevice | null {
    return activeDevice;
  },

  getSelectedProvider(): PrinterProvider | null {
    return activeProvider;
  },

  async discoverDevices(): Promise<
    Record<'bluetooth' | 'wifi', PrinterDevice[]>
  > {
    debugLog('printerCore.discoverDevices', 'Starting discovery');
    const result = await printerProviderManager.discoverAll();
    debugLog('printerCore.discoverDevices', 'Discovery result', {
      bluetoothCount: result.bluetooth.length,
      wifiCount: result.wifi.length,
      bluetooth: result.bluetooth,
      wifi: result.wifi,
    });
    return result;
  },

  async connectToDevice(device: PrinterDevice): Promise<PrinterActionResult> {
    debugLog('printerCore.connectToDevice', 'Attempting connection', {
      device,
      transport: device.transport,
    });

    try {
      const provider = printerProviderManager.getProvider(device.transport);
      const connectedDevice = await provider.connect(device);
      activeProvider = provider;
      activeDevice = connectedDevice;

      debugLog('printerCore.connectToDevice', 'Connection succeeded', {
        connectedDevice,
        provider: provider.transport,
      });

      return {
        ok: true,
        action: 'Check status',
        message: `Connected to ${connectedDevice.name} (${connectedDevice.transport}).`,
        device: connectedDevice,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect to printer.';

      debugLog('printerCore.connectToDevice', 'Connection failed', {
        device,
        error: message,
      });

      return {
        ok: false,
        action: 'Check status',
        message,
        device: null,
      };
    }
  },

  async disconnectSelected(): Promise<PrinterActionResult> {
    if (!activeProvider) {
      return {
        ok: false,
        action: 'Check status',
        message: 'No printer is currently connected.',
        device: null,
      };
    }

    try {
      await activeProvider.disconnect();
      activeProvider = null;
      activeDevice = null;

      return {
        ok: true,
        action: 'Check status',
        message: 'Printer disconnected successfully.',
        device: null,
      };
    } catch (error) {
      return {
        ok: false,
        action: 'Check status',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to disconnect printer.',
        device: null,
      };
    }
  },

  async executeAction(
    action: PrinterActionName,
    payload?: {
      text?: string;
      imageUri?: string;
      rows?: string[][];
      data?: string;
      type?: string;
    },
  ): Promise<PrinterActionResult> {
    if (!activeProvider || !activeDevice) {
      return {
        ok: false,
        action,
        message: 'No printer is connected. Select a device first.',
        device: null,
      };
    }

    try {
      switch (action) {
        case 'Check status': {
          const status = await activeProvider.getStatus();
          return {
            ok: true,
            action,
            message: `Online: ${status.online ? 'yes' : 'no'} | Paper out: ${
              status.paperOut ? 'yes' : 'no'
            }`,
            device: activeDevice,
          };
        }
        case 'Print text': {
          if (!payload?.text) {
            throw new Error('Text payload is required.');
          }

          await activeProvider.printText(payload.text);
          return {
            ok: true,
            action,
            message: 'Text sent to printer successfully.',
            device: activeDevice,
          };
        }
        case 'Print image': {
          if (!payload?.imageUri) {
            throw new Error('Image URI is required.');
          }

          await activeProvider.printImage(payload.imageUri);
          return {
            ok: true,
            action,
            message: 'Image sent to printer successfully.',
            device: activeDevice,
          };
        }
        case 'Print table': {
          if (!payload?.rows) {
            throw new Error('Table rows are required.');
          }

          await activeProvider.printTable(payload.rows);
          return {
            ok: true,
            action,
            message: 'Table content sent to printer successfully.',
            device: activeDevice,
          };
        }
        case 'Print QR code': {
          if (!payload?.data) {
            throw new Error('QR data is required.');
          }

          await activeProvider.printQrCode(payload.data);
          return {
            ok: true,
            action,
            message: 'QR code sent to printer successfully.',
            device: activeDevice,
          };
        }
        case 'Print barcode': {
          if (!payload?.data) {
            throw new Error('Barcode data is required.');
          }

          await activeProvider.printBarcode(
            payload.data,
            payload.type ?? 'CODE128',
          );
          return {
            ok: true,
            action,
            message: 'Barcode sent to printer successfully.',
            device: activeDevice,
          };
        }
        case 'Cut paper': {
          await activeProvider.cutPaper();
          return {
            ok: true,
            action,
            message: 'Cut paper command sent successfully.',
            device: activeDevice,
          };
        }
        default:
          return {
            ok: false,
            action,
            message: 'Unsupported printer action.',
            device: activeDevice,
          };
      }
    } catch (error) {
      return {
        ok: false,
        action,
        message:
          error instanceof Error ? error.message : 'Printer action failed.',
        device: activeDevice,
      };
    }
  },
};
