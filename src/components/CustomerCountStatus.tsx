import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCustomers } from '../hooks/useCustomers';

/** Tile status for the Customer Map tile: count, loading, or error + retry. */
export function CustomerCountStatus(): React.JSX.Element {
  const state = useCustomers();

  if (state.status === 'loading') {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color="#6B7280" />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <View>
        <Text style={styles.error}>Data unavailable</Text>
        <Pressable
          onPress={state.retry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading customer data"
          hitSlop={8}
          style={styles.retry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  const n = state.data.customers.length;
  if (n === 0) {
    return <Text style={styles.muted}>No customers in the database</Text>;
  }
  return (
    <Text style={styles.muted}>
      {n.toLocaleString()} {n === 1 ? 'customer' : 'customers'}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muted: { fontSize: 14, color: '#6B7280' },
  error: { fontSize: 14, color: '#B91C1C', fontWeight: '600' },
  retry: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#B91C1C',
  },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});
