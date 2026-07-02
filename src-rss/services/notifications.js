// Push notification service
import * as api from './api';

function generateUserId() {
  // Generate a simple user ID based on browser fingerprint
  const nav = navigator;
  const screen = window.screen;
  const guid = `${nav.userAgent}-${screen.width}x${screen.height}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < guid.length; i++) {
    const char = guid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `user-${Math.abs(hash)}`;
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

  // Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Register service worker
  let registration;
  try {
    registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw new Error('Failed to register service worker: ' + error.message);
  }

  // Get VAPID public key
  const publicKey = await api.getVapidPublicKey();
  
  // Subscribe to push notifications
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  console.log('Push subscription:', subscription);

  // Send subscription to server
  const userId = generateUserId();
  await api.subscribe(userId, subscription, preferences);

  // Store subscription locally
  localStorage.setItem('pushSubscription', JSON.stringify(subscription));
  localStorage.setItem('userId', userId);

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
    console.log('Unsubscribed from push notifications');
  }

  localStorage.removeItem('pushSubscription');
}

export function hasNotificationSupport() {
  return 'Notification' in window && 
         'serviceWorker' in navigator && 
         'PushManager' in window;
}
