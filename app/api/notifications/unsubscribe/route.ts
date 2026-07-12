import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
