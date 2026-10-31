import React from 'react'

export const SelectTravelesList = [
    {
        id:1,
        title:'나홀로',
        desc:'나만의 속도로 즐기는 자유로운 여행',
        icon: '🎒',
        people: '1인'
    },
    {
        id:2,
        title:'둘이서 함께',
        desc:'연인 또는 친구와 나누는 소중하고 즐거운 여행',
        icon: '🥂',
        people: '2인'
    },
    {
        id:3,
        title:'가족/친구',
        desc:'웃음꽃 피는 우리만의 화목하고 프라이빗한 여행',
        icon: '🏡',
        people: '3 ~ 4인'
    },
    {
        id:2,
        title:'단체',
        desc:'여럿이 함께해서 더 신나고 활기찬 여행',
        icon: '🚌',
        people: '5인 이상'
    }
]


function GroupSizeUi({onSelectedOption}:any) {
  return (
    // grid-cols-2를 주면 2개씩 옆으로 배치됩니다
    <div className='grid grid-cols-2 gap-3 mt-4'> 
        {SelectTravelesList.map((item, index) => (
            <div 
                key={index} 
                className='p-4 border rounded-2xl bg-white hover:border-primary hover:shadow-md transition-all cursor-pointer flex flex-col items-center gap-2'
                onClick={()=>onSelectedOption(item.title+":"+item.people)}
            
            >
                <div className='text-3xl'>{item.icon}</div>
                <div className='text-center'>
                    <h3 className='font-bold text-sm'>{item.title}</h3>
                    {/* 설명(desc) 부분이 빠져있어서 추가했습니다! */}
                    <p className='text-[10px] text-gray-500 mt-1'>{item.desc}</p>
                </div>
            </div>
        ))}
    </div>
  )
}

export default GroupSizeUi