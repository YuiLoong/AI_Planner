'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PlaceImageProps {
  keyword: string;
  alt: string;
}

const IS_MOCK_MODE = false; 

export default function PlaceImage({ keyword, alt }: PlaceImageProps) {
  const [imgUrl, setImgUrl] = useState<string>('/placeholder.png');

  useEffect(() => {
    if (IS_MOCK_MODE || !keyword) return;

    const fetchImage = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACE_API_KEY as string;
        
        const res = await fetch(
          'https://places.googleapis.com/v1/places:searchText',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey, // 👈 여기에 적용
              'X-Goog-FieldMask': 'places.photos',
            },
            body: JSON.stringify({
              textQuery: keyword,
            }),
          }
        );
        
        const data = await res.json();

        if (data.places && data.places.length > 0 && data.places[0].photos) {
          const photoName = data.places[0].photos[0].name; 
          
          // 사진 URL 가져올 때도 동일한 apiKey 사용
          const googleImgUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${apiKey}`;
          setImgUrl(googleImgUrl);
        }
      } catch (error) {
        console.error('구글 이미지 로딩 실패:', error);
        setImgUrl('/placeholder.png');
      }
    };

    fetchImage();
  }, [keyword]);

  return (
    <Image
      src={imgUrl}
      width={400}
      height={200}
      alt={alt}
      onError={() => setImgUrl('/placeholder.png')}
      className="object-cover rounded-xl w-full h-[180px]"
    />
  );
}