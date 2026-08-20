# Printer integration guide

This folder contains a reusable printer adapter for a React Native app. It is designed to be copied into another app project and adapted to a different printer provider or device flow without rewriting the core usage pattern.

## What is included

- `types.ts` – shared types for devices, status, actions, and provider contracts.
- `provider-manager.ts` – registry of printer providers by transport.
- `core.ts` – main entry point for discovery, connect, disconnect, and action execution.
- `providers/` – concrete printer implementations for Bluetooth and Wi‑Fi.
- `api.ts`, `devices.ts`, `status.ts`, `print.ts` – convenience wrappers and app-level helpers.

## Core idea

The flow is intentionally simple:

1. Discover available devices.
2. Select a device.
3. Connect using the correct provider.
4. Execute supported actions like status checks, text/image printing, QR/barcode print, and paper cutting.

The active device and provider are tracked in `printerCore`, which keeps the app-facing API small.

## Main API

### `printerCore.discoverDevices()`

Returns a map of discovered devices by transport:

```ts
const devices = await printerCore.discoverDevices();
console.log(devices.bluetooth);
console.log(devices.wifi);
```

### `printerCore.connectToDevice(device)`

Connects to a selected device and stores it as the active printer.

```ts
const result = await printerCore.connectToDevice(device);

if (!result.ok) {
  console.error(result.message);
  return;
}
```

### `printerCore.executeAction(action, payload)`

Executes a print or printer command.

```ts
const result = await printerCore.executeAction('Print text', {
  text: 'Hello from the app',
});

if (!result.ok) {
  console.error(result.message);
}
```

Supported actions:

- `Check status`
- `Print text`
- `Print image`
- `Print table`
- `Print QR code`
- `Print barcode`
- `Cut paper`

### `printerCore.getSelectedDevice()` and `printerCore.getSelectedProvider()`

Use these to retrieve the current connection state.

```ts
const device = printerCore.getSelectedDevice();
const provider = printerCore.getSelectedProvider();
```

### `printerCore.disconnectSelected()`

Disconnects the currently connected device.

```ts
await printerCore.disconnectSelected();
```

---

## How to add this to another app project

### 1. Copy the folder

Copy the entire `printers/` folder into the target app project.

Keep the same folder structure so internal imports like `./types`, `./provider-manager`, and `./providers/...` continue to resolve correctly.

### 2. Install the required dependency

This project relies on `react-native-thermal-pos-printer` for device communication.

```bash
npm install react-native-thermal-pos-printer
```

If using Android, ensure the package has its Android consumer rule file present. In some package builds, the generated package may be missing a file named `consumer-rules.pro`.

Create this file if needed:

```proguard
# This file is intentionally empty.
# The published package is missing it, and Gradle requires it to exist.
```

### 3. Ensure permissions are configured

For Bluetooth discovery on Android, request the necessary runtime permissions before calling discovery or connection methods.

Example:

```ts
import { PermissionsAndroid, Platform } from 'react-native';

const requestPrinterPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  const perms =
    Number(Platform.Version) >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const grants = await PermissionsAndroid.requestMultiple(perms);
  return Object.values(grants).every(
    result => result === PermissionsAndroid.RESULTS.GRANTED,
  );
};
```

### 4. Use the integration layer in app code

```ts
import { printerCore } from './printers/core';

const discover = async () => {
  const results = await printerCore.discoverDevices();
  return results;
};

const connectToFirstBluetoothPrinter = async () => {
  const devices = await printerCore.discoverDevices();
  const firstDevice = devices.bluetooth[0];

  if (!firstDevice) {
    throw new Error('No Bluetooth printer found.');
  }

  const result = await printerCore.connectToDevice(firstDevice);
  return result;
};

const printReceipt = async () => {
  await printerCore.executeAction('Print text', {
    text: 'Thank you\nOrder #1234',
  });
};
```

---

## Provider contract

Each transport provider implements `PrinterProvider` from `types.ts`.

```ts
export interface PrinterProvider {
  transport: PrinterTransport;
  discover(options?: Record<string, unknown>): Promise<PrinterDevice[]>;
  connect(device: PrinterDevice): Promise<PrinterDevice>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  getStatus(): Promise<PrinterStatus>;
  printText(text: string): Promise<void>;
  printImage(imageUri: string): Promise<void>;
  printTable(rows: string[][]): Promise<void>;
  printQrCode(data: string): Promise<void>;
  printBarcode(data: string, type?: string): Promise<void>;
  cutPaper(): Promise<void>;
}
```

If you are adding support for another printer backend, create a provider class and register it in `PrinterProviderManager`.

Example:

```ts
export class MyCustomPrinterProvider implements PrinterProvider {
  transport = 'bluetooth';

  async discover() {
    return [];
  }

  async connect(device) {
    return device;
  }

  async disconnect() {}

  async isConnected() {
    return true;
  }

  async getStatus() {
    return {
      online: true,
      paperOut: false,
      coverOpen: false,
      cutterError: false,
      temperature: 'normal',
      voltage: '5V',
    };
  }

  async printText() {}
  async printImage() {}
  async printTable() {}
  async printQrCode() {}
  async printBarcode() {}
  async cutPaper() {}
}
```

Then register it:

```ts
private providers: Record<PrinterTransport, PrinterProvider> = {
  bluetooth: new MyCustomPrinterProvider(),
  wifi: new WifiPrinterProvider(),
};
```

---

## Best practices for app integration

- Keep provider implementations isolated from app UI logic.
- Normalize device metadata into `PrinterDevice` before exposing it to the app.
- Return structured results from `printerCore.executeAction()` instead of throwing UI-level exceptions.
- Perform permission handling before discovery or connection.
- Keep connection state in one place so multiple screens can use the same active printer.

## Notes

This module is intentionally app-agnostic: it is built around a device + provider abstraction so the same app flow can support more than one printer type or communication transport.

Copying the folder into another app should be enough to establish the same pattern as a reusable printer service layer.
