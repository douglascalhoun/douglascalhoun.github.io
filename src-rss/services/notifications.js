// Push notification service
import * as api from './api';

export function getUserId() {
  const existing = localStorage.getItem('userId');
  if (existing) return existing;

  const nav = navigator;
  const screen = window.screen;
  const guid = `${nav.userAgent}-${screen.width}x${screen.height}`;

  let hash = 0;
  for (let i = 0; i < guid.length; i++) {
    const char = guid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const userId = `user-${Math.abs(hash)}`;
  localStorage.setItem('userId', userId);
  return userId;
}

function urlBase64ToUint8Array(base64String) {
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

export async function subscribeToNotifications(preferences = {}) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  let registration;
  try {
    registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw new Error('Failed to register service worker: ' + error.message);
  }

  const publicKey = await api.getVapidPublicKey();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  const userId = getUserId();
  await api.subscribe(userId, subscription, preferences);

  localStorage.setItem('pushSubscription', JSON.stringify(subscription));

  return subscription;
}

export async function unsubscribeFromNotifications() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return;
  }

  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }

  localStorage.removeItem('pushSubscription');
}

export function hasNotificationSupport() {
  return 'Notification' in window &&
         'serviceWorker' in navigator &&
         'PushManager' in window;
}
