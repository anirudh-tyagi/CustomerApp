import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  onPress: () => void;
  /** Optional status area under the title (e.g. a count or an error with retry). */
  status?: React.ReactNode;
  accessibilityHint?: string;
};

export function HomeTile({
  title,
  icon,
  accentColor,
  onPress,
  status,
  accessibilityHint,
}: Props): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>{icon}</View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {status ? <View style={styles.status}>{status}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 150,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  pressed: { opacity: 0.9 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  status: { marginTop: 6 },
});
