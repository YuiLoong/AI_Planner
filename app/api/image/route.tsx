import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  // 검색어가 없으면 기본 땜빵 이미지(지구본 등) 반환
  if (!query) return NextResponse.json({ imageUrl: '/placeholder.png' });

  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;
    
    // 구글 커스텀 검색 API (searchType=image로 무조건 사진만 1장 가져옴!)
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${cx}&key=${apiKey}&searchType=image&num=1`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      return NextResponse.json(
        { imageUrl: data.items[0].link },
       
        { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } } 
      );
    }

    // 사진이 없으면 기본 이미지
    return NextResponse.json({ imageUrl: '/placeholder.png' });
    
  } catch (error) {
    console.error("❌ 사진 검색 실패:", error);
    return NextResponse.json({ imageUrl: '/placeholder.png' });
  }
}