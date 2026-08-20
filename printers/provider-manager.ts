import { PrinterDevice, PrinterProvider, PrinterTransport } from './types';
import { BluetoothPrinterProvider } from './providers/bluetooth';
import { WifiPrinterProvider } from './providers/wifi';

export class PrinterProviderManager {
  private providers: Record<PrinterTransport, PrinterProvider> = {
    bluetooth: new BluetoothPrinterProvider(),
    wifi: new WifiPrinterProvider(),
  };

  getProvider(transport: PrinterTransport): PrinterProvider {
    return this.providers[transport];
  }

  async discoverByTransport(
    transport: PrinterTransport,
  ): Promise<PrinterDevice[]> {
    return this.getProvider(transport).discover();
  }

  async discoverAll(): Promise<Record<PrinterTransport, PrinterDevice[]>> {
    const [bluetooth, wifi] = await Promise.all([
      this.discoverByTransport('bluetooth'),
      this.discoverByTransport('wifi'),
    ]);

    return {
      bluetooth,
      wifi,
    };
  }
}

export const printerProviderManager = new PrinterProviderManager();
