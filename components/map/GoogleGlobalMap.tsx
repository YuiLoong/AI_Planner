'use client';

import React, { useEffect, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, InfoWindow } from '@react-google-maps/api';
import { useTripDetailInfo } from '@/app/Provider';
import { Button } from '@/components/ui/button'; 

const containerStyle = { width: '100%', height: '85vh', borderRadius: '20px' };
const defaultCenter = { lat: 35.6762, lng: 139.6503 };
const DAY_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];

export default function GoogleGlobalMap() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const { tripDetailInfo } = useTripDetailInfo() as any;
  
  useEffect(() => {
    console.log("현재 여행 데이터 상태:", tripDetailInfo);
  }, [tripDetailInfo]);
  
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsList, setDirectionsList] = useState<any[]>([]);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  
  const [selectedHotelIndex, setSelectedHotelIndex] = useState<number>(0);

  useEffect(() => {
    // ⭐️ 수정: .trip_plan 껍데기 제거
    if (!isLoaded || !tripDetailInfo?.hotels) return;
    const plan = tripDetailInfo;

    const calculateRoutes = async () => {
      const directionsService = new window.google.maps.DirectionsService();
      const newRoutes: any[] = [];

      const baseHotel = plan.hotels?.[selectedHotelIndex];
      const hotelLocation = baseHotel ? {
        lat: baseHotel.geo_coordinates.latitude,
        lng: baseHotel.geo_coordinates.longitude
      } : null;

      if (!hotelLocation) return;

      if (plan.itinerary) {
        for (let i = 0; i < plan.itinerary.length; i++) {
          const dayPlan = plan.itinerary[i];
          const color = DAY_COLORS[i % DAY_COLORS.length];
          
          let previousLocation = hotelLocation; 

          for (let j = 0; j <= dayPlan.activities.length; j++) {
            const isGoingBackToHotel = j === dayPlan.activities.length;
            const activity = !isGoingBackToHotel ? dayPlan.activities[j] : null;
            
            const currentLocation = isGoingBackToHotel 
              ? hotelLocation 
              : {
                  lat: activity.geo_coordinates.latitude,
                  lng: activity.geo_coordinates.longitude ?? (activity.geo_coordinates as any).londtiude
                };

            if (previousLocation && currentLocation.lat) {
              let finalResult: google.maps.DirectionsResult | null = null;
              let travelModeLabel = "";
              let fareText = "";

              try {
                const walkResult = await directionsService.route({
                  origin: previousLocation,
                  destination: currentLocation,
                  travelMode: window.google.maps.TravelMode.WALKING,
                });

                const walkDuration = walkResult.routes[0]?.legs[0]?.duration?.value || Infinity;

                if (walkDuration <= 1200) { 
                  finalResult = walkResult;
                  travelModeLabel = "도보";
                } else {
                  throw new Error("도보 20분 초과");
                }
              } catch (walkError) {
                try {
                  const transitResult = await directionsService.route({
                    origin: previousLocation,
                    destination: currentLocation,
                    travelMode: window.google.maps.TravelMode.TRANSIT,
                  });

                  let transitWalkSec = 0;
                  transitResult.routes[0]?.legs[0]?.steps?.forEach((step: any) => {
                    if (step.travel_mode === 'WALKING') {
                      transitWalkSec += step.duration?.value || 0;
                    }
                  });

                  if (transitWalkSec > 1200) {
                    throw new Error("역까지 걷는 시간이 너무 깁니다.");
                  }

                  finalResult = transitResult;
                  travelModeLabel = "대중교통";
                  
                  if (transitResult.routes[0]?.fare) {
                    fareText = (transitResult.routes[0].fare as any).text;
                  }
                } catch (transitError) {
                  try {
                    const driveResult = await directionsService.route({
                      origin: previousLocation,
                      destination: currentLocation,
                      travelMode: window.google.maps.TravelMode.DRIVING,
                    });
                    
                    finalResult = driveResult;
                    travelModeLabel = "택시";
                    fareText = "택시 요금 별도";
                  } catch (driveError) {
                    console.error("경로 검색 실패:", driveError);
                  }
                }
              }

              if (finalResult) {
                newRoutes.push({
                  result: finalResult,
                  color,
                  id: `day${dayPlan.day}-route${j}`,
                  info: { mode: travelModeLabel, ...finalResult.routes[0].legs[0] }
                });
              }
            }
            previousLocation = currentLocation;
          }
        }
      }
      setDirectionsList(newRoutes);
    };

    calculateRoutes();
  }, [isLoaded, tripDetailInfo, selectedHotelIndex]); 

  useEffect(() => {
    // ⭐️ 수정: .trip_plan 껍데기 제거
    if (map && tripDetailInfo?.hotels?.[selectedHotelIndex]) {
      const targetLocation = tripDetailInfo.hotels[selectedHotelIndex].geo_coordinates;
      
      if (targetLocation.latitude && targetLocation.longitude) {
        map.panTo({ lat: targetLocation.latitude, lng: targetLocation.longitude });
        map.setZoom(12); 
      }
    }
  }, [map, tripDetailInfo, selectedHotelIndex]);

  if (!isLoaded) return <div className="w-full h-full bg-gray-100 animate-pulse rounded-xl" />;

  // ⭐️ 수정: .trip_plan 껍데기 제거
  const centerPos = tripDetailInfo?.hotels?.[selectedHotelIndex]?.geo_coordinates 
    ? { 
        lat: tripDetailInfo.hotels[selectedHotelIndex].geo_coordinates.latitude, 
        lng: tripDetailInfo.hotels[selectedHotelIndex].geo_coordinates.longitude 
      } 
    : defaultCenter;

  return (
    <div className="relative w-full h-full flex flex-col gap-4">
      
      {/* ⭐️ 수정: .trip_plan 껍데기 제거 */}
      {tripDetailInfo?.hotels?.length > 1 && (
        <div className="absolute top-4 left-4 z-10 flex gap-2 bg-white/90 p-2 rounded-lg shadow-md backdrop-blur-sm">
          {tripDetailInfo.hotels.map((hotel: any, index: number) => (
            <Button
              key={index}
              variant={selectedHotelIndex === index ? "default" : "outline"}
              onClick={() => setSelectedHotelIndex(index)}
              className="font-bold"
            >
              호텔 {index === 0 ? 'A' : 'B'} 기준 경로 보기
            </Button>
          ))}
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={centerPos}
        zoom={12}
        onLoad={(map) => setMap(map)}
        options={{ disableDefaultUI: true }} // 지도 UI 깔끔하게
      >
        {directionsList.map((routeData) => (
          <DirectionsRenderer
            key={routeData.id}
            directions={routeData.result}
            options={{
              suppressMarkers: true, 
              polylineOptions: { strokeColor: routeData.color, strokeWeight: 5, strokeOpacity: 0.8 },
            }}
          />
        ))}

        {/* ⭐️ 수정: .trip_plan 껍데기 제거 */}
        {tripDetailInfo?.hotels?.map((hotel: any, index: number) => {
          const lat = hotel.geo_coordinates.latitude;
          const lng = hotel.geo_coordinates.longitude;
          if (!lat || !lng) return null;

          const markerIcon = index === 0 
            ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" 
            : "http://maps.google.com/mapfiles/ms/icons/purple-dot.png";
          
          return (
            <Marker
              key={`hotel-${index}`}
              position={{ lat, lng }}
              icon={markerIcon}
              label={{ text: index === 0 ? "A" : "B", color: "white", fontWeight: "bold" }}
              onClick={() => setActiveMarker(`hotel-${index}`)}
            >
              {activeMarker === `hotel-${index}` && (
                <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                  <div className="font-bold text-gray-800">
                    <span className={index === 0 ? "text-blue-600" : "text-purple-600"}>[호텔 {index === 0 ? 'A' : 'B'}]</span> {hotel.hotel_name || '숙소'}
                  </div>
                </InfoWindow>
              )}
            </Marker>
          );
        })}

        {/* ⭐️ 수정: .trip_plan 껍데기 제거 */}
        {tripDetailInfo?.itinerary?.map((day: any) => 
          day.activities.map((act: any, idx: number) => {
            const lat = act.geo_coordinates.latitude;
            const lng = act.geo_coordinates.longitude ?? (act.geo_coordinates as any).londtiude; 
            if (!lat || !lng) return null;

            return (
              <Marker
                key={`act-${day.day}-${idx}`}
                position={{ lat, lng }}
                icon="http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                onClick={() => setActiveMarker(`act-${day.day}-${idx}`)}
              >
                {activeMarker === `act-${day.day}-${idx}` && (
                  <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                    <div className="font-bold text-gray-800 p-1">
                      <p className="text-sm">{act.place_name}</p>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            );
          })
        )}
      </GoogleMap>
    </div>
  );
}