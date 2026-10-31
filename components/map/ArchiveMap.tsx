'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';


mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface Place {
  name: string;
  lat: number;
  lng: number;
}

// 💡 좌표 데이터가 늦게 로딩될 때를 대비한 기본값 (파리 중심부)
const DEFAULT_CENTER: [number, number] = [2.3522, 48.8566];

export default function ArchiveMap({ places }: { places: Place[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. 지도 초기화 (places 유무와 무관하게 무조건 1회 생성)
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initialCenter: [number, number] = places && places.length > 0 
      ? [places[0].lng, places[0].lat] 
      : DEFAULT_CENTER;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: 13,
      pitch: 0,
      bearing: 0,
    });

    map.current.on('load', () => {
      // 3D 건물 레이어 추가
      if (map.current && !map.current.getLayer('3d-buildings')) {
        map.current.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#e2e8f0',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.7
          }
        });
      }
      // 컨테이너 리사이징 보정
      map.current?.resize();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 2. places 데이터가 뒤늦게 들어왔을 때 마커 렌더링 및 카메라 이동
  useEffect(() => {
    if (!map.current || !places || places.length === 0) return;

    // 첫 번째 장소로 중심 이동
    map.current.flyTo({
      center: [places[0].lng, places[0].lat],
      zoom: 13,
      duration: 1000
    });

    // 기존에 추가된 마커 DOM 제거 후 재등록
    document.querySelectorAll('.mapbox-custom-marker').forEach(el => el.remove());

    places.forEach((place, index) => {
      const el = document.createElement('div');
      el.className = 'mapbox-custom-marker bg-orange-500 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-md text-xs';
      el.innerText = (index + 1).toString();

      new mapboxgl.Marker(el)
        .setLngLat([place.lng, place.lat])
        .addTo(map.current!);
    });
  }, [places]);

  // 3. 사전 답사 3D 투어
  const startTour = async () => {
    if (!map.current || !places || places.length === 0) {
      alert('방문할 장소 좌표 데이터가 없습니다.');
      return;
    }
    setIsPlaying(true);

    for (let i = 0; i < places.length; i++) {
      const place = places[i];

      map.current.flyTo({
        center: [place.lng, place.lat],
        zoom: 16.5,
        pitch: 65,
        bearing: i * 45,
        duration: 3500,
        essential: true
      });

      await new Promise(resolve => setTimeout(resolve, 5500));
    }

    map.current.flyTo({
      center: [places[0].lng, places[0].lat],
      zoom: 13,
      pitch: 0,
      bearing: 0,
      duration: 2000
    });

    setTimeout(() => setIsPlaying(false), 2000);
  };

  return (
    <div className="relative w-full h-[650px] shadow-lg rounded-2xl overflow-hidden border border-gray-200">
      {/* 💡 컨테이너에 명시적인 h-full과 w-full 부여 */}
      <div ref={mapContainer} className="w-full h-full" />
      
      <Button 
        type="button"
        onClick={startTour}
        disabled={isPlaying}
        className="absolute bottom-6 right-6 z-10 shadow-xl rounded-full px-6 py-6 bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all hover:scale-105"
      >
        <Play className="w-5 h-5 mr-2" fill="currentColor" />
        {isPlaying ? '사전 답사 진행 중...' : '사전 답사 시작'}
      </Button>
    </div>
  );
}