import { currentUser } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import ItineraryEmail from '../../../emails/ItineraryEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const user = await currentUser();

    if (!user || !user.primaryEmailAddress) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userEmail = user.primaryEmailAddress.emailAddress;

    // 클라이언트에서 전달한 여행 일정 데이터
    const itineraryData = await req.json();

    const data = await resend.emails.send({
      from: 'AI 여행 플래너 <noreply@ai-trip-planner.shop>',
      to: [userEmail],
      subject: '요청하신 여행 계획이 준비되었습니다! ✈️',
      react: ItineraryEmail({ itineraryData }),
    });

    return Response.json(data);

  } catch (error) {
    console.error('이메일 전송 오류:', error);

    return Response.json(
      { error: '이메일 전송에 실패했습니다.' },
      { status: 500 }
    );
  }
}