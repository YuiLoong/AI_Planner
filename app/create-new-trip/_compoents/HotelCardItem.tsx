import React from 'react'
import { Hotel } from './ChatBox'
import { Button } from '@/components/ui/button'
import { ExternalLink, Star, Wallet } from 'lucide-react'
import PlaceImage from './PlaceImage'

type Props={
    hotel:Hotel
}

export const HotelCardItem = ({hotel}:Props) => {
  return (
    <div className='flex flex-col gap-1'>
              <PlaceImage
                // 검색어에서 'official room'을 빼고 주소를 추가해 정확도를 높임
                keyword={`${hotel?.hotel_name} ${hotel?.hotel_address}`} 
                alt={hotel?.hotel_name || 'hotel image'}
              />
              <h2 className='font-semibold text-lg truncate'>{hotel?.hotel_name}</h2>
              <h2 className='text-gray-500 text-xs'>{hotel?.hotel_address}</h2>
              <div className='flex justify-between items-center'>
                <p className='flex gap-2 text-green-600'><Wallet/>{hotel.price_per_night}</p>
                <p className='text-yellow-500 flex gap-2'><Star/>{hotel.rating}</p>
              </div>
              
              <Button size={'sm'} variant={'outline'} className='w-full mt-1' asChild>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel?.hotel_name || ''} ${hotel?.hotel_address || ''}`.trim())}`} 
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

export default HotelCardItem