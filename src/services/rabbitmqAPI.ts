// Service for fetching real RabbitMQ topology data from backend
import { Node, Edge } from '@xyflow/react';

const API_BASE_URL = 'http://localhost:8081';

export interface TopologyData {
  nodes: Node[];
  edges: Edge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    queues: number;
    exchanges: number;
    bindings: number;
    lastUpdated: string;
  };
}

export interface RabbitMQOverview {
  managementVersion: string;
  rabbitMQVersion: string;
  erlangVersion: string;
  totalQueues: number;
  totalExchanges: number;
  totalConnections: number;
  totalChannels: number;
  totalConsumers: number;
  messageStats: Record<string, unknown>;
  queueTotals: Record<string, unknown>;
}

export interface Exchange {
  name: string;
  type: 'direct' | 'fanout' | 'topic' | 'headers';
  durable: boolean;
  autoDelete: boolean;
  internal: boolean;
  arguments?: Record<string, unknown>;
  vhost?: string;
}

export interface Queue {
  name: string;
  durable: boolean;
  autoDelete: boolean;
  arguments?: Record<string, unknown>;
  vhost?: string;
  messageStats?: {
    messages: number;
    messageRate: number;
    consumers: number;
  };
}

export interface Message {
  id: string;
  payload: string;
  properties: {
    messageId?: string;
    timestamp?: string;
    contentType?: string;
    deliveryMode?: number;
    priority?: number;
    correlationId?: string;
    replyTo?: string;
    expiration?: string;
    userId?: string;
    appId?: string;
    headers?: Record<string, unknown>;
  };
  routingKey: string;
  exchange: string;
  redeliveryCount: number;
  size: number;
}

export interface Binding {
  source: string;
  destination: string;
  destinationType: 'queue' | 'exchange';
  routingKey: string;
  arguments: Record<string, unknown>;
  vhost?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DeadLetterQueue {
  name: string;
  durable: boolean;
  autoDelete: boolean;
  arguments: Record<string, unknown>;
  messageCount: number;
  consumerCount: number;
  messageRate: number;
  originalQueue?: string;
  deadLetterExchange?: string;
}

export interface DeadLetterMessage {
  id: string;
  payload: string;
  properties: {
    messageId?: string;
    timestamp?: string;
    expiration?: string;
    userId?: string;
    appId?: string;
    correlationId?: string;
    replyTo?: string;
    headers?: Record<string, unknown>;
  };
  routingKey: string;
  exchange: string;
  originalQueue: string;
  deadLetterReason: 'rejected' | 'expired' | 'maxlen' | 'delivery_limit';
  deadLetterTime: string;
  redeliveryCount: number;
  originalExchange?: string;
  originalRoutingKey?: string;
}

class RabbitMQAPIService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async testConnection(): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; message: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/test-connection`);
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to connect to backend API'
      };
    }
  }

  async getTopology(): Promise<{ success: boolean; data: TopologyData; source: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/topology`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching topology:', error);
      
      // Return error instead of fallback data
      return {
        success: false,
        data: {
          nodes: [],
          edges: [],
          metadata: {
            totalNodes: 0,
            totalEdges: 0,
            queues: 0,
            exchanges: 0,
            bindings: 0,
            lastUpdated: new Date().toISOString()
          }
        },
        source: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getOverview(): Promise<{ success: boolean; data: RabbitMQOverview; source: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/overview`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching overview:', error);
      
      // Return error instead of fallback data
      return {
        success: false,
        data: {
          managementVersion: 'Error',
          rabbitMQVersion: 'Unavailable',
          erlangVersion: 'Unknown',
          totalQueues: 0,
          totalExchanges: 0,
          totalConnections: 0,
          totalChannels: 0,
          totalConsumers: 0,
          messageStats: {},
          queueTotals: {}
        },
        source: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async retryConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/api/retry-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retry connection',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getHealthStatus(): Promise<{ 
    status: string; 
    timestamp: number; 
    clients: { sse: number; websocket: number }; 
    rabbitMQConnection: string 
  }> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching health status:', error);
      return {
        status: 'error',
        timestamp: Date.now(),
        clients: { sse: 0, websocket: 0 },
        rabbitMQConnection: 'disconnected'
      };
    }
  }

  // Exchange Management
  async getExchanges(): Promise<APIResponse<Exchange[]>> {
    try {
      const response = await fetch(`${this.baseURL}/api/exchanges`);
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createExchange(exchange: Exchange): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/exchanges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exchange)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateExchange(exchange: Exchange): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/exchanges/${encodeURIComponent(exchange.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exchange)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteExchange(name: string, vhost: string = '/'): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/exchanges/${encodeURIComponent(name)}?vhost=${encodeURIComponent(vhost)}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Queue Management
  async getQueues(): Promise<APIResponse<Queue[]>> {
    try {
      const response = await fetch(`${this.baseURL}/api/queues`);
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createQueue(queue: Queue): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/queues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteQueue(name: string, vhost: string = '/'): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/queues/${encodeURIComponent(name)}?vhost=${encodeURIComponent(vhost)}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getQueueMessages(queueName: string, count: number = 10, ackMode: string = 'ack_requeue_true'): Promise<APIResponse<Message[]>> {
    try {
      const response = await fetch(`${this.baseURL}/api/queues/${encodeURIComponent(queueName)}/messages?count=${count}&ackMode=${ackMode}`);
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async purgeQueue(queueName: string): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/queues/${encodeURIComponent(queueName)}/purge`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Binding Management
  async getBindings(): Promise<APIResponse<Binding[]>> {
    try {
      const response = await fetch(`${this.baseURL}/api/bindings`);
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createBinding(binding: Binding): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/bindings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(binding)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteBinding(binding: Binding): Promise<APIResponse<void>> {
    try {
      const params = new URLSearchParams({
        source: binding.source,
        destination: binding.destination,
        destinationType: binding.destinationType,
        routingKey: binding.routingKey,
        vhost: binding.vhost || '/'
      });
      const response = await fetch(`${this.baseURL}/api/bindings?${params}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(binding.arguments)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Message Publishing
  async publishMessage(message: {
    exchange: string;
    routingKey: string;
    payload: string;
    properties?: Record<string, unknown>;
  }): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Dead Letter Queue Management
  async getDeadLetterQueues(): Promise<APIResponse<DeadLetterQueue[]>> {
    try {
      const response = await fetch(`${this.baseURL}/api/dead-letter-queues`);
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getDeadLetterMessages(queueName: string): Promise<APIResponse<DeadLetterMessage[]>> {
    try {
      const response = await fetch(`${this.baseURL}/api/dead-letter-queues/${encodeURIComponent(queueName)}/messages`);
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async configureDeadLetterQueue(config: {
    queueName: string;
    arguments: Record<string, unknown>;
    strategy: string;
  }): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/dead-letter-queues/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async replayDeadLetterMessages(replayConfig: {
    queueName: string;
    messageIds: string[];
    targetExchange: string;
    targetRoutingKey: string;
    modifyPayload?: boolean;
    newPayload?: string;
    additionalHeaders?: Record<string, unknown>;
    delaySeconds?: number;
    batchSize?: number;
  }): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/dead-letter-queues/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(replayConfig)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteDeadLetterMessages(queueName: string, messageIds: string[]): Promise<APIResponse<void>> {
    try {
      const response = await fetch(`${this.baseURL}/api/dead-letter-queues/messages`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueName, messageIds })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async exportDeadLetterMessages(queueName: string, messageIds: string[]): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/api/dead-letter-queues/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueName, messageIds })
    });
    
    if (!response.ok) {
      throw new Error('Failed to export messages');
    }
    
    return await response.blob();
  }
}

export const rabbitmqAPI = new RabbitMQAPIService();
export default RabbitMQAPIService;
