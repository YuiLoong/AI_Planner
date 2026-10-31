"use client"
import { Button } from '@/components/ui/button';
import { useConvex } from 'convex/react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useUserDetail } from '../Provider';
import { api } from '@/convex/_generated/api';
import MyTripCardItem from './_components/MyTripCardItem';
import { TripInfo } from '../create-new-trip/_compoents/ChatBox';

export type Trip = {
  tripId: any;
  tripDetail: TripInfo;
  _id: string;
  isPinned?: boolean;
  isStamped?: boolean;
  stampDate?: string;
};

function MyTrips() {
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const { userDetail } = useUserDetail();
  const convex = useConvex();
  const [isStampMode, setIsStampMode] = useState(false);

  useEffect(() => {
    if (userDetail) {
      GetUserTrips();
    }
  }, [userDetail]);

  const GetUserTrips = async () => {
    const result = await convex.query(api.tripDetail.GetUserTrips, {
      uid: userDetail?._id
    });
    setMyTrips(result);
  };

  const validTrips = myTrips?.filter(trip => trip?.tripDetail?.trip_image_url) || [];

  // 💡 핀 고정 정렬: isPinned가 true인 항목을 맨 위로 배치
  const sortedTrips = [...validTrips].sort((a, b) => {
    const aPin = a.isPinned ? 1 : 0;
    const bPin = b.isPinned ? 1 : 0;
    return bPin - aPin;
  });

  return (
    <div className='px-6 py-10 md:px-16 lg:px-24 max-w-7xl mx-auto'>
      <div className='flex justify-between items-center mb-8'>
        <div className='flex items-center gap-3'>
          <h2 className='font-bold text-3xl text-gray-900'>✈️ 여행 일정</h2>
          {validTrips.length > 0 && (
            <span className='text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-600'>
              {validTrips.length}개
            </span>
          )}
        </div>

        <Button 
          onClick={() => setIsStampMode(!isStampMode)} 
          variant={isStampMode ? "default" : "outline"}
          className={isStampMode ? "bg-red-500 hover:bg-red-600 text-white" : "border-gray-300 text-gray-700"}
        >
          {isStampMode ? "완료" : "도장 찍기"}
        </Button>
      </div>

      {validTrips.length === 0 && (
        <div className='p-12 border border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 bg-gray-50/50'>
          <p className='text-gray-500 font-medium'>아직 생성된 여행 일정이 없습니다.</p>
          <Link href={'/create-new-trip'}>
            <Button>새로운 일정 만들기</Button>
          </Link>
        </div>
      )}

      {/* 정렬된 목록 렌더링 */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {sortedTrips.map((trip) => (
          <MyTripCardItem 
            key={trip._id} 
            trip={trip} 
            isStampMode={isStampMode} 
            refreshData={GetUserTrips}
          />
        ))}
      </div>
    </div>
  );
}

export default MyTrips;