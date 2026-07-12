"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushSubscriber({ userId }: { userId: string }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // register service worker if not registered
      navigator.serviceWorker.register('/sw.js').then(reg => {
        setRegistration(reg);
        reg.pushManager.getSubscription().then(sub => {
          if (sub && !(sub.expirationTime && Date.now() > sub.expirationTime - 5 * 60 * 1000)) {
            setSubscription(sub);
            setIsSubscribed(true);
          }
          setIsLoading(false);
        });
      }).catch(err => {
        console.error('Service Worker registration failed:', err);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const subscribeButtonOnClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!registration) return;
    
    setIsLoading(true);

    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string)
      });
      
      setSubscription(sub);
      setIsSubscribed(true);
      
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subscription: sub
        })
      });
      
      setIsLoading(false);
      
      // Send a test notification upon successful subscription
      await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });
      
    } catch (error) {
      console.error('Failed to subscribe the user: ', error);
      setIsLoading(false);
    }
  };

  const unsubscribeButtonOnClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!subscription) return;
    
    setIsLoading(true);

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);
      
      await fetch(`/api/notifications/unsubscribe?userId=${userId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error unsubscribing', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (isSubscribed) {
    return (
      <Button variant="outline" size="sm" onClick={unsubscribeButtonOnClick}>
        <BellOff className="w-4 h-4 mr-2" />
        Disable Notifications
      </Button>
    );
  }

  return (
    <Button variant="default" size="sm" onClick={subscribeButtonOnClick}>
      <Bell className="w-4 h-4 mr-2" />
      Enable Notifications
    </Button>
  );
}
