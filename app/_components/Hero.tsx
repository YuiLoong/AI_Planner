"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowDown, Globe2, Send, ChevronLeft, ChevronRight } from 'lucide-react'
import { HeroVideoDialog } from "@/components/ui/hero-video-dialog"
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from "@clerk/nextjs"
import { motion, AnimatePresence } from "framer-motion"
import { GuideModal } from "@/components/GuideModal"
// ⭐️ 추가된 훅
import { useProtectedAction } from '@/hooks/useProtectedAction';

export const suggestions = [
  { title: '새로운 여행지 생성', icon: <Globe2 className='text-purple-300 h-5 w-5' /> },
  { title: '여행지 추천받기', icon: <Globe2 className='text-orange-300 h-5 w-5' /> },
  { title: '숨겨진 명소 찾기', icon: <Globe2 className='text-yellow-300 h-5 w-5' /> },
  { title: '액티비티 여행지', icon: <Globe2 className='text-green-300 h-5 w-5' /> },
]

const guideVideos = [
  {
    id: 0,
    title: '로그인 & 로그아웃',
    videoSrc: 'https://www.youtube.com/embed/PIUnaZpvcb8', // 1번 영상
    thumbnailSrc: '/sample1.png', 
    thumbnailAlt: '로그인 및 로그아웃 가이드 영상',
  },
  {
    id: 1,
    title: '여행 생성 시작하기',
    videoSrc: 'https://www.youtube.com/embed/ie9JTHTbVyQ', // 2번 영상
    thumbnailSrc: '/sample2.png', 
    thumbnailAlt: '여행 생성 시작하기 가이드 영상',
  },
  {
    id: 2,
    title: '일정표 확인하기',
    videoSrc: 'https://www.youtube.com/embed/PFnJSiMAQR0', // 3번 영상
    thumbnailSrc: '/sample3.png', 
    thumbnailAlt: '일정표 확인하기 가이드 영상',
  },
  {
    id: 3,
    title: '사전답사 하기',
    videoSrc: 'https://www.youtube.com/embed/xCKy_fGxcVg', // 4번 영상
    thumbnailSrc: '/sample4.png', 
    thumbnailAlt: '사전답사 가이드 영상',
  },
]

const Hero = () => {
  // const { user, isLoaded, isSignedIn } = useUser(); <- 이제 useProtectedAction이 로그인 여부를 처리하므로 지워도 무방합니다.
  // const clerk = useClerk(); <- 위와 동일
  const router = useRouter();
  const executeProtected = useProtectedAction(); // ⭐️ 훅 초기화

  const [typedText, setTypedText] = useState("");
  const [typingKey, setTypingKey] = useState(0);
  const fullText = "목적지부터 숙소, 일정까지 한 번에. 나만을 위한 완벽한 코스 제안.";
  
  // ⭐️ 텍스트 입력창 상태
  const [inputText, setInputText] = useState("");

  const [selectedGuideIndex, setSelectedGuideIndex] = useState(0);

  const handlePrevGuide = () => {
    setSelectedGuideIndex((prev) => (prev === 0 ? guideVideos.length - 1 : prev - 1));
  };

  const handleNextGuide = () => {
    setSelectedGuideIndex((prev) => (prev === guideVideos.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTypingKey((prev) => prev + 1);
    }, 12000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let currentIndex = 0;
    setTypedText("");

    const typeInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTypedText(fullText.substring(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 70);

    return () => clearInterval(typeInterval);
  }, [typingKey]);


  const currentGuide = guideVideos[selectedGuideIndex];

  return (
    <div className='mt-8 w-full flex flex-col items-center justify-center space-y-12 px-4'> 
        
      {/* ✈️ 비행기 배너 */}
      <div className="w-full max-w-7xl h-[400px] md:h-[550px] relative rounded-3xl flex items-center justify-center overflow-hidden shadow-md">
        <motion.img
          src="headerImg.jpg"
          alt="비행기 배경"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ clipPath: "polygon(0 0, 0 0, 0 0, 0 0)" }}
          animate={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        <div className='relative z-10 text-center space-y-6 px-4'>
          <h1 className='text-3xl md:text-5xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]'> 
            <span className='text-blue-100'>AI</span>와 함께, 당신만의 <span className='text-blue-100'>특별한 여행</span>을 설계하세요
          </h1>

          <p className='text-lg md:text-xl text-white font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] inline-block'>
            {typedText}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ repeat: Infinity, duration: 0.8, repeatType: "reverse" }} 
              className="ml-1 font-bold text-blue-200"
            >
              _
            </motion.span>
          </p>
        </div>
      </div>

      {/* ----------------- 입력 상자 ----------------- */}
      <div className='max-w-3xl w-full'>
        <div className='rounded-xl border border-border bg-card p-4 shadow-sm relative'>
          <Textarea 
            placeholder='어디로 떠나고 싶으신가요? (예: 3박 4일 일본 도쿄 여행)'
            className="w-full h-20 bg-transparent border-none focus-visible:ring-0 resize-none p-0"
            value={inputText} // ⭐️ 상태 연결
            onChange={(e) => setInputText(e.target.value)} // ⭐️ 입력값 업데이트
          />
          {/* ⭐️ 입력창 우하단의 보내기 버튼 클릭 이벤트 수정 */}
          <Button 
            size={'icon'} 
            className='absolute bottom-6 right-6' 
            onClick={() => executeProtected('/create-new-trip', inputText)}
          >
            <Send className='h-4 w-4'/>
          </Button>
        </div>
      </div>

      {/* ----------------- 추천 태그 (4개 버튼) ----------------- */}
      <div className='flex gap-5 flex-wrap justify-center'>
        {suggestions.map((item, index) =>
          <div 
            key={index} 
            onClick={() => executeProtected('/create-new-trip', item.title)} 
            className='flex items-center gap-2 border rounded-full p-2 cursor-pointer hover:bg-primary hover:text-white transition-colors'
          >
            {item.icon}
            <h2 className='text-sm'>{item.title}</h2>
          </div>
        )}
      </div>
        
      {/* ----------------- 💡 사용 가이드 영역 ----------------- */}
      <div className='flex items-center justify-center flex-col w-full max-w-6xl px-2'>
        
        <h2 className='my-6 mt-14 flex items-center justify-center gap-2 text-center text-xl md:text-2xl text-foreground font-medium'>
          시작이 막막하신가요? <strong className="font-bold text-primary">사용 가이드 확인하기</strong>
          <ArrowDown className='w-5 h-5 text-primary animate-bounce' />
        </h2>

        <div className='flex items-center justify-center gap-2 md:gap-3 flex-wrap mb-8 w-full px-2'>
          {guideVideos.map((guide, idx) => {
            const isSelected = selectedGuideIndex === idx;
            return (
              <button
                key={guide.id}
                onClick={() => setSelectedGuideIndex(idx)}
                className={`px-5 py-2.5 text-xs md:text-sm font-semibold rounded-full transition-all duration-200 border ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                    : 'bg-background/80 hover:bg-muted text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {guide.title}
              </button>
            );
          })}
        </div>

        <div className="relative w-full max-w-5xl flex items-center justify-center px-6 md:px-12">
          <button
            onClick={handlePrevGuide}
            aria-label="이전 가이드 영상"
            className="absolute left-0 md:-left-4 z-20 p-2.5 md:p-3.5 rounded-full bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-lg hover:scale-110 active:scale-95 transition-all text-slate-700 dark:text-zinc-200 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 md:w-7 md:h-7" />
          </button>

          <div className="w-full overflow-hidden rounded-2xl shadow-xl border border-slate-100 dark:border-zinc-800">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentGuide.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <HeroVideoDialog
                  className="block dark:hidden"
                  animationStyle="from-center"
                  videoSrc={currentGuide.videoSrc}
                  thumbnailSrc={currentGuide.thumbnailSrc}
                  thumbnailAlt={currentGuide.thumbnailAlt}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            onClick={handleNextGuide}
            aria-label="다음 가이드 영상"
            className="absolute right-0 md:-right-4 z-20 p-2.5 md:p-3.5 rounded-full
             bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-800 border border-slate-200
              dark:border-zinc-700 shadow-lg hover:scale-110 active:scale-95 transition-all text-slate-700 dark:text-zinc-200 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 md:w-7 md:h-7" />
          </button>
        </div>

      </div>
      <GuideModal/>
    </div>
  )
}

export default Hero;