"use client"
import { Button } from '@/components/ui/button'
import { Globe2 } from 'lucide-react'
import React from 'react'

function FinalUi({ viewTrip, isLoading }: any) {
    return (
        <div className='flex flex-col items-center justify-center mt-6 p-8 bg-white rounded-3xl border border-gray-100 shadow-sm'>
            {/* 로딩 중일 때와 완료되었을 때 아이콘 변화 */}
            <div className={`p-4 rounded-full bg-primary/10 ${isLoading ? 'animate-pulse' : ''}`}>
                <Globe2 className={`h-10 w-10 text-primary ${isLoading ? 'animate-bounce' : ''}`} />
            </div>

            <h2 className='mt-4 text-xl font-bold text-gray-800'>
                {isLoading ? '✈️ 여행 계획을 세우는 중...' : '🎉 여행 계획이 완성되었습니다!'}
            </h2>
            
            <p className='text-gray-500 text-sm text-center mt-2 px-4'>
                {isLoading 
                    ? '가장 멋진 명소와 최적의 동선을 찾고 있어요. 잠시만 기다려 주세요!' 
                    : '준비된 나만의 맞춤형 여행 계획을 확인해 보세요!'}
            </p>

            <Button 
                disabled={isLoading} 
                onClick={viewTrip} 
                className='mt-6 w-full bg-primary hover:bg-primary/90 text-white py-6 rounded-2xl text-lg font-bold transition-all shadow-lg shadow-primary/20'
            >
                {isLoading ? '계획 중...' : '일정 확인하기 (View Trip)'}
            </Button>
        </div>
    )
}

export default FinalUi