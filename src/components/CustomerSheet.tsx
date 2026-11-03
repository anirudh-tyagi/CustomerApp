import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  callCustomer,
  copyAddress,
  openDirections,
  shareCustomer,
  telUrl,
} from '../services/customerActions';
import type { Customer } from '../types/customer';
import { displayValue, formatCoordinates } from '../utils/format';

type Props = {
  /** Customer to show; null hides the sheet. */
  customer: Customer | null;
  onClose: () => void;
  /** Reports the sheet's height (incl. bottom inset) so the map can pad the camera. */
  onHeightChange?: (height: number) => void;
};

const OFFSCREEN = 900;

/** Bottom sheet built on RN Animated + PanResponder (no gesture libraries). */
export function CustomerSheet({ customer, onClose, onHeightChange }: Props): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const heightRef = useRef(OFFSCREEN);
  // Keep showing the last customer while the close animation runs.
  const [shown, setShown] = useState<Customer | null>(customer);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (customer) {
      setShown(customer);
      setCopied(false);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 14,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: heightRef.current,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShown(null);
        }
      });
    }
  }, [customer, translateY]);

  useEffect(
    () => () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
    },
    [],
  );

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 80 || g.vy > 0.8) {
          onCloseRef.current();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
    }),
  ).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  if (!shown) {
    return null;
  }

  const c = shown;
  const canCall = telUrl(c.phone) !== null;
  const canCopy = c.address !== null;

  const onCopy = () => {
    if (copyAddress(c)) {
      setCopied(true);
      AccessibilityInfo.announceForAccessibility('Address copied');
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current);
      }
      copiedTimer.current = setTimeout(() => setCopied(false), 1800);
    }
  };

  const hints = [
    !canCall ? 'No phone number' : null,
    !canCopy ? 'No address to copy' : null,
  ].filter(Boolean);

  return (
    <Animated.View
      style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY }] }]}
      onLayout={e => {
        heightRef.current = e.nativeEvent.layout.height;
        onHeightChange?.(e.nativeEvent.layout.height);
      }}
      accessibilityViewIsModal
      testID="customer-sheet"
    >
      <View {...pan.panHandlers} style={styles.dragArea}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={[styles.name, !c.name && styles.missing]} numberOfLines={2}>
            {displayValue(c.name)}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close customer details"
            hitSlop={12}
            style={styles.close}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      </View>

      <Field label="Address" value={c.address} />
      <Field label="Phone" value={c.phone} />
      <Text style={styles.coords}>{formatCoordinates(c.latitude, c.longitude)}</Text>

      <View style={styles.actions}>
        <ActionButton label="Call" onPress={() => callCustomer(c)} disabled={!canCall} hint="No phone number" />
        <ActionButton label="Get directions" onPress={() => openDirections(c)} />
        <ActionButton
          label={copied ? 'Copied ✓' : 'Copy address'}
          onPress={onCopy}
          disabled={!canCopy}
          hint="No address to copy"
        />
        <ActionButton label="Share" onPress={() => shareCustomer(c)} />
      </View>
      {hints.length > 0 ? <Text style={styles.hint}>{hints.join(' · ')}</Text> : null}
    </Animated.View>
  );
}

function Field({ label, value }: { label: string; value: string | null }): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, !value && styles.missing]} selectable={!!value}>
        {displayValue(value)}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  hint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityHint={disabled ? hint : undefined}
      style={({ pressed }) => [styles.action, disabled && styles.actionDisabled, pressed && styles.actionPressed]}
    >
      <Text style={[styles.actionText, disabled && styles.actionTextDisabled]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
  },
  dragArea: { paddingTop: 8 },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { flex: 1, fontSize: 20, fontWeight: '700', color: '#111827' },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 16, color: '#374151' },
  field: { marginTop: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  fieldValue: { marginTop: 2, fontSize: 15, color: '#111827' },
  missing: { color: '#9CA3AF', fontStyle: 'italic' },
  coords: { marginTop: 10, fontSize: 12, color: '#9CA3AF' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  action: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#0F4C81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: { opacity: 0.85 },
  actionDisabled: { backgroundColor: '#E5E7EB' },
  actionText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  actionTextDisabled: { color: '#9CA3AF' },
  hint: { marginTop: 8, fontSize: 12, color: '#6B7280', textAlign: 'center' },
});
