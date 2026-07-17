/**
 * Aether OS - Multi-User Collaboration
 * Real-time sync with WebRTC & WebSocket
 */

import { EventBus, Events } from '../core/EventBus';

export interface CollaborationConfig {
  serverUrl?: string;
  roomId?: string;
  userId?: string;
  userName?: string;
  signalingServer?: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number; z: number };
  isHost: boolean;
  joinedAt: number;
}

export interface CollaborationEvent {
  type: 'user-join' | 'user-leave' | 'cursor-move' | 'node-update' | 'chat' | 'sync';
  userId: string;
  data: any;
  timestamp: number;
}

export class CollaborationManager {
  private eventBus: EventBus;
  private config: CollaborationConfig;
  private ws: WebSocket | null = null;
  private users: Map<string, User> = new Map();
  private localUser: User | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private eventQueue: CollaborationEvent[] = [];

  constructor(eventBus?: EventBus, config?: CollaborationConfig) {
    this.eventBus = eventBus || new EventBus();
    this.config = {
      serverUrl: config?.serverUrl || 'wss://aether-collab.example.com',
      roomId: config?.roomId || this.generateRoomId(),
      userId: config?.userId || this.generateUserId(),
      userName: config?.userName || `User-${Math.random().toString(36).substr(2, 4)}`,
      signalingServer: config?.signalingServer || 'wss://signaling.example.com'
    };
  }

  private generateRoomId(): string {
    return `aether-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  private getRandomColor(): string {
    const colors = ['#00d9ff', '#ff00ff', '#00ff88', '#ffaa00', '#ff6b6b', '#6b6bff', '#d9ff00'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Connect to collaboration server
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      const wsUrl = `${this.config.serverUrl}?room=${this.config.roomId}&user=${this.config.userId}`;
      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve) => {
        if (!this.ws) return resolve(false);

        this.ws.onopen = () => {
          console.log('🔗 Collaboration connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Send join event
          this.sendEvent({
            type: 'user-join',
            userId: this.config.userId!,
            data: {
              name: this.config.userName,
              color: this.getRandomColor()
            },
            timestamp: Date.now()
          });

          // Flush queued events
          this.flushEventQueue();

          this.eventBus.emit('collaboration:connected');
          resolve(true);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('🔌 Collaboration disconnected');
          this.eventBus.emit('collaboration:disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('Collaboration error:', error);
          this.eventBus.emit('collaboration:error', { error });
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            resolve(false);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      return false;
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.ws) {
      this.sendEvent({
        type: 'user-leave',
        userId: this.config.userId!,
        data: {},
        timestamp: Date.now()
      });
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.users.clear();
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private sendEvent(event: CollaborationEvent): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(event));
    } else {
      this.eventQueue.push(event);
    }
  }

  private flushEventQueue(): void {
    while (this.eventQueue.length > 0 && this.isConnected) {
      const event = this.eventQueue.shift();
      if (event) this.sendEvent(event);
    }
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'user-join':
        this.handleUserJoin(data);
        break;
      case 'user-leave':
        this.handleUserLeave(data);
        break;
      case 'cursor-move':
        this.handleCursorMove(data);
        break;
      case 'node-update':
        this.handleNodeUpdate(data);
        break;
      case 'chat':
        this.handleChat(data);
        break;
      case 'sync':
        this.handleSync(data);
        break;
    }
  }

  private handleUserJoin(data: CollaborationEvent): void {
    const user: User = {
      id: data.userId,
      name: data.data.name,
      color: data.data.color,
      isHost: data.data.isHost || false,
      joinedAt: data.timestamp
    };

    this.users.set(data.userId, user);
    
    if (data.userId === this.config.userId) {
      this.localUser = user;
    }

    this.eventBus.emit('collaboration:user-join', user);
  }

  private handleUserLeave(data: CollaborationEvent): void {
    const user = this.users.get(data.userId);
    if (user) {
      this.users.delete(data.userId);
      this.eventBus.emit('collaboration:user-leave', user);
    }
  }

  private handleCursorMove(data: CollaborationEvent): void {
    const user = this.users.get(data.userId);
    if (user) {
      user.cursor = data.data.cursor;
      this.eventBus.emit('collaboration:cursor-move', { user, cursor: data.data.cursor });
    }
  }

  private handleNodeUpdate(data: CollaborationEvent): void {
    this.eventBus.emit('collaboration:node-update', data.data);
  }

  private handleChat(data: CollaborationEvent): void {
    const user = this.users.get(data.userId);
    this.eventBus.emit('collaboration:chat', {
      user,
      message: data.data.message,
      timestamp: data.timestamp
    });
  }

  private handleSync(data: CollaborationEvent): void {
    // Sync user list
    if (data.data.users) {
      data.data.users.forEach((user: User) => {
        this.users.set(user.id, user);
      });
    }
    this.eventBus.emit('collaboration:sync', data.data);
  }

  /**
   * Send cursor position
   */
  sendCursorPosition(x: number, y: number, z: number = 0): void {
    this.sendEvent({
      type: 'cursor-move',
      userId: this.config.userId!,
      data: { cursor: { x, y, z } },
      timestamp: Date.now()
    });
  }

  /**
   * Send node update
   */
  sendNodeUpdate(nodeData: any): void {
    this.sendEvent({
      type: 'node-update',
      userId: this.config.userId!,
      data: nodeData,
      timestamp: Date.now()
    });
  }

  /**
   * Send chat message
   */
  sendChatMessage(message: string): void {
    this.sendEvent({
      type: 'chat',
      userId: this.config.userId!,
      data: { message },
      timestamp: Date.now()
    });
  }

  /**
   * Request sync
   */
  requestSync(): void {
    this.sendEvent({
      type: 'sync',
      userId: this.config.userId!,
      data: { request: true },
      timestamp: Date.now()
    });
  }

  /**
   * Get all users
   */
  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * Get local user
   */
  getLocalUser(): User | null {
    return this.localUser;
  }

  /**
   * Get room ID
   */
  getRoomId(): string {
    return this.config.roomId || '';
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Generate share link
   */
  getShareLink(): string {
    return `${window.location.origin}?room=${this.config.roomId}`;
  }
}
