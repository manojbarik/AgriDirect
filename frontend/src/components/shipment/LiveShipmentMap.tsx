import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import L from 'leaflet';
import { Skeleton } from '../ui/Skeleton';
import {
  getShipment,
  getOrderTracking,
  type TripDetail,
  SHIPMENT_STATUS_LABEL,
} from '../../api/logistics';
import {
  Navigation,
  Maximize2,
  Minimize2,
  Compass,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export interface LiveShipmentMapProps {
  shipmentId?: string;
  orderId?: string;
  initialData?: TripDetail | null;
  onRefresh?: () => void;
  className?: string;
}

const OSM_STREETS = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

const TILE_LAYERS = {
  streets: {
    name: 'Streets',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; OpenStreetMap',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Earthstar Geographics',
    maxZoom: 18,
  },
  dark: {
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
};

// CARTO basemaps require an API key. In this environment no key is configured,
// so streets/dark fall back to OpenStreetMap tiles (keyless) to avoid rendering
// "API KEY REQUIRED" tiles on every map.
const cartoConfigured = Boolean(
  import.meta.env.VITE_CARTO_API_KEY ?? import.meta.env.VITE_MAPBOX_TOKEN
);

const RESOLVED_TILE_LAYERS = cartoConfigured
  ? TILE_LAYERS
  : {
      ...TILE_LAYERS,
      streets: { ...OSM_STREETS, name: 'Streets' },
      dark: { ...OSM_STREETS, name: 'Dark Mode' },
    };

export const LiveShipmentMap: React.FC<LiveShipmentMapProps> = ({
  shipmentId,
  orderId,
  initialData,
  onRefresh,
  className,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{
    origin?: L.Marker;
    destination?: L.Marker;
    vehicle?: L.Marker;
    waypoints: L.Marker[];
    completedPath?: L.Polyline;
    remainingPath?: L.Polyline;
  }>({ waypoints: [] });

  const [trip, setTrip] = useState<TripDetail | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!initialData && Boolean(shipmentId || orderId));
  const [tileLayerType, setTileLayerType] = useState<keyof typeof RESOLVED_TILE_LAYERS>('streets');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Sync external initialData changes
  useEffect(() => {
    if (initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrip(initialData);
      setLoading(false);
    }
  }, [initialData]);

  // Fetch shipment/order details if IDs provided and not populated
  useEffect(() => {
    let cancelled = false;
    if ((!shipmentId && !orderId) || initialData) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const loader = shipmentId ? getShipment(shipmentId) : getOrderTracking(orderId as string);

    loader
      .then((res) => {
        if (!cancelled) setTrip(res.data);
      })
      .catch((err) => {
        console.warn('Failed to load shipment coordinates', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shipmentId, orderId, initialData]);

  // Coordinates resolution
  const pickupCoords: [number, number] | null = (() => {
    if (trip?.pickup_latitude && trip?.pickup_longitude) {
      return [trip.pickup_latitude, trip.pickup_longitude];
    }
    // Fallback default: Cuttack/Khordha farm belt
    return [20.4625, 85.883];
  })();

  const destCoords: [number, number] | null = (() => {
    if (trip?.destination_latitude && trip?.destination_longitude) {
      return [trip.destination_latitude, trip.destination_longitude];
    }
    // Fallback default: Bhubaneswar market hub
    return [20.2961, 85.8245];
  })();

  const currentCoords: [number, number] | null = (() => {
    if (trip?.current_latitude && trip?.current_longitude) {
      return [trip.current_latitude, trip.current_longitude];
    }
    if (trip?.status === 'DELIVERED') return destCoords;
    if (trip?.status === 'ORDER_PLACED' || trip?.status === 'ASSIGNED') return pickupCoords;
    // Midpoint between pickup and dest
    if (pickupCoords && destCoords) {
      return [
        (pickupCoords[0] + destCoords[0]) / 2,
        (pickupCoords[1] + destCoords[1]) / 2,
      ];
    }
    return [20.35, 85.85];
  })();

  /* eslint-disable react-hooks/exhaustive-deps */
  // Initialize and tear down Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(currentCoords || [20.2961, 85.8245], 11);

      tileLayerRef.current = L.tileLayer(RESOLVED_TILE_LAYERS[tileLayerType].url, {
        attribution: RESOLVED_TILE_LAYERS[tileLayerType].attribution,
        maxZoom: RESOLVED_TILE_LAYERS[tileLayerType].maxZoom,
      }).addTo(map);

      // Attribution bottom right minimal
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [currentCoords, tileLayerType]);

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(RESOLVED_TILE_LAYERS[tileLayerType].url, {
      attribution: RESOLVED_TILE_LAYERS[tileLayerType].attribution,
      maxZoom: RESOLVED_TILE_LAYERS[tileLayerType].maxZoom,
    }).addTo(mapInstanceRef.current);
  }, [tileLayerType]);

  // Draw Map Elements (Markers, Polylines, Bounds)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !pickupCoords || !destCoords || !currentCoords) return;

    // Clear existing markers and lines
    if (markersRef.current.origin) markersRef.current.origin.remove();
    if (markersRef.current.destination) markersRef.current.destination.remove();
    if (markersRef.current.vehicle) markersRef.current.vehicle.remove();
    markersRef.current.waypoints.forEach((w) => w.remove());
    markersRef.current.waypoints = [];
    if (markersRef.current.completedPath) markersRef.current.completedPath.remove();
    if (markersRef.current.remainingPath) markersRef.current.remainingPath.remove();

    // 1. Origin / Farmer Pickup Marker
    const originIcon = L.divIcon({
      className: 'custom-leaflet-marker origin-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-9 h-9 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-base">
            🌾
          </div>
          <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-800 shadow border border-emerald-100 whitespace-nowrap">
            Pickup
          </span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const originMarker = L.marker(pickupCoords, { icon: originIcon }).addTo(map);
    originMarker.bindPopup(`
      <div class="p-1 font-sans text-xs">
        <p class="font-bold text-emerald-800 text-sm">📍 Farmer Pickup Location</p>
        <p class="text-neutral-600 mt-1">${trip?.farmer_name ? `Farmer: <b>${trip.farmer_name}</b>` : ''}</p>
        <p class="text-neutral-500">${trip?.origin_label || trip?.pickup_location || 'Odisha Farm'}</p>
        ${trip?.farmer_contact ? `<p class="text-neutral-400 text-[10px] mt-0.5">📞 ${trip.farmer_contact}</p>` : ''}
      </div>
    `);
    markersRef.current.origin = originMarker;

    // 2. Destination / Buyer Delivery Marker
    const destIcon = L.divIcon({
      className: 'custom-leaflet-marker dest-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-base">
            🏢
          </div>
          <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-800 shadow border border-blue-100 whitespace-nowrap">
            Buyer
          </span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const destMarker = L.marker(destCoords, { icon: destIcon }).addTo(map);
    destMarker.bindPopup(`
      <div class="p-1 font-sans text-xs">
        <p class="font-bold text-blue-800 text-sm">🎯 Buyer Destination</p>
        <p class="text-neutral-600 mt-1">${trip?.buyer_name ? `Buyer: <b>${trip.buyer_name}</b>` : ''}</p>
        <p class="text-neutral-500">${trip?.destination_label || trip?.destination_location || 'Distribution Centre'}</p>
        <p class="text-emerald-600 font-medium text-[11px] mt-1">${trip?.order_items_summary || 'Fresh Farm Produce'}</p>
      </div>
    `);
    markersRef.current.destination = destMarker;

    // 3. Vehicle Marker with Live Pulsing Radar Halo
    const isMoving = trip?.status === 'IN_TRANSIT' || trip?.status === 'OUT_FOR_DELIVERY' || trip?.status === 'NEAR_DESTINATION';
    const isDelivered = trip?.status === 'DELIVERED';

    const vehicleIcon = L.divIcon({
      className: 'custom-leaflet-marker vehicle-marker',
      html: `
        <div class="relative flex items-center justify-center">
          ${
            isMoving
              ? `
            <div class="absolute -inset-3 rounded-full bg-emerald-500/25 animate-ping"></div>
            <div class="absolute -inset-2 rounded-full bg-emerald-500/35 animate-pulse"></div>
          `
              : ''
          }
          <div class="relative w-11 h-11 rounded-2xl ${
            isDelivered
              ? 'bg-emerald-700'
              : isMoving
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/40'
              : 'bg-neutral-800'
          } border-2 border-white shadow-xl flex items-center justify-center text-white text-lg transition-transform hover:scale-110">
            🚚
          </div>
          <span class="absolute -top-6 left-1/2 -translate-x-1/2 ${
            trip?.is_demo_gps ? 'bg-amber-600' : 'bg-emerald-600'
          } text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-md tracking-wider whitespace-nowrap uppercase">
            ${trip?.is_demo_gps ? '⚡ DEMO GPS' : '● LIVE GPS'}
          </span>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const vehicleMarker = L.marker(currentCoords, { icon: vehicleIcon }).addTo(map);
    vehicleMarker.bindPopup(`
      <div class="p-1 font-sans text-xs min-w-[180px]">
        <div class="flex items-center justify-between gap-2 border-b pb-1 mb-1.5">
          <span class="font-bold text-emerald-700">🚚 Vehicle Telemetry</span>
          <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${trip?.is_demo_gps ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">
            ${trip?.is_demo_gps ? 'Demo Sim' : 'Live GPS'}
          </span>
        </div>
        <p class="text-neutral-700"><b>Status:</b> ${SHIPMENT_STATUS_LABEL[trip?.status || ''] || trip?.status}</p>
        <p class="text-neutral-600"><b>Driver:</b> ${trip?.driver_name || 'Assigned Logistics Driver'}</p>
        <p class="text-neutral-600"><b>Vehicle:</b> ${trip?.vehicle_label || 'EV Cargo Van'}</p>
        ${trip?.eta_minutes !== null && trip?.eta_minutes !== undefined ? `<p class="text-emerald-700 font-semibold mt-1">⏱ ETA: ~${trip.eta_minutes} mins</p>` : ''}
        ${trip?.distance_remaining_km !== null && trip?.distance_remaining_km !== undefined ? `<p class="text-neutral-500 text-[11px]">📍 Dist. Left: ${trip.distance_remaining_km} km</p>` : ''}
      </div>
    `);
    markersRef.current.vehicle = vehicleMarker;

    // 4. Polylines (Completed vs Remaining)
    const completedPoly = L.polyline([pickupCoords, currentCoords], {
      color: '#059669', // Emerald 600
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    markersRef.current.completedPath = completedPoly;

    const remainingPoly = L.polyline([currentCoords, destCoords], {
      color: '#94a3b8', // Slate 400
      weight: 4,
      dashArray: '8, 8',
      opacity: 0.75,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    markersRef.current.remainingPath = remainingPoly;

    // 5. Fit Bounds smoothly
    const bounds = L.latLngBounds([pickupCoords, destCoords, currentCoords]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
  }, [pickupCoords, destCoords, currentCoords, trip?.status, trip?.is_demo_gps]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleCenterVehicle = () => {
    if (mapInstanceRef.current && currentCoords) {
      mapInstanceRef.current.flyTo(currentCoords, 14, { duration: 1.2 });
    }
  };

  const handleResetBounds = () => {
    if (mapInstanceRef.current && pickupCoords && destCoords && currentCoords) {
      const bounds = L.latLngBounds([pickupCoords, destCoords, currentCoords]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
  };

  if (loading) {
    return (
      <div className={clsx('relative rounded-3xl overflow-hidden border border-neutral-200/80 bg-neutral-900/5 p-4', className)}>
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  const isDelivered = trip?.status === 'DELIVERED';
  const inTransit = trip?.status === 'IN_TRANSIT' || trip?.status === 'OUT_FOR_DELIVERY';

  return (
    <div
      className={clsx(
        'relative rounded-3xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 shadow-xl transition-all duration-300 bg-neutral-950 flex flex-col',
        isFullscreen ? 'fixed inset-4 z-50 rounded-2xl' : 'h-[460px] md:h-[520px]',
        className
      )}
    >
      {/* Interactive Leaflet Map Viewport */}
      <div ref={mapContainerRef} className="w-full h-full z-0 outline-none" tabIndex={0} />

      {/* Top Floating Telemetry Glass Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 pointer-events-none flex flex-wrap items-center justify-between gap-2.5">
        <div className="pointer-events-auto flex items-center gap-2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 px-3.5 py-2 rounded-2xl shadow-2xl text-white">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {inTransit && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={clsx(
                  'relative inline-flex rounded-full h-3 w-3',
                  isDelivered ? 'bg-emerald-400' : inTransit ? 'bg-emerald-500' : 'bg-amber-400'
                )}
              />
            </span>
            <span className="font-semibold text-xs tracking-tight">
              {trip?.order_number ? `Order #${trip.order_number}` : 'Live Route Tracking'}
            </span>
          </div>

          <div className="h-3 w-px bg-white/20 mx-0.5" />

          <span
            className={clsx(
              'text-[11px] py-0.5 px-2 rounded-full font-bold',
              isDelivered
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : inTransit
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-white/10 text-neutral-300 border border-white/10'
            )}
          >
            {SHIPMENT_STATUS_LABEL[trip?.status || ''] || trip?.status || 'Active'}
          </span>

          {trip?.is_demo_gps && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
              <Sparkles className="w-3 h-3" /> Demo Mode
            </span>
          )}
        </div>

        {/* ETA & Distance Telemetry Pill */}
        <div className="pointer-events-auto flex items-center gap-3 bg-neutral-900/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-2xl text-white">
          {trip?.eta_minutes !== null && trip?.eta_minutes !== undefined && !isDelivered && (
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-neutral-400">ETA:</span>
              <span className="font-bold text-emerald-300">~{trip.eta_minutes} min</span>
            </div>
          )}

          {trip?.distance_remaining_km !== null && trip?.distance_remaining_km !== undefined && !isDelivered && (
            <>
              <div className="h-3 w-px bg-white/20" />
              <div className="flex items-center gap-1.5 text-xs">
                <Navigation className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-neutral-400">Remaining:</span>
                <span className="font-bold text-teal-300">{trip.distance_remaining_km} km</span>
              </div>
            </>
          )}

          {isDelivered && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Delivered Successfully</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Controls (Right Vertical Pill) */}
      <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-1.5 bg-neutral-900/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl text-white">
        <button
          onClick={handleCenterVehicle}
          title="Recenter on Truck"
          aria-label="Recenter map on vehicle"
          className="p-2 hover:bg-white/15 rounded-xl transition text-emerald-400 hover:text-emerald-300 flex items-center justify-center"
        >
          <Compass className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetBounds}
          title="Fit entire route"
          aria-label="Fit entire route on map"
          className="p-2 hover:bg-white/15 rounded-xl transition text-neutral-300 hover:text-white flex items-center justify-center"
        >
          <Navigation className="w-4 h-4" />
        </button>

        <div className="h-px bg-white/15 my-0.5 mx-1" />

        <button
          onClick={handleZoomIn}
          title="Zoom in"
          aria-label="Zoom in"
          className="p-2 hover:bg-white/15 rounded-xl transition text-neutral-300 hover:text-white font-bold text-sm flex items-center justify-center"
        >
          +
        </button>

        <button
          onClick={handleZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
          className="p-2 hover:bg-white/15 rounded-xl transition text-neutral-300 hover:text-white font-bold text-sm flex items-center justify-center"
        >
          -
        </button>

        <div className="h-px bg-white/15 my-0.5 mx-1" />

        {/* Map Layers Dropdown / Switch */}
        <button
          onClick={() => {
            const types: (keyof typeof RESOLVED_TILE_LAYERS)[] = ['streets', 'satellite', 'dark'];
            const nextIdx = (types.indexOf(tileLayerType) + 1) % types.length;
            setTileLayerType(types[nextIdx]);
          }}
          title={`Switch map view (Current: ${RESOLVED_TILE_LAYERS[tileLayerType].name})`}
          aria-label="Switch map style layer"
          className="p-2 hover:bg-white/15 rounded-xl transition text-teal-400 hover:text-teal-300 flex items-center justify-center"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          aria-label="Toggle map fullscreen"
          className="p-2 hover:bg-white/15 rounded-xl transition text-neutral-300 hover:text-white flex items-center justify-center"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Floating Route Legend Glass Pill */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 bg-neutral-900/80 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-2xl shadow-xl text-[11px] text-white">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-emerald-500 rounded-full" />
          <span className="text-neutral-300 font-medium">Covered Path</span>
        </div>
        <div className="h-3 w-px bg-white/15" />
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 border-b-2 border-dashed border-neutral-400" />
          <span className="text-neutral-400 font-medium">Remaining</span>
        </div>
        {onRefresh && (
          <>
            <div className="h-3 w-px bg-white/15" />
            <button
              onClick={onRefresh}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition text-[10px] font-semibold"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </>
        )}
      </div>
    </div>
  );
};