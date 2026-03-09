import { WS_URL } from './api';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.shouldReconnect = true;
    this.subscribedGuild = null;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      if (this.subscribedGuild) {
        this.send({ type: 'subscribe', guildId: this.subscribedGuild });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const callbacks = this.listeners.get(data.type);
        if (callbacks) {
          callbacks.forEach(cb => cb(data));
        }
      } catch {}
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      }
    };

    this.ws.onerror = () => {};
  }

  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  subscribe(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
    return () => this.unsubscribe(type, callback);
  }

  unsubscribe(type, callback) {
    this.listeners.get(type)?.delete(callback);
  }

  subscribeGuild(guildId) {
    this.subscribedGuild = guildId;
    this.send({ type: 'subscribe', guildId });
  }
}

export const ws = new WebSocketManager();
