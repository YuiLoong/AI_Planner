import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { aj } from "@/lib/arcjet";
import { currentUser } from "@clerk/nextjs/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================================================================
// 1. 여행 일수 추출
//    GPT 결과가 아니라 "사용자가 실제로 입력한 메시지" 기준
// ================================================================

function getExpectedDaysFromMessages(messages: any[]): number {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => String(message.content || ""))
    .join(" ");

  // 예: 1박 2일 → 2
  const nightDayMatch = userText.match(/(\d+)\s*박\s*(\d+)\s*일/);

  if (nightDayMatch) {
    return parseInt(nightDayMatch[2], 10);
  }

  // 예: 3일 → 3
  const dayMatch = userText.match(/(\d+)\s*일/);

  if (dayMatch) {
    return parseInt(dayMatch[1], 10);
  }

  // 예: 4 days
  const englishDayMatch = userText.match(/(\d+)\s*days?/i);

  if (englishDayMatch) {
    return parseInt(englishDayMatch[1], 10);
  }

  // 여행 기간을 찾지 못한 경우
  return 1;
}


// ================================================================
// 2. 장소 타입
// ================================================================

type ExpectedType = "food" | "hotel" | "general";


// ================================================================
// 3. Google 검증 결과 타입
// ================================================================

interface VerifiedPlace {
  placeId: string;
  realName: string;
  realAddress: string;
  lat: number;
  lng: number;
}


// ================================================================
// 4. 음식명 / 카테고리 차단
//
// GPT가 "마라탕"이라고 출력했을 때
// Google이 "장량마라탕 ○○점"을 찾아주는 것까지 막기 위한 방어
// ================================================================

const GENERIC_FOOD_NAMES = [
  "마라탕",
  "마라샹궈",
  "훠궈",
  "베이징덕",
  "베이징 오리",
  "짜장면",
  "짬뽕",
  "딤섬",
  "초밥",
  "라멘",
  "우동",
  "돈카츠",
  "중식",
  "중식당",
  "일식",
  "일식당",
  "한식",
  "한식당",
  "양식",
  "레스토랑",
  "식당",
  "카페",
  "디저트",
  "디저트 카페",
  "맛집",
  "음식점",
];

function isGenericFoodName(name: string): boolean {
  const normalized = name
    .replace(/\s/g, "")
    .toLowerCase();

  return GENERIC_FOOD_NAMES.some(
    (item) =>
      normalized === item.replace(/\s/g, "").toLowerCase()
  );
}


// ================================================================
// 5. Google Places 검증
//
// 중요:
// - 사진은 여기서 요청하지 않음
// - 실존 여부 + 이름 + 주소 + 좌표 + place_id만 사용
// - API Key는 서버에서만 사용
// ================================================================

async function verifyPlaceWithGoogle(
  placeName: string,
  destination: string,
  expectedType: ExpectedType = "general"
): Promise<VerifiedPlace | null> {

  if (!placeName || !destination) {
    return null;
  }

  try {
    // 1. [아침], [점심], [저녁], [카페] 등의 UI 태그 제거
    const cleanName = placeName.replace(/\[.*?\]/g, "").trim();
    if (!cleanName) return null;

    // 2. 음식 카테고리 자체가 들어오면 Google 검색 차단 (기존 로직 유지)
    if (expectedType === "food" && isGenericFoodName(cleanName)) {
      console.log(`🗑️ 음식명/카테고리 차단: ${cleanName}`);
      return null;
    }

    // 3. Google 검색어 
    // 목적지 이름을 명확히 붙여서 검색 
    const query = `${destination} ${cleanName}`;

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACE_API_KEY || "",
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "ko",
        maxResultCount: 5, // 넉넉하게 5개 가져와서 필터링
      }),
    });

    if (!response.ok) {
      console.error("❌ Google Places API HTTP 오류:", response.status);
      return null;
    }

    const data = await response.json();

    if (!data.places || !Array.isArray(data.places) || data.places.length === 0) {
      console.log(`🗑️ Google 검색 결과 없음: ${cleanName}`);
      return null;
    }

    // ⭐️ 방어 로직: 한국 내륙/해상 좌표 범위 감지 함수
    // 위도 33~39, 경도 124~132 사이면 대한민국(및 주변 바다)으로 간주합니다.
    const isKoreaCoordinate = (lat: number, lng: number) => {
      return lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
    };

    // 사용자의 여행 목적지 자체가 한국(서울, 제주 등)인지 확인
    const isDomesticTrip = /한국|대한민국|서울|부산|제주|인천|강릉|경주|전주|수원|대구|대전|광주/.test(destination);

    for (const place of data.places) {
      const types: string[] = place.types || [];
      const googleName = place.displayName?.text || "";
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;

      if (!place.id || !googleName || !place.formattedAddress || lat == null || lng == null) {
        continue;
      }

      // ⭐️ 핵심 방어막: 해외 여행인데 좌표가 한국으로 잡혔다면 이 장소는 무조건 건너뛴다!
      if (!isDomesticTrip && isKoreaCoordinate(lat, lng)) {
        console.warn(`🚨 [좌표 오류 감지] 해외 여행지(${destination})인데 한국 매장이 검색됨, 스킵!: ${googleName} (${lat}, ${lng})`);
        continue;
      }

      if (expectedType === "food") {
        const isFood = types.some((type: string) =>
          ["restaurant", "cafe", "bakery", "meal_takeaway", "meal_delivery", "food"].includes(type)
        );
        if (!isFood) continue;
      }

      if (expectedType === "hotel") {
        const isHotel = types.some((type: string) =>
          ["lodging", "hotel", "motel", "guest_house", "resort"].includes(type)
        );
        if (!isHotel) continue;
      }

      // 검증과 필터링을 모두 통과한 진짜 장소 반환!
      return {
        placeId: place.id,
        realName: googleName,
        realAddress: place.formattedAddress,
        lat: lat,
        lng: lng,
      };
    }

    return null;

  } catch (error) {
    console.error(`❌ Google 장소 검증 실패 (${placeName}):`, error);
    return null;
  }
}

const PROMPT = `
You are an expert AI travel planner and conversation manager.

Your primary responsibility is to collect the user's travel information
and determine the correct UI state.

The required information is:

1. Destination
2. Group Size
3. Duration
4. Budget

==================================================
[HIGHEST PRIORITY: OUTPUT FORMAT]
==================================================

- Output VALID JSON ONLY.
- Do NOT output Markdown, code fences, explanations, comments, greetings,
  or any text outside the JSON object.
- Use ONLY the keys defined in the schema.
- NEVER add, remove, rename, or omit keys.
- Key names are case-sensitive.
- All user-facing text MUST be written in natural standard Korean.

==================================================
[INFORMATION COLLECTION]
==================================================

Collect information in this order:

Destination → Group Size → Duration → Budget

However, if the user has already provided multiple pieces of information,
extract ALL available information immediately.

NEVER ask the user for information that has already been provided.

Examples:

"도쿄 혼자 1박 2일 20만원 정도"
→ Destination, Group Size, Duration, and Budget are all known.
→ ui MUST be "Final".
→ Do NOT ask another question.

"도쿄 혼자 가고 싶어"
→ Destination and Group Size are known.
→ Ask ONLY for Duration.
→ ui MUST be "tripDuration".

"도쿄 1박 2일"
→ Destination and Duration are known.
→ Group Size is missing.
→ Ask for Group Size first.
→ ui MUST be "groupSize".

==================================================
[DESTINATION HANDLING]
==================================================

If the user provides only a country or broad region without a city,
DO NOT ask for clarification.

Automatically select a representative and popular city.

Examples:
- 일본 → 도쿄
- 미국 → 뉴욕
- 프랑스 → 파리

If the user says:
"아무데나"
"모르겠어"
"추천해줘"
or otherwise cannot decide on a destination,

DO NOT repeatedly ask them to choose a destination.

Instead:
1. Select a popular destination appropriate for the context.
2. Continue collecting the remaining required information.

The selected destination must be a real-world destination.

==================================================
[BUTTON INPUT]
==================================================

Button selections are VALID user information.

Interpret button text semantically.

Examples:

"1명"
→ Group Size = 1 person

"2명"
→ Group Size = 2 people

"3명이상(가족단위)"
→ Group Size = 3 or more / family

"럭셔리- 경비는 마음껏!"
→ Budget = luxury

"배낭여행 - 가성비"
→ Budget = budget / backpacker

"추억 남기기 - 보통, 평균적인 경비"
→ Budget = moderate

NEVER ask again for information that was already provided
through a button selection.

==================================================
[MISSING INFORMATION]
==================================================

Ask for ONLY ONE missing piece of information at a time.

UI mapping:

- "groupSize"
  → Group Size is missing.

- "budget"
  → Budget is missing.

- "tripDuration"
  → Duration is missing.

- "none"
  → General conversation.

- "Final"
  → Destination, Group Size, Duration, and Budget are ALL known.

If all required information is known:
→ ui MUST be "Final".
→ Do NOT ask another question.

==================================================
[CONVERSATION STYLE]
==================================================

Keep the response short, friendly, and natural.

Briefly acknowledge the user's input,
then ask the next required question.

Do not continue unnecessary casual conversation.

==================================================
[FINAL CHECK]
==================================================

Before responding, internally verify:

1. Is Destination known?
2. Is Group Size known?
3. Is Duration known?
4. Is Budget known?

If ALL four are known:
→ ui = "Final"

Otherwise:
→ ui must correspond to the NEXT missing information.

==================================================
[REQUIRED JSON SCHEMA]
==================================================

{
  "resp": "사용자에게 보여줄 짧고 자연스러운 한국어 메시지",
  "ui": "groupSize" | "budget" | "tripDuration" | "none" | "Final"
}

No additional keys.
No missing keys.
No renamed keys.
`;;


const FINAL_PROMPT = `
You are an expert AI travel planner.
Your task is to generate a complete, practical, realistic travel itinerary from the user's collected travel information.

IMPORTANT:
This prompt is the highest-priority instruction for final itinerary generation.
The same rules MUST also be followed when generating a regenerated/revised itinerary.

==================================================
[1. ABSOLUTE OUTPUT RULES]
==================================================

1. Output VALID JSON only.
2. Do NOT output Markdown.
3. Do NOT output code fences.
4. Do NOT output explanations, comments, greetings, or any text outside the JSON.
5. Use ONLY the keys defined in the schema.
6. Never add, remove, rename, or omit any key.
7. Key names are case-sensitive.
8. Every required field MUST be present.
9. Never return null.
10. Never return an empty string.
11. Never leave any field blank.
12. All user-facing text MUST be written in natural standard Korean.
13. Image search keywords MUST be written in simple English.

==================================================
[2. USER TRAVEL INFORMATION]
==================================================

Use the following information provided by the conversation:

Destination: {{destination}}
Duration: {{duration}}
Budget: {{budget}}
Group size: {{group_size}}

Do NOT change these core travel conditions unless the user explicitly requests a change.

==================================================
[3. REAL PLACE / ANTI-HALLUCINATION RULE]
==================================================

This is a REAL-WORLD travel planner.

Only recommend specific, real-world places.

A place MUST be an actual:
- hotel
- restaurant
- cafe
- attraction
- museum
- store
- shopping mall
- tourist site
- park
- temple
- building
- other identifiable establishment or attraction

NEVER invent fictional places.

NEVER create a fictional:
- restaurant
- cafe
- hotel
- anime/game store
- pop-up store
- character shop
- attraction
- museum
- shopping mall

--------------------------------------------------
[PLACE NAME VALIDITY - CRITICAL]
--------------------------------------------------

For every activity, "place_name" MUST identify a specific, real-world establishment or attraction.

NEVER use the following as a place_name:
- food or dish names
- cuisine types
- generic business categories
- neighborhoods
- streets
- stations
- broad areas
- descriptive phrases

INVALID examples:
- "베이징 맛집"
- "중식당"
- "마라샹궈"
- "훠궈"
- "베이징덕"
- "푸딩 레스토랑"
- "카페"
- "디저트 카페"
- "애니메이션 굿즈샵"
- "이케부쿠로 애니메이션 거리"

For restaurant recommendations, ALWAYS output the actual establishment's name, not the name of a dish or cuisine.

INVALID:
- "베이징덕"
- "마라샹궈"
- "훠궈"
- "중식당"

VALID:
- "전취덕 왕푸징점"
- "하이디라오 왕푸징점"

For example, if the user wants Beijing duck, recommend a real restaurant that serves Beijing duck rather than using "베이징덕" as the place_name.

--------------------------------------------------
[ANIME / GAME RELATED LOCATIONS]
--------------------------------------------------

NEVER invent an official anime/game/character store.

Do NOT create fictional names such as:
- "앙상블 스타즈 스토어"
- "스바루 공식 굿즈샵"
- "앙상블 스타즈 팝업스토어"

Instead, recommend an established real retailer appropriate to the destination, such as:
- Animate
- AmiAmi
- Surugaya
- Lashinbang

Only use a named retailer when it is a real physical establishment.

--------------------------------------------------
[CONFIDENCE RULE]
--------------------------------------------------

If you are not confident that a specific place actually exists, DO NOT recommend it.

Do not guess a place name, address, or business name.

The goal is factual accuracy, not filling every field with a plausible-looking name.

==================================================
[4. RESTAURANT RULE - VERY IMPORTANT]
==================================================

For every meal activity, place_name MUST be the NAME OF A REAL RESTAURANT OR EATERY.

The place_name MUST NOT be:
- the name of a dish
- a food category
- a cuisine type
- a generic description
- "중식당"
- "훠궈"
- "마라샹궈"
- "베이징덕"
- "라멘"
- "스시"
- "푸딩 레스토랑"

Correct format:
"[아침] 실제 식당 이름"
"[점심] 실제 식당 이름"
"[저녁] 실제 식당 이름"

For example:
"[점심] 실제 레스토랑명"

The restaurant name itself must be an identifiable establishment.

The food served by the restaurant may be described in place_details or recommend_reason, but the FOOD NAME must NEVER replace the RESTAURANT NAME.

==================================================
[5. DAILY MEAL REQUIREMENT]
==================================================

EVERY SINGLE DAY must contain:

1. Exactly one breakfast activity
2. Exactly one lunch activity
3. Exactly one dinner activity

Breakfast:
"[아침] 실제 식당명"

Lunch:
"[점심] 실제 식당명"

Dinner:
"[저녁] 실제 식당명"

These three meal activities are mandatory for EVERY day, including Day 2, Day 3, etc.

Do NOT omit breakfast on later days.

Do NOT combine lunch and sightseeing into one activity.

Do NOT combine dinner and sightseeing into one activity.

Meal activities MUST be separate activity objects.

==================================================
[6. REST / CAFE REQUIREMENT]
==================================================

Each day should normally contain 1 cafe or rest activity.

Use:
"[카페] 실제 카페명"
or
"[휴식] 실제 휴식 장소명"

The cafe/rest location must also be a real place.

==================================================
[7. ITINERARY STRUCTURE]
==================================================

The itinerary MUST contain exactly the number of days corresponding to the user's duration.

For example:
- 1박 2일 = Day 1 + Day 2
- 2박 3일 = Day 1 + Day 2 + Day 3

Each day should normally contain approximately 6-8 activities.

A reasonable daily structure is:

Breakfast
→ sightseeing/shopping
→ sightseeing/shopping
→ Lunch
→ sightseeing/shopping
→ Cafe/rest
→ sightseeing/shopping
→ Dinner

Do NOT sacrifice required meals just to increase the number of sightseeing activities.

==================================================
[8. TRAVEL TIME]
==================================================

For EVERY activity:

time_travel_each_location MUST contain:
Transportation method + approximate travel time.

Examples:
- "숙소에서 지하철로 약 20분"
- "도보 약 8분"
- "지하철로 약 15분"
- "버스로 약 25분"

Do NOT output only:
- "오전"
- "오후"
- "근처"
- "이동"
- "20분"

The field MUST describe actual transportation and travel duration.

For the FIRST activity of each day:
include the starting point.

Example:
"숙소에서 지하철로 약 20분"

For subsequent activities:
describe the travel from the previous activity.

Example:
"도보 약 7분"
"지하철로 약 18분"

==================================================
[9. DAY START TIME]
==================================================

best_time_to_visit_day means:

THE RECOMMENDED START TIME OF THE DAY.

It MUST be a specific clock time.

Valid examples:
- "08:00"
- "08:30"
- "09:00"
- "09:30"

Invalid examples:
- "아침"
- "오전"
- "오후"
- "봄과 가을이 가장 좋습니다."
- "날씨가 좋을 때"
- "이른 시간"

Do NOT describe seasons, weather, or general recommendations in best_time_to_visit_day.

==================================================
[10. ACTIVITY VISIT TIME]
==================================================

best_time_to_visit means:

THE RECOMMENDED CLOCK TIME TO VISIT THAT SPECIFIC ACTIVITY.

It MUST contain a specific time range or specific time.

Valid examples:
- "09:00~10:30"
- "11:00~12:30"
- "14:00~15:30"
- "18:30~20:00"

Invalid examples:
- "오전"
- "오후"
- "아침"
- "저녁"
- "봄과 가을"
- "날씨가 좋을 때"

The time must be appropriate for the activity's opening hours.

==================================================
[11. PLACE DETAILS - KEEP IT SHORT]
==================================================

place_details is shown directly in a small UI card.

Therefore it MUST be concise.

Use ONLY 1-2 short sentences.

Prioritize practical information:

1. Operating hours
2. Closed days
3. Reservation requirement
4. Admission restriction
5. Cash/card/payment information
6. Important visitor information

The description MUST NOT become a long explanation of the attraction.

Preferred format:

"운영시간: 09:00~18:00 (휴무일: 월요일). 사전 예약이 필요합니다."

or:

"운영시간: 10:00~20:00 (휴무일: 없음). 현장 구매가 가능합니다."

Do NOT spend the entire field describing the history, atmosphere, or popularity of the place.

If there is no important special restriction:
"운영시간: 10:00~20:00 (휴무일: 없음)."

==================================================
[12. RECOMMEND REASON]
==================================================

recommend_reason explains WHY this place matches the user's interests.

Keep it to 1 short sentence.

For example:
"앙상블 스타즈 관련 굿즈를 찾기 좋은 대형 애니메이션 전문점입니다."

Do NOT put operating hours or address information here.

==================================================
[13. PLACE ADDRESS]
==================================================

place_address MUST contain the real-world address of the specific place.

Do NOT use:
- neighborhood only
- city only
- station name only
- street name only

Example of acceptable format:
"東京都豊島区東池袋1-20-7"

The address must correspond to the specific place_name.

==================================================
[14. COORDINATES - CRITICAL]
==================================================

geo_coordinates MUST contain numeric latitude and longitude.

Coordinates are used directly for Mapbox map display and Google route
calculation. Therefore, coordinate accuracy is extremely important.

For EVERY hotel and EVERY activity:

1. Coordinates MUST belong to the EXACT real-world place named in
   hotel_name or place_name.

2. Coordinates MUST be consistent with the place_address or hotel_address.

3. Coordinates MUST be geographically inside the selected destination.

4. NEVER use coordinates for:
   - another country
   - another city
   - another branch of the same business
   - a nearby station
   - a nearby landmark
   - a neighborhood
   - a city center
   - another similar business

5. NEVER guess, invent, estimate, or fabricate coordinates.

6. NEVER copy coordinates from a similar place.

7. latitude MUST be latitude.
   longitude MUST be longitude.
   NEVER swap them.

8. If the exact coordinates of a place are uncertain:
   DO NOT invent coordinates.
   Replace that place with another real-world place whose name, address,
   and coordinates are more reliable.

--------------------------------------------------
[DESTINATION CONSISTENCY]
--------------------------------------------------

Before returning the JSON, check every hotel and activity:

place_name/hotel_name
        +
place_address/hotel_address
        +
geo_coordinates

MUST refer to the same physical location.

The coordinates MUST NOT belong to a different country or city.

Example:

Destination: Tokyo

INVALID:
place_name: "스시로 신주쿠점"
place_address: "東京都新宿区..."
latitude: 37.xxxx
longitude: 126.xxxx

The above coordinates are in Korea and MUST NOT be returned.

If such a mismatch occurs, replace the place with another real-world place
whose name, address, and coordinates are consistent.

--------------------------------------------------
[COORDINATE SELF-CHECK]
--------------------------------------------------

Before outputting the final JSON, silently verify:

- Is the place real?
- Does the coordinate belong to the exact place?
- Does the coordinate match the address?
- Is the coordinate inside the selected destination?
- Are latitude and longitude in the correct order?
- Did I accidentally use another branch or another city?
- Did I use a station, neighborhood, landmark, or city-center coordinate
  instead of the actual place?

If ANY answer is NO or uncertain:
REPLACE THE PLACE.

NEVER fabricate a coordinate to fill the required field.


==================================================
[15. HOTEL RULES]
==================================================

hotels MUST contain EXACTLY 2 hotel recommendations.

Both hotels MUST be real hotels.

Each hotel must have:

- real hotel_name
- real hotel_address
- price_per_night
- hotel_image_url
- numeric geo_coordinates
- numeric rating
- description

hotel_address MUST contain:
real address + nearby station/landmark walking time.

Example:
"東京都豊島区... (이케부쿠로역 도보 약 5분)"

price_per_night MUST include the pricing basis.

Example:
"약 80,000엔 / 1박당"

Do NOT invent hotel names.

==================================================
[16. HOTEL DESCRIPTION]
==================================================

description MUST be short and practical.

Focus on:
- nearby station
- transportation convenience
- location advantages

Example:
"이케부쿠로역에서 도보 약 5분 거리로 주요 관광지와 애니메이션 매장 이동이 편리합니다."

==================================================
[17. IMAGE SEARCH KEYWORDS]
==================================================

hotel_image_url and place_image_url are NOT actual URLs.

They are search keywords for a separate image search API.

Use ONLY 1-2 simple English words.

Do NOT use:
- exact place names
- hotel names
- long sentences
- Korean
- URLs

Good:
"hotel room"
"tokyo street"
"sushi"
"anime store"
"temple"
"city night"

Bad:
"Hotel Metropolitan Tokyo Ikebukuro"
"Shinjuku Gyoen National Garden"
"https://example.com/image.jpg"

==================================================
[18. PRICE RULE]
==================================================

ticket_pricing MUST contain a realistic price.

For paid attractions:
"약 1,500엔 / 1인당"

For restaurants:
"약 2,000엔 / 1인당"

For free locations:
"무료"

Never invent obviously unrealistic prices.

For Japan, remember that restaurants may have:
- 오토오시
- 자릿세
- 서비스 요금

If relevant, mention it briefly.

==================================================
[19. TRAVEL LOGIC]
==================================================

Create a practical route.

Avoid unnecessary backtracking.

Group nearby locations together whenever possible.

The itinerary should move logically through the destination.

Do NOT create a route that repeatedly travels across the entire city.

The first activity should start from the hotel/accommodation area.

==================================================
[20. USER INTEREST PERSONALIZATION]
==================================================

Strongly prioritize the user's explicit interests.

If the user likes anime, games, characters, idols, or otaku culture:
include REAL stores, shopping locations, exhibitions, themed locations, or related attractions.

However:
NEVER invent an official character/game store.

If no official location exists, use established retailers or real related attractions.

==================================================
[21. REGENERATION RULE]
==================================================

If this request is a REGENERATED itinerary:

- Keep the same destination.
- Keep the same duration.
- Keep the same budget.
- Keep the same group size.
- Keep the same JSON schema.
- Keep ALL rules in this prompt.
- Generate a genuinely different route.
- Prefer different attractions, restaurants, cafes, and shopping locations from the previous itinerary.
- Do NOT simply rename or reorder the previous itinerary.

A regenerated itinerary MUST still satisfy:
- exactly 2 hotels
- breakfast every day
- lunch every day
- dinner every day
- real restaurant names
- real specific places
- specific clock times
- transportation + travel duration
- practical short place_details
- numeric coordinates

The regeneration request does NOT override any rule above.

==================================================
[22. FINAL SELF-CHECK BEFORE OUTPUT]
==================================================

Before returning the JSON, silently verify:

1. Is the JSON valid?
2. Are all required keys present?
3. Are there exactly 2 hotels?
4. Does EVERY day contain breakfast?
5. Does EVERY day contain lunch?
6. Does EVERY day contain dinner?
7. Is every meal place_name an actual RESTAURANT NAME?
8. Did I accidentally use a food name instead of a restaurant name?
9. Did I accidentally invent a place?
10. Are all activities specific establishments or attractions?
11. Is best_time_to_visit_day a specific clock time?
12. Is every best_time_to_visit a specific clock time/range?
13. Does every time_travel_each_location contain transportation + duration?
14. Are place_details short and focused on operating hours/holidays/practical information?
15. Are all coordinates numeric?
16. Do coordinates correspond to the EXACT named place?
17. Do coordinates match the specific place address?
18. Are coordinates geographically consistent with the selected destination?
19. Are latitude and longitude in the correct order?
20. Did I accidentally use coordinates from another city, country,
    branch, station, neighborhood, landmark, or city center?
21. Are both hotel coordinates correct?
22. Are addresses specific and consistent with the coordinates?
23. Are there exactly 2 hotels?
24. Are image keywords simple English keywords?
25. Is every field meaningful and non-empty?

If any answer is NO, fix it before returning the JSON.

==================================================
[FINAL JSON SCHEMA]
==================================================

{
  "resp": "일정 생성이 완료되었습니다! 나만의 여루룩 로드를 확인해보세요.",
  "ui": "Final",
  "trip_plan": {
    "destination": "...",
    "duration": "...",
    "origin": "...",
    "budget": "...",
    "group_size": "...",
    "hotels": [
      {
        "hotel_name": "...",
        "hotel_address": "...",
        "price_per_night": "...",
        "hotel_image_url": "...",
        "geo_coordinates": {
          "latitude": 0.0,
          "longitude": 0.0
        },
        "rating": 0.0,
        "description": "..."
      },
      {
        "hotel_name": "...",
        "hotel_address": "...",
        "price_per_night": "...",
        "hotel_image_url": "...",
        "geo_coordinates": {
          "latitude": 0.0,
          "longitude": 0.0
        },
        "rating": 0.0,
        "description": "..."
      }
    ],
    "itinerary": [
      {
        "day": 1,
        "day_plan": "...",
        "best_time_to_visit_day": "09:00",
        "activities": [
          {
            "place_name": "[아침] 실제 식당명",
            "place_details": "운영시간: 07:00~22:00 (휴무일: 없음).",
            "recommend_reason": "...",
            "place_image_url": "breakfast cafe",
            "geo_coordinates": {
              "latitude": 0.0,
              "longitude": 0.0
            },
            "place_address": "...",
            "ticket_pricing": "약 1,500엔 / 1인당",
            "time_travel_each_location": "숙소에서 도보 약 8분",
            "best_time_to_visit": "08:00~09:00"
          }
        ]
      }
    ]
  }
}
`;

export async function POST(
  req: NextRequest
) {

  const {
    messages,
    isFinal,
  } = await req.json();


  const user = await currentUser();

  const decision = await aj.protect(
    req,
    {
      userId:
        user?.primaryEmailAddress
          ?.emailAddress ?? "",

      requested:
        isFinal ? 1 : 0,
    }
  );


// 💡 Arcjet 공식 메서드를 사용하여 안전하게 차단 여부 확인
  if (decision.isDenied()) {
    return NextResponse.json({
      resp: "사용 한도에 도달했어요. 잠시 후 다시 시도해주세요.",
      ui: "Limit",
    });
  }


  try {

  
    const expectedDays =
      isFinal
        ? getExpectedDaysFromMessages(messages)
        : 1;


    console.log(
      `📅 예상 여행 일수: ${expectedDays}일`
    );


    const MAX_RETRIES = 2;

    let finalParsedData: any = null;

    let generationSucceeded = false;


    for (
      let attempt = 1;
      attempt <= MAX_RETRIES;
      attempt++
    ) {

      console.log(
        `🤖 일정 생성 ${attempt}/${MAX_RETRIES}`
      );


      const completion =
        await openai.chat.completions.create({

          model: "gpt-4o-mini",

          messages: [
            {
              role: "system",

              content:
                isFinal
                  ? FINAL_PROMPT
                  : PROMPT,
            },

            ...messages,
          ],

          temperature: 0.3,

          max_tokens: 8000,

          response_format: {
            type: "json_object",
          },
        });


   
      const cleanContent =
        (
          completion.choices[0]
            ?.message?.content || ""
        )
          .replace(
            /<think>[\s\S]*?<\/think>/g,
            ""
          )
          .replace(
            /```json/gi,
            ""
          )
          .replace(
            /```/g,
            ""
          )
          .trim();


    
      try {

        finalParsedData =
          JSON.parse(cleanContent);

      } catch (error) {

        console.error(
          "❌ JSON 파싱 실패"
        );

        if (
          attempt < MAX_RETRIES
        ) {
          continue;
        }

        throw new Error(
          "JSON 파싱 실패"
        );
      }


      if (
        isFinal &&
        finalParsedData?.trip_plan
      ) {

        const actualDays =
          Array.isArray(
            finalParsedData
              .trip_plan
              .itinerary
          )
            ? finalParsedData
                .trip_plan
                .itinerary
                .length
            : 0;


        console.log(
          `📅 예상 ${expectedDays}일 / 실제 ${actualDays}일`
        );


        if (
          actualDays !== expectedDays
        ) {

          console.warn(
            `⚠️ 일정 일수 불일치: 예상 ${expectedDays}일 / 실제 ${actualDays}일`
          );


          // 재시도 가능
          if (
            attempt < MAX_RETRIES
          ) {
            continue;
          }

          throw new Error(
            `일정 일수 검증 실패: expected=${expectedDays}, actual=${actualDays}`
          );
        }
      }


      // 여기까지 왔다면 정상
      generationSucceeded = true;

      break;
    }


    if (
      !generationSucceeded ||
      !finalParsedData
    ) {

      throw new Error(
        "여행 일정 생성 실패"
      );
    }


    if (
      !finalParsedData.resp
    ) {

      finalParsedData.resp =
        "일정 계획을 성공적으로 가져왔습니다! ✈️";
    }


    if (
      isFinal &&
      finalParsedData.trip_plan
    ) {

      const plan =
        finalParsedData.trip_plan;


      const destination =
        typeof plan.destination === "object"
          ? plan.destination?.city
          : plan.destination;


      console.log(
        `🔍 [${destination}] Google Places 팩트체크 시작`
      );


      if (
        Array.isArray(plan.hotels)
      ) {

        const hotelPromises =
          plan.hotels.map(
            async (hotel: any) => {

              const verified =
                await verifyPlaceWithGoogle(
                  hotel.hotel_name,
                  destination,
                  "hotel"
                );


              // Google에서 찾지 못함
              if (!verified) {

                console.log(
                  `🗑️ 호텔 삭제: ${hotel.hotel_name}`
                );

                return null;
              }


              return {
                ...hotel,

                // Google의 실제 이름
                hotel_name:
                  verified.realName,

                // Google의 실제 주소
                hotel_address:
                  verified.realAddress,

                // Google 실제 좌표
                geo_coordinates: {
                  latitude:
                    verified.lat,

                  longitude:
                    verified.lng,
                },

                // 나중에 지도/사진 등에 활용
                place_id:
                  verified.placeId,

                // 사진은 기존 AI 이미지 키워드 유지
                //
                // Google 사진 API를 사용하지 않음
                hotel_image_url:
                  hotel.hotel_image_url,
              };
            }
          );


        plan.hotels =
          (
            await Promise.all(
              hotelPromises
            )
          ).filter(
            (hotel) =>
              hotel !== null
          );


        if (
          plan.hotels.length < 2
        ) {

          console.warn(
            `⚠️ Google 검증 후 호텔이 ${plan.hotels.length}개만 남았습니다.`
          );
        }
      }


      if (
        Array.isArray(
          plan.itinerary
        )
      ) {

        const itineraryPromises =
          plan.itinerary.map(
            async (day: any) => {

              if (
                !Array.isArray(
                  day.activities
                )
              ) {

                return day;
              }


              const activityPromises =
                day.activities.map(
                  async (
                    activity: any
                  ) => {

            
                    const placeName =
                      String(
                        activity.place_name ||
                        ""
                      );


                    const tagMatch =
                      placeName.match(
                        /\[.*?\]/
                      );


                    const tag =
                      tagMatch
                        ? tagMatch[0] + " "
                        : "";


                    const isFoodRelated =
                      /아침|점심|저녁|카페/
                        .test(tag);


                    const expectedType =
                      isFoodRelated
                        ? "food"
                        : "general";

                    const verified =
                      await verifyPlaceWithGoogle(
                        placeName,
                        destination,
                        expectedType
                      );


             
                    if (!verified) {

                      console.log(
                        `🗑️ 장소 삭제: ${placeName}`
                      );

                      return null;
                    }


                    return {
                      ...activity,

                      // 태그 + 실제 Google 장소명
                      place_name:
                        tag +
                        verified.realName,

                      // 실제 주소
                      place_address:
                        verified.realAddress,

                      // 실제 좌표
                      geo_coordinates: {
                        latitude:
                          verified.lat,

                        longitude:
                          verified.lng,
                      },

                      // Google Place ID
                      place_id:
                        verified.placeId,

                      // 사진은 기존 이미지 검색 결과 유지
                      place_image_url:
                        activity.place_image_url,
                    };
                  }
                );


              const beforeCount =
                day.activities.length;


              day.activities =
                (
                  await Promise.all(
                    activityPromises
                  )
                ).filter(
                  (activity) =>
                    activity !== null
                );


      
              if (
                day.activities.length < 4
              ) {

                console.warn(
                  `⚠️ Day ${day.day}: ${beforeCount}개 → ${day.activities.length}개`
                );
              }


              return day;
            }
          );


        plan.itinerary =
          await Promise.all(
            itineraryPromises
          );
      }



      const verifiedDays =
        Array.isArray(
          plan.itinerary
        )
          ? plan.itinerary.length
          : 0;


      if (
        verifiedDays !== expectedDays
      ) {

        console.warn(
          `⚠️ Google 검증 후 일수 확인: 예상 ${expectedDays}일 / 실제 ${verifiedDays}일`
        );
      }


      console.log(
        "✅ Google Places 팩트체크 완료"
      );
    }


    return NextResponse.json(
      finalParsedData
    );


  } catch (error: any) {

    console.error(
      "❌ API 서버 오류:",
      error?.message || error
    );


    return NextResponse.json(
      {
        resp:
          "여행 일정을 만드는 과정에서 잠시 문제가 발생했어요. 😭 다시 시도해주세요!",

        ui:
          isFinal
            ? "Final"
            : "none",
      },
      {
        status: 200,
      }
    );
  }
}