"use client";

import React from "react";
import { Carousel, Card } from "@/components/ui/apple-cards-carousel";

export function PopularCityList() {
  // ⭐️ 겉을 감싸던 div(호버 이펙트 포함)를 완전히 제거하고 Card만 바로 리턴합니다!
  const cards = data.map((card, index) => (
    <Card key={card.src} card={card} index={index} />
  ));

  return (
    <div className="w-full h-full py-20">
      <h2 className="max-w-7xl pl-4 mx-auto text-xl md:text-3xl font-bold text-neutral-800 dark:text-neutral-200 font-sans">
        가장 많이 찾는 추천 여행지
      </h2>
      <Carousel items={cards} />
    </div>
  );
}


// 1. 기존 DummyContent 대신 들어갈 스마트 유도 컴포넌트
const CityDetailContent = ({ cityName, promptHint }: { cityName: string, promptHint: string }) => {
  return (
    <div className="bg-[#F5F5F7] dark:bg-neutral-800 p-8 md:p-14 rounded-3xl mb-4 text-center">
      <div className="text-4xl mb-4">✈️</div>
      <h3 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-4">
        {cityName} 여행, AI 플래너에게 맡겨보세요!
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 text-base md:text-lg font-sans max-w-2xl mx-auto mb-8 leading-relaxed">
        복잡한 여행 계획은 이제 그만! <br className="hidden md:block"/>
        좌측 채팅창에 아래 문구를 입력하시면, AI가 취향에 딱 맞는 
        <strong className="text-blue-600"> 맞춤형 일정과 지도 경로</strong>를 1분 만에 완성해 드립니다.
      </p>

      {/* 사용자가 그대로 따라 칠 수 있는 프롬프트 힌트 박스 */}
      <div className="bg-white dark:bg-neutral-900 border-2 border-blue-100 p-4 rounded-2xl inline-block shadow-sm">
        <p className="text-blue-600 font-bold text-lg px-4">
          "{promptHint}"
        </p>
      </div>
    </div>
  );
};

// 2. data 배열에 각각의 도시 이름과 프롬프트 힌트 매핑
const data = [
  {
    category: "Paris, France",
    title: "낭만이 가득한 예술의 도시 - 에펠탑과 루브르 박물관 투어",
    src: "/Paris.png",
    content: <CityDetailContent cityName="파리" promptHint="프랑스 파리 3박 4일 여행 코스 추천해 줘" />,
  },
  {
    category: "New York, USA",
    title: "잠들지 않는 도시의 활기 - 타임스퀘어와 브로드웨이의 밤",
    src: "/NewYork.png",
    content: <CityDetailContent cityName="뉴욕" promptHint="미국 뉴욕 4박 5일 맛집 탐방 일정 짜줘" />,
  },
  {
    category: "Seoul, Korea",
    title: "전통과 현대가 공존하는 매력 - 고궁 산책과 화려한 야경",
    src: "/Seoul.png",
    content: <CityDetailContent cityName="서울" promptHint="서울 1박 2일 데이트 코스 알려줘" />,
  },
  {
    category: "Tokyo, Japan",
    title: "미식과 쇼핑의 천국 - 시부야 거리와 조용한 골목 여행",
    src: "/Tokyo.png",
    content: <CityDetailContent cityName="도쿄" promptHint="도쿄 2박 3일 랜드마크 위주로 계획해 줘" />,
  },
  {
    category: "Beijing, China",
    title: "웅장한 역사의 숨결 - 만리장성과 자금성에서 느끼는 세월",
    src: "/Beijing.png",
    content: <CityDetailContent cityName="베이징" promptHint="중국 베이징 3박 4일 가족 여행 코스 부탁해" />,
  },
  {
    category: "Dubai, UAE",
    title: "사막 위에 세워진 미래 - 부르즈 할리파와 럭셔리 휴양",
    src: "/Dubai.png",
    content: <CityDetailContent cityName="두바이" promptHint="두바이 4박 5일 럭셔리 여행 일정 짜줘" />,
  },
];