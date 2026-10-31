"use client"
import GlobalMap from '@/app/create-new-trip/_compoents/GlobalMap';
import Itinerary from '@/app/create-new-trip/_compoents/Itinerary';
import { Trip } from '@/app/my-trips/page';
import { useTripDetailInfo, useUserDetail } from '@/app/Provider';
import { api } from '@/convex/_generated/api';
import { useConvex } from 'convex/react';
import { useParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'

function ViewTrip() {
    const {tripid}=useParams();
    const {userDetail, setUserDetail}=useUserDetail();
    const convex = useConvex();
    const [tripData, setTripData] = useState<Trip>();
    
    const { setTripDetailInfo } = useTripDetailInfo() as any;

    useEffect(()=>{
        userDetail&&GetTrip()
    },[userDetail])

    const GetTrip=async ()=>{
        const result = await convex.query(api.tripDetail.GetTripById,{
            uid: userDetail?._id,
            tripid:tripid+''
        });
        setTripData(result);
        setTripDetailInfo(result?.tripDetail)

        console.log("DB에서 가져온 데이터:", result?.tripDetail.itinerary[0].activities[0]);
    }
        
    const handleSendEmail = async () => {
        if (!tripData) return alert('일정 데이터를 불러오는 중입니다.');
        try {
            alert('이메일 전송을 시작합니다... ✈️'); 
            const response = await fetch('/api/send-itinerary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tripData),
            });
            if (response.ok) alert('가입하신 이메일로 여행 일정이 성공적으로 전송되었습니다! ✈️');
            else alert('이메일 전송에 실패했습니다.');
        } catch (error) {
            alert('전송 중 오류가 발생했습니다.');
        }
    };
        
    return (
        <div className='grid grid-cols-5'>
            <div className='col-span-3'>
            {tripData ? (
                <Itinerary isReadonly={true} onSendEmail={handleSendEmail} />
            ) : (
                <div className="flex flex-col justify-center items-center h-[70vh] gap-3">
                    <p className="text-xl font-semibold">여행 일정을 불러오는 중입니다... ✈️</p>
                </div>
            )}
            </div>
            <div className='col-span-2'>
                <GlobalMap isArchiveMode={true} />
            </div>
        </div>
  )
}
export default ViewTrip