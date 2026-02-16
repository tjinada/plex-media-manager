import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';

export interface NotificationPreferences {
  enabled: boolean;
  categories: {
    streaming_started: { enabled: boolean };
    compatibility_issue: { enabled: boolean; minSeverity: string };
    media_downloaded: { enabled: boolean };
    missing_media: { enabled: boolean };
  };
}

export interface NotificationLogEntry {
  _id: string;
  category: string;
  title: string;
  body: string;
  url: string;
  sentAt: string;
  recipientCount: number;
  failedCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {

  constructor(
    private swPush: SwPush,
    private api: ApiService
  ) {
    // Handle notification clicks — navigate to the URL
    this.swPush.notificationClicks.subscribe(({ action, notification }) => {
      const data = notification?.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    });
  }

  /**
   * Check if push is supported in this browser
   */
  get isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Subscribe this browser to push notifications
   * Uses native Push API for reliable iOS PWA support
   */
  async subscribe(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('Push API not supported');
        return false;
      }

      // Get VAPID public key from server
      const { publicKey } = await firstValueFrom(
        this.api.get<{ publicKey: string }>('/notifications/vapid-public-key')
      );

      if (!publicKey) {
        console.error('No VAPID public key returned');
        return false;
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Convert VAPID key from base64url to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(publicKey);

      // Subscribe using native Push API
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // Send subscription to server
      await firstValueFrom(
        this.api.post('/notifications/subscribe', { subscription: subscription.toJSON() })
      );

      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  }

  /**
   * Convert a base64url-encoded string to a Uint8Array (for VAPID key)
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Unsubscribe this browser from push notifications
   * Uses native Push API for reliable iOS PWA support
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator)) return true;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await firstValueFrom(
          this.api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint })
        );
        await subscription.unsubscribe();
      }
      return true;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Check if this browser is currently subscribed
   * Uses native Push API for reliable state detection
   */
  async isSubscribed(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  }

  /**
   * Get notification preferences from server
   */
  async getPreferences(): Promise<{ preferences: NotificationPreferences; subscribedDevices: number }> {
    return firstValueFrom(
      this.api.get<{ preferences: NotificationPreferences; subscribedDevices: number }>('/notifications/preferences')
    );
  }

  /**
   * Update notification preferences on server
   */
  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const result = await firstValueFrom(
      this.api.put<{ preferences: NotificationPreferences }>('/notifications/preferences', prefs)
    );
    return result.preferences;
  }

  /**
   * Get notification history
   */
  async getHistory(limit = 50): Promise<NotificationLogEntry[]> {
    const result = await firstValueFrom(
      this.api.get<{ history: NotificationLogEntry[] }>('/notifications/history', { limit })
    );
    return result.history;
  }

  /**
   * Send a test notification
   */
  async sendTest(): Promise<boolean> {
    try {
      await firstValueFrom(this.api.post('/notifications/test'));
      return true;
    } catch {
      return false;
    }
  }
}
