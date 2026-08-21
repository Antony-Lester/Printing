import { PermissionsAndroid, Platform } from 'react-native';
import {
  ReactNativePosPrinter,
  ThermalPrinterDevice,
} from 'react-native-thermal-pos-printer';
import { PrinterDevice } from './types';
import { debugLog } from './logger';

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

export const processDevices = (
  devices: ThermalPrinterDevice[],
): PrinterDevice[] => {
  const mappedDevices = devices.map(toPrinterDevice);
  const filteredDevices = mappedDevices.filter(device =>
    !device.name.toUpperCase().startsWith('AX'),
  );

  debugLog('devices.processDevices', 'Processed Bluetooth devices', {
    rawCount: mappedDevices.length,
    filteredCount: filteredDevices.length,
    rawDeviceNames: mappedDevices.map(device => device.name),
    filteredDevices,
  });

  return filteredDevices;
};

export const getDevices = async (): Promise<PrinterDevice[]> => {
  try {
    const hasPermissions = await ensureBluetoothPermissions();

    if (!hasPermissions) {
      debugLog(
        'devices.getDevices',
        'Bluetooth permissions were not granted for device discovery.',
      );
      return [];
    }

    const devices = await ReactNativePosPrinter.getDeviceList();
    return processDevices(devices);
  } catch (error) {
    debugLog('devices.getDevices', 'Failed to get device list', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

export const toProcessedPrinterDevice = (
  device: ThermalPrinterDevice,
): PrinterDevice => toPrinterDevice(device);
