import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const { id } = await params;

  try {
    let updatedNotif;

    if (isOnline) {
      updatedNotif = await prisma.notification.update({
        where: { id },
        data: { read: true },
      });
    } else {
      const db = getFallbackDb();
      const notifIndex = db.notifications.findIndex((n: any) => n.id === id);

      if (notifIndex < 0) {
        return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
      }

      db.notifications[notifIndex] = {
        ...db.notifications[notifIndex],
        read: true,
      };
      updatedNotif = db.notifications[notifIndex];
      saveFallbackDb(db);
    }

    return NextResponse.json(updatedNotif);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
