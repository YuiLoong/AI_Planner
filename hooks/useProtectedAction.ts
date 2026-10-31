import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useProtectedAction() {
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const router = useRouter();

  // targetUrl: 이동할 주소, textToSave: 유지할 텍스트(선택)
  const execute = useCallback((targetUrl: string, textToSave?: string) => {
    // 1. 보존할 텍스트가 있다면 라우팅/모달 실행 전에 무조건 먼저 브라우저에 저장
    if (textToSave && textToSave.trim()) {
      sessionStorage.setItem('pendingPrompt', textToSave);
    }

    // 2. 상태에 따라 페이지 이동 처리
    if (isSignedIn) {
      router.push(targetUrl); // 이미 로그인 상태면 즉시 이동
    } else {
      // 비로그인이면 모달을 띄우고, 완료되는 순간 자동으로 targetUrl로 쏴줌
      openSignIn({ forceRedirectUrl: targetUrl });
    }
  }, [isSignedIn, openSignIn, router]);

  return execute;
}