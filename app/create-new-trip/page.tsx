'use client'
import React, { useState } from 'react'
import ChatBox from './_compoents/ChatBox'
import Itinerary from './_compoents/Itinerary'
import GoogleGlobalMap from '@/components/map/GoogleGlobalMap';
import { Button } from '@/components/ui/button';
import { Globe2, Plane } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider, // 1. TooltipProvider 추가
  TooltipTrigger,
} from "@/components/ui/tooltip"
import GlobalMap from './_compoents/GlobalMap';
export const maxDuration = 60;

function createNewTrip () {
  const [activeIndex, setActiveIndex] = useState(1);

  return (
    <div className='flex flex-col md:flex-row gap-2 p-10'>
      <div className='w-full md:w-[37%]'>
        <ChatBox />
      </div>

      <div className='w-full md:w-[62%] relative'>
        {activeIndex == 0 ? <Itinerary /> : <GlobalMap />}
        
        {/* 2. TooltipProvider로 감싸기 */}
        <TooltipProvider>
          <Tooltip>
            {/* asChild를 넣어야 Button과 충돌 없이 깔끔하게 동작합니다 */}
            <TooltipTrigger asChild>
              <Button
                size={'lg'}
                onClick={() => setActiveIndex(activeIndex == 0 ? 1 : 0)}
                className='absolute bg-black hover:bg-gray-500 bottom-10 left-[50%] -translate-x-1/2'
              >
                {activeIndex == 0 ? <Plane /> : <Globe2 />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="whitespace-nowrap px-3 py-1.5 text-xs">
              <p>지도 / 일정 전환</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export default createNewTrip;