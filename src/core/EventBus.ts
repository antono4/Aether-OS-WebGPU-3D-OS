/**
 * Aether OS - Event Bus
 * Centralized event system for loose coupling between modules
 */

type EventHandler = (data?: any) => void;

export class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private eventHistory: Array<{ event: string; data: any; timestamp: number }> = [];
  private maxHistory: number = 100;

  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  once(event: string, handler: EventHandler): void {
    const wrapped = (data?: any) => {
      this.off(event, wrapped);
      handler(data);
    };
    this.on(event, wrapped);
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, data?: any): void {
    this.eventHistory.push({ event, data, timestamp: Date.now() });
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }
    this.listeners.get(event)?.forEach(h => {
      try { h(data); } catch (e) { console.error(`Event error '${event}':`, e); }
    });
  }

  getHistory() { return [...this.eventHistory]; }
  clear() { this.listeners.clear(); }
  getRegisteredEvents() { return Array.from(this.listeners.keys()); }
}

export const Events = {
  NODE_CREATED: 'node:created',
  NODE_DELETED: 'node:deleted',
  NODE_FOCUSED: 'node:focused',
  NODE_MOVED: 'node:moved',
  NODE_RESIZED: 'node:resized',
  NODE_CONNECTED: 'node:connected',
  CANVAS_CLICKED: 'canvas:clicked',
  CANVAS_TRANSFORMED: 'canvas:transformed',
  CAMERA_MOVED: 'camera:moved',
  INTENT_RECEIVED: 'ai:intent-received',
  TOOL_GENERATING: 'ai:tool-generating',
  TOOL_GENERATED: 'ai:tool-generated',
  TOOL_ERROR: 'ai:tool-error',
  MEMORY_STORED: 'memory:stored',
  MEMORY_RETRIEVED: 'memory:retrieved',
  MEMORY_SEARCH: 'memory:search',
  READY: 'system:ready',
  ERROR: 'system:error'
} as const;

export type EventName = typeof Events[keyof typeof Events];
