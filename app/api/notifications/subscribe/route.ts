import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

export async function POST(request: Request) {
  try {
    const { userId, subscription } = await request.json();

    if (!userId || !subscription) {
      return NextResponse.json({ success: false, error: 'Missing userId or subscription' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;

    await prisma.pushSubscription.upsert({
      where: { userId },
      update: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
