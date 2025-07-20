// Server-Sent Events service for real-time RabbitMQ data
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
}

export interface SSEEvent {
  type: 'metrics' | 'messageFlow' | 'connected' | 'error';
  payload: RabbitMQMetrics | MessageFlow | { message: string; clientId?: number };
}

export class RabbitMQSSEService {
  private eventSource: EventSource | null = null;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private callbacks: {
    onMetrics: ((metrics: RabbitMQMetrics) => void)[];
    onMessageFlow: ((flow: MessageFlow) => void)[];
    onConnect: (() => void)[];
    onDisconnect: (() => void)[];
    onError: ((error: Error) => void)[];
  } = {
    onMetrics: [],
    onMessageFlow: [],
    onConnect: [],
    onDisconnect: [],
    onError: []
  };

  constructor(private baseUrl: string) {}

  connect(): void {
    try {
      // Use environment variables for SSE connection
      const sseUrl = `http://${import.meta.env.VITE_RABBITMQ_HOST || 'localhost'}:${import.meta.env.VITE_SSE_PORT || '8080'}/events`;
      
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log('SSE connected to RabbitMQ monitoring service');
        this.reconnectAttempts = 0;
        this.callbacks.onConnect.forEach(cb => cb());
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
          this.callbacks.onError.forEach(cb => cb(error as Error));
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        this.callbacks.onDisconnect.forEach(cb => cb());
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Error creating SSE connection:', error);
      this.callbacks.onError.forEach(cb => cb(error as Error));
      this.attemptReconnect();
    }
  }

  private handleMessage(data: SSEEvent): void {
    switch (data.type) {
      case 'metrics':
        this.callbacks.onMetrics.forEach(cb => cb(data.payload as RabbitMQMetrics));
        break;
      case 'messageFlow':
        this.callbacks.onMessageFlow.forEach(cb => cb(data.payload as MessageFlow));
        break;
      case 'connected':
        console.log('SSE connection established:', data.payload);
        break;
      case 'error': {
        const errorPayload = data.payload as { message: string; clientId?: number };
        console.error('Server error:', errorPayload);
        this.callbacks.onError.forEach(cb => cb(new Error(errorPayload.message)));
        break;
      }
      default:
        console.warn('Unknown SSE message type:', data.type);
    }
  }

  private attemptReconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect SSE (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.error('Max SSE reconnection attempts reached');
      this.callbacks.onError.forEach(cb => cb(new Error('Max reconnection attempts reached')));
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

  onError(callback: (error: Error) => void): void {
    this.callbacks.onError.push(callback);
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
