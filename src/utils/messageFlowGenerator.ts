// Helper functions for generating test message flows with proper multi-hop paths

import { MessageFlow } from '@/services/rabbitmqWebSocket';

interface FlowPath {
  producer: string;
  exchange: string;
  queue: string;
  consumer: string;
}

export const generateMessageFlow = (path: FlowPath): MessageFlow => {
  const flowId = `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: flowId,
    fromNodeId: path.producer,
    toNodeId: path.consumer,
    routingKey: 'test.message',
    messageSize: Math.floor(Math.random() * 1024) + 512, // 512B to 1.5KB
    timestamp: Date.now(),
    flowPath: [path.producer, path.exchange, path.queue, path.consumer],
    messageType: 'normal'
  };
};

export const generateRandomMessageFlow = (
  producers: string[],
  exchanges: string[],
  queues: string[],
  consumers: string[]
): MessageFlow => {
  const producer = producers[Math.floor(Math.random() * producers.length)];
  const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];
  const queue = queues[Math.floor(Math.random() * queues.length)];
  const consumer = consumers[Math.floor(Math.random() * consumers.length)];

  return generateMessageFlow({ producer, exchange, queue, consumer });
};

// Predefined test flows for common RabbitMQ patterns
export const testFlows = {
  direct: (routingKey: string = 'direct.test') => generateMessageFlow({
    producer: 'producer-direct',
    exchange: 'exchange-direct',
    queue: `queue-${routingKey}`,
    consumer: `consumer-${routingKey}`
  }),

  fanout: () => generateMessageFlow({
    producer: 'producer-fanout',
    exchange: 'exchange-fanout',
    queue: 'queue-fanout-1',
    consumer: 'consumer-fanout-1'
  }),

  topic: (topic: string = 'logs.info') => generateMessageFlow({
    producer: 'producer-topic',
    exchange: 'exchange-topic',
    queue: `queue-${topic.replace('.', '-')}`,
    consumer: `consumer-${topic.replace('.', '-')}`
  })
};

// Demo mode message generator
export class MessageFlowGenerator {
  private intervalId: NodeJS.Timeout | null = null;
  private onFlowCallback: ((flow: MessageFlow) => void) | null = null;

  constructor(private interval: number = 3000) {}

  start(onFlow: (flow: MessageFlow) => void) {
    this.onFlowCallback = onFlow;
    this.intervalId = setInterval(() => {
      this.generateRandomFlow();
    }, this.interval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private generateRandomFlow() {
    if (!this.onFlowCallback) return;

    const patterns = ['direct', 'fanout', 'topic'] as const;
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    let flow: MessageFlow;
    switch (pattern) {
      case 'direct':
        flow = testFlows.direct(`key-${Math.floor(Math.random() * 3) + 1}`);
        break;
      case 'fanout':
        flow = testFlows.fanout();
        break;
      case 'topic': {
        const topics = ['logs.info', 'logs.error', 'logs.debug'];
        flow = testFlows.topic(topics[Math.floor(Math.random() * topics.length)]);
        break;
      }
    }

    this.onFlowCallback(flow);
  }
}
