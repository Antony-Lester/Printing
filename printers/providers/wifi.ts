import { PrinterDevice, PrinterProvider, PrinterStatus } from '../types';

const TcpSocket = require('react-native-tcp-socket');

const ESC = '\u001b';
const GS = '\u001d';
const LF = '\n';

const encode = (value: string): Buffer | Uint8Array =>
  typeof Buffer !== 'undefined'
    ? Buffer.from(value, 'utf8')
    : new TextEncoder().encode(value);

const escPosCommands = {
  init: `${ESC}@`,
  lineFeed: `${LF}`,
  cut: `${ESC}d\u0002`,
  qr: `${GS}k\u0004\u0000\u0001`,
};

export class WifiPrinterProvider implements PrinterProvider {
  transport = 'wifi' as const;

  private currentDevice: PrinterDevice | null = null;
  private socket: any = null;

  async discover(): Promise<PrinterDevice[]> {
    return [];
  }

  async connect(device: PrinterDevice): Promise<PrinterDevice> {
    const port = device.port ?? 9100;

    if (!device.address) {
      throw new Error('Wi‑Fi printer address is required.');
    }

    this.socket = TcpSocket.createConnection({
      port,
      host: device.address,
      timeout: 5000,
    });

    await new Promise<void>((resolve, reject) => {
      this.socket.once('connect', () => resolve());
      this.socket.once('error', (error: Error) => reject(error));
    });

    this.currentDevice = {
      ...device,
      transport: 'wifi',
      connected: true,
      port,
    };

    return this.currentDevice;
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    this.currentDevice = null;
  }

  async isConnected(): Promise<boolean> {
    return Boolean(this.currentDevice?.connected && this.socket);
  }

  async getStatus(): Promise<PrinterStatus> {
    return {
      online: Boolean(this.currentDevice),
      paperOut: false,
      coverOpen: false,
      cutterError: false,
      temperature: 'NORMAL',
      voltage: 'NORMAL',
      raw: { transport: 'wifi' },
    };
  }

  private async send(data: string): Promise<void> {
    if (!this.socket) {
      throw new Error('No Wi‑Fi printer connected.');
    }

    await new Promise<void>((resolve, reject) => {
      this.socket.write(encode(data), (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  async printText(text: string): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Wi‑Fi printer connected.');
    }

    await this.send(`${escPosCommands.init}${text}${escPosCommands.lineFeed}`);
  }

  async printImage(imageUri: string): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Wi‑Fi printer connected.');
    }

    await this.send(
      `${escPosCommands.init}Image: ${imageUri}${escPosCommands.lineFeed}`,
    );
  }

  async printTable(rows: string[][]): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Wi‑Fi printer connected.');
    }

    const text = rows.map(row => row.join('\t')).join('\n');
    await this.send(`${escPosCommands.init}${text}${escPosCommands.lineFeed}`);
  }

  async printQrCode(data: string): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Wi‑Fi printer connected.');
    }

    await this.send(
      `${escPosCommands.init}${escPosCommands.qr}${data}${escPosCommands.lineFeed}`,
    );
  }

  async printBarcode(data: string, type = 'CODE128'): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Wi‑Fi printer connected.');
    }

    await this.send(
      `${escPosCommands.init}Barcode:${type}:${data}${escPosCommands.lineFeed}`,
    );
  }

  async cutPaper(): Promise<void> {
    if (!this.currentDevice) {
      throw new Error('No Wi‑Fi printer connected.');
    }

    await this.send(`${escPosCommands.cut}`);
  }
}
