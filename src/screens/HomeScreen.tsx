import React from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeTile } from '../components/HomeTile';
import { HOME_TILES, type HomeTileConfig } from '../config/homeTiles';
import type { RootStackScreenProps } from '../navigation/types';

const GAP = 12;

/** Splits tiles into rows of `perRow`, padding the last row so tiles keep equal width. */
function toRows(tiles: HomeTileConfig[], perRow: number): Array<Array<HomeTileConfig | null>> {
  const rows: Array<Array<HomeTileConfig | null>> = [];
  for (let i = 0; i < tiles.length; i += perRow) {
    const row: Array<HomeTileConfig | null> = tiles.slice(i, i + perRow);
    while (row.length < perRow) {
      row.push(null);
    }
    rows.push(row);
  }
  return rows;
}

export function HomeScreen({ navigation }: RootStackScreenProps<'Home'>): React.JSX.Element {
  const { width } = useWindowDimensions();
  const perRow = width >= 600 ? 3 : 2;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {toRows(HOME_TILES, perRow).map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((tile, c) =>
              tile ? (
                <HomeTile
                  key={tile.key}
                  title={tile.title}
                  icon={tile.icon}
                  accentColor={tile.accentColor}
                  accessibilityHint={tile.accessibilityHint}
                  status={tile.Status ? <tile.Status /> : undefined}
                  onPress={() => navigation.navigate(tile.route)}
                />
              ) : (
                <View key={`empty-${c}`} style={styles.spacer} />
              ),
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6F8' },
  content: { padding: 16, gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  spacer: { flex: 1 },
});
