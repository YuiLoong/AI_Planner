"use client"
import React, { useEffect, useState } from 'react'
import { Timeline } from "@/components/ui/timeline";
import Image from 'next/image';
import { ArrowLeft, Clock, ChevronLeft, ChevronRight } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import HotelCardItem from './HotelCardItem';
import PlaceCardItem from './PlaceCardItem';
import { useTripDetailInfo, useUserDetail } from '@/app/Provider';
import { useRouter } from 'next/navigation'; 
import { useMutation } from 'convex/react'; 
import { api } from '@/convex/_generated/api'; 
import { v4 as uuidv4 } from 'uuid';
import { fetchTripImageUrl } from './ChatBox'; 
import axios from 'axios';
export const maxDuration = 60;

function Itinerary({ isReadonly = false, onSendEmail }: { isReadonly?: boolean; onSendEmail?: () => void }) {
  const { tripDetailInfo, setTripDetailInfo } = useTripDetailInfo() as any;
  const { userDetail } = useUserDetail(); 
  const router = useRouter(); 
  const SaveTripDetail = useMutation(api.tripDetail.CreateTripDetail); 
  
  const [plans, setPlans] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false); 
  const [isSaving, setIsSaving] = useState(false); 

  // 2. 초기 렌더링 및 '지도에서 돌아왔을 때' 데이터 복구 로직
  useEffect(() => {
    if (!tripDetailInfo) return;
    
    // 이미 로컬에 플랜 데이터가 세팅되었다면 무시 (무한루프 방지)
    if (plans.length > 0) return; 

    // 지도 토글 후 돌아왔을 때, 백업해둔 데이터가 있다면 복구!
    if (tripDetailInfo._backupPlans) {
      setPlans(tripDetailInfo._backupPlans);
      setCurrentIndex(tripDetailInfo._backupIndex);
    } 
    // 맨 처음 로딩되었을 때
    else {
      setPlans([tripDetailInfo]);
      setCurrentIndex(0);
    }
  }, [tripDetailInfo]); // plans 의존성은 뺍니다.

  useEffect(() => {
    if (plans.length > 0) {
      const currentPlan = plans[currentIndex];
      
      setTripDetailInfo({
        ...currentPlan,
        _backupPlans: plans,
        _backupIndex: currentIndex
      });
    }
  }, [currentIndex, plans]);

  const currentPlanData = plans[currentIndex];
  const rawPlan = currentPlanData?.trip_plan || currentPlanData;
  
  // 1. 일수(duration)를 무조건 "N박 M일"로 계산해주는 함수 추가
const formatLocation = (loc: any) => {
  if (!loc) return "";
  return typeof loc === 'object' ? (loc.city || loc.name || "") : String(loc);
};

const formatDuration = (duration: any) => {
  if (!duration) return "1박 2일";
  const str = String(duration);

  // ⭐️ 이미 "박"이라는 글자가 들어있다면(예: 1박 2일), 건드리지 말고 그대로 내보냄!
  if (str.includes("박")) {
    return str;
  }

  // "3", "3일" 처럼 숫자만 넘어왔을 때만 N박 M일로 변환
  const match = str.match(/\d+/);
  const days = match ? parseInt(match[0], 10) : 2;
  const nights = days > 1 ? days - 1 : 0;
  return `${nights}박 ${days}일`;
};

const normalizePlan = (plan: any) => {
  if (!plan) return null;

  const rawDest = formatLocation(plan.destination || plan.location) || "여행지";
  
  const formattedDuration = formatDuration(plan.duration || plan.tripDuration || plan.days);

  return {
    ...plan,
    origin: formatLocation(plan.origin || plan.departure) || "서울",
    destination: rawDest,
    duration: formattedDuration, // "2박 3일"로 확정 박제!
    budget: plan.budget || "보통",
    group_size: plan.group_size || plan.groupSize || plan.people || "1명",

      hotels: (plan.hotels || []).map((h: any) => ({
        ...h,
        hotel_name: h.hotel_name || h.name || "호텔 이름 없음",
        hotel_address: h.hotel_address || h.location || "주소 정보 없음",
        price_per_night: h.price_per_night || h.price_range || "가격 정보 확인 중",
        hotel_image_url: h.hotel_image_url || h.hotel_name || "hotel", 
        geo_coordinates: h.geo_coordinates || { latitude: h.latitude, longitude: h.longitude },
        description: h.description || h.details || "설명 없음",
        rating: h.rating || 4.5
      })),

      itinerary: (plan.itinerary || plan.days || []).map((d: any, idx: number) => ({
        ...d,
        day: d.day || idx + 1,
        day_plan: d.day_plan || d.date || d.theme || `Day ${idx + 1}`,
        best_time_to_visit_day: d.best_time_to_visit_day || "09:00 AM",
        
        activities: (d.activities || d.schedule || []).map((a: any) => ({
          ...a,
          place_name: a.place_name || a.activity_name || "추천 장소",
          place_details: a.place_details || a.description || "상세 설명이 준비 중입니다.",
          place_address: a.place_address || a.location || "주소 확인 필요",
          ticket_pricing: a.ticket_pricing || a.price || "현장 확인",
          time_travel_each_location: a.time_travel_each_location || "이동 시간 정보 없음",
          best_time_to_visit: a.best_time_to_visit || a.time_of_day || "",
          place_image_url: a.place_image_url || a.image_keyword || "tokyo travel landmark", 
          geo_coordinates: a.geo_coordinates || { latitude: a.latitude, longitude: a.longitude }
        }))
      }))
    };
  };

  const safePlan = normalizePlan(rawPlan);

  const data = safePlan && (safePlan.hotels?.length > 0 || safePlan.itinerary?.length > 0)
    ? [
        ...(safePlan.hotels && safePlan.hotels.length > 0
          ? [{
              title: "추천 호텔 리스트",
              content: (
                <div key="item-1" className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {safePlan.hotels.map((hotel: any, index: number) => (
                    <HotelCardItem key={index} hotel={hotel} />
                  ))}
                </div>
              ),
            }]
          : []),

        ...(safePlan.itinerary?.map((dayData: any) => ({
          title: `Day ${dayData?.day}`,
          content: (
            <div className="flex flex-col gap-3">
              {dayData?.best_time_to_visit_day && (
                <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-md w-fit">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>활동 시작 권장: <strong>{dayData?.best_time_to_visit_day}</strong></span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dayData?.activities?.map((activity: any, index: number) => (
                  <PlaceCardItem key={index} activity={activity} />
                ))}
              </div>
            </div>
          ),
        })) || []),
      ]
    : [];

  // 🟢 AI 일정 재생성 로직 (통신 코드 탑재 완료!)
  const handleRegenerate = async () => {
    try {
      setIsGenerating(true);
      const destName = typeof safePlan.destination === 'object' ? safePlan.destination.city : safePlan.destination;
      
      const prompt = `너는 전문 여행 플래너야. 
      목적지: ${destName}
      여행 기간: ${safePlan.duration}
      예산: ${safePlan.budget}
      인원: ${safePlan.group_size}
      
      위 조건에 맞춰서, 이전에 짰던 일정과는 '완전히 다른 새로운 명소'와 '새로운 동선'으로 구성된 여행 일정을 다시 하나만 짜줘.
      반드시 JSON 형식으로만 응답하고, 최상위 키는 'trip_plan'으로 구성해줘. 인사말이나 부연 설명은 절대 금지야.`;

      const result = await axios.post('/api/aimodel', {
        messages: [{ role: 'user', content: prompt }],
        isFinal: true 
      });

      let chatResponse = result.data;
      console.log("🚨 재생성 AI 원본 데이터:", chatResponse);

      if (typeof chatResponse === 'string') {
        const jsonMatch = chatResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) chatResponse = JSON.parse(jsonMatch[0]);
      }

      const newPlan = chatResponse?.trip_plan || chatResponse;

      if (newPlan && newPlan.itinerary) {
        setPlans(prev => [...prev, newPlan]);
        setCurrentIndex(1); // 스무스하게 2번 탭으로 이동!
      } else {
        alert("AI가 일정 형식을 벗어나 생성에 실패했습니다. 한 번 더 눌러주세요!");
      }
    } catch (error) {
      console.error("재생성 오류:", error);
      alert("일정 재생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 🟢 최종 확정 및 DB 저장 로직
  const handleConfirm = async () => {
    try {
      setIsSaving(true);
      const finalPlan = plans[currentIndex]; 

      console.log("1. 저장할 유저 ID 확인:", userDetail?._id);

      const destName = typeof finalPlan.destination === 'object' 
        ? finalPlan.destination.city 
        : finalPlan.destination;

      const imageUrl = await fetchTripImageUrl(`${destName} travel landmark`);

      const finalPlanWithImage = {
        ...finalPlan,
        trip_image_url: imageUrl
      };

      const tripId = uuidv4(); 

      await SaveTripDetail({
        tripDetail: finalPlanWithImage, 
        tripId: tripId, 
        uid: userDetail?._id 
      });

      alert("최종 확정되었습니다! 🎉 나의 여행 일정으로 이동합니다.");
      router.push(`/view-trips/${tripId}`);

    } catch (e) {
      console.error("DB 저장 실패:", e);
      alert("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-[93%] ml-16 h-[83vh] flex flex-col">
       {plans.length > 0 ? (
         <>
           <div className="shrink-0 flex items-center justify-between bg-white/90 backdrop-blur-md p-4 mb-2 rounded-xl shadow-sm border">
             <div className="flex items-center gap-4">
               <Button 
                 variant="outline" 
                 size="icon" 
                 disabled={currentIndex === 0} 
                 onClick={() => setCurrentIndex(prev => prev - 1)}
               >
                 <ChevronLeft className="w-4 h-4" />
               </Button>
               <span className="font-semibold text-gray-700">
                 플랜 {currentIndex + 1} <span className="text-gray-400 font-normal">/ {plans.length}</span>
               </span>
               <Button 
                 variant="outline" 
                 size="icon" 
                 disabled={currentIndex === plans.length - 1} 
                 onClick={() => setCurrentIndex(prev => prev + 1)}
               >
                 <ChevronRight className="w-4 h-4" />
               </Button>
             </div>

          
             <div className="flex gap-2">
               {isReadonly ? (
                 <Button 
                  variant="outline" 
                  onClick={onSendEmail}
                  className="border-primary text-primary hover:bg-primary/10"
                  >
                  이메일로 전송 ✈️
                </Button>
               ) : (
                 <>
                   {plans.length < 2 && (
                     <Button variant="secondary" onClick={handleRegenerate} disabled={isGenerating}>
                       {isGenerating ? "새 일정 짜는 중... ✈️" : `다른 일정 받아보기 (${2 - plans.length}/1 남음)`}
                     </Button>
                   )}
                   <Button onClick={handleConfirm} disabled={isGenerating || isSaving} className="bg-blue-600 hover:bg-blue-700">
                     {isSaving ? "저장 중..." : "이 일정으로 확정하기"}
                   </Button>
                 </>
               )}
             </div>
           </div>

           <div className="relative flex-1 overflow-auto rounded-xl">
             <div key={currentIndex} className="animate-in fade-in slide-in-from-right-4 duration-500">
               <Timeline data={data} tripData={safePlan} />
             </div>
           </div>
         </>
       ) : (
         <div className="relative w-full h-full">
        <h2 className='flex gap-2 text-2xl text-white items-center absolute bottom-20 left-10 z-10 drop-shadow-md'> 
          <ArrowLeft/> 나만의 맞춤 여행, 여기서부터 그려볼까요?
        </h2>
        <Image 
          src={'/travel.png'} 
          alt={'travel'} 
          width={'800'}
          height={800}
          className='w-full h-full object-cover rounded-3xl'
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-3xl pointer-events-none" />
      </div>
       )}
    </div>
  );
}

export default Itinerary;

function formatLocation(arg0: any) {
  throw new Error('Function not implemented.');
}
