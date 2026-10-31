"use client"
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X, ChevronLeft, ChevronRight, Sparkles, RotateCcw, ZoomIn } from 'lucide-react'

// 🖼️ 5장의 단계별 도움말 이미지 데이터
export const guideImages = [
  {
    step: 1,
    title: '로그인 및 시작하기',
    description: '홈 화면에서 간편하게 로그인하고 새로운 여행 생성을 시작해보세요.',
    src: '/guide-1.png',
  },
  {
    step: 2,
    title: '여행 생성 화면',
    description: '여행지, 일정, 인원 등 기본적인 여행 조건을 설정하는 화면입니다.',
    src: 'guide-2.png',
  },
  {
    step: 3,
    title: '여행 생성 과정',
    description: 'AI가 여행 취향과 선호도를 실시간으로 반영하여 맞춤 코스를 기획합니다.',
    src: '/guide-3.png',
  },
  {
    step: 4,
    title: '여행 생성 결과 확인',
    description: '추천 장소와 동선, 지도가 결합된 최적의 일정이 완성됩니다.',
    src: '/guide-4.png',
  },
  {
    step: 5,
    title: '완성된 여행 일정 확인',
    description: '내 아카이브에 저장된 완성 일정을 언제든 열람하고 수정할 수 있습니다.',
    src: 'guide-5.jpg',
  },
]

export const GuideModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFirstVisitToast, setShowFirstVisitToast] = useState(false)
  const [imgError, setImgError] = useState(false)

  // 🔍 줌 및 드래그 팬(Pan) 상태 관리
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. 첫 방문 안내 팝업 (localStorage 확인)
  useEffect(() => {
    const hasSeenGuideToast = localStorage.getItem('hasSeenGuideToast')
    if (!hasSeenGuideToast) {
      const timer = setTimeout(() => {
        setShowFirstVisitToast(true)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  // 2. ESC 키 입력 감지하여 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // 3. 🛡️ 모달 오픈 시 뒷배경(홈 화면) 스크롤 완벽 차단
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // 4. 🖱️ 뒷배경 스크롤 방지 + 이미지 줌(Zoom) 네이티브 리스너 등록
  useEffect(() => {
    const container = containerRef.current
    if (!container || !isOpen) return

    const handleNativeWheel = (e: WheelEvent) => {
      // 브라우저의 기본 화면 스크롤 동작을 완전히 차단
      e.preventDefault()
      e.stopPropagation()

      const zoomStep = 0.15
      if (e.deltaY < 0) {
        // 휠 위로: 확대 (최대 3.5배)
        setScale((prev) => Math.min(Number((prev + zoomStep).toFixed(2)), 3.5))
      } else {
        // 휠 아래로: 축소 (최소 1배)
        setScale((prev) => {
          const next = Math.max(Number((prev - zoomStep).toFixed(2)), 1)
          if (next === 1) setPosition({ x: 0, y: 0 })
          return next
        })
      }
    }

    // passive: false 로 지정해야 브라우저 스크롤을 완벽히 막을 수 있습니다.
    container.addEventListener('wheel', handleNativeWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleNativeWheel)
    }
  }, [isOpen])

  // 🔄 슬라이드 이동 시 배율 & 위치 리셋
  const resetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  useEffect(() => {
    setImgError(false)
    resetZoom()
  }, [currentIndex])

  // 🖐️ 확대 시 마우스 드래그로 화면 이동
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleOpenModal = () => {
    setIsOpen(true)
    handleDismissToast()
  }

  const handleDismissToast = () => {
    setShowFirstVisitToast(false)
    localStorage.setItem('hasSeenGuideToast', 'true')
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1)
  }

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (currentIndex < guideImages.length - 1) setCurrentIndex((prev) => prev + 1)
  }

  const currentStep = guideImages[currentIndex]

  return (
    <>
      {/* ---------------- 1. 우하단 플로팅 도움말 (?) 버튼 ---------------- */}
      <aside aria-label="도움말 가이드" className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-auto">
        <AnimatePresence>
          {showFirstVisitToast && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-sky-200 dark:border-zinc-700 shadow-xl rounded-2xl p-4 max-w-xs text-left"
            >
              <div className="flex items-center gap-1.5 font-bold text-sm text-sky-600 dark:text-sky-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span>처음 사용하시나요?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                AI 여행 플래너의 핵심 기능과 사용 방법을 1분 만에 확인해보세요!
              </p>
              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  onClick={handleDismissToast}
                  className="px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  나중에 보기
                </button>
                <button
                  onClick={handleOpenModal}
                  className="px-3 py-1 font-semibold rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm hover:opacity-90 transition-opacity"
                >
                  가이드 보기
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleOpenModal}
          aria-label="도움말 가이드 열기"
          className="group relative flex items-center justify-center w-12 h-12 md:w-13 md:h-13 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-lg hover:shadow-sky-500/25 hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/40"
        >
          <HelpCircle className="w-6 h-6 md:w-7 md:h-7 stroke-[2.2]" />
          <span className="absolute right-14 bg-zinc-900/90 text-white text-xs px-2.5 py-1 rounded-md shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            사용 가이드
          </span>
        </button>
      </aside>

      {/* ---------------- 2. 시원하게 넓어진 도움말 모달 창 ---------------- */}
      <AnimatePresence>
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
          >
            {/* 어두운 배경 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* 모달 본체 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl h-[88vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-sky-100 dark:border-zinc-800 overflow-hidden"
            >
              {/* [헤더] 제목 + 원본 리셋 버튼 + 닫기 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-sky-50/70 to-indigo-50/40 dark:from-zinc-900 dark:to-zinc-900 select-none">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500/10 dark:bg-sky-400/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm">
                    {currentStep.step}
                  </div>
                  <div>
                    <h2 id="guide-modal-title" className="text-base md:text-lg font-bold text-foreground">
                      처음 사용하시나요? 사용 가이드
                    </h2>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {currentStep.title} — {currentStep.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={resetZoom}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      scale > 1
                        ? 'bg-sky-500 text-white border-sky-600 shadow-sm animate-pulse'
                        : 'bg-background/80 hover:bg-muted text-muted-foreground border-border'
                    }`}
                    title="원본 크기로 되돌리기"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>원본 크기 {scale > 1 ? `(${Math.round(scale * 100)}%)` : ''}</span>
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    aria-label="닫기"
                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* [본문] 마우스 이벤트 연결 (onWheel은 useEffect 네이티브 리스너가 가로채 처리함) */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`relative flex-1 flex items-center justify-center bg-slate-100/70 dark:bg-zinc-950 overflow-hidden select-none ${
                  scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
                }`}
              >
                {/* 확대 전 힌트 라벨 */}
                {scale === 1 && (
                  <div className="absolute top-3 left-4 z-10 hidden sm:flex items-center gap-1.5 bg-black/40 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full pointer-events-none">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>마우스 휠로 확대해서 자세히 볼 수 있습니다</span>
                  </div>
                )}

                {/* 〈 이전 버튼 */}
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  aria-label="이전 단계"
                  className={`absolute left-4 md:left-6 z-20 p-3 md:p-4 rounded-full bg-white/95 dark:bg-zinc-800/95 border border-slate-200 dark:border-zinc-700 shadow-lg transition-all ${
                    currentIndex === 0
                      ? 'opacity-20 cursor-not-allowed pointer-events-none'
                      : 'hover:scale-110 active:scale-95 text-foreground hover:bg-white cursor-pointer'
                  }`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* 이미지 영역 */}
                <div className="w-full h-full flex items-center justify-center p-3 md:p-6 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentIndex}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      {imgError ? (
                        <div className="flex flex-col items-center justify-center w-full max-w-lg h-80 border-2 border-dashed border-sky-200 dark:border-zinc-700 rounded-3xl p-6 text-center text-muted-foreground bg-white/50 dark:bg-zinc-900/50">
                          <p className="font-bold text-base mb-1">{currentStep.title}</p>
                          <p className="text-xs text-zinc-400">이미지를 불러올 수 없습니다. 경로를 확인해주세요.</p>
                          <span className="text-[11px] mt-3 px-3 py-1 bg-muted rounded-md font-mono">
                            {currentStep.src}
                          </span>
                        </div>
                      ) : (
                        <img
                          src={currentStep.src}
                          alt={currentStep.title}
                          onError={() => setImgError(true)}
                          draggable={false}
                          style={{
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                          }}
                          className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-md border border-slate-200/80 dark:border-zinc-800 will-change-transform"
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* 〉 다음 버튼 */}
                <button
                  onClick={handleNext}
                  disabled={currentIndex === guideImages.length - 1}
                  aria-label="다음 단계"
                  className={`absolute right-4 md:right-6 z-20 p-3 md:p-4 rounded-full bg-white/95 dark:bg-zinc-800/95 border border-slate-200 dark:border-zinc-700 shadow-lg transition-all ${
                    currentIndex === guideImages.length - 1
                      ? 'opacity-20 cursor-not-allowed pointer-events-none'
                      : 'hover:scale-110 active:scale-95 text-foreground hover:bg-white cursor-pointer'
                  }`}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* [푸터] 페이지 번호 & 점 인디케이터 */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-white dark:bg-zinc-900 select-none">
                <span className="text-xs font-semibold text-muted-foreground font-mono">
                  {currentIndex + 1} / {guideImages.length}
                </span>

                <div className="flex items-center gap-2">
                  {guideImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      aria-label={`${idx + 1}번 가이드로 이동`}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        currentIndex === idx
                          ? 'w-7 bg-gradient-to-r from-sky-500 to-indigo-500'
                          : 'w-2.5 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300'
                      }`}
                    />
                  ))}
                </div>

                {currentIndex === guideImages.length - 1 ? (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    가이드 닫기
                  </button>
                ) : (
                  <button
                    onClick={() => handleNext()}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    다음 &rarr;
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}