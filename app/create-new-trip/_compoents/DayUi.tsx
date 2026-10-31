import React, { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DayUiProps {
  onConfirm: (days: number) => void;
}

function DayUi({ onConfirm }: DayUiProps) {
  const [days, setDays] = useState(1); // 기본값 1일

  const handleIncrement = () => setDays(prev => prev + 1);
  const handleDecrement = () => {
    if (days > 1) setDays(prev => prev - 1); // 1일 미만 방지
  };

  return (
    <div className='flex flex-col items-center gap-6 p-6 border rounded-2xl bg-white mt-4 shadow-sm'>
      <h2 className='font-bold text-lg text-black'>여행 기간은 며칠로 계획하시나요?</h2>
      
      <div className='flex items-center gap-8'>
        {/* 마이너스 버튼 */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleDecrement}
          className='rounded-full border-gray-200'
        >
          <Minus className='h-4 w-4' />
        </Button>

        {/* 숫자 표시 */}
        <div className='flex flex-col items-center'>
            <span className='text-3xl font-extrabold text-primary'>{days}일</span>
            <span className='text-xs text-gray-400 font-medium uppercase'>Travel Days</span>
        </div>

        {/* 플러스 버튼 */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleIncrement}
          className='rounded-full border-gray-200'
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>

      {/* 확인 버튼 */}
      <Button 
        className='w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-6 text-lg font-bold'
        onClick={() => onConfirm(days)}
      >
        확인 완료
      </Button>
    </div>
  )
}

export default DayUi