import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { logger } from '../utils/logger';

type Props = { children: React.ReactNode };
type State = { error: Error | null; resetKey: number };

/**
 * Global error boundary: a render error anywhere below shows a friendly
 * screen with "Try again" instead of a red screen / crash. "Try again"
 * remounts the whole tree. Only the error type is logged (messages could in
 * principle contain data).
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error): void {
    logger.warn('render error caught by boundary', { type: error?.name ?? 'Error' });
  }

  private retry = (): void => {
    this.setState(s => ({ error: null, resetKey: s.resetKey + 1 }));
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.container} accessibilityRole="alert" testID="error-boundary">
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected problem. Your customer data on this device is safe.
          </Text>
          <Pressable
            onPress={this.retry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F4F6F8',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center' },
  body: { marginTop: 12, fontSize: 15, color: '#4B5563', textAlign: 'center', lineHeight: 21 },
  button: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0F4C81',
  },
  pressed: { opacity: 0.85 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
