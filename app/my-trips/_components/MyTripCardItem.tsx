"use client"
import React, { useState, useEffect } from 'react';
import { Trip } from '../page';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarIcon, Pin } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

type Props = {
  trip: Trip;
  isStampMode: boolean;
  refreshData: () => void;
};

const MyTripCardItem = ({ trip, isStampMode, refreshData }: Props) => {
  const [isStamped, setIsStamped] = useState(trip.isStamped || false);
  const [stampDate, setStampDate] = useState(trip.stampDate || "");
  const [isPinned, setIsPinned] = useState(trip.isPinned || false);

  const updateOptions = useMutation(api.tripDetail.updateTripOptions);

  useEffect(() => {
    setIsStamped(trip.isStamped || false);
    setStampDate(trip.stampDate || "");
    setIsPinned(trip.isPinned || false);
  }, [trip]);

  const destName = typeof trip?.tripDetail?.destination === 'object' 
    ? (trip?.tripDetail?.destination as any)?.city 
    : (trip?.tripDetail?.destination as string) || "어딘가로의";

  const savedImageUrl = trip?.tripDetail?.trip_image_url || '/placeholder.png';
  const rawDate = (trip as any)?.createdAt || (trip as any)?._creationTime || (trip as any)?.tripDetail?.createdAt;
  const formattedDate = rawDate
    ? new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(new Date(rawDate))
    : null;

  // 카드 클릭 시 도장 찍기/지우기 및 DB 저장
  const handleCardClick = async (e: React.MouseEvent) => {
    if (isStampMode) {
      e.preventDefault();
      const nextStamped = !isStamped;
      let nextDate = "";

      if (nextStamped) {
        const today = new Date();
        const yy = today.getFullYear().toString().slice(2);
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        nextDate = `${yy}.${mm}.${dd}`;
      }

      setIsStamped(nextStamped);
      setStampDate(nextDate);

      await updateOptions({
        tripDocId: trip._id as any,
        isStamped: nextStamped,
        stampDate: nextDate,
      });
      refreshData();
    }
  };

  // 핀 클릭 시 상단 고정 토글 및 DB 저장
  const handlePinClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextPinned = !isPinned;
    setIsPinned(nextPinned);

    await updateOptions({
      tripDocId: trip._id as any,
      isPinned: nextPinned,
    });
    refreshData();
  };

  return (
    <>
      <style jsx>{`
        @keyframes stamp-slam {
          0% { transform: scale(3) rotate(-15deg); opacity: 0; }
          50% { transform: scale(0.9) rotate(-15deg); opacity: 1; }
          100% { transform: scale(1) rotate(-15deg); opacity: 1; }
        }
        .animate-stamp {
          animation: stamp-slam 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      <Link 
        href={'/view-trips/' + trip?.tripId} 
        onClick={handleCardClick}
        className={`relative group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-200 overflow-hidden
          ${isStampMode ? 'cursor-crosshair ring-2 ring-red-400 hover:scale-[1.02]' : 'hover:shadow-md hover:-translate-y-1 cursor-pointer'}
        `}
      >
        {/* 상단 고정 핀 버튼 */}
        <button 
          type="button"
          onClick={handlePinClick}
          className={`absolute top-3 left-3 z-30 p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm
            ${isPinned 
              ? 'bg-amber-400 text-white hover:bg-amber-500' 
              : 'bg-white/80 text-gray-500 hover:bg-white hover:text-gray-900'
            }
          `}
        >
          <Pin size={16} className={isPinned ? "fill-current" : ""} />
        </button>

        {/* 다녀옴 도장 */}
        {isStamped && (
          <div className="absolute top-4 right-4 z-20 animate-stamp pointer-events-none">
            <div className="relative w-[96px] h-[96px] flex flex-col items-center justify-center opacity-90 mix-blend-multiply">
              <div className="absolute inset-0 rounded-full border-[3px] border-red-500 border-double opacity-80"></div>
              <div className="absolute inset-1 rounded-full border-[1.5px] border-red-500 border-dotted opacity-70"></div>
              <span className="relative z-10 font-black text-[18px] text-red-500 tracking-widest bg-white/60 px-1 py-0.5 rounded-sm backdrop-blur-[2px] border-y border-red-500 transform -rotate-12 mt-1">
                다녀옴
              </span>
              <span className="relative z-10 font-bold text-[10px] text-red-500 bg-white/70 px-1 rounded-sm backdrop-blur-[2px] transform -rotate-12 mt-0.5">
                {stampDate}
              </span>
            </div>
          </div>
        )}

        {/* 썸네일 */}
        <div className={`relative w-full h-[180px] overflow-hidden bg-gray-100 transition-all duration-300 ${isStamped ? 'grayscale-[35%]' : ''}`}>
          <Image 
            src={savedImageUrl} 
            alt={destName ? `${destName} 여행` : 'trip image'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={`object-cover transition-transform duration-300 ${!isStampMode && 'group-hover:scale-105'}`}
          />
        </div>

        {/* 정보 영역 */}
        <div className='p-4 flex flex-col gap-1.5'>
          <h2 className='font-bold text-lg text-gray-900 truncate group-hover:text-blue-600 transition-colors'>
            {destName} 여행
          </h2>
          <p className='text-sm text-gray-500 font-medium'>
            {trip?.tripDetail?.budget || '스탠다드'} • {trip?.tripDetail?.duration || '1박 2일'} 
          </p>
          {formattedDate && (
            <div className='flex items-center gap-1 mt-1 text-xs text-gray-400'>
              <CalendarIcon className='w-3.5 h-3.5' />
              <span>{formattedDate}</span>
            </div>
          )}
        </div>
      </Link>
    </>
  );
};

export default MyTripCardItem;