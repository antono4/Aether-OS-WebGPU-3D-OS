/**
 * Aether OS - Collaboration UI
 * UI Components for Multi-User Collaboration
 */

import { CollaborationManager, User, CollaborationEvent } from './Collaboration';
import { EventBus, Events } from '../core/EventBus';

export class CollaborationUI {
  private collab: CollaborationManager;
  private eventBus: EventBus;
  private container: HTMLElement | null = null;
  private usersPanel: HTMLElement | null = null;
  private chatPanel: HTMLElement | null = null;
  private cursorElements: Map<string, HTMLElement> = new Map();

  constructor(collab: CollaborationManager, eventBus: EventBus) {
    this.collab = collab;
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('collaboration:user-join', (user: User) => {
      this.onUserJoin(user);
    });

    this.eventBus.on('collaboration:user-leave', (user: User) => {
      this.onUserLeave(user);
    });

    this.eventBus.on('collaboration:cursor-move', (data: { user: User; cursor: { x: number; y: number } }) => {
      this.updateUserCursor(data.user.id, data.cursor);
    });

    this.eventBus.on('collaboration:chat', (data: { user: User; message: string }) => {
      this.onChatMessage(data);
    });
  }

  /**
   * Render collaboration panel
   */
  render(container: HTMLElement): void {
    this.container = container;
    
    container.innerHTML = `
      <div class="collab-panel">
        <div class="collab-header">
          <h3>👥 Collaboration</h3>
          <div class="collab-status">
            <span class="status-indicator disconnected"></span>
            <span class="status-text">Disconnected</span>
          </div>
        </div>
        
        <div class="collab-actions">
          <button id="collab-connect" class="btn-connect">Join Session</button>
          <button id="collab-share" class="btn-share" style="display:none">Share Link</button>
        </div>
        
        <div class="collab-users">
          <h4>Users</h4>
          <div id="users-list" class="users-list"></div>
        </div>
        
        <div class="collab-chat">
          <h4>Chat</h4>
          <div id="chat-messages" class="chat-messages"></div>
          <div class="chat-input-container">
            <input type="text" id="chat-input" placeholder="Type a message..." />
            <button id="chat-send">Send</button>
          </div>
        </div>
      </div>
      
      <style>
        .collab-panel {
          background: var(--glass-bg, rgba(26,26,46,0.6));
          backdrop-filter: blur(20px);
          border: var(--glass-border, 1px solid rgba(255,255,255,0.1));
          border-radius: 16px;
          padding: 16px;
          width: 300px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .collab-header h3 { margin: 0; color: #00d9ff; font-size: 14px; }
        .collab-status { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
        .status-indicator { width: 8px; height: 8px; border-radius: 50%; }
        .status-indicator.connected { background: #00ff88; box-shadow: 0 0 8px #00ff88; }
        .status-indicator.disconnected { background: #ff6b6b; }
        .status-indicator.connecting { background: #ffaa00; animation: pulse 1s infinite; }
        .status-text { font-size: 12px; color: #a0a0b0; }
        .collab-actions { display: flex; gap: 8px; }
        .btn-connect, .btn-share {
          flex: 1; padding: 8px; border: none; border-radius: 8px;
          cursor: pointer; font-weight: 600; transition: all 0.2s;
        }
        .btn-connect { background: linear-gradient(135deg, #00d9ff, #00ff88); color: #0a0a0f; }
        .btn-share { background: rgba(0,217,255,0.1); color: #00d9ff; border: 1px solid #00d9ff; }
        .collab-users h4, .collab-chat h4 { margin: 0 0 8px; font-size: 12px; color: #a0a0b0; text-transform: uppercase; }
        .users-list { display: flex; flex-wrap: wrap; gap: 8px; max-height: 100px; overflow-y: auto; }
        .user-badge {
          display: flex; align-items: center; gap: 6px; padding: 4px 10px;
          background: rgba(255,255,255,0.05); border-radius: 20px; font-size: 12px;
        }
        .user-dot { width: 8px; height: 8px; border-radius: 50%; }
        .collab-chat { flex: 1; display: flex; flex-direction: column; min-height: 150px; }
        .chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .chat-message { padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; }
        .chat-message .sender { font-size: 11px; font-weight: 600; margin-bottom: 2px; }
        .chat-message .text { font-size: 13px; color: #d0d0e0; }
        .chat-input-container { display: flex; gap: 8px; margin-top: 8px; }
        .chat-input-container input {
          flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          color: #fff; font-size: 13px; outline: none;
        }
        .chat-input-container input:focus { border-color: #00d9ff; }
        .chat-input-container button { padding: 8px 16px; background: #00d9ff; border: none; border-radius: 8px; color: #0a0a0f; cursor: pointer; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      </style>
    `;

    this.setupEventHandlers();
    this.usersPanel = container.querySelector('#users-list');
    this.chatPanel = container.querySelector('#chat-messages');
  }

  private setupEventHandlers(): void {
    const connectBtn = this.container?.querySelector('#collab-connect');
    const shareBtn = this.container?.querySelector('#collab-share');
    const chatInput = this.container?.querySelector('#chat-input') as HTMLInputElement;
    const chatSend = this.container?.querySelector('#chat-send');

    connectBtn?.addEventListener('click', () => this.toggleConnection());
    
    shareBtn?.addEventListener('click', () => {
      const link = this.collab.getShareLink();
      navigator.clipboard.writeText(link);
      alert('Share link copied to clipboard!');
    });

    chatSend?.addEventListener('click', () => this.sendMessage());
    chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  private async toggleConnection(): Promise<void> {
    const btn = this.container?.querySelector('#collab-connect') as HTMLButtonElement;
    const statusIndicator = this.container?.querySelector('.status-indicator');
    const statusText = this.container?.querySelector('.status-text');
    const shareBtn = this.container?.querySelector('#collab-share');

    if (this.collab.getIsConnected()) {
      this.collab.disconnect();
      if (btn) btn.textContent = 'Join Session';
      if (statusIndicator) { statusIndicator.className = 'status-indicator disconnected'; }
      if (statusText) statusText.textContent = 'Disconnected';
      if (shareBtn) (shareBtn as HTMLElement).style.display = 'none';
    } else {
      if (statusIndicator) { statusIndicator.className = 'status-indicator connecting'; }
      if (statusText) statusText.textContent = 'Connecting...';
      if (btn) btn.textContent = 'Connecting...';

      const success = await this.collab.connect();
      
      if (success) {
        if (btn) btn.textContent = 'Leave Session';
        if (statusIndicator) { statusIndicator.className = 'status-indicator connected'; }
        if (statusText) statusText.textContent = `Room: ${this.collab.getRoomId().substring(0, 12)}...`;
        if (shareBtn) (shareBtn as HTMLElement).style.display = 'block';
        
        this.updateUsersList();
      } else {
        if (btn) btn.textContent = 'Join Session';
        if (statusIndicator) { statusIndicator.className = 'status-indicator disconnected'; }
        if (statusText) statusText.textContent = 'Connection failed';
      }
    }
  }

  private onUserJoin(user: User): void {
    this.updateUsersList();
    this.addSystemMessage(`${user.name} joined the session`);
  }

  private onUserLeave(user: User): void {
    this.updateUsersList();
    this.addSystemMessage(`${user.name} left the session`);
    this.removeUserCursor(user.id);
  }

  private updateUsersList(): void {
    if (!this.usersPanel) return;
    
    const users = this.collab.getUsers();
    
    this.usersPanel.innerHTML = users.map(user => `
      <div class="user-badge">
        <span class="user-dot" style="background: ${user.color}"></span>
        <span>${user.name}${user.id === this.collab.getLocalUser()?.id ? ' (you)' : ''}</span>
      </div>
    `).join('');
  }

  private updateUserCursor(userId: string, cursor: { x: number; y: number }): void {
    let cursorEl = this.cursorElements.get(userId);
    
    if (!cursorEl) {
      cursorEl = document.createElement('div');
      cursorEl.className = 'remote-cursor';
      cursorEl.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20"><path d="M4 4 L16 10 L10 12 L8 18 Z" fill="#00d9ff"/></svg>';
      cursorEl.style.cssText = 'position: fixed; pointer-events: none; z-index: 1000; transition: transform 0.1s;';
      document.body.appendChild(cursorEl);
      this.cursorElements.set(userId, cursorEl);
    }
    
    cursorEl.style.transform = `translate(${cursor.x}px, ${cursor.y}px)`;
  }

  private removeUserCursor(userId: string): void {
    const cursorEl = this.cursorElements.get(userId);
    if (cursorEl) {
      cursorEl.remove();
      this.cursorElements.delete(userId);
    }
  }

  private sendMessage(): void {
    const input = this.container?.querySelector('#chat-input') as HTMLInputElement;
    const message = input?.value.trim();
    
    if (message && this.collab.getIsConnected()) {
      this.collab.sendChatMessage(message);
      input.value = '';
    }
  }

  private onChatMessage(data: { user: User; message: string }): void {
    if (!this.chatPanel) return;

    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `
      <div class="sender" style="color: ${data.user.color}">${data.user.name}</div>
      <div class="text">${data.message}</div>
    `;
    
    this.chatPanel.appendChild(messageEl);
    this.chatPanel.scrollTop = this.chatPanel.scrollHeight;
  }

  private addSystemMessage(text: string): void {
    if (!this.chatPanel) return;

    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.style.opacity = '0.6';
    messageEl.innerHTML = `<div class="text" style="font-style: italic; text-align: center;">${text}</div>`;
    
    this.chatPanel.appendChild(messageEl);
    this.chatPanel.scrollTop = this.chatPanel.scrollHeight;
  }

  dispose(): void {
    this.cursorElements.forEach(el => el.remove());
    this.cursorElements.clear();
  }
}
