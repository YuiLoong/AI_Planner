import { suggestions } from '@/app/_components/Hero'
import React from 'react'

function EmptyBoxState({onSelectOption}:any) {
  return (
    <div className='mt-5'>
        <h2 className='font-bold text-3xl text-center'><strong className='text-primary'>AI</strong>로 나만의 <strong className='text-primary'>맞춤 여행</strong>계획하기</h2>
        <p className='text-center text-gray-400 mt-2'>취향에 딱 맞는 맞춤형 코스부터 나만 알고 싶은 로컬 스팟까지</p>
    
     <div className='flex-col flex gap-5 mt-7'>
            {suggestions.map((suggestions,index) =>
                <div key={index}
                onClick={()=>onSelectOption(suggestions.title)}
                className='flex items-center gap-2 border 
                    rounded-xl p-3 cursor-pointer hover:border-primary hover:text-primary'>
                    {suggestions.icon}
                    <h2 className='text-lg'>{suggestions.title}</h2>
                </div>
            )}
        </div>
    
    </div>
  )
}

export default EmptyBoxState