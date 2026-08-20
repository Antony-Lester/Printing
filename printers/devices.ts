import { PermissionsAndroid, Platform } from 'react-native';
import {
  ReactNativePosPrinter,
  ThermalPrinterDevice,
} from 'react-native-thermal-pos-printer';

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

export const getDevices = async (): Promise<ThermalPrinterDevice[]> => {
  try {
    const hasPermissions = await ensureBluetoothPermissions();

    if (!hasPermissions) {
      console.warn(
        'Bluetooth permissions were not granted for device discovery.',
      );
      return [];
    }

    const devices: ThermalPrinterDevice[] =
      await ReactNativePosPrinter.getDeviceList();

    console.log('Available devices:', devices);
    return devices;
  } catch (error) {
    console.error('Failed to get device list:', error);
    return [];
  }
};
