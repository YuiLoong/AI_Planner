import { icons } from 'lucide-react'
import React from 'react'

export const SelectBudgetOptions = [
    {
        id: 1,
        title: '가성비',
        desc: '경비는 아끼고 경험은 가득 채우는 실속 여행',
        icon: '🪙',
        color: "bg-green-100 text-green-600"
    },
    {
        id: 2,
        title: '스탠다드',
        desc: '평균적인 비용으로 즐기는 균형 잡힌 여행',
        icon: '💵',
        color: "bg-yellow-100 text-yellow-600"
    },
    {
        id: 3,
        title: '프리미엄',
        desc: '비용 걱정 없이 최고를 경험하는 고품격 여행',
        icon: '💎',
        color: "bg-purple-100 text-purple-600"
    },
]

function BudgetUi({onSelectedOption}:any) {
  return (
    // BudgetUi.tsx의 return 부분 수정
<div className='grid grid-cols-1 md:grid-cols-3 gap-3 mt-4'> 
    {SelectBudgetOptions.map((item, index) => (
        <div 
            key={index} 
            className='p-4 border rounded-2xl bg-white hover:border-primary hover:shadow-md transition-all cursor-pointer flex flex-col items-center gap-2'
            onClick={()=>onSelectedOption(item.title+":"+item.desc)}
        >
            <div className={`text-3xl p-3 rounded-full ${item.color}`}>{item.icon}</div>
            <div className='text-center'>
                <h3 className='font-bold text-sm text-black'>{item.title}</h3>
                <p className='text-[10px] text-gray-500 mt-1 leading-tight'>{item.desc}</p>
            </div>
        </div>
    ))}
</div>
  )
}

export default BudgetUi