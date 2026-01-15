import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  StreamingSession,
  DownloadItem,
  QuickStats,
  RecentActivity,
  WebSocketStatus
} from '@core/models/home.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: any = null;

  // Connection status
  private statusSubject = new BehaviorSubject<WebSocketStatus>({
    connected: false,
    reconnecting: false
  });

  // Data subjects
  private streamingSubject = new BehaviorSubject<StreamingSession[]>([]);
  private downloadsSubject = new BehaviorSubject<DownloadItem[]>([]);
  private statsSubject = new BehaviorSubject<QuickStats | null>(null);

  // Event subjects
  private streamStartedSubject = new Subject<StreamingSession>();
  private streamStoppedSubject = new Subject<{ sessionKey: string }>();
  private downloadCompletedSubject = new Subject<{ id: string; title: string; type: string }>();
  private activitySubject = new Subject<RecentActivity>();

  // Public observables
  status$ = this.statusSubject.asObservable();
  streaming$ = this.streamingSubject.asObservable();
  downloads$ = this.downloadsSubject.asObservable();
  stats$ = this.statsSubject.asObservable();
  streamStarted$ = this.streamStartedSubject.asObservable();
  streamStopped$ = this.streamStoppedSubject.asObservable();
  downloadCompleted$ = this.downloadCompletedSubject.asObservable();
  newActivity$ = this.activitySubject.asObservable();

  constructor() {}

  /**
   * Connect to WebSocket server and subscribe to home updates
   */
  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    // Build WebSocket URL from current location
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
    this.statusSubject.next({ connected: false, reconnecting: false });
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.statusSubject.next({
        connected: true,
        reconnecting: false,
        lastUpdate: new Date()
      });

      // Subscribe to home updates
      this.send({ type: 'subscribe', channel: 'home' });
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.statusSubject.next({ connected: false, reconnecting: false });
      this.scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: { type: string; data: any }): void {
    switch (message.type) {
      case 'streaming:update':
        this.streamingSubject.next(message.data);
        this.updateLastUpdate();
        break;

      case 'streaming:started':
        this.streamStartedSubject.next(message.data);
        break;

      case 'streaming:stopped':
        this.streamStoppedSubject.next(message.data);
        break;

      case 'downloads:update':
        // Handle both old format (array) and new format (object with items)
        const downloads = Array.isArray(message.data) ? message.data : (message.data.items || []);
        this.downloadsSubject.next(downloads);
        this.updateLastUpdate();
        break;

      case 'download:completed':
        this.downloadCompletedSubject.next(message.data);
        break;

      case 'stats:update':
        this.statsSubject.next(message.data);
        this.updateLastUpdate();
        break;

      case 'activity:new':
        this.activitySubject.next(message.data);
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  /**
   * Send a message through the WebSocket
   */
  private send(data: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.statusSubject.next({ connected: false, reconnecting: false });
      return;
    }

    this.statusSubject.next({ connected: false, reconnecting: true });

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Update last update timestamp
   */
  private updateLastUpdate(): void {
    const current = this.statusSubject.value;
    this.statusSubject.next({
      ...current,
      lastUpdate: new Date()
    });
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
