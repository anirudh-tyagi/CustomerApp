import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onRecenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

/** Floating map buttons: zoom in/out and recenter on India. */
export function MapControls({ onRecenter, onZoomIn, onZoomOut }: Props): React.JSX.Element {
  return (
    <View style={styles.column} pointerEvents="box-none">
      <View style={styles.group}>
        <ControlButton label="Zoom in" onPress={onZoomIn}>
          <Text style={styles.glyph}>+</Text>
        </ControlButton>
        <View style={styles.divider} />
        <ControlButton label="Zoom out" onPress={onZoomOut}>
          <Text style={styles.glyph}>−</Text>
        </ControlButton>
      </View>
      <View style={styles.group}>
        <ControlButton label="Recenter on India" onPress={onRecenter}>
          <View style={styles.ring}>
            <View style={styles.dot} />
          </View>
        </ControlButton>
      </View>
    </View>
  );
}

function ControlButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: { position: 'absolute', top: 12, right: 12, gap: 10 },
  group: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: '#F3F4F6' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' },
  glyph: { fontSize: 22, lineHeight: 24, color: '#0F4C81', fontWeight: '600' },
  ring: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0F4C81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0F4C81' },
});
