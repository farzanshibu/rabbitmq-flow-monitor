import { Node, Edge } from '@xyflow/react';

// Mock RabbitMQ topology data for Phase 1
export const initialNodes: Node[] = [
  // Producers
  {
    id: 'producer-1',
    type: 'producer',
    position: { x: 50, y: 100 },
    data: {
      label: 'Order Service',
      status: 'active',
      messageRate: 12.5
    }
  },
  {
    id: 'producer-2',
    type: 'producer',
    position: { x: 50, y: 250 },
    data: {
      label: 'Payment Service',
      status: 'active',
      messageRate: 8.2
    }
  },
  {
    id: 'producer-3',
    type: 'producer',
    position: { x: 50, y: 400 },
    data: {
      label: 'Inventory Service',
      status: 'idle',
      messageRate: 0
    }
  },

  // Exchanges
  {
    id: 'exchange-1',
    type: 'exchange-direct',
    position: { x: 300, y: 150 },
    data: {
      label: 'orders.direct',
      type: 'direct',
      status: 'active',
      messageRate: 15.2,
      durable: true
    }
  },
  {
    id: 'exchange-2',
    type: 'exchange-fanout',
    position: { x: 300, y: 300 },
    data: {
      label: 'notifications.fanout',
      type: 'fanout',
      status: 'active',
      messageRate: 25.8,
      durable: true
    }
  },
  {
    id: 'exchange-3',
    type: 'exchange-topic',
    position: { x: 300, y: 450 },
    data: {
      label: 'events.topic',
      type: 'topic',
      status: 'active',
      messageRate: 18.4,
      durable: true
    }
  },

  // Queues
  {
    id: 'queue-1',
    type: 'queue',
    position: { x: 550, y: 100 },
    data: {
      label: 'order.processing',
      status: 'active',
      messageCount: 45,
      consumerCount: 2,
      messageRate: 12.1,
      durable: true
    }
  },
  {
    id: 'queue-2',
    type: 'queue',
    position: { x: 550, y: 200 },
    data: {
      label: 'order.validation',
      status: 'active',
      messageCount: 12,
      consumerCount: 1,
      messageRate: 8.5,
      durable: true
    }
  },
  {
    id: 'queue-3',
    type: 'queue',
    position: { x: 550, y: 300 },
    data: {
      label: 'email.notifications',
      status: 'active',
      messageCount: 123,
      consumerCount: 3,
      messageRate: 15.2,
      durable: true
    }
  },
  {
    id: 'queue-4',
    type: 'queue',
    position: { x: 550, y: 400 },
    data: {
      label: 'sms.notifications',
      status: 'warning',
      messageCount: 256,
      consumerCount: 1,
      messageRate: 5.8,
      durable: true
    }
  },
  {
    id: 'queue-5',
    type: 'queue',
    position: { x: 550, y: 500 },
    data: {
      label: 'analytics.events',
      status: 'active',
      messageCount: 89,
      consumerCount: 2,
      messageRate: 22.3,
      durable: true
    }
  },

  // Consumers
  {
    id: 'consumer-1',
    type: 'consumer',
    position: { x: 800, y: 100 },
    data: {
      label: 'Order Processor A',
      status: 'active',
      messageRate: 6.2,
      prefetchCount: 10,
      autoAck: false
    }
  },
  {
    id: 'consumer-2',
    type: 'consumer',
    position: { x: 950, y: 150 },
    data: {
      label: 'Order Processor B',
      status: 'active',
      messageRate: 5.9,
      prefetchCount: 10,
      autoAck: false
    }
  },
  {
    id: 'consumer-3',
    type: 'consumer',
    position: { x: 800, y: 250 },
    data: {
      label: 'Validator Service',
      status: 'active',
      messageRate: 8.5,
      prefetchCount: 5,
      autoAck: true
    }
  },
  {
    id: 'consumer-4',
    type: 'consumer',
    position: { x: 800, y: 350 },
    data: {
      label: 'Email Worker',
      status: 'active',
      messageRate: 15.2,
      prefetchCount: 20,
      autoAck: false
    }
  },
  {
    id: 'consumer-5',
    type: 'consumer',
    position: { x: 800, y: 450 },
    data: {
      label: 'SMS Worker',
      status: 'error',
      messageRate: 0,
      prefetchCount: 10,
      autoAck: false
    }
  },
  {
    id: 'consumer-6',
    type: 'consumer',
    position: { x: 800, y: 550 },
    data: {
      label: 'Analytics Service',
      status: 'active',
      messageRate: 22.3,
      prefetchCount: 50,
      autoAck: true
    }
  }
];

export const initialEdges: Edge[] = [
  // Producer to Exchange connections
  { id: 'e1', source: 'producer-1', target: 'exchange-1', type: 'smoothstep', label: 'order.create' },
  { id: 'e2', source: 'producer-2', target: 'exchange-1', type: 'smoothstep', label: 'payment.completed' },
  { id: 'e3', source: 'producer-1', target: 'exchange-2', type: 'smoothstep', label: 'broadcast' },
  { id: 'e4', source: 'producer-3', target: 'exchange-3', type: 'smoothstep', label: 'inventory.*' },

  // Exchange to Queue connections
  { id: 'e5', source: 'exchange-1', target: 'queue-1', type: 'smoothstep', label: 'order.processing' },
  { id: 'e6', source: 'exchange-1', target: 'queue-2', type: 'smoothstep', label: 'order.validation' },
  { id: 'e7', source: 'exchange-2', target: 'queue-3', type: 'smoothstep', label: 'email' },
  { id: 'e8', source: 'exchange-2', target: 'queue-4', type: 'smoothstep', label: 'sms' },
  { id: 'e9', source: 'exchange-3', target: 'queue-5', type: 'smoothstep', label: 'inventory.updated' },

  // Queue to Consumer connections
  { id: 'e10', source: 'queue-1', target: 'consumer-1', type: 'smoothstep' },
  { id: 'e11', source: 'queue-1', target: 'consumer-2', type: 'smoothstep' },
  { id: 'e12', source: 'queue-2', target: 'consumer-3', type: 'smoothstep' },
  { id: 'e13', source: 'queue-3', target: 'consumer-4', type: 'smoothstep' },
  { id: 'e14', source: 'queue-4', target: 'consumer-5', type: 'smoothstep' },
  { id: 'e15', source: 'queue-5', target: 'consumer-6', type: 'smoothstep' }
];