import { PrinterDevice, PrinterProvider, PrinterStatus } from '../types';
import { debugLog } from '../logger';

const TcpSocket = require('react-native-tcp-socket');
const ZeroconfModule = require('react-native-zeroconf');

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

const MDNS_SCAN_TIMEOUT_MS = 3500;

type MdnsService = {
  type: string;
  protocol: 'tcp' | 'udp';
  domain?: string;
  defaultPort?: number;
};

const MDNS_SERVICES: MdnsService[] = [
  { type: '_pdl-datastream', protocol: 'tcp', domain: 'local.', defaultPort: 9100 },
  { type: '_printer', protocol: 'tcp', domain: 'local.', defaultPort: 515 },
  { type: '_ipp', protocol: 'tcp', domain: 'local.', defaultPort: 631 },
  { type: '_ipps', protocol: 'tcp', domain: 'local.', defaultPort: 631 },
];

const ipv4Pattern = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

const getServiceAddress = (service: Record<string, unknown>): string | null => {
  const addresses = Array.isArray(service.addresses) ? service.addresses : [];
  const addressList = addresses.filter(
    (address): address is string => typeof address === 'string' && address.length > 0,
  );

  const ipv4Address = addressList.find(address => ipv4Pattern.test(address));
  if (ipv4Address) {
    return ipv4Address;
  }

  if (addressList.length) {
    return addressList[0];
  }

  return null;
};

const createZeroconfClient = (): any => {
  const moduleValue =
    ZeroconfModule && typeof ZeroconfModule === 'object'
      ? ZeroconfModule.default ?? ZeroconfModule
      : ZeroconfModule;

  if (typeof moduleValue === 'function') {
    return new moduleValue();
  }

  if (
    moduleValue &&
    typeof moduleValue === 'object' &&
    typeof moduleValue.scan === 'function'
  ) {
    return moduleValue;
  }

  if (
    moduleValue &&
    typeof moduleValue === 'object' &&
    typeof moduleValue.Zeroconf === 'function'
  ) {
    return new moduleValue.Zeroconf();
  }

  throw new Error('Unsupported react-native-zeroconf export shape.');
};

export class WifiPrinterProvider implements PrinterProvider {
  transport = 'wifi' as const;

  private currentDevice: PrinterDevice | null = null;
  private socket: any = null;

  async discover(): Promise<PrinterDevice[]> {
    debugLog('WifiPrinterProvider.discover', 'Starting mDNS LAN discovery', {
      services: MDNS_SERVICES,
      timeoutMs: MDNS_SCAN_TIMEOUT_MS,
    });

    const discoveredByServiceSettled = await Promise.allSettled(
      MDNS_SERVICES.map(service => this.scanMdnsService(service)),
    );

    const discoveredByService = discoveredByServiceSettled.map(
      (serviceResult, index) => {
        if (serviceResult.status === 'fulfilled') {
          return serviceResult.value;
        }

        debugLog('WifiPrinterProvider.discover', 'Service scan failed', {
          serviceType: MDNS_SERVICES[index].type,
          protocol: MDNS_SERVICES[index].protocol,
          error:
            serviceResult.reason instanceof Error
              ? serviceResult.reason.message
              : String(serviceResult.reason),
        });

        return [] as PrinterDevice[];
      },
    );

    const deduped = new Map<string, PrinterDevice>();
    discoveredByService.flat().forEach(device => {
      const dedupeKey = `${device.address}:${device.port ?? 9100}`;
      if (!deduped.has(dedupeKey)) {
        deduped.set(dedupeKey, device);
      }
    });

    const devices = Array.from(deduped.values());

    debugLog('WifiPrinterProvider.discover', 'mDNS LAN discovery complete', {
      serviceCount: MDNS_SERVICES.length,
      discoveredCount: devices.length,
      devices,
    });

    return devices;
  }

  private async scanMdnsService(service: MdnsService): Promise<PrinterDevice[]> {
    let zeroconf: any;
    try {
      zeroconf = createZeroconfClient();
    } catch (error) {
      debugLog('WifiPrinterProvider.discover', 'Failed to initialize mDNS client', {
        serviceType: service.type,
        protocol: service.protocol,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }

    const discovered = new Map<string, PrinterDevice>();

    const addListener = (event: string, listener: (...args: any[]) => void) => {
      if (typeof zeroconf.on === 'function') {
        zeroconf.on(event, listener);
        return;
      }

      if (typeof zeroconf.addListener === 'function') {
        zeroconf.addListener(event, listener);
      }
    };

    const removeListener = (
      event: string,
      listener: (...args: any[]) => void,
    ) => {
      if (typeof zeroconf.off === 'function') {
        zeroconf.off(event, listener);
      }

      if (typeof zeroconf.removeListener === 'function') {
        zeroconf.removeListener(event, listener);
      }
    };

    return new Promise(resolve => {
      let done = false;

      const finish = () => {
        if (done) {
          return;
        }

        done = true;

        try {
          if (typeof zeroconf.stop === 'function') {
            zeroconf.stop();
          }
        } catch {
          // Ignore stop errors; discovery timeout is expected.
        }

        removeListener('resolved', onResolved);
        removeListener('error', onError);

        if (typeof zeroconf.removeDeviceListeners === 'function') {
          zeroconf.removeDeviceListeners();
        }

        resolve(Array.from(discovered.values()));
      };

      const onResolved = (resolvedService: Record<string, unknown>) => {
        const address = getServiceAddress(resolvedService);
        if (!address) {
          return;
        }

        const rawPort = resolvedService.port;
        const port =
          typeof rawPort === 'number' && Number.isFinite(rawPort)
            ? rawPort
            : service.defaultPort ?? 9100;

        const rawName = resolvedService.name;
        const name =
          typeof rawName === 'string' && rawName.trim().length
            ? rawName.trim()
            : `LAN Printer ${address}`;

        const id = `wifi-${address}-${port}`;
        discovered.set(id, {
          id,
          name,
          address,
          transport: 'wifi',
          port,
          connected: false,
          metadata: {
            mdnsType: service.type,
            protocol: service.protocol,
            domain: service.domain ?? 'local.',
            host: resolvedService.host,
            fullname: resolvedService.fullname,
            txt: resolvedService.txt,
          },
        });
      };

      const onError = (error: unknown) => {
        debugLog('WifiPrinterProvider.discover', 'mDNS scan error', {
          serviceType: service.type,
          protocol: service.protocol,
          error: error instanceof Error ? error.message : String(error),
        });
      };

      addListener('resolved', onResolved);
      addListener('error', onError);

      try {
        zeroconf.scan(service.type, service.protocol, service.domain ?? 'local.');
      } catch (error) {
        debugLog('WifiPrinterProvider.discover', 'Failed to start mDNS scan', {
          serviceType: service.type,
          protocol: service.protocol,
          error: error instanceof Error ? error.message : String(error),
        });
        finish();
        return;
      }

      setTimeout(finish, MDNS_SCAN_TIMEOUT_MS);
    });
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
