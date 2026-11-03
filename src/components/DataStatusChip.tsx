import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CustomersState } from '../hooks/useCustomers';

type Props = { state: CustomersState; onRetry: () => void };

/** Small overlay summarising the customer data load (counts only, no PII). */
export function DataStatusChip({ state, onRetry }: Props): React.JSX.Element {
  if (state.status === 'loading') {
    return (
      <View style={styles.chip} accessibilityLabel="Loading customers">
        <ActivityIndicator size="small" />
        <Text style={styles.text}>Loading customers…</Text>
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={[styles.chip, styles.error]} accessibilityRole="alert">
        <Text style={[styles.text, styles.errorText]}>{state.error.userMessage}</Text>
        <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  const { customers, skippedTotal, loadMs } = state.data;
  if (customers.length === 0) {
    return (
      <View style={styles.chip} accessibilityLabel="No customers to show">
        <Text style={styles.text}>
          {skippedTotal > 0
            ? `No customers to show · all ${skippedTotal} rows have invalid locations`
            : 'No customers in the database yet'}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.chip} accessibilityLabel="Customer data summary">
      <Text style={styles.text}>
        {customers.length.toLocaleString()} customers
        {skippedTotal > 0 ? ` · ${skippedTotal} skipped (invalid location)` : ''}
        {__DEV__ ? ` · ${loadMs} ms` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  text: { fontSize: 13, color: '#1F2937' },
  error: { backgroundColor: '#FEF2F2' },
  errorText: { color: '#991B1B', flexShrink: 1 },
  retry: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#991B1B' },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});
