// WebSocket service for real-time RabbitMQ data
export interface RabbitMQMetrics {
  nodeId: string;
  messageRate: number;
  messageCount?: number;
  consumerCount?: number;
  status: 'active' | 'idle' | 'warning' | 'error';
  timestamp: number;
}

export interface MessageFlow {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  routingKey?: string;
  messageSize: number;
  timestamp: number;
  flowPath?: string[]; // Complete path: producer -> exchange -> queue -> consumer
  messageType?: 'normal' | 'priority' | 'dead-letter';
}

export class RabbitMQWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private isConnecting: boolean = false;
  private callbacks: {
    onMetrics: ((metrics: RabbitMQMetrics) => void)[];
    onMessageFlow: ((flow: MessageFlow) => void)[];
    onConnect: (() => void)[];
    onDisconnect: (() => void)[];
  } = {
    onMetrics: [],
    onMessageFlow: [],
    onConnect: [],
    onDisconnect: []
  };

  constructor(private baseUrl: string) {}

  connect(): void {
    // Prevent multiple connection attempts
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket connection already in progress');
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.isConnecting = true;

    try {
      // Use environment variables for WebSocket connection
      const wsUrl = `ws://${import.meta.env.VITE_RABBITMQ_HOST || 'localhost'}:${import.meta.env.VITE_WS_PORT || '8080'}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected to RabbitMQ monitoring service');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.callbacks.onConnect.forEach(cb => cb());
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.callbacks.onDisconnect.forEach(cb => cb());
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private handleMessage(data: { type: string; payload: unknown }): void {
    switch (data.type) {
      case 'metrics':
        this.callbacks.onMetrics.forEach(cb => cb(data.payload as RabbitMQMetrics));
        break;
      case 'messageFlow':
        this.callbacks.onMessageFlow.forEach(cb => cb(data.payload as MessageFlow));
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private attemptReconnect(): void {
    // Don't reconnect if we're already trying to connect
    if (this.isConnecting) {
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  onMetrics(callback: (metrics: RabbitMQMetrics) => void): void {
    this.callbacks.onMetrics.push(callback);
  }

  onMessageFlow(callback: (flow: MessageFlow) => void): void {
    this.callbacks.onMessageFlow.push(callback);
  }

  onConnect(callback: () => void): void {
    this.callbacks.onConnect.push(callback);
  }

  onDisconnect(callback: () => void): void {
    this.callbacks.onDisconnect.push(callback);
  }

  disconnect(): void {
    this.isConnecting = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
