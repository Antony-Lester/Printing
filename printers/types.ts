export type PrinterTransport = 'bluetooth' | 'wifi';

export type PrinterStatus = {
  online: boolean;
  paperOut: boolean;
  coverOpen: boolean;
  cutterError: boolean;
  temperature: string;
  voltage: string;
  raw?: Record<string, unknown>;
};

export type PrinterDevice = {
  id: string;
  name: string;
  address: string;
  transport: PrinterTransport;
  port?: number;
  connected?: boolean;
  metadata?: Record<string, unknown>;
};

export type PrinterActionName =
  | 'Check status'
  | 'Print text'
  | 'Print image'
  | 'Print table'
  | 'Print QR code'
  | 'Print barcode'
  | 'Cut paper';

export type PrinterActionResult = {
  ok: boolean;
  action: PrinterActionName;
  message: string;
  device?: PrinterDevice | null;
};

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
