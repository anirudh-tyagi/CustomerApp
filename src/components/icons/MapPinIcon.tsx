import React from 'react';
import { StyleSheet, View } from 'react-native';

type Props = { size?: number; color?: string; dotColor?: string };

/** Map-pin glyph drawn with Views (no icon font / image dependency). */
export function MapPinIcon({
  size = 28,
  color = '#FFFFFF',
  dotColor = '#0F4C81',
}: Props): React.JSX.Element {
  const head = size * 0.7;
  const dot = head * 0.38;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={[
          styles.head,
          {
            width: head,
            height: head,
            borderRadius: head / 2,
            backgroundColor: color,
          },
        ]}
      >
        <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: dotColor }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center' },
  head: {
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Square corner + 45deg rotation = pin tip pointing down.
    borderBottomRightRadius: 0,
    transform: [{ rotate: '45deg' }],
  },
});
