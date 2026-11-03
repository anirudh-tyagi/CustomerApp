import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, type NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map,
  type CameraRef,
  type GeoJSONSourceRef,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';

import {
  FALLBACK_STYLE,
  CLUSTER_LABEL_FONT,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  INDIA_BOUNDS,
  INDIA_BOUNDS_PADDING,
  MAP_COLORS,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_STYLE_URL,
} from '../config/map';
import { CustomerSheet } from '../components/CustomerSheet';
import { DataStatusChip } from '../components/DataStatusChip';
import { MapControls } from '../components/MapControls';
import { useCustomers } from '../hooks/useCustomers';
import { useMapConnectivity } from '../hooks/useMapConnectivity';
import type { Customer } from '../types/customer';
import { customersToFeatureCollection, emptyFeatureCollection } from '../utils/geojson';
import { logger } from '../utils/logger';
import { installMapLogFilter } from '../services/mapLogging';

installMapLogFilter();

type FeaturePressEvent = NativeSyntheticEvent<{
  features: GeoJSON.Feature[];
}>;

const DEFAULT_SHEET_HEIGHT = 320;

/** Pin icons (density variants @2x/@3x picked automatically). */
const MAP_IMAGES = {
  'customer-pin': require('../assets/map/customer-pin.png'),
  'customer-pin-selected': require('../assets/map/customer-pin-selected.png'),
};

/** Cluster size buckets: radius and colour grow with the number of customers. */
const CLUSTER_RADIUS_EXPR: ExpressionSpecification = ['step', ['get', 'point_count'], 17, 10, 20, 50, 24, 200, 28, 1000, 33];
const CLUSTER_COLOR: ExpressionSpecification = [
  'step',
  ['get', 'point_count'],
  MAP_COLORS.clusterSmall,
  10,
  MAP_COLORS.clusterMedium,
  50,
  MAP_COLORS.clusterLarge,
  200,
  MAP_COLORS.clusterHuge,
  1000,
  MAP_COLORS.clusterMax,
];

export function MapScreen(): React.JSX.Element {
  // Online style normally; a local plain style if it cannot be loaded at all,
  // so customer pins still render. Switches back when the server answers.
  const [useFallbackStyle, setUseFallbackStyle] = useState(false);
  const connectivity = useMapConnectivity(MAP_STYLE_URL);
  const customersState = useCustomers();
  const customers: readonly Customer[] = useMemo(
    () => (customersState.status === 'ready' ? customersState.data.customers : []),
    [customersState],
  );
  const shape = useMemo(() => customersToFeatureCollection(customers), [customers]);

  const [selected, setSelected] = useState<Customer | null>(null);
  const selectedShape = useMemo<GeoJSON.FeatureCollection>(
    () => (selected ? customersToFeatureCollection([selected]) : emptyFeatureCollection()),
    [selected],
  );

  const cameraRef = useRef<CameraRef>(null);
  const clusterSourceRef = useRef<GeoJSONSourceRef>(null);
  const zoomRef = useRef(4);
  const sheetHeightRef = useRef(DEFAULT_SHEET_HEIGHT);
  // Guards against the map's background onPress closing the sheet right after
  // a feature press, in case the native event is not stopped.
  const lastFeaturePressAt = useRef(0);

  // Android 15+ draws edge-to-edge: keep overlays clear of the gesture bar.
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + 12;

  const fitIndia = useCallback((duration = 0) => {
    cameraRef.current?.fitBounds(INDIA_BOUNDS, { padding: INDIA_BOUNDS_PADDING, duration });
  }, []);

  const { reportFailure } = connectivity;
  const onlineStyleLoaded = useRef(false);
  const onFail = useCallback(() => {
    setUseFallbackStyle(true);
    reportFailure();
  }, [reportFailure]);
  const onStyleLoaded = useCallback(() => {
    if (!useFallbackStyle) {
      onlineStyleLoaded.current = true;
    }
  }, [useFallbackStyle]);
  useEffect(() => {
    if (connectivity.status === 'ok' && useFallbackStyle) {
      setUseFallbackStyle(false);
    } else if (connectivity.status !== 'ok' && !useFallbackStyle && !onlineStyleLoaded.current) {
      // Offline before the online style ever loaded: MapLibre waits silently
      // instead of failing, so switch to the local style to show the pins.
      setUseFallbackStyle(true);
    }
  }, [connectivity.status, useFallbackStyle]);
  // initialViewState can be applied before the view has its final size, which
  // occasionally framed a much wider area. Re-fit once the map has loaded.
  const onMapLoaded = useCallback(() => fitIndia(0), [fitIndia]);

  const onRegionDidChange = useCallback((e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    zoomRef.current = e.nativeEvent.zoom;
  }, []);

  const closeSheet = useCallback(() => setSelected(null), []);

  // Android back closes the sheet before leaving the screen.
  useEffect(() => {
    if (!selected) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(null);
      return true;
    });
    return () => sub.remove();
  }, [selected]);

  // Perf (counts + ms only): mount -> data ready -> first fully rendered frame
  // after the pins were handed to the map.
  const perf = useRef({ mountAt: Date.now(), dataAt: 0, logged: false });
  useEffect(() => {
    if (customers.length > 0 && perf.current.dataAt === 0) {
      perf.current.dataAt = Date.now();
    }
  }, [customers]);
  const onFrameFullyRendered = useCallback(() => {
    const p = perf.current;
    if (p.logged || p.dataAt === 0) {
      return;
    }
    p.logged = true;
    const now = Date.now();
    logger.info('map perf', {
      customers: customers.length,
      dataReadyMs: p.dataAt - p.mountAt,
      firstFullRenderMs: now - p.mountAt,
      renderAfterDataMs: now - p.dataAt,
    });
  }, [customers.length]);

  const selectCustomer = useCallback((c: Customer) => {
    setSelected(c);
    cameraRef.current?.easeTo({
      center: [c.longitude, c.latitude],
      zoom: Math.max(zoomRef.current, 12),
      // Keep the pin visible above the sheet.
      padding: { top: 0, left: 0, right: 0, bottom: sheetHeightRef.current },
      duration: 600,
    });
  }, []);

  const onClusterSourcePress = useCallback(
    async (e: FeaturePressEvent) => {
      e.stopPropagation?.();
      lastFeaturePressAt.current = Date.now();
      const feature = e.nativeEvent.features?.[0];
      if (!feature || feature.geometry?.type !== 'Point') {
        return;
      }
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const [lng, lat] = feature.geometry.coordinates;

      if (props.cluster === true || typeof props.cluster_id === 'number') {
        try {
          const id = Number(props.cluster_id);
          const zoom = await clusterSourceRef.current?.getClusterExpansionZoom(id);
          cameraRef.current?.easeTo({
            center: [lng, lat],
            zoom: Math.min((zoom ?? zoomRef.current + 2) + 0.5, MAP_MAX_ZOOM),
            padding: { top: 0, left: 0, right: 0, bottom: 0 },
            duration: 500,
          });
        } catch (err) {
          // Fall back to a plain zoom-in if the native lookup fails.
          logger.warn('cluster expansion failed', {
            error: err instanceof Error ? err.message.slice(0, 120) : undefined,
          });
          cameraRef.current?.easeTo({
            center: [lng, lat],
            zoom: Math.min(zoomRef.current + 2, MAP_MAX_ZOOM),
            duration: 500,
          });
        }
        return;
      }

      const idx = Number(props.idx);
      const c = Number.isInteger(idx) ? customers[idx] : undefined;
      if (c) {
        selectCustomer(c);
      }
    },
    [customers, selectCustomer],
  );

  const onMapPress = useCallback(() => {
    if (Date.now() - lastFeaturePressAt.current < 350) {
      return;
    }
    setSelected(null);
  }, []);

  const zoomBy = useCallback((delta: number) => {
    const z = Math.min(Math.max(zoomRef.current + delta, MAP_MIN_ZOOM), MAP_MAX_ZOOM);
    cameraRef.current?.zoomTo(z, { duration: 250 });
  }, []);

  return (
    <View style={styles.container}>
      <Map
        // Remount on style switch: MapLibre does not carry our sources/layers
        // over from a style that failed to load to the fallback style.
        key={useFallbackStyle ? 'fallback-style' : 'online-style'}
        style={styles.map}
        mapStyle={useFallbackStyle ? FALLBACK_STYLE : MAP_STYLE_URL}
        compass
        compassHiddenFacingNorth={false}
        compassPosition={{ top: 12, left: 12 }}
        attribution
        attributionPosition={{ bottom: bottom + 4, right: 8 }}
        logo={false}
        onPress={onMapPress}
        onRegionDidChange={onRegionDidChange}
        onDidFailLoadingMap={onFail}
        onDidFinishLoadingMap={onMapLoaded}
        onDidFinishLoadingStyle={onStyleLoaded}
        onDidFinishRenderingFrameFully={onFrameFullyRendered}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ bounds: INDIA_BOUNDS, padding: INDIA_BOUNDS_PADDING }}
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
        />

        <Images images={MAP_IMAGES} />

        <GeoJSONSource
          id="customers"
          ref={clusterSourceRef}
          data={shape}
          cluster
          clusterRadius={CLUSTER_RADIUS}
          clusterMaxZoom={CLUSTER_MAX_ZOOM}
          onPress={onClusterSourcePress}
          hitbox={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          {/* Cluster halo: soft ring that makes clusters read as groups. */}
          <Layer
            id="customer-cluster-halo"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': CLUSTER_COLOR,
              'circle-radius': ['+', CLUSTER_RADIUS_EXPR, 7],
              'circle-opacity': 0.22,
            }}
          />
          <Layer
            id="customer-clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': CLUSTER_COLOR,
              'circle-radius': CLUSTER_RADIUS_EXPR,
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#FFFFFF',
            }}
          />
          {/* Count labels need font glyphs from the network. MapLibre won't draw
              this source's tiles until every layer is ready, so offline (fallback
              style) the labels are left out to keep the circles visible. */}
          {useFallbackStyle ? null : (
            <Layer
              id="customer-cluster-count"
              type="symbol"
              filter={['has', 'point_count']}
              layout={{
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': CLUSTER_LABEL_FONT,
                'text-size': ['step', ['get', 'point_count'], 12, 50, 13, 200, 14, 1000, 15],
                'text-allow-overlap': true,
                'text-ignore-placement': true,
              }}
              paint={{ 'text-color': MAP_COLORS.clusterText }}
            />
          )}
          {/* Single customers: custom teardrop pin (src/assets/map), tip on the location. */}
          <Layer
            id="customer-pins"
            type="symbol"
            filter={['!', ['has', 'point_count']]}
            layout={{
              'icon-image': 'customer-pin',
              'icon-anchor': 'bottom',
              'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.75, 13, 1],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            }}
          />
        </GeoJSONSource>

        <GeoJSONSource id="selected-customer" data={selectedShape}>
          {/* Soft ground glow + larger amber pin drawn above all customers. */}
          <Layer
            id="selected-customer-glow"
            type="circle"
            paint={{
              'circle-radius': 16,
              'circle-color': MAP_COLORS.selected,
              'circle-opacity': 0.25,
              'circle-blur': 0.6,
            }}
          />
          <Layer
            id="selected-customer-pin"
            type="symbol"
            layout={{
              'icon-image': 'customer-pin-selected',
              'icon-anchor': 'bottom',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            }}
          />
        </GeoJSONSource>
      </Map>

      <MapControls
        onRecenter={() => {
          setSelected(null);
          fitIndia(600);
        }}
        onZoomIn={() => zoomBy(1)}
        onZoomOut={() => zoomBy(-1)}
      />

      {selected ? null : (
        <View style={[styles.statusArea, { bottom }]} pointerEvents="box-none">
          <DataStatusChip state={customersState} onRetry={customersState.retry} />
        </View>
      )}

      {connectivity.status !== 'ok' ? (
        <View style={styles.banner} pointerEvents="none" accessibilityLiveRegion="polite" testID="map-banner">
          <Text style={styles.bannerText}>
            {connectivity.status === 'offline'
              ? "You're offline. Map details can't load; customer pins are still shown."
              : 'Map background unavailable right now; customer pins are still shown.'}
          </Text>
        </View>
      ) : null}

      <CustomerSheet
        customer={selected}
        onClose={closeSheet}
        onHeightChange={h => {
          sheetHeightRef.current = h;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  statusArea: { position: 'absolute', left: 56, right: 56 },
  banner: {
    position: 'absolute',
    top: 64,
    left: 64,
    right: 64,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(180, 83, 9, 0.92)',
  },
  bannerText: { color: '#FFFFFF', fontSize: 13, textAlign: 'center' },
});
