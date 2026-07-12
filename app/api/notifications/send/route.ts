import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

// Initialize web-push with VAPID keys if they exist
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@ecosphere.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: Request) {
  try {
    const { userId, type, title, body, url } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Get user's push subscription
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId }
    });

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'No active push subscription found for this user.' });
    }

    // Prepare web-push subscription object
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      type
    });

    // Send via web-push
    await webpush.sendNotification(pushSubscription, payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send notification error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
