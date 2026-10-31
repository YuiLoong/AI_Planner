"use client"
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserButton, useUser } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'
import { useProtectedAction } from '@/hooks/useProtectedAction';

function Header() {
  // 1. isLoaded를 추가로 가져옵니다.
  const { user, isLoaded } = useUser();
  const path = usePathname();
  
  const router = useRouter(); 
  const executeProtected = useProtectedAction();

  return (
    <div className="flex justify-between items-center p-4 shadow-sm bg-white relative z-10 border-b border-border/40">
      <Link href="/" className="flex gap-2 items-center hover:opacity-90 transition-opacity">
        <Image src={'/Logo.svg'} alt="logo" width={30} height={30} />
        <h2 className="font-bold text-2xl">AI 여행 플래너</h2>
      </Link>

      <div className="flex gap-3 items-center">
        {/* 2. 로그인 정보가 로딩 중일 때는 아무것도 안 보여주거나 빈 공간을 유지합니다 */}
        {!isLoaded ? (
          <div className="w-24 h-10" /> // 로딩 중 레이아웃 밀림 방지용 빈 박스
        ) : user ? (
          <>
            {path === '/create-new-trip' ? (
              <Link href={'/my-trips'}>
                <Button variant="outline">내 여행 일정</Button>
              </Link>
            ) : (
              <Link href={'/create-new-trip'}>
                <Button>새로운 일정 만들기</Button>
              </Link>
            )}

            <div className="relative w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 flex items-center justify-center transition-all shadow-sm cursor-pointer ml-1">
              <span className="text-base select-none pointer-events-none">👤</span>
              <div className="absolute inset-0 opacity-0 cursor-pointer flex items-center justify-center">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </>
        ) : (
          <Button onClick={() => executeProtected('/create-new-trip')}>
            지금 시작하기
          </Button>
        )}
      </div>
    </div>
  )
}

export default Header;