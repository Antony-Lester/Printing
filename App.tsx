/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { PrinterDevice, PrinterActionName } from './printers/types';
import { printerCore } from './printers/core';
import { debugLog } from './printers/logger';

const actionItems: PrinterActionName[] = [
  'Check status',
  'Print text',
  'Print image',
  'Print table',
  'Print QR code',
  'Print barcode',
  'Cut paper',
];

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [devices, setDevices] = React.useState<PrinterDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string | null>(
    null,
  );
  const [loading, setLoading] = React.useState<boolean>(true);
  const [connecting, setConnecting] = React.useState<boolean>(false);
  const [actionInFlight, setActionInFlight] = React.useState<string | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = React.useState<string>(
    'Ready to scan for printers.',
  );

  const refreshDevices = React.useCallback(async () => {
    let discoveredCount = 0;
    setLoading(true);
    setStatusMessage('Scanning for nearby printer devices...');
    debugLog('App.refreshDevices', 'Refresh devices pressed');

    try {
      const discovered = await printerCore.discoverDevices();
      const combined = [...discovered.bluetooth, ...discovered.wifi];
      discoveredCount = combined.length;
      debugLog('App.refreshDevices', 'Discovered devices summary', {
        bluetoothCount: discovered.bluetooth.length,
        wifiCount: discovered.wifi.length,
        combinedCount: combined.length,
        combined,
      });
      setDevices(combined);

      if (!combined.length) {
        const message =
          'No printer-like devices found yet. Check Bluetooth permissions or provide a Wi‑Fi IP/port.';
        setStatusMessage(message);
        debugLog('App.refreshDevices', message);
      } else {
        const message = `Found ${combined.length} possible printer device(s).`;
        setStatusMessage(message);
        debugLog('App.refreshDevices', message, { devices: combined });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to discover printer devices.';
      setStatusMessage(message);
      debugLog('App.refreshDevices', 'Discovery error', { error: message });
      setDevices([]);
      discoveredCount = 0;
    } finally {
      setLoading(false);
      debugLog('App.refreshDevices', 'Refresh complete', {
        loading: false,
        deviceCount: discoveredCount,
      });
    }
  }, []);

  React.useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const selectedDevice =
    devices.find(device => device.id === selectedDeviceId) ?? null;

  const handleConnect = async (device: PrinterDevice) => {
    setConnecting(true);
    setStatusMessage(`Connecting to ${device.name}...`);

    try {
      const result = await printerCore.connectToDevice(device);
      setStatusMessage(result.message);
      if (result.ok && result.device) {
        setSelectedDeviceId(result.device.id);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleAction = async (action: PrinterActionName) => {
    if (!selectedDevice) {
      setStatusMessage('Select a device before trying to print.');
      return;
    }

    setActionInFlight(action);
    setStatusMessage(`Running ${action}...`);

    const payload = {
      text: 'Hello from printing spike',
      imageUri: 'https://example.com/test.png',
      rows: [
        ['Item', 'Qty', 'Total'],
        ['Coffee', '1', '£3.50'],
      ],
      data: 'https://example.com',
      type: 'CODE128',
    };

    try {
      const result = await printerCore.executeAction(action, payload);
      setStatusMessage(result.message);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Printer action failed.',
      );
    } finally {
      setActionInFlight(null);
    }
  };

  return (
    <View style={[styles.container, safeAreaInsets]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Printer Debug</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          <Text style={styles.statusText}>{statusMessage}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={refreshDevices}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Refreshing...' : 'Refresh devices'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Discovered devices</Text>
          {loading ? (
            <Text style={styles.mutedText}>Searching nearby devices...</Text>
          ) : devices.length ? (
            devices.map(device => {
              const selected = device.id === selectedDeviceId;

              return (
                <View
                  key={`${device.transport}-${device.id}`}
                  style={styles.deviceRow}
                >
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceMeta}>
                      {device.transport.toUpperCase()} · {device.address}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.connectButton,
                      selected && styles.connectButtonSelected,
                    ]}
                    onPress={() => handleConnect(device)}
                    disabled={connecting}
                  >
                    <Text style={styles.connectButtonText}>
                      {selected ? 'Connected' : 'Connect'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                No printer devices found
              </Text>
              <Text style={styles.emptyStateText}>
                Try scanning again with a powered-on Bluetooth printer, or add a
                Wi‑Fi printer IP/port manually.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <Text style={styles.selectionText}>
            Selected:{' '}
            {selectedDevice
              ? `${selectedDevice.name} (${selectedDevice.transport})`
              : 'None'}
          </Text>
          <View style={styles.actionGrid}>
            {actionItems.map(action => (
              <TouchableOpacity
                key={action}
                style={[
                  styles.actionButton,
                  (!selectedDevice || actionInFlight === action) &&
                    styles.actionButtonDisabled,
                ]}
                activeOpacity={0.8}
                disabled={!selectedDevice || actionInFlight === action}
                onPress={() => handleAction(action)}
              >
                <Text style={styles.actionButtonText}>
                  {actionInFlight === action ? 'Running...' : action}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#1f2937',
  },
  mutedText: {
    color: '#6b7280',
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  deviceInfo: {
    flex: 1,
    paddingRight: 10,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  deviceMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  connectButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  connectButtonSelected: {
    backgroundColor: '#16a34a',
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptyStateText: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
  selectionText: {
    color: '#374151',
    fontSize: 14,
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  actionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default App;
