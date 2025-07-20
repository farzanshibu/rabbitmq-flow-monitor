import { rabbitmqAPI, APIResponse } from '@/services/rabbitmqAPI';
import { withRetry, retryPresets } from '@/hooks/useRetry';
import { errorLogger } from '@/utils/errorLogger';

// Enhanced API wrapper with error handling and retry logic
class EnhancedRabbitMQAPI {
  private retryableGet = withRetry(this.get.bind(this), retryPresets.api);
  private retryablePost = withRetry(this.post.bind(this), retryPresets.api);
  private retryableDelete = withRetry(this.delete.bind(this), retryPresets.api);
  private retryablePut = withRetry(this.put.bind(this), retryPresets.api);

  private async get<T>(url: string): Promise<APIResponse<T>> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      errorLogger.error('EnhancedRabbitMQAPI', `GET request failed: ${url}`, {
        error: error instanceof Error ? error : new Error(String(error)),
        context: { url, method: 'GET' }
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async post<T>(url: string, data: unknown): Promise<APIResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      errorLogger.error('EnhancedRabbitMQAPI', `POST request failed: ${url}`, {
        error: error instanceof Error ? error : new Error(String(error)),
        context: { url, method: 'POST', data }
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async put<T>(url: string, data: unknown): Promise<APIResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      errorLogger.error('EnhancedRabbitMQAPI', `PUT request failed: ${url}`, {
        error: error instanceof Error ? error : new Error(String(error)),
        context: { url, method: 'PUT', data }
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async delete<T>(url: string): Promise<APIResponse<T>> {
    try {
      const response = await fetch(url, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      errorLogger.error('EnhancedRabbitMQAPI', `DELETE request failed: ${url}`, {
        error: error instanceof Error ? error : new Error(String(error)),
        context: { url, method: 'DELETE' }
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Enhanced topology methods with retry
  async getTopology() {
    return this.retryableGet('http://localhost:8081/api/topology');
  }

  async getOverview() {
    return this.retryableGet('http://localhost:8081/api/overview');
  }

  async testConnection() {
    return this.retryableGet('http://localhost:8081/api/test-connection');
  }

  async retryConnection() {
    return this.retryablePost('http://localhost:8081/api/retry-connection', {});
  }

  async getHealthStatus() {
    return this.retryableGet('http://localhost:8081/health');
  }

  // Enhanced exchange methods with retry
  async getExchanges() {
    return this.retryableGet('http://localhost:8081/api/exchanges');
  }

  async createExchange(exchange: {
    name: string;
    type: 'direct' | 'fanout' | 'topic' | 'headers';
    durable: boolean;
    autoDelete: boolean;
    internal: boolean;
    arguments?: Record<string, unknown>;
    vhost?: string;
  }) {
    return this.retryablePost('http://localhost:8081/api/exchanges', exchange);
  }

  async updateExchange(exchange: {
    name: string;
    type: 'direct' | 'fanout' | 'topic' | 'headers';
    durable: boolean;
    autoDelete: boolean;
    internal: boolean;
    arguments?: Record<string, unknown>;
    vhost?: string;
  }) {
    return this.retryablePut(`http://localhost:8081/api/exchanges/${encodeURIComponent(exchange.name)}`, exchange);
  }

  async deleteExchange(name: string, vhost: string = '/') {
    return this.retryableDelete(`http://localhost:8081/api/exchanges/${encodeURIComponent(name)}?vhost=${encodeURIComponent(vhost)}`);
  }

  // Enhanced queue methods with retry
  async getQueues() {
    return this.retryableGet('http://localhost:8081/api/queues');
  }

  async createQueue(queue: {
    name: string;
    durable: boolean;
    autoDelete: boolean;
    arguments?: Record<string, unknown>;
    vhost?: string;
  }) {
    return this.retryablePost('http://localhost:8081/api/queues', queue);
  }

  async deleteQueue(name: string, vhost: string = '/') {
    return this.retryableDelete(`http://localhost:8081/api/queues/${encodeURIComponent(name)}?vhost=${encodeURIComponent(vhost)}`);
  }

  // Enhanced binding methods with retry
  async getBindings() {
    return this.retryableGet('http://localhost:8081/api/bindings');
  }

  async createBinding(binding: {
    source: string;
    destination: string;
    destinationType: 'queue' | 'exchange';
    routingKey: string;
    arguments: Record<string, unknown>;
    vhost?: string;
  }) {
    return this.retryablePost('http://localhost:8081/api/bindings', binding);
  }

  async deleteBinding(binding: {
    source: string;
    destination: string;
    destinationType: 'queue' | 'exchange';
    routingKey: string;
    arguments: Record<string, unknown>;
    vhost?: string;
  }) {
    const params = new URLSearchParams({
      source: binding.source,
      destination: binding.destination,
      destinationType: binding.destinationType,
      routingKey: binding.routingKey,
      vhost: binding.vhost || '/'
    });
    
    return this.retryableDelete(`http://localhost:8081/api/bindings?${params}`);
  }

  // Enhanced message publishing with retry
  async publishMessage(message: {
    exchange: string;
    routingKey: string;
    payload: string;
    properties?: Record<string, unknown>;
  }) {
    return this.retryablePost('http://localhost:8081/api/publish', message);
  }

  // Enhanced dead letter queue methods with retry
  async getDeadLetterQueues() {
    return this.retryableGet('http://localhost:8081/api/dead-letter-queues');
  }

  async getDeadLetterMessages(queueName: string) {
    return this.retryableGet(`http://localhost:8081/api/dead-letter-queues/${encodeURIComponent(queueName)}/messages`);
  }

  async configureDeadLetterQueue(config: {
    queueName: string;
    arguments: Record<string, unknown>;
    strategy: string;
  }) {
    return this.retryablePost('http://localhost:8081/api/dead-letter-queues/configure', config);
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
  }) {
    return this.retryablePost('http://localhost:8081/api/dead-letter-queues/replay', replayConfig);
  }

  async deleteDeadLetterMessages(queueName: string, messageIds: string[]) {
    return this.retryableDelete('http://localhost:8081/api/dead-letter-queues/messages');
  }

  // File operations (no retry for downloads)
  async exportDeadLetterMessages(queueName: string, messageIds: string[]): Promise<Blob> {
    try {
      const response = await fetch('http://localhost:8081/api/dead-letter-queues/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueName, messageIds })
      });
      
      if (!response.ok) {
        throw new Error('Failed to export messages');
      }
      
      return await response.blob();
    } catch (error) {
      errorLogger.error('EnhancedRabbitMQAPI', 'Failed to export dead letter messages', {
        error: error instanceof Error ? error : new Error(String(error)),
        context: { queueName, messageIds }
      });
      throw error;
    }
  }

  // Helper method to check if an error should trigger a notification
  shouldNotifyUser(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Don't notify for network issues (they're handled by retry)
    if (message.includes('network') || message.includes('fetch')) {
      return false;
    }
    
    // Don't notify for validation errors (handled by forms)
    if (message.includes('validation') || message.includes('invalid')) {
      return false;
    }
    
    // Notify for server errors and other unexpected issues
    return true;
  }
}

// Export enhanced API instance
export const enhancedRabbitMQAPI = new EnhancedRabbitMQAPI();
export default EnhancedRabbitMQAPI;
