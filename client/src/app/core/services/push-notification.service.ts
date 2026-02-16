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
    return this.swPush.isEnabled;
  }

  /**
   * Subscribe this browser to push notifications
   */
  async subscribe(): Promise<boolean> {
    try {
      // Get VAPID public key from server
      const { publicKey } = await firstValueFrom(
        this.api.get<{ publicKey: string }>('/notifications/vapid-public-key')
      );

      if (!publicKey) return false;

      // Request browser permission and get subscription
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: publicKey
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
   * Unsubscribe this browser from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      const subscription = await this.swPush.subscription.pipe().toPromise();
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
   */
  async isSubscribed(): Promise<boolean> {
    try {
      const subscription = await this.swPush.subscription.pipe().toPromise();
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
