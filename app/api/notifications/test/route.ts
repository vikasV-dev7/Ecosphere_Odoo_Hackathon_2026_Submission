import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    // Call the internal send API
    const response = await fetch(`${protocol}://${host}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type: 'test',
        title: '🎉 Push Notifications Active!',
        body: 'You are successfully subscribed to EcoSphere alerts.',
        url: '/'
      })
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
