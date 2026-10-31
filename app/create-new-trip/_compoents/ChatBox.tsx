"use client"
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import axios from 'axios'
import { Loader, LucideSquareBottomDashedScissors, Send } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import EmptyBoxState from './EmptyBoxState'
import GroupSizeUi from './GroupSizeUi'
import BudgetUi from './BudgetUi'
import DayUi from './DayUi'
import FinalUi from './FinalUi'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useTripDetailInfo, useUserDetail } from '@/app/Provider'
import {v4 as uuidv4} from 'uuid'; 

type Message={
    role:string,
    content:string
    ui?: string,
}

export type TripInfo={
    budget:string,
    destination:string,
    duration:string,
    trip_image_url?: string;
    group_size:string,
    origin:string,
    hotels:Hotel[],
    itinerary:Itinerary[],

}

export type Hotel={
    hotel_name: string;
    hotel_address: string;
    price_per_night: string;
    hotel_image_url: string;
    geo_coordinates: { latitude: number; longitude: number; };
    rating: number;
    description: string;
};

export type Activity = {
    place_name: string;
    place_details: string;
    recommend_reason?: string;
    place_image_url: string;
    geo_coordinates:{
        latitude: number; longitude: number; 
    };
    place_address: string;
    ticket_pricing: string;
    time_travel_each_location: string;
    best_time_to_visit: string;
};

type Itinerary = {
    day: number;
    day_plan: string;
    best_time_to_visit_day: string;
    activities:Activity[];
};

// 💡 이미지 검색 후 URL 문자열만 쏙 반환하는 헬퍼 함수
export const fetchTripImageUrl = async (keyword: string): Promise<string> => {
    if (!keyword) return '/placeholder.png';

    try {
        // Unsplash API 호출 (구글 API 사용 시 이 fetch 주소만 구글 API 주소로 바꾸시면 됩니다!)
        const res = await fetch(
            `https://api.unsplash.com/search/photos?page=1&query=${encodeURIComponent(
                keyword
            )}&client_id=${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}&per_page=1`
        );
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            return data.results[0].urls.regular; // 🎯 사진의 실제 URL 반환!
        }
    } catch (error) {
        console.error('이미지 URL 가져오기 실패:', error);
    }

    return '/placeholder.png'; // 실패 시 기본 이미지 반환
};

function ChatBox () {

    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [isFinal, setIsFinal] = useState(false);
    const [tripDetail, setTripDetail] = useState<TripInfo>();
    const SaveTripDetail = useMutation(api.tripDetail.CreateTripDetail);
    const {userDetail,setUserDetail}=useUserDetail();

    useEffect(() => {
        const savedText = sessionStorage.getItem('pendingPrompt');
        if (savedText) {
            setUserInput(savedText); // 텍스트 박스 상태에 값 채우기
            sessionStorage.removeItem('pendingPrompt'); // 한 번 가져왔으니 저장소에서 비우기
        }
    }, []);

    //수정
    const {tripDetailInfo, setTripDetailInfo} = useTripDetailInfo() as any;
   // 1. handleAutoSend 수정: 중복 저장 로직을 handleSaveTrip으로 통합
    const handleAutoSend = async (text: string, forceFinal: boolean = false) => {
    if (!text.trim()) return;

    setLoading(true);
    const newMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, newMsg]);

    try {
        // 🎯 현재 state의 isFinal 값이거나 강제로 넘겨받은 forceFinal 값을 사용!
        const currentIsFinal = isFinal || forceFinal;

        const result = await axios.post('/api/aimodel', {                 
            messages: [...messages, newMsg],
            isFinal: currentIsFinal // 👈 이제 무조건 true가 잘 넘어갑니다!
        });

        let chatResponse = result.data;
        if (typeof chatResponse === 'string') {
            const jsonMatch = chatResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) chatResponse = JSON.parse(jsonMatch[0]);
        }

        // 🎯 여기서도 currentIsFinal을 사용해서 분기 처리
        if (!currentIsFinal) {
            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: chatResponse.resp,
                ui: chatResponse.ui
            }]);
        }

        if (currentIsFinal || chatResponse.ui === 'Final') {
            setTripDetail(chatResponse.trip_plan);
            setTripDetailInfo(chatResponse.trip_plan); 
        }
    } catch (error) {
        console.error("자동 전송 오류:", error);
    } finally {
        setLoading(false);
    }
};

    const onSend = async () => {
    if (!userInput?.trim()) return;

    const currentInput = userInput;
    setUserInput('');
    setLoading(true);

    const newMsg: Message = { role: 'user', content: currentInput };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);

    try {
        const result = await axios.post('/api/aimodel', {
            messages: updatedMessages,
            isFinal: isFinal 
        });

        let chatResponse = result.data;
        if (typeof chatResponse === 'string') {
            const jsonMatch = chatResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) chatResponse = JSON.parse(jsonMatch[0]);
        }

        // [핵심 수정] 최종 단계가 아닐 때만 AI 말풍선을 추가합니다.
        if (!isFinal) {
            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: chatResponse.resp,
                ui: chatResponse.ui
            }]);
        }

        // 최종 단계 데이터 저장
        if (chatResponse.ui === 'Final' || isFinal) {
            setTripDetail(chatResponse.trip_plan);
            setTripDetailInfo(chatResponse.trip_plan);
        }

    } catch (error) {
        console.error("전송 오류:", error);
    } finally {
        setLoading(false);
    }
};


const handleSaveTrip = async (plan: any) => {
    if (!plan) return;
    try {
        setTripDetail(plan);
        setTripDetailInfo(plan);

        // 1. 목적지 이름 추출 (객체/문자열 예외 처리)
        const destName = typeof plan.destination === 'object' 
            ? plan.destination.city 
            : plan.destination;

        // 2. 🎯 DB 저장 직전, 사진 URL 딱 1번 가져오기!
        const imageUrl = await fetchTripImageUrl(`${destName} travel landmark`);

        // 3. AI가 짜준 데이터(plan)에 trip_image_url 항목 추가
        const finalPlanWithImage = {
            ...plan,
            trip_image_url: imageUrl
        };

        const tripId = uuidv4(); 
        
        // 4. 사진 주소까지 박제된 최종 데이터 저장!
        await SaveTripDetail({
            tripDetail: finalPlanWithImage, 
            tripId: tripId, 
            uid: userDetail?._id 
        });
        
        console.log("DB 저장 완료! 영구 박제된 이미지:", imageUrl);
    } catch (e) {
        console.error("DB 저장 실패:", e);
    }
};

useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    
    if (lastMsg?.ui === 'Final' && !isFinal) {
        setIsFinal(true);

        handleAutoSend('네, 일정표를 만들어 주세요!', true); 
    }
}, [messages, isFinal]);


    const RenderGenerativeUi=(msg:Message)=>{

        const {ui, content} = msg;
        if(ui=='budget')
        {
            //Budget UI Component
            return <BudgetUi onSelectedOption={(v:string)=>{setUserInput(v);onSend()}}/>
        }else if(ui=='groupSize')
        {
            //GroupSize UI Component
            return <GroupSizeUi onSelectedOption={(v:string)=>{setUserInput(v);onSend()}}/>
        }else if (ui=='tripDuration')
        {
            return <DayUi onConfirm={(days) => handleAutoSend(`${days}일 동안 갈 거야`)} />;
        }else if(ui=='Final') {
    return (<FinalUi 
        isLoading={loading}
        viewTrip={() => {
            // 1. 실수로 누를 수도 있으니 진짜 확정할 건지 한 번 더 물어봅니다!
            const isConfirm = window.confirm("이 일정으로 최종 확정하시겠습니까?\n(확정 시 나의 여행 백업 목록에 저장됩니다)");
            
            if (isConfirm) {
                // 2. 사용자가 OK를 누르면 그때 DB에 찐으로 저장합니다!
                if (tripDetail) {
                    handleSaveTrip(tripDetail); // Step 1에서 임시 보관해둔 데이터를 저장
                    alert("최종 확정되었습니다! MyTrips에서 확인할 수 있습니다. 🎉");
                } else {
                    alert("저장할 데이터가 아직 준비되지 않았습니다.");
                }
            }
        }} 
    />);
}

        return null;
    }
    

  return (
    <div className='w-full h-[85vh] flex flex-col border shadow rounded-2xl p-4'>
        {messages?.length==0 &&
            <EmptyBoxState 
            onSelectOption={(v:string)=>{setUserInput(v); onSend()}}/>
        }
        {/* DisPlay Message*/}
        <section className='flex-1 overflow-y-auto p-4'>
            {messages.map((msg, index) => (
                msg.role === 'user' ? (
                    <div className='flex justify-end mt-2' key={index}>
                    <div className='max-w-[70%] bg-primary text-white px-4 py-2 rounded-2xl rounded-tr-none shadow-sm font-sans'>
                        {msg.content}
                    </div>
                    </div>
                ) : (
                    <div className='flex justify-start mt-2' key={index}> {/* justify-start로 수정 */}
                        <div className='max-w-[70%] bg-white border border-gray-200 text-black px-4 py-2 rounded-2xl rounded-tl-none shadow-sm font-sans whitespace-pre-wrap'>
                            {msg.ui !== 'Final' && msg.content}
                            {RenderGenerativeUi(msg)}
                        </div>
                    </div>
                )
            ))}
            {loading && <div className='flex justify-start mt-2' > {/* justify-start로 수정 */}
                <div className='max-w-[70%] bg-white border border-gray-200 text-black px-4 py-2 rounded-2xl rounded-tl-none shadow-sm font-sans whitespace-pre-wrap'>
                        <Loader className='animate-spin'/>
                </div>
            </div>}
              

        </section>

         {/*User Input*/}
        <section>
            <div className='rounded-xl border border-border bg-card p-4 shadow-sm relative'>
                <Textarea placeholder='어디로 떠나고 싶으신가요? (예: 3박 4일 일본 도쿄 여행)'
                className="w-full h-20 bg-transparent border-none focus-visible:ring-0 resize-none p-0"
                onChange={(event)=>setUserInput(event.target.value)}
                value={userInput}/>

                <Button size={'icon'} className='absolute bottom-6 right-6' onClick={()=>onSend()}>
                    <Send className='h-4 w-4'/>
                </Button>

            </div>
        </section>
    </div>
  )
}

export default ChatBox

