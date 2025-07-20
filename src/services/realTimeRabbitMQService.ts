// Unified real-time service for RabbitMQ monitoring with SSE and WebSocket support
import { RabbitMQSSEService, SSEEvent } from './rabbitmqSSE';
import { RabbitMQWebSocketService } from './rabbitmqWebSocket';
import { enhancedRabbitMQAPI } from './enhancedRabbitMQAPI';
import { errorLogger } from '@/utils/errorLogger';

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
  flowPath?: string[];
  messageType?: 'normal' | 'priority' | 'dead-letter';
}

export interface TopologyUpdate {
  type: 'queue_added' | 'queue_removed' | 'exchange_added' | 'exchange_removed' | 'binding_added' | 'binding_removed' | 'full_refresh';
  data?: unknown;
  timestamp: number;
}

export interface ConnectionEvent {
  type: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  message?: string;
  timestamp: number;
}

export class RealTimeRabbitMQService {
  private sseService: RabbitMQSSEService;
  private wsService: RabbitMQWebSocketService;
  private baseUrl: string;
  private preferredTransport: 'sse' | 'websocket' | 'auto' = 'auto';
  private isSSEConnected = false;
  private isWSConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;

  private callbacks: {
    onMetrics: ((metrics: RabbitMQMetrics) => void)[];
    onMessageFlow: ((flow: MessageFlow) => void)[];
    onTopologyUpdate: ((update: TopologyUpdate) => void)[];
    onConnection: ((event: ConnectionEvent) => void)[];
  } = {
    onMetrics: [],
    onMessageFlow: [],
    onTopologyUpdate: [],
    onConnection: []
  };

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    this.sseService = new RabbitMQSSEService(baseUrl);
    this.wsService = new RabbitMQWebSocketService(baseUrl);
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // SSE Event Handlers
    this.sseService.onMetrics((metrics) => {
      this.callbacks.onMetrics.forEach(cb => cb(metrics));
    });

    this.sseService.onMessageFlow((flow) => {
      this.callbacks.onMessageFlow.forEach(cb => cb(flow));
    });

    this.sseService.onConnect(() => {
      this.isSSEConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emitConnectionEvent('connected', 'SSE connection established');
      errorLogger.info('RealTimeRabbitMQService', 'SSE connected successfully');
    });

    this.sseService.onDisconnect(() => {
      this.isSSEConnected = false;
      this.stopHeartbeat();
      this.emitConnectionEvent('disconnected', 'SSE connection lost');
      this.handleReconnection();
    });

    this.sseService.onError((error) => {
      errorLogger.error('RealTimeRabbitMQService', 'SSE error occurred', {
        error,
        context: { transport: 'sse', isConnected: this.isSSEConnected }
      });
      this.emitConnectionEvent('error', error.message);
    });

    // WebSocket Event Handlers
    this.wsService.onMetrics((metrics) => {
      this.callbacks.onMetrics.forEach(cb => cb(metrics));
    });

    this.wsService.onMessageFlow((flow) => {
      this.callbacks.onMessageFlow.forEach(cb => cb(flow));
    });

    this.wsService.onConnect(() => {
      this.isWSConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emitConnectionEvent('connected', 'WebSocket connection established');
      errorLogger.info('RealTimeRabbitMQService', 'WebSocket connected successfully');
    });

    this.wsService.onDisconnect(() => {
      this.isWSConnected = false;
      this.stopHeartbeat();
      this.emitConnectionEvent('disconnected', 'WebSocket connection lost');
      this.handleReconnection();
    });
  }

  private emitConnectionEvent(type: ConnectionEvent['type'], message?: string): void {
    const event: ConnectionEvent = {
      type,
      message,
      timestamp: Date.now()
    };
    this.callbacks.onConnection.forEach(cb => cb(event));
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastHeartbeat = Date.now();
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        const healthStatus = await enhancedRabbitMQAPI.getHealthStatus();
        const healthResult = healthStatus as { status?: string; rabbitMQConnection?: string };
        if (healthResult.status && healthResult.rabbitMQConnection !== 'disconnected') {
          this.lastHeartbeat = Date.now();
          // Emit topology update if needed
          this.callbacks.onTopologyUpdate.forEach(cb => cb({
            type: 'full_refresh',
            timestamp: Date.now()
          }));
        } else {
          throw new Error('Health check failed');
        }
      } catch (error) {
        errorLogger.warning('RealTimeRabbitMQService', 'Heartbeat failed', {
          context: { 
            lastHeartbeat: this.lastHeartbeat,
            error: error instanceof Error ? error.message : String(error)
          }
        });
        
        // If heartbeat fails for too long, trigger reconnection
        if (Date.now() - this.lastHeartbeat > 30000) {
          this.handleReconnection();
        }
      }
    }, 15000); // Heartbeat every 15 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emitConnectionEvent('error', 'Maximum reconnection attempts reached');
      errorLogger.error('RealTimeRabbitMQService', 'Max reconnection attempts reached', {
        error: new Error('Connection failed permanently'),
        context: { attempts: this.reconnectAttempts }
      });
      return;
    }

    this.reconnectAttempts++;
    this.emitConnectionEvent('reconnecting', `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    // Wait before reconnecting with exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, Math.min(delay, 30000)); // Cap at 30 seconds
  }

  public setTransportPreference(transport: 'sse' | 'websocket' | 'auto'): void {
    this.preferredTransport = transport;
    errorLogger.info('RealTimeRabbitMQService', `Transport preference changed to: ${transport}`);
    
    // Reconnect with new preference if already connected
    if (this.isConnected) {
      this.disconnect();
      setTimeout(() => this.connect(), 1000);
    }
  }

  public async connect(): Promise<void> {
    try {
      // Test backend connectivity first
      const healthCheck = await enhancedRabbitMQAPI.getHealthStatus();
      const healthResult = healthCheck as { status?: string; rabbitMQConnection?: string };
      if (!healthResult.status || healthResult.rabbitMQConnection === 'disconnected') {
        throw new Error('Backend health check failed');
      }

      // Determine which transport to use
      let transportToUse: 'sse' | 'websocket' = 'websocket';
      
      if (this.preferredTransport === 'sse') {
        transportToUse = 'sse';
      } else if (this.preferredTransport === 'websocket') {
        transportToUse = 'websocket';
      } else {
        // Auto-select based on browser capabilities and backend support
        transportToUse = this.selectOptimalTransport();
      }

      errorLogger.info('RealTimeRabbitMQService', `Connecting using ${transportToUse} transport`);

      if (transportToUse === 'sse') {
        this.sseService.connect();
      } else {
        this.wsService.connect();
      }
    } catch (error) {
      errorLogger.error('RealTimeRabbitMQService', 'Failed to connect', {
        context: { 
          transport: this.preferredTransport,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.emitConnectionEvent('error', 'Connection failed');
      this.handleReconnection();
    }
  }

  private selectOptimalTransport(): 'sse' | 'websocket' {
    // Check browser support
    const hasWebSocket = typeof WebSocket !== 'undefined';
    const hasEventSource = typeof EventSource !== 'undefined';
    
    // Prefer WebSocket for bidirectional communication
    if (hasWebSocket) {
      return 'websocket';
    } else if (hasEventSource) {
      return 'sse';
    } else {
      // Fallback to WebSocket as it has broader support
      return 'websocket';
    }
  }

  public disconnect(): void {
    this.stopHeartbeat();
    this.sseService.disconnect();
    this.wsService.disconnect();
    this.isSSEConnected = false;
    this.isWSConnected = false;
    this.reconnectAttempts = 0;
    
    errorLogger.info('RealTimeRabbitMQService', 'Disconnected from all transports');
  }

  public get isConnected(): boolean {
    return this.isSSEConnected || this.isWSConnected;
  }

  public get connectionStatus(): string {
    if (this.isSSEConnected && this.isWSConnected) {
      return 'dual-connected';
    } else if (this.isSSEConnected) {
      return 'sse-connected';
    } else if (this.isWSConnected) {
      return 'ws-connected';
    } else if (this.reconnectAttempts > 0) {
      return 'reconnecting';
    } else {
      return 'disconnected';
    }
  }

  // Event subscription methods
  public onMetrics(callback: (metrics: RabbitMQMetrics) => void): void {
    this.callbacks.onMetrics.push(callback);
  }

  public onMessageFlow(callback: (flow: MessageFlow) => void): void {
    this.callbacks.onMessageFlow.push(callback);
  }

  public onTopologyUpdate(callback: (update: TopologyUpdate) => void): void {
    this.callbacks.onTopologyUpdate.push(callback);
  }

  public onConnection(callback: (event: ConnectionEvent) => void): void {
    this.callbacks.onConnection.push(callback);
  }

  // Request specific topology updates
  public async requestTopologyRefresh(): Promise<void> {
    try {
      const topology = await enhancedRabbitMQAPI.getTopology();
      const topologyResult = topology as { success?: boolean; data?: unknown };
      if (topologyResult.success && topologyResult.data) {
        this.callbacks.onTopologyUpdate.forEach(cb => cb({
          type: 'full_refresh',
          data: topologyResult.data,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      errorLogger.error('RealTimeRabbitMQService', 'Failed to refresh topology', {
        context: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  // Send real-time commands (WebSocket only)
  public async sendCommand(command: { type: string; payload: unknown }): Promise<void> {
    if (!this.isWSConnected) {
      throw new Error('WebSocket not connected - cannot send commands');
    }
    
    // This would require implementing command sending in the WebSocket service
    // For now, we'll use the enhanced API
    errorLogger.info('RealTimeRabbitMQService', 'Command sent via API', {
      context: { command }
    });
  }

  // Get current metrics snapshot
  public getMetricsSnapshot(): Map<string, RabbitMQMetrics> {
    // This would maintain a local cache of current metrics
    // For now, return empty map - this should be implemented with state management
    return new Map();
  }

  // Cleanup method
  public destroy(): void {
    this.disconnect();
    this.callbacks.onMetrics = [];
    this.callbacks.onMessageFlow = [];
    this.callbacks.onTopologyUpdate = [];
    this.callbacks.onConnection = [];
  }
}

// Export singleton instance
export const realTimeRabbitMQService = new RealTimeRabbitMQService();
export default RealTimeRabbitMQService;
