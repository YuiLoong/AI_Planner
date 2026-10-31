import { Button } from '@/components/ui/button'
import { Clock, ExternalLink, Ticket, Info } from 'lucide-react'
import React from 'react'
import { Activity } from './ChatBox'
import PlaceImage from './PlaceImage'

type Props = {
  activity: Activity
}

function PlaceCardItem({ activity }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {/* 장소 이미지 */}
      <PlaceImage 
        keyword={`${activity?.place_name} ${activity?.place_address || ''}`.trim()} 
        alt={activity?.place_name || 'place image'}
      />

      {/* 장소 이름 + (i) 툴팁 아이콘 */}
      <div className="flex items-center justify-between mt-1">
        <h2 className="font-semibold text-lg line-clamp-1">{activity?.place_name}</h2>
        
        {/* 💡 툴팁 영역: recommend_reason이 있을 때만 (i) 아이콘 표시 */}
        {activity?.recommend_reason && (
          <div className="relative group/tooltip cursor-pointer ml-1 flex-shrink-0">
            <Info className="w-4 h-4 text-gray-400 hover:text-primary transition-colors" />
            
            {/* 마우스 호버 시 나오는 툴팁 풍선 */}
            <div className="absolute right-0 bottom-6 hidden group-hover/tooltip:block w-60 p-3 bg-slate-900/95 text-white text-xs rounded-xl shadow-xl z-50 whitespace-pre-wrap leading-relaxed animate-in fade-in zoom-in-95 duration-150">
              <p className="font-bold text-amber-300 mb-1 flex items-center gap-1">
                ✨ AI 추천 포인트
              </p>
              {activity?.recommend_reason}
            </div>
          </div>
        )}
      </div>

      {/* 카드 본문: 운영시간/휴무일/입장제한 등 핵심 실용 정보만 표시 */}
      <p className="text-gray-500 text-sm line-clamp-2 min-h-[40px]">
        {activity?.place_details}
      </p>
      
      {/* 티켓 가격 */}
      <div className="flex items-center gap-2 text-green-600 text-base line-clamp-1 mt-1">
        <Ticket className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{activity?.ticket_pricing}</span>
      </div>
      
      {/* 방문 권장 시간 */}
      <div className="flex items-center gap-2 text-orange-400 text-base line-clamp-1">
        <Clock className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{activity?.best_time_to_visit}</span>
      </div>
      
      {/* 구글 맵 이동 버튼 */}
      <Button size={'sm'} variant={'outline'} className='w-full mt-2' asChild>
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((activity?.place_name || '') + ' ' + (activity?.place_address || ''))}`}
          target='_blank' 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5"
        >
          <span>상세보기</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </Button>
    </div>
  )
}

export default PlaceCardItem