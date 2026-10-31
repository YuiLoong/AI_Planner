'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxLanguage from '@mapbox/mapbox-gl-language';
import polyline from '@mapbox/polyline';
import { useJsApiLoader } from '@react-google-maps/api';
import { useTripDetailInfo } from '@/app/Provider';
import { Button } from '@/components/ui/button';
import { Play, Eye, Map as MapIcon, Square, MapPin, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RotateCcw, CheckCircle2 } from 'lucide-react';
export const maxDuration = 60;

const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ['places', 'geometry'];

interface Activity {
  place_name: string;
  place_image_url?: string;
  geo_coordinates: {
    longitude?: number;
    londtiude?: number;
    latitude: number;
  };
}

interface GlobalMapProps {
  isArchiveMode?: boolean;
}

const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export default function GlobalMap({ isArchiveMode = false }: GlobalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  const isCancelledRef = useRef<boolean>(false);
  const highlightMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const { tripDetailInfo } = useTripDetailInfo() as any;

  const { isLoaded: isGoogleLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [selectedHotelIndex, setSelectedHotelIndex] = useState<number>(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [isDaySidebarOpen, setIsDaySidebarOpen] = useState<boolean>(false);
  const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null); 
  const [activeRouteInfo, setActiveRouteInfo] = useState<any>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTourLoading, setIsTourLoading] = useState<boolean>(false);
  const [is3DView, setIs3DView] = useState<boolean>(false);
  
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);

  const [tourStep, setTourStep] = useState<number>(-1);
  const [tourSegments, setTourSegments] = useState<any[]>([]);
  const [activeTourNode, setActiveTourNode] = useState<any>(null);
  const [tourNextInfo, setTourNextInfo] = useState<string>("");
  const [isFlying, setIsFlying] = useState<boolean>(false); 

  const [isCardExpanded, setIsCardExpanded] = useState<boolean>(true);

  const [carouselItems, setCarouselItems] = useState<any[]>([]);
  const [carouselIndex, setCarouselIndex] = useState<number>(0);

  const currentHotel = useMemo(() => tripDetailInfo?.hotels?.[selectedHotelIndex] || null, [tripDetailInfo, selectedHotelIndex]);
  const currentDayPlan = useMemo(() => tripDetailInfo?.itinerary?.[selectedDayIndex] || null, [tripDetailInfo, selectedDayIndex]);

  const dayNodes = useMemo(() => {
    if (!currentHotel || !currentDayPlan) return [];
    const nodes = [];
    const seenCoords = new Set(); // 📍 좌표 중복 체크를 여기서 수행

    // 겹치는 좌표를 살짝 흩뿌려주는 헬퍼 함수
    const applyOffset = (lat: number, lng: number) => {
      let newLat = lat;
      let newLng = lng;
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (seenCoords.has(key)) {
        newLat += (Math.random() - 0.5) * 0.0006;
        newLng += (Math.random() - 0.5) * 0.0006;
      }
      seenCoords.add(key);
      return { lat: newLat, lng: newLng };
    };
    
    const hLat = currentHotel.geo_coordinates?.latitude;
    const hLng = currentHotel.geo_coordinates?.longitude ?? (currentHotel.geo_coordinates as any)?.londtiude;
    
    if (hLat !== undefined && hLng !== undefined) {
      const { lat, lng } = applyOffset(hLat, hLng);
      nodes.push({ 
        id: -1, lat, lng, 
        label: `🏨${selectedHotelIndex === 0 ? 'A' : 'B'}`, 
        title: currentHotel.hotel_name || currentHotel.name || '숙소',
        image: currentHotel.hotel_image_url || '/placeholder.png'
      });
    }

    const acts = currentDayPlan.activities || [];
    acts.forEach((act: Activity, idx: number) => {
      const actLat = act.geo_coordinates?.latitude;
      const actLng = act.geo_coordinates?.longitude ?? (act.geo_coordinates as any)?.londtiude;
      if (actLat !== undefined && actLng !== undefined) {
        const { lat, lng } = applyOffset(actLat, actLng);
        nodes.push({ 
          id: idx, lat, lng, 
          label: `${idx + 1}`, 
          title: act.place_name,
          image: act.place_image_url || '/placeholder.png'
        });
      }
    });
    return nodes;
  }, [currentHotel, currentDayPlan, selectedHotelIndex]);

  const createCurvedLine = (start: number[], end: number[]) => {
  const points = [];
  const numPoints = 50; // 곡선을 쪼갤 개수 (높을수록 부드러움)
  const [x1, y1] = start;
  const [x2, y2] = end;
  
  // 두 점의 중간 지점
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  
  // 수직 방향으로 휘어지는 정도 (0.2 ~ 0.3 추천)
  const curveFactor = 0.2; 
  
  // 제어점 계산 (곡선의 꼭짓점)
  const controlX = midX - (y2 - y1) * curveFactor;
  const controlY = midY + (x2 - x1) * curveFactor;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const x = Math.pow(1 - t, 2) * x1 + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * x2;
    const y = Math.pow(1 - t, 2) * y1 + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * y2;
    points.push([x, y]);
  }
  return points;
};

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '';
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.6917, 35.6895],
      zoom: 11,
      pitch: 0,
      projection: 'globe' as any,
    });

    map.addControl(new MapboxLanguage({ defaultLanguage: 'ko' }));

    map.on('load', () => {
      setIsMapLoaded(true);
      
      // 💡 1. 1일차 전체 경로선 소스 및 레이어 (배경 점선)
      if (!map.getSource('day-full-route-source')) {
        map.addSource('day-full-route-source', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
        });
        map.addLayer({
          id: 'day-full-route-layer',
          type: 'line',
          source: 'day-full-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#94a3b8', 'line-width': 4, 'line-dasharray': [2, 2], 'line-opacity': 0.8 }
        });
      }

      // 💡 2. 클릭한 부분만 보여줄 하이라이트 경로선 (초록색 실선)
      if (!map.getSource('selected-route-source')) {
        map.addSource('selected-route-source', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
        });
        map.addLayer({
          id: 'selected-route-layer',
          type: 'line',
          source: 'selected-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#10b981', 'line-width': 6, 'line-opacity': 1.0 } // 🟢 초록색 하이라이트
        });
      }

      if (!map.getLayer('3d-buildings')) {
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#e2e8f0',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.7
          }
        });
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // 💡 [핵심] DAY가 변경될 때마다 1일차 전체 경로선을 그어주는 함수
  useEffect(() => {
    const fetchFullDayRoute = async () => {
      if (!mapRef.current || !isMapLoaded || dayNodes.length < 2 || !isGoogleLoaded) return;
      const map = mapRef.current;
      const directionsService = new window.google.maps.DirectionsService();
      let allCoords: number[][] = [];

      try {
        // 단 1번의 API 호출로 호텔 -> 모든 장소 -> 호텔 경로 완성
        const waypoints = dayNodes.slice(1).map(n => ({
          location: { lat: n.lat, lng: n.lng },
          stopover: true
        }));

        const res = await directionsService.route({
          origin: { lat: dayNodes[0].lat, lng: dayNodes[0].lng },
          destination: { lat: dayNodes[0].lat, lng: dayNodes[0].lng },
          waypoints: waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING
        });

        if (res.routes[0]) {
           allCoords = polyline.decode(res.routes[0].overview_polyline).map(([lat, lng]) => [lng, lat]);
        }
      } catch (e) {
        // 길찾기 실패 시 '직선' 대신 '부드러운 곡선'으로 연결 (쭉 뻗는 느낌 해결)
        allCoords = [];
        for (let i = 0; i < dayNodes.length; i++) {
          const current = dayNodes[i];
          const next = dayNodes[i + 1] || dayNodes[0]; // 마지막은 다시 처음(호텔)으로
          
          const curveCoords = createCurvedLine(
            [current.lng, current.lat], 
            [next.lng, next.lat]
          );
          allCoords.push(...curveCoords);
        }
      }

      (map.getSource('day-full-route-source') as mapboxgl.GeoJSONSource)?.setData({
        type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: allCoords }
      });
    };

    fetchFullDayRoute();
  }, [dayNodes, isMapLoaded, isGoogleLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || dayNodes.length === 0) return;

    stopTour();
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    clearRouteLine(); 
    setSelectedPinIndex(null);

    const bounds = new mapboxgl.LngLatBounds();

    dayNodes.forEach((node) => {
      // 이미 useMemo에서 분산 처리된 안전한 좌표를 그대로 사용
      const { lat, lng } = node;
      bounds.extend([lng, lat]);

      const el = document.createElement('div');
      const isHotel = node.id === -1;
      
      // ❌ el.style.position = 'relative'; (절대 사용 금지: Mapbox 포지셔닝 파괴 원인)
      el.style.zIndex = '1';

      // HTML 내부 div에 position: relative를 주어 z-index 제어가 안전하게 동작하도록 수정
      el.innerHTML = `
        <div style="
          position: relative;
          background: ${isHotel ? '#1e3a8a' : '#f97316'}; 
          color: white; 
          border-radius: 50%; 
          width: ${isHotel ? '32px' : '28px'}; 
          height: ${isHotel ? '32px' : '28px'}; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: bold; 
          font-size: 14px; 
          border: 2px solid white; 
          box-shadow: 0 3px 6px rgba(0,0,0,0.3); 
          cursor: pointer; 
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">${node.label}</div>
      `;

      el.addEventListener('mouseenter', () => {
        el.style.zIndex = '50';
        (el.firstElementChild as HTMLElement).style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.zIndex = '1';
        (el.firstElementChild as HTMLElement).style.transform = 'scale(1)';
      });
      el.addEventListener('click', () => handleNodeAction(node.id));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
        
      markersRef.current.push(marker);
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 15.5, pitch: 0, duration: 1500 });
    }
  }, [dayNodes, isMapLoaded]);

  const clearRouteLine = () => {
    const map = mapRef.current;
    if (map && map.getSource('selected-route-source')) {
      (map.getSource('selected-route-source') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] }
      });
    }
    setActiveRouteInfo(null);
  };

  const clearHighlightMarker = () => {
    if (highlightMarkerRef.current) {
      highlightMarkerRef.current.remove();
      highlightMarkerRef.current = null;
    }
  };

  const stopTour = () => {
    isCancelledRef.current = true;
    setIsPlaying(false);
    setIsTourLoading(false);
    setActiveTourNode(null);
    setTourStep(-1);
    setIsFlying(false);
    setCarouselItems([]);
    setCarouselIndex(0);
    clearHighlightMarker();
  };

  const handleHighlightLocation = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    clearHighlightMarker();

    const el = document.createElement('div');
    el.className = 'relative flex items-center justify-center w-12 h-12 cursor-pointer';
    el.innerHTML = `
      <style>@keyframes mapboxPulse { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(2.5); opacity: 0; } }</style>
      <div class="absolute w-full h-full bg-red-500 rounded-full opacity-60" style="animation: mapboxPulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);"></div>
      <div class="relative z-10 text-3xl drop-shadow-md">📍</div>
    `;

    highlightMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);

    mapRef.current.easeTo({
      center: [lng, lat],
      padding: { right: isCardExpanded ? 320 : 0 }, 
      duration: 1000,
      zoom: Math.max(mapRef.current.getZoom(), 15.5) 
    });
  };

  const getGooglePlaceClass = async () => {
    if (!window.google?.maps) return null;
    let PlaceClass = (window.google.maps as any).places?.Place;
    if (!PlaceClass && typeof (window.google.maps as any).importLibrary === 'function') {
      const placesLib = await (window.google.maps as any).importLibrary("places");
      PlaceClass = placesLib.Place;
    }
    return PlaceClass;
  };

  const handleImageError = async (item: any, index: number) => {
    if (item.fallbackTried) {
      setCarouselItems(prev => prev.map((p, i) => i === index ? { ...p, imageUrl: '/placeholder.png' } : p));
      return;
    }
    setCarouselItems(prev => prev.map((p, i) => i === index ? { ...p, fallbackTried: true } : p));

    try {
      const Place = await getGooglePlaceClass();
      if (!Place) throw new Error();
      
      const request = { textQuery: item.title, fields: ['photos'], maxResultCount: 1 };
      const { places } = await Place.searchByText(request);
      
      if (places && places.length > 0 && places[0].photos && places[0].photos.length > 0) {
        const photoUrl = places[0].photos[0].getURI({ maxWidth: 400 });
        setCarouselItems(prev => prev.map((p, i) => i === index ? { ...p, imageUrl: photoUrl } : p));
      } else {
        throw new Error(); 
      }
    } catch (e) {
      setCarouselItems(prev => prev.map((p, i) => i === index ? { ...p, imageUrl: '/placeholder.png' } : p));
    }
  };

  const fetchNearbyPlacesNew = async (currentNode: any) => {
    try {
      const Place = await getGooglePlaceClass();
      if (!Place) return;
      
      const request = {
        fields: ['displayName', 'location', 'photos', 'types'],
        locationRestriction: { center: { lat: currentNode.lat, lng: currentNode.lng }, radius: 350 },
        maxResultCount: 8,
      };

      const { places } = await Place.searchNearby(request);
      if (!places || places.length === 0) return;

      const dayNodeNames = dayNodes.map((n:any) => n.title.toLowerCase());

      const filtered = places.filter((p: any) => {
        const name = p.displayName?.toLowerCase() || '';
        const isAlreadyInPlan = dayNodeNames.some((dn: string) => dn.includes(name) || name.includes(dn));
        const isLodging = p.types?.includes('lodging') || p.types?.includes('hotel');
        
        if (currentNode.id === -1 && isLodging) return false;
        if (isAlreadyInPlan) return false;
        if (!p.photos || p.photos.length === 0) return false; 
        
        return true;
      }).slice(0, 3);

      const newNearbyItems = filtered.map((p: any) => {
        const dist = getDistanceMeters(currentNode.lat, currentNode.lng, p.location.lat(), p.location.lng());
        return {
          id: p.id,
          isMain: false,
          title: p.displayName,
          subtitle: `${dist}m`,
          imageUrl: p.photos[0].getURI({ maxHeight: 400, maxWidth: 400 }),
          label: '주변 둘러보기',
          lat: p.location.lat(),
          lng: p.location.lng(),
          fallbackTried: false
        };
      });

      if (newNearbyItems.length > 0) {
        setCarouselItems(prev => [...prev, ...newNearbyItems]);
      }
    } catch (err) {
      console.warn("주변 장소 로딩 실패", err);
    }
  };

  const startTour = async () => {
    if (!mapRef.current || !isMapLoaded || dayNodes.length < 2 || !isGoogleLoaded) return;
    
    isCancelledRef.current = false;
    setIsPlaying(true);
    setIsTourLoading(true);
    setIs3DView(true);

    const map = mapRef.current;
    const directionsService = new window.google.maps.DirectionsService();
    const segments: any[] = [];

    for (let i = 0; i < dayNodes.length; i++) {
      if (isCancelledRef.current) return;
      const origin = dayNodes[i];
      const dest = dayNodes[i + 1] || dayNodes[0]; 

      let decoded: number[][] = [];
      let modeText = "이동";
      let durationText = "약 15분";

      try {
        const res = await directionsService.route({
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: dest.lat, lng: dest.lng },
          travelMode: window.google.maps.TravelMode.TRANSIT
        });
        decoded = polyline.decode(res.routes[0].overview_polyline).map(([lat, lng]) => [lng, lat]);
        modeText = "🚇 대중교통";
        durationText = res.routes[0].legs[0].duration?.text || durationText;
      } catch {
        try {
          const walkRes = await directionsService.route({
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: dest.lat, lng: dest.lng },
            travelMode: window.google.maps.TravelMode.WALKING
          });
          decoded = polyline.decode(walkRes.routes[0].overview_polyline).map(([lat, lng]) => [lng, lat]);
          modeText = "🚶 도보";
          durationText = walkRes.routes[0].legs[0].duration?.text || durationText;
        } catch {
          decoded = [[origin.lng, origin.lat], [dest.lng, dest.lat]];
        }
      }
      segments.push({ originId: origin.id, originTitle: origin.title, destTitle: dest.title, mode: modeText, duration: durationText, coords: decoded });
    }

    if (isCancelledRef.current) return;
    setTourSegments(segments);
    setIsTourLoading(false);
    executeFlyTo(0, segments);
  };

  const executeFlyTo = (stepIndex: number, currentSegments: any[]) => {
    if (!mapRef.current) return;
    
    setTourStep(stepIndex);
    setIsFlying(true);
    setActiveTourNode(null); 
    setCarouselItems([]);
    setCarouselIndex(0);
    clearHighlightMarker(); 
    setIsCardExpanded(true);

    const node = dayNodes[stepIndex];
    mapRef.current.flyTo({
      center: [node.lng, node.lat],
      zoom: 15.8,
      pitch: 45,
      bearing: stepIndex * 25,
      duration: 2500,
      essential: true
    });

    const seg = currentSegments[stepIndex];
    if (seg) {
      (mapRef.current.getSource('selected-route-source') as mapboxgl.GeoJSONSource)?.setData({
        type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: seg.coords }
      });
    }

    setTimeout(() => {
      if (isCancelledRef.current) return;
      setIsFlying(false);
      
      const nextNode = dayNodes[stepIndex + 1] || dayNodes[0];
      
      setActiveTourNode(node);
      setTourNextInfo(`${nextNode.title}까지 ${seg.mode} ${seg.duration}`);
      
      const mainItem = {
        id: node.id,
        isMain: true,
        title: node.title,
        subtitle: '',
        imageUrl: node.image || '/placeholder.png',
        label: node.id === -1 ? '출발/숙소' : '메인 일정',
        lat: node.lat,
        lng: node.lng,
        fallbackTried: false
      };
      setCarouselItems([mainItem]);
      setCarouselIndex(0);

      fetchNearbyPlacesNew(node);
    }, 2500);
  };

  const handleNextTourStep = () => {
    const nextStep = tourStep + 1;
    if (nextStep >= dayNodes.length) {
      stopTour();
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [dayNodes[0].lng, dayNodes[0].lat], zoom: 13, pitch: 0, bearing: 0, duration: 2500 });
        setIs3DView(false);
      }
    } else {
      executeFlyTo(nextStep, tourSegments);
    }
  };

  const handlePrevPhoto = () => setCarouselIndex((prev) => (prev === 0 ? carouselItems.length - 1 : prev - 1));
  const handleNextPhoto = () => setCarouselIndex((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1));

  const handleNodeAction = async (nodeId: number) => {
    const map = mapRef.current;
    if (!map) return;
    setSelectedPinIndex(nodeId);
    const currentIndex = dayNodes.findIndex(n => n.id === nodeId);
    if (currentIndex === -1) return;
    const currentNode = dayNodes[currentIndex];
    const nextNode = dayNodes[currentIndex + 1] || dayNodes[0];
    
    if (isArchiveMode) {
      map.flyTo({ center: [currentNode.lng, currentNode.lat], zoom: is3DView ? 16 : 14.5, pitch: is3DView ? 40 : 0, duration: 1500, essential: true });
      return;
    }

    if (!isGoogleLoaded || !window.google?.maps) return;
    map.flyTo({ center: [currentNode.lng, currentNode.lat], zoom: 14.5, duration: 1500, essential: true });
    setIsLoadingRoute(true);
    const directionsService = new window.google.maps.DirectionsService();
    let finalResult: google.maps.DirectionsResult | null = null;
    let travelModeLabel = ""; let fareText = "";
    
    try {
      const walkResult = await directionsService.route({ origin: { lat: currentNode.lat, lng: currentNode.lng }, destination: { lat: nextNode.lat, lng: nextNode.lng }, travelMode: window.google.maps.TravelMode.WALKING });
      if ((walkResult.routes[0]?.legs[0]?.duration?.value || Infinity) <= 1200) { finalResult = walkResult; travelModeLabel = "🚶 도보"; } else throw new Error("도보 초과");
    } catch {
      try {
        const transitResult = await directionsService.route({ origin: { lat: currentNode.lat, lng: currentNode.lng }, destination: { lat: nextNode.lat, lng: nextNode.lng }, travelMode: window.google.maps.TravelMode.TRANSIT });
        finalResult = transitResult; travelModeLabel = "🚇 대중교통";
        if (transitResult.routes[0]?.fare) fareText = (transitResult.routes[0].fare as any).text;
      } catch {
        try {
          const driveResult = await directionsService.route({ origin: { lat: currentNode.lat, lng: currentNode.lng }, destination: { lat: nextNode.lat, lng: nextNode.lng }, travelMode: window.google.maps.TravelMode.DRIVING });
          finalResult = driveResult; travelModeLabel = "🚕 택시"; fareText = "요금 별도";
        } catch (e) {}
      }
    }
    
    setIsLoadingRoute(false);
    if (finalResult && finalResult.routes[0]) {
      const decodedCoords = polyline.decode(finalResult.routes[0].overview_polyline).map(([lat, lng]) => [lng, lat]);
      // 💡 [핵심] 클릭한 구간을 초록색으로 하이라이트!
      (map.getSource('selected-route-source') as mapboxgl.GeoJSONSource)?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: decodedCoords } });
      let segmentLabel = ""; let targetTitle = "";
      if (nodeId === -1) { segmentLabel = `호텔 ➔ ①`; targetTitle = `① ${nextNode.title}`; }
      else if (currentIndex === dayNodes.length - 1) { segmentLabel = `${nodeId + 1} ➔ 호텔`; targetTitle = `🏨 ${nextNode.title} (숙소로 귀가)`; }
      else { segmentLabel = `${nodeId + 1} ➔ ${nextNode.id + 1}`; targetTitle = `${nextNode.id + 1}번 ${nextNode.title}`; }
      setActiveRouteInfo({ title: targetTitle, segmentLabel, mode: travelModeLabel, distance: finalResult.routes[0].legs[0].distance?.text || "", duration: finalResult.routes[0].legs[0].duration?.text || "", fare: fareText });
    } else {
      clearRouteLine();
      setActiveRouteInfo({ title: `경로 탐색 불가`, segmentLabel: `이동`, mode: "✈️ 불가", distance: "바다/먼 구간", duration: "-", fare: "" });
    }
  };

  const toggle3DView = () => {
    if (!mapRef.current) return;
    const next3DState = !is3DView;
    setIs3DView(next3DState);
    mapRef.current.flyTo({ pitch: next3DState ? 45 : 0, zoom: next3DState ? 15 : 13 });
  };

  const renderMiniMap = () => {
    if (dayNodes.length < 2) return null;
    const W = 220, H = 140, P = 24;
    const lats = dayNodes.map(n => n.lat), lngs = dayNodes.map(n => n.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.0001, lngRange = maxLng - minLng || 0.0001;
    const getXY = (lat: number, lng: number) => ({ x: P + ((lng - minLng) / lngRange) * (W - P * 2), y: (H - P) - ((lat - minLat) / latRange) * (H - P * 2) });
    const pathData = dayNodes.map((n, i) => { const { x, y } = getXY(n.lat, n.lng); return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ');
    const { x: hx, y: hy } = getXY(dayNodes[0].lat, dayNodes[0].lng);
    const fullPath = pathData + ` L ${hx.toFixed(1)} ${hy.toFixed(1)}`;

    return (
      <svg width={W} height={H} className="mx-auto mt-1 drop-shadow-sm">
        <path d={fullPath} fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />
        {dayNodes.map((n) => {
          const { x, y } = getXY(n.lat, n.lng);
          const isSelected = selectedPinIndex === n.id;
          return (
            <g key={n.id} transform={`translate(${x},${y})`} onClick={() => handleNodeAction(n.id)} className="cursor-pointer hover:scale-110 transition-transform origin-center">
              <circle cx="0" cy="0" r={isSelected ? "13" : "9"} fill={isSelected ? "#ea580c" : (n.id === -1 ? "#1E3A8A" : "#f97316")} stroke="white" strokeWidth="2" className="shadow-md transition-all" />
              <text x="0" y="3.5" textAnchor="middle" fill="white" fontSize={isSelected ? "11" : "9"} fontWeight="bold" style={{ pointerEvents: 'none' }}>{n.label.replace('🏨', '')}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const currentItem = carouselItems.length > 0 ? carouselItems[carouselIndex] : null;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[20px]">
      <style>{`
        @keyframes mapboxPulse { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(2.5); opacity: 0; } }
        .animate-slow-pulse { animation: mapboxPulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1); }
      `}</style>

      {isArchiveMode && activeTourNode && currentItem && !isFlying && (
        isCardExpanded ? (
          <div className="absolute top-20 right-6 z-40 bg-white/95 p-3.5 rounded-2xl shadow-2xl border border-slate-100 backdrop-blur-md animate-in zoom-in-95 slide-in-from-right-8 duration-300 flex flex-col gap-3 w-[260px]">
            <button 
              onClick={() => setIsCardExpanded(false)}
              className="absolute -top-3 -right-3 bg-white text-slate-600 hover:text-slate-900 shadow-md border border-slate-200 rounded-full p-1.5 z-50 transition-transform hover:scale-110"
              title="지도 넓게 보기"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            <div className="relative w-full h-[150px] rounded-xl overflow-hidden bg-slate-100 shadow-inner border border-slate-200/60 flex items-center justify-center group">
              <img 
                src={currentItem.imageUrl} 
                alt={currentItem.title} 
                onError={() => handleImageError(currentItem, carouselIndex)}
                onClick={() => {
                  if (!currentItem.isMain) handleHighlightLocation(currentItem.lat, currentItem.lng);
                }}
                className={`w-full h-full object-cover transition-transform hover:scale-105 duration-500 ${!currentItem.isMain ? 'cursor-pointer' : ''}`} 
              />
              
              <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
                <div className="bg-slate-900/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {currentItem.label}
                </div>
              </div>

              {carouselIndex !== 0 && (
                <button 
                  onClick={() => setCarouselIndex(0)}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-700 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1 transition-all z-10"
                >
                  <RotateCcw className="w-3 h-3" /> 원래 장소
                </button>
              )}

              {carouselItems.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevPhoto} 
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-1.5 transition-all shadow-md backdrop-blur-sm z-10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleNextPhoto} 
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-1.5 transition-all shadow-md backdrop-blur-sm z-10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {carouselItems.map((_, idx) => (
                      <span key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === carouselIndex ? 'bg-white scale-125 shadow-sm' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="px-1">
              <div 
                onClick={() => {
                  if (!currentItem.isMain) handleHighlightLocation(currentItem.lat, currentItem.lng);
                }}
                className={`${!currentItem.isMain ? 'cursor-pointer hover:bg-slate-100 group' : ''} p-1 -ml-1 rounded transition-colors`}
                title={!currentItem.isMain ? "지도에서 위치 보기" : ""}
              >
                <h3 className="font-bold text-[15px] text-slate-800 tracking-tight leading-snug line-clamp-2">
                  {currentItem.isMain ? (
                    <><span className="text-orange-500 mr-1">{activeTourNode.label}</span> {currentItem.title}</>
                  ) : (
                    <>📍 {currentItem.title} <span className="text-slate-500 text-xs ml-0.5 font-medium tracking-normal">· {currentItem.subtitle}</span></>
                  )}
                </h3>
                {!currentItem.isMain && (
                  <p className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-0.5 opacity-80 group-hover:opacity-100 font-medium">
                    <MapPin className="w-3 h-3" /> 지도에서 위치 보기
                  </p>
                )}
              </div>

              {carouselItems.length > 1 && (
                <div className="mt-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" /> 주변 일정 둘러보기
                  </div>
                  <ul className="text-[10.5px] space-y-1.5 pl-0.5">
                    {carouselItems.slice(1).map((place, i) => {
                      const globalIndex = i + 1;
                      const isSelected = carouselIndex === globalIndex;
                      return (
                        <li 
                          key={globalIndex} 
                          onClick={() => setCarouselIndex(globalIndex)}
                          className={`flex justify-between items-center cursor-pointer p-1 -ml-1 rounded transition-colors ${
                            isSelected ? 'bg-orange-100 text-orange-700 font-bold border border-orange-200' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate w-3/4 mr-1 tracking-tight flex items-center gap-1">
                            {isSelected ? <CheckCircle2 className="w-3 h-3 text-orange-500 shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mx-0.5"></span>}
                            {place.title}
                          </span>
                          <span className={`font-medium shrink-0 ${isSelected ? 'text-orange-600' : 'text-slate-400'}`}>
                            {place.subtitle}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex items-start gap-1.5 mt-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-600 font-medium leading-tight">
                  다음 장소 안내<br/>
                  <span className="text-slate-800 font-bold">{tourNextInfo}</span>
                </p>
              </div>
              
              <Button 
                onClick={handleNextTourStep}
                className="w-full mt-3 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 shadow-md transition-all hover:-translate-y-0.5 flex justify-between px-4"
              >
                <span>{tourStep >= dayNodes.length - 1 ? '사전답사 완료' : '다음 장소로'}</span>
                {tourStep >= dayNodes.length - 1 ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="absolute top-20 right-6 z-40 animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsCardExpanded(true)}
              className="bg-white/95 text-slate-800 hover:bg-white shadow-xl border border-slate-200 rounded-full px-5 py-2.5 font-bold flex items-center gap-2 transition-transform hover:scale-105"
              title="카드 펴기"
            >
              <span>📍 {activeTourNode.title}</span>
              <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
            </button>
          </div>
        )
      )}

      {isArchiveMode && isPlaying && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 text-white px-5 py-2 rounded-full shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Play className="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" />
          <div className="text-xs font-bold tracking-wider">
            {isFlying ? '비행 중...' : '사전답사 진행 중'}
          </div>
        </div>
      )}

      {tripDetailInfo?.hotels?.length > 1 && (
        <div className="absolute top-4 left-4 z-10 flex gap-2 bg-white/90 p-1.5 rounded-xl shadow-md backdrop-blur-sm border border-slate-100">
          {tripDetailInfo.hotels.map((hotel: any, idx: number) => (
            <Button key={idx} variant={selectedHotelIndex === idx ? "default" : "outline"} onClick={() => setSelectedHotelIndex(idx)} className={`font-bold text-xs h-8 px-3 rounded-lg ${selectedHotelIndex === idx ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
              호텔 {idx === 0 ? 'A' : 'B'} 기준
            </Button>
          ))}
        </div>
      )}

      {isArchiveMode ? (
        <div className="absolute top-4 right-4 z-10">
          <Button type="button" onClick={toggle3DView} className="bg-white hover:bg-gray-100 text-gray-800 font-bold shadow-lg border border-gray-200 rounded-lg px-4 py-2 text-sm flex items-center gap-2 transition-all">
            {is3DView ? <><MapIcon className="w-4 h-4 text-blue-600" />지도 보기</> : <><Eye className="w-4 h-4 text-orange-500" />3D 모드</>}
          </Button>
        </div>
      ) : (
        dayNodes.length > 0 && (
          <div className="absolute top-4 right-4 z-10 bg-white/95 p-3 rounded-2xl shadow-xl backdrop-blur-md border border-slate-100 w-[244px] select-none pointer-events-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2"><span className="text-xs font-black tracking-wider text-slate-800 flex items-center gap-1">🗺️ DAY {selectedDayIndex + 1} ROADMAP</span></div>
            {renderMiniMap()}
          </div>
        )
      )}

      {tripDetailInfo?.itinerary && (
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
          <Button onClick={() => setIsDaySidebarOpen(!isDaySidebarOpen)} className="font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg h-9 px-4 text-xs">
            DAY {selectedDayIndex + 1}
          </Button>
          {isDaySidebarOpen && (
            <div className="flex gap-1.5 bg-white/95 p-1.5 rounded-full shadow-md backdrop-blur-sm border border-slate-100 animate-in slide-in-from-left-4">
              {tripDetailInfo.itinerary.map((day: any, idx: number) => (
                <Button key={idx} variant={selectedDayIndex === idx ? "default" : "ghost"} onClick={() => { setSelectedDayIndex(idx); setIsDaySidebarOpen(false); }} className={`font-bold rounded-full h-7 px-3 text-xs ${selectedDayIndex === idx ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
                  {idx + 1}일차
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {isArchiveMode ? (
        <Button 
          type="button"
          onClick={isPlaying ? stopTour : startTour}
          className={`absolute bottom-6 right-6 z-10 shadow-xl rounded-full px-6 py-6 font-bold transition-all hover:scale-105 ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
        >
          {isTourLoading ? (
            <span className="animate-pulse">경로 준비 중...</span>
          ) : isPlaying ? (
            <><Square className="w-5 h-5 mr-2" fill="currentColor" />사전 답사 중지</>
          ) : (
            <><Play className="w-5 h-5 mr-2" fill="currentColor" />사전 답사 시작</>
          )}
        </Button>
      ) : (
        (activeRouteInfo || isLoadingRoute) && (
          <div className="absolute bottom-4 right-4 z-10 bg-white/95 p-4 rounded-2xl shadow-xl border border-slate-100 w-[240px] backdrop-blur-md animate-in slide-in-from-bottom-4">
            <button onClick={clearRouteLine} className="absolute top-2.5 right-3 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
            {isLoadingRoute ? (
              <div className="py-4 text-center text-xs text-slate-500 font-medium animate-pulse">경로 계산 중...</div>
            ) : (
              <>
                <div className="text-[11px] font-bold text-blue-600 tracking-tight mb-0.5">{activeRouteInfo?.segmentLabel}</div>
                <h4 className="font-bold text-slate-800 text-sm mb-2 truncate">{activeRouteInfo?.title}</h4>
                <div className="bg-slate-50 p-2 rounded-xl text-xs space-y-1 border border-slate-100">
                  <div className="font-semibold text-slate-700 flex items-center justify-between"><span>{activeRouteInfo?.mode}</span><span className="text-slate-500 font-normal">{activeRouteInfo?.distance}</span></div>
                  <div className="flex items-center justify-between text-slate-500"><span>예상 소요시간</span><span className="font-medium text-slate-700">{activeRouteInfo?.duration}</span></div>
                  {activeRouteInfo?.fare && <div className="text-[11px] text-blue-600 font-semibold pt-0.5 border-t border-slate-200/60">{activeRouteInfo.fare}</div>}
                </div>
              </>
            )}
          </div>
        )
      )}

      <div ref={mapContainerRef} style={{ width: '100%', height: '85vh' }} />
    </div>
  );
}