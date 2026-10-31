import { Html, Text, Tailwind, Container, Section, Row, Column, Link, Heading } from '@react-email/components';
import * as React from 'react';

export default function ItineraryEmail({ itineraryData }: any) {
  // DB에 저장된 실제 AI JSON 구조(trip_plan)로 경로를 맞춤
  const plan = itineraryData?.tripDetail?.trip_plan || itineraryData?.tripDetail;
  const hotels = plan?.hotels || [];
  const days = plan?.itinerary || plan?.days || [];
  
  // 목적지 이름 추출
  const destObj = plan?.destination;
  const destinationName = typeof destObj === 'object' ? destObj?.city : destObj;

  return (
    <Tailwind>
      <Html>
        <Container className="bg-white p-6 font-sans">
          {/* 헤더 섹션 */}
          <Heading className="text-2xl font-bold text-blue-600 mb-2">
            ✈️ {destinationName || '선택한 여행지'} AI 여행 일정표
          </Heading>
          <Text className="text-gray-600 mb-6">
            요청하신 여행 일정이 준비되었습니다. 즐거운 여행 되세요!
          </Text>

          {/* 호텔 추천 섹션 */}
          <Section className="mb-8">
            <Heading className="text-xl font-bold text-gray-800 mb-4">추천 호텔 리스트</Heading>
            {hotels.map((hotel: any, index: number) => (
              <Row key={index} className="border border-gray-200 rounded-lg mb-4 p-4 block">
                <Column>
                  {/* 실제 데이터 키값(hotel_name 등)으로 매핑 */}
                  <Text className="font-bold text-lg mb-1">
                    {hotel?.hotel_name || hotel?.name || '호텔 이름 정보 없음'}
                  </Text>
                  <Text className="text-sm text-gray-500 mb-2">
                    {hotel?.hotel_address || hotel?.location || '주소 정보 없음'}
                  </Text>
                  <Text className="text-sm font-semibold mb-2 text-green-600">
                    {hotel?.price_per_night || hotel?.price} / 평점: {hotel?.rating}
                  </Text>
                  {hotel?.geo_coordinates && (
                    <Link 
                    href={`https://www.google.com/maps/search/?api=1&query=${hotel?.hotel_name || hotel?.name}`} 
                    className="text-blue-500 text-sm underline"
                    >
                    구글 지도에서 보기
                    </Link>
                  )}
                </Column>
              </Row>
            ))}
          </Section>

          {/* 일자별 상세 일정 섹션 */}
          <Section>
            <Heading className="text-xl font-bold text-gray-800 mb-4">일자별 상세 일정</Heading>
            
            {/* Days 배열을 순회하며 일정 출력 */}
            {days.map((dayData: any, index: number) => (
              <div key={index} className="mb-8">
                <Text className="font-bold text-lg text-blue-500 mb-3 border-b pb-1">
                  Day {dayData?.day} - {dayData?.day_plan || dayData?.theme || '일정'}
                </Text>
                
                {/* 각 일자의 Activities(명소) 배열 순회 */}
                {dayData?.activities?.map((activity: any, actIdx: number) => (
                  <Row key={actIdx} className="mb-3 bg-gray-50 p-4 rounded-md block border border-gray-100">
                    <Column>
                      <Text className="font-semibold text-gray-800 mb-1">
                        📍 {activity?.place_name || activity?.activity_name}
                      </Text>
                      <Text className="text-sm text-gray-600 mb-2 leading-relaxed">
                        {activity?.place_details || activity?.description}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        🕒 권장 시간: {activity?.best_time_to_visit || activity?.time_of_day || '자유'} | 
                        💰 예상 비용: {activity?.ticket_pricing || activity?.price || '무료/현장확인'}
                      </Text>
                    </Column>
                  </Row>
                ))}
              </div>
            ))}
          </Section>
          
        </Container>
      </Html>
    </Tailwind>
  );
}