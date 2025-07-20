// Express server to provide SSE and WebSocket endpoints for RabbitMQ monitoring with real data
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import RabbitMQService from './rabbitmqService.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store connected clients
const sseClients = new Set();
const wsClients = new Set();

// Initialize RabbitMQ service with real credentials
const rabbitmqService = new RabbitMQService({
//   host: '5.161.73.159',
//   port: 15672,
//   username: 'admin',
//   password: 'AS2av7qn',
//   protocol: 'http'
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: process.env.RABBITMQ_PORT || 15672,
    username: process.env.RABBITMQ_USERNAME || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    protocol: process.env.RABBITMQ_PROTOCOL || 'http'
});

// Test RabbitMQ connection on startup with retry logic
let connectionRetries = 0;
const maxRetries = 3;
const retryDelay = 5000; // 5 seconds

const testRabbitMQConnection = async () => {
  try {
    console.log(`🔄 Testing RabbitMQ connection (attempt ${connectionRetries + 1}/${maxRetries})...`);
    const connectionTest = await rabbitmqService.testConnection();
    if (connectionTest.success) {
      console.log('✅ Successfully connected to RabbitMQ Management API');
      console.log(`RabbitMQ Version: ${connectionTest.data.rabbitmq_version}`);
      useRealData = true;
      return true;
    } else {
      throw new Error(connectionTest.error);
    }
  } catch (error) {
    console.error(`❌ RabbitMQ connection failed (attempt ${connectionRetries + 1}):`, error.message);
    connectionRetries++;
    
    if (connectionRetries < maxRetries) {
      console.log(`⏳ Retrying connection in ${retryDelay/1000} seconds...`);
      setTimeout(testRabbitMQConnection, retryDelay);
    } else {
      console.error('❌ Max retries reached. Real-time features will be disabled.');
      console.log('� Use the retry endpoint to attempt reconnection later.');
      useRealData = false;
    }
    return false;
  }
};

// Initialize connection test
testRabbitMQConnection();

// Counter for unique flow IDs
let flowCounter = 0;
let useRealData = false; // Start with false, set to true only when RabbitMQ connects
let virtualConsumers = new Map(); // Store virtual consumers

// Generate real-time metrics from RabbitMQ only
const generateRealTimeMetrics = async () => {
  if (!useRealData) {
    console.log('⏭️  Skipping metrics generation - RabbitMQ not connected');
    return [];
  }

  try {
    const metrics = await rabbitmqService.getRealTimeMetrics();
    
    // Format for frontend consumption
    const formattedMetrics = [];
    
    // Add queue metrics
    metrics.queues.forEach(queue => {
      formattedMetrics.push({
        nodeId: queue.id,
        messageRate: queue.messageRate,
        messageCount: queue.messages,
        consumerCount: queue.consumers,
        consumerRate: queue.consumerRate,
        status: queue.status,
        timestamp: Date.now(),
        type: 'queue'
      });
    });
    
    // Add exchange metrics
    metrics.exchanges.forEach(exchange => {
      formattedMetrics.push({
        nodeId: exchange.id,
        messageRateIn: exchange.messageRateIn,
        messageRateOut: exchange.messageRateOut,
        status: exchange.status,
        timestamp: Date.now(),
        type: 'exchange'
      });
    });
    
    return formattedMetrics;
  } catch (error) {
    console.error('Error generating real-time metrics:', error.message);
    
    // Try to reconnect on connection errors
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      console.log('🔄 Connection lost, attempting to reconnect...');
      useRealData = false;
      setTimeout(() => {
        connectionRetries = 0;
        testRabbitMQConnection();
      }, 5000);
    }
    
    return [];
  }
};

// Generate message flows with fallback handling
const generateRealMessageFlow = async () => {
  if (!useRealData) {
    console.log('⏭️  Skipping message flow generation - no data source available');
    return [];
  }

  try {
    const topology = await rabbitmqService.getTopologyData();
    const flows = [];
    
    if (topology.queues && topology.queues.length > 0) {
      // Generate realistic message flows based on actual topology
      const activeQueues = topology.queues.filter(q => q.messages > 0 || q.messageRate > 0);
      
      if (activeQueues.length > 0) {
        const randomQueue = activeQueues[Math.floor(Math.random() * activeQueues.length)];
        
        // Simulate producer -> exchange -> queue flow
        flowCounter++;
        flows.push({
          id: `real-flow-${Date.now()}-${flowCounter}`,
          fromNodeId: `producer-${Math.floor(Math.random() * 3) + 1}`,
          toNodeId: `exchange-${Math.floor(Math.random() * 3) + 1}`,
          routingKey: 'real.message.flow',
          messageSize: Math.floor(Math.random() * 1024) + 256,
          timestamp: Date.now(),
          messageType: 'normal'
        });
        
        // Simulate exchange -> queue flow
        flowCounter++;
        flows.push({
          id: `real-flow-${Date.now()}-${flowCounter}`,
          fromNodeId: `exchange-${Math.floor(Math.random() * 3) + 1}`,
          toNodeId: randomQueue.id,
          routingKey: 'real.message.flow',
          messageSize: Math.floor(Math.random() * 1024) + 256,
          timestamp: Date.now() + 100,
          messageType: 'normal'
        });
        
        // Simulate queue -> consumer flow if there are consumers
        if (randomQueue.consumers > 0) {
          flowCounter++;
          flows.push({
            id: `real-flow-${Date.now()}-${flowCounter}`,
            fromNodeId: randomQueue.id,
            toNodeId: `consumer-${Math.floor(Math.random() * 5) + 1}`,
            routingKey: 'real.message.flow',
            messageSize: Math.floor(Math.random() * 1024) + 256,
            timestamp: Date.now() + 200,
            messageType: 'normal'
          });
        }
      }
    }
    
    return flows;
  } catch (error) {
    console.error('Error generating real message flow:', error.message);
    
    // Try to reconnect on connection errors
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      console.log('🔄 Connection lost, attempting to reconnect...');
      useRealData = false;
      setTimeout(() => {
        connectionRetries = 0;
        testRabbitMQConnection();
      }, 5000);
    }
    
    // No fallback for message flows - only show real data
    return [];
  }
};

// SSE endpoint for real-time metrics
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const clientId = Date.now();
  const client = { id: clientId, res };
  sseClients.add(client);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(client);
    console.log(`SSE Client ${clientId} disconnected`);
  });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  wsClients.add(ws);

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
});

// Broadcast data to all connected clients
const broadcastToSSE = (data) => {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(message);
    } catch (error) {
      console.error('Error sending SSE data:', error);
      sseClients.delete(client);
    }
  });
};

const broadcastToWS = (data) => {
  const message = JSON.stringify(data);
  wsClients.forEach(ws => {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    } catch (error) {
      console.error('Error sending WebSocket data:', error);
      wsClients.delete(ws);
    }
  });
};

// Generate and broadcast real-time data with fallback handling
setInterval(async () => {
  try {
    const metricsArray = await generateRealTimeMetrics();
    
    // Send each metric update
    if (metricsArray && metricsArray.length > 0) {
      metricsArray.forEach(metrics => {
        const data = { type: 'metrics', payload: metrics };
        broadcastToSSE(data);
        broadcastToWS(data);
      });
    }
  } catch (error) {
    console.error('Error broadcasting metrics:', error.message);
    // Broadcast error to inform clients of connection issues
    const errorData = { 
      type: 'error', 
      payload: { 
        message: 'Failed to fetch RabbitMQ metrics',
        timestamp: Date.now()
      } 
    };
    broadcastToSSE(errorData);
    broadcastToWS(errorData);
  }
}, 2000);

// Only generate real message flows when they actually occur
// Message flows will be triggered by actual RabbitMQ message events

// Health check endpoint
app.get('/health', (req, res) => {
  const status = useRealData ? 'healthy' : 'degraded';
  res.json({
    status,
    timestamp: Date.now(),
    clients: {
      sse: sseClients.size,
      websocket: wsClients.size
    },
    dataSource: useRealData ? 'rabbitmq' : 'none',
    rabbitMQConnection: useRealData ? 'connected' : 'disconnected',
    message: useRealData 
      ? 'RabbitMQ connected and operational' 
      : 'RabbitMQ connection unavailable - real-time features disabled'
  });
});

// Manual reconnection endpoint
app.post('/reconnect', async (req, res) => {
  try {
    console.log('🔄 Manual reconnection requested...');
    connectionRetries = 0;
    useRealData = false;
    
    const success = await testRabbitMQConnection();
    
    res.json({
      success,
      status: useRealData ? 'connected' : 'failed',
      timestamp: Date.now(),
      message: success 
        ? 'Successfully reconnected to RabbitMQ' 
        : 'Connection failed - check RabbitMQ server status'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Get real RabbitMQ topology data
app.get('/api/topology', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch topology data - RabbitMQ server is not connected',
        source: 'error'
      });
    }

    const topology = await rabbitmqService.getTopologyData();
    res.json({
      success: true,
      data: topology,
      source: 'rabbitmq'
    });
  } catch (error) {
    console.error('Error fetching topology:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch RabbitMQ topology data',
      source: 'error'
    });
  }
});

// Consumer and Producer Management
app.get('/api/consumers', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch consumers - RabbitMQ server is not connected'
      });
    }

    const consumers = await rabbitmqService.getConsumers();
    res.json({
      success: true,
      data: consumers
    });
  } catch (error) {
    console.error('Error fetching consumers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch consumers'
    });
  }
});

app.get('/api/connections', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch connections - RabbitMQ server is not connected'
      });
    }

    const connections = await rabbitmqService.getDetailedConnections();
    res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch connections'
    });
  }
});


// Get RabbitMQ overview/stats
app.get('/api/overview', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch overview data - RabbitMQ server is not connected',
        source: 'error'
      });
    }

    const overview = await rabbitmqService.getOverview();
    res.json({
      success: true,
      data: overview,
      source: 'rabbitmq'
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch RabbitMQ overview data'
    });
  }
});

// Add connection retry endpoint
app.post('/api/retry-connection', async (req, res) => {
  try {
    console.log('🔄 Retrying RabbitMQ connection...');
    const connectionTest = await rabbitmqService.testConnection();
    
    if (connectionTest.success) {
      useRealData = true;
      console.log('✅ RabbitMQ connection restored successfully');
      res.json({
        success: true,
        message: 'RabbitMQ connection restored',
        data: connectionTest.data
      });
    } else {
      useRealData = false;
      res.status(503).json({
        success: false,
        error: connectionTest.error,
        message: 'RabbitMQ connection still failing'
      });
    }
  } catch (error) {
    useRealData = false;
    console.error('❌ Connection retry failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retry RabbitMQ connection'
    });
  }
});

// Test RabbitMQ connection endpoint
app.get('/api/test-connection', async (req, res) => {
  try {
    const result = await rabbitmqService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to test RabbitMQ connection'
    });
  }
});

// Management API Endpoints

// Exchange Management
app.get('/api/exchanges', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch exchanges - RabbitMQ server is not connected'
      });
    }

    const exchanges = await rabbitmqService.getExchanges();
    res.json({
      success: true,
      data: exchanges.map(exchange => ({
        name: exchange.name,
        type: exchange.exchangeType,
        durable: exchange.durable,
        autoDelete: exchange.autoDelete,
        internal: exchange.data?.internal || false,
        arguments: exchange.data?.arguments || {},
        messageStats: {
          publishIn: exchange.messageRateIn || 0,
          publishOut: exchange.messageRateOut || 0
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching exchanges:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch exchanges'
    });
  }
});

app.post('/api/exchanges', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot create exchange - RabbitMQ server is not connected'
      });
    }

    const { name, type, durable, autoDelete, internal, arguments: exchangeArgs } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Exchange name and type are required'
      });
    }

    const result = await rabbitmqService.createExchange('%2F', name, {
      type,
      durable: durable !== false,
      autoDelete: autoDelete === true,
      internal: internal === true,
      arguments: exchangeArgs || {}
    });

    res.json(result);
  } catch (error) {
    console.error('Error creating exchange:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create exchange'
    });
  }
});

app.delete('/api/exchanges/:name', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot delete exchange - RabbitMQ server is not connected'
      });
    }

    const { name } = req.params;
    const result = await rabbitmqService.deleteExchange('%2F', name);
    res.json(result);
  } catch (error) {
    console.error('Error deleting exchange:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to delete exchange'
    });
  }
});

// Get exchange details
app.get('/api/exchanges/:name/details', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch exchange details - RabbitMQ server is not connected'
      });
    }

    const { name } = req.params;
    const details = await rabbitmqService.getExchangeDetails(name, '%2F');
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error fetching exchange details:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch exchange details'
    });
  }
});

// Get producer details (virtual endpoint - maps to connections/channels)
app.get('/api/producers/:name/details', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch producer details - RabbitMQ server is not connected'
      });
    }

    const { name } = req.params;
    const details = await rabbitmqService.getProducerDetails(name);
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error fetching producer details:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch producer details'
    });
  }
});

// Get consumer details
app.get('/api/consumers/:name/details', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch consumer details - RabbitMQ server is not connected'
      });
    }

    const { name } = req.params;
    const details = await rabbitmqService.getConsumerDetails(name);
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error fetching consumer details:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch consumer details'
    });
  }
});

// Queue Management
app.get('/api/queues', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch queues - RabbitMQ server is not connected'
      });
    }

    const queues = await rabbitmqService.getQueues();
    res.json({
      success: true,
      data: queues.map(queue => ({
        name: queue.name,
        durable: queue.data?.durable || false,
        autoDelete: queue.data?.autoDelete || false,
        arguments: queue.data?.arguments || {},
        messageStats: {
          messages: queue.data?.metrics?.messages || 0,
          messageRate: queue.data?.metrics?.messageRate || 0,
          consumers: queue.data?.metrics?.consumers || 0
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching queues:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch queues'
    });
  }
});

app.post('/api/queues', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot create queue - RabbitMQ server is not connected'
      });
    }

    const { name, durable, autoDelete, arguments: queueArgs } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Queue name is required'
      });
    }

    const result = await rabbitmqService.createQueue('%2F', name, {
      durable: durable !== false,
      autoDelete: autoDelete === true,
      arguments: queueArgs || {}
    });

    res.json(result);
  } catch (error) {
    console.error('Error creating queue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create queue'
    });
  }
});

app.delete('/api/queues/:name', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot delete queue - RabbitMQ server is not connected'
      });
    }

    const { name } = req.params;
    const result = await rabbitmqService.deleteQueue('%2F', name);
    res.json(result);
  } catch (error) {
    console.error('Error deleting queue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to delete queue'
    });
  }
});

// Get queue details
app.get('/api/queues/:name/details', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch queue details - RabbitMQ server is not connected'
      });
    }

    const { name } = req.params;
    const details = await rabbitmqService.getQueueDetails(name);
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error fetching queue details:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch queue details'
    });
  }
});

// Get queue messages
app.get('/api/queues/:name/messages', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot fetch queue messages - RabbitMQ server is not connected'
      });
    }

    const { name } = req.params;
    const { count = 10, ackMode = 'ack_requeue_true' } = req.query;
    const messages = await rabbitmqService.getQueueMessages(name, parseInt(count), ackMode);
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching queue messages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch queue messages'
    });
  }
});

// Publish message to queue
app.post('/api/queues/:name/publish', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot publish message - RabbitMQ server is not connected'
      });
    }

    const { name } = req.params;
    const { payload, routingKey, properties } = req.body;
    const result = await rabbitmqService.publishToQueue(name, payload, routingKey, properties);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error publishing message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to publish message'
    });
  }
});

// Purge queue
app.delete('/api/queues/:name/purge', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot purge queue - RabbitMQ server is not connected'
      });
    }

    const { name } = req.params;
    const result = await rabbitmqService.purgeQueue(name);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error purging queue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to purge queue'
    });
  }
});

// Message Publishing
app.post('/api/publish', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot publish message - RabbitMQ server is not connected'
      });
    }

    const { exchange, routingKey, payload, properties } = req.body;
    
    if (!exchange) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Exchange name is required'
      });
    }

    const result = await rabbitmqService.publishMessage('%2F', exchange, {
      routingKey: routingKey || '',
      payload: payload || '',
      properties: properties || {},
      payloadEncoding: 'string'
    });

    res.json(result);
  } catch (error) {
    console.error('Error publishing message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to publish message'
    });
  }
});

// Binding Management
app.post('/api/bindings', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(503).json({
        success: false,
        error: 'RabbitMQ connection not available',
        message: 'Cannot create binding - RabbitMQ server is not connected'
      });
    }

    const { exchange, queue, routingKey, arguments: bindingArgs } = req.body;
    
    if (!exchange || !queue) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Exchange and queue names are required'
      });
    }

    const result = await rabbitmqService.createBinding('%2F', exchange, queue, routingKey || '', bindingArgs || {});
    res.json(result);
  } catch (error) {
    console.error('Error creating binding:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create binding'
    });
  }
});

// Virtual Consumer Management API
app.get('/api/virtual-consumers', (req, res) => {
  res.json(Array.from(virtualConsumers.values()));
});

app.post('/api/virtual-consumers', (req, res) => {
  const { id, name, queueName, prefetchCount, ackMode, processingDelay, errorRate } = req.body;
  
  if (!id || !name || !queueName) {
    return res.status(400).json({ error: 'Missing required fields: id, name, queueName' });
  }

  const consumer = {
    id,
    name,
    queueName,
    prefetchCount: prefetchCount || 1,
    ackMode: ackMode || 'auto',
    processingDelay: processingDelay || 1000,
    errorRate: errorRate || 0,
    status: 'stopped',
    messagesProcessed: 0,
    messagesPerSecond: 0,
    lastActivity: null,
    createdAt: Date.now(),
    intervalId: null
  };

  virtualConsumers.set(id, consumer);
  res.json(consumer);
});

app.post('/api/virtual-consumers/:id/start', (req, res) => {
  const { id } = req.params;
  const consumer = virtualConsumers.get(id);
  
  if (!consumer) {
    return res.status(404).json({ error: 'Consumer not found' });
  }

  if (consumer.status === 'running') {
    return res.json({ message: 'Consumer already running' });
  }

  // Start the consumer simulation
  consumer.status = 'running';
  consumer.lastActivity = Date.now();
  
  // Simulate message processing with realistic intervals
  const baseInterval = consumer.processingDelay || 1000;
  const jitterRange = baseInterval * 0.3; // ±30% jitter
  
  const processMessage = () => {
    if (consumer.status !== 'running') return;
    
    const shouldError = Math.random() * 100 < (consumer.errorRate || 0);
    
    if (!shouldError) {
      consumer.messagesProcessed++;
      consumer.lastActivity = Date.now();
      
      // Calculate messages per second (rolling average)
      const timeDiff = (Date.now() - consumer.createdAt) / 1000;
      consumer.messagesPerSecond = consumer.messagesProcessed / Math.max(timeDiff, 1);
      
      // Broadcast message processing event
      const data = {
        type: 'virtualConsumerActivity',
        payload: {
          consumerId: consumer.id,
          queueName: consumer.queueName,
          messagesProcessed: consumer.messagesProcessed,
          messagesPerSecond: consumer.messagesPerSecond,
          lastActivity: consumer.lastActivity,
          action: 'processed'
        }
      };
      broadcastToSSE(data);
      broadcastToWS(data);
    }
    
    // Schedule next message processing with jitter
    const nextInterval = baseInterval + (Math.random() - 0.5) * jitterRange;
    consumer.timeoutId = setTimeout(processMessage, Math.max(nextInterval, 100));
  };
  
  // Start processing
  processMessage();
  
  virtualConsumers.set(id, consumer);
  res.json({ message: 'Consumer started', status: consumer.status });
});

app.post('/api/virtual-consumers/:id/pause', (req, res) => {
  const { id } = req.params;
  const consumer = virtualConsumers.get(id);
  
  if (!consumer) {
    return res.status(404).json({ error: 'Consumer not found' });
  }

  consumer.status = 'paused';
  if (consumer.timeoutId) {
    clearTimeout(consumer.timeoutId);
    consumer.timeoutId = null;
  }
  
  virtualConsumers.set(id, consumer);
  res.json({ message: 'Consumer paused', status: consumer.status });
});

app.post('/api/virtual-consumers/:id/stop', (req, res) => {
  const { id } = req.params;
  const consumer = virtualConsumers.get(id);
  
  if (!consumer) {
    return res.status(404).json({ error: 'Consumer not found' });
  }

  consumer.status = 'stopped';
  if (consumer.timeoutId) {
    clearTimeout(consumer.timeoutId);
    consumer.timeoutId = null;
  }
  
  virtualConsumers.set(id, consumer);
  res.json({ message: 'Consumer stopped', status: consumer.status });
});

app.delete('/api/virtual-consumers/:id', (req, res) => {
  const { id } = req.params;
  const consumer = virtualConsumers.get(id);
  
  if (!consumer) {
    return res.status(404).json({ error: 'Consumer not found' });
  }

  // Stop the consumer first
  if (consumer.timeoutId) {
    clearTimeout(consumer.timeoutId);
  }
  
  virtualConsumers.delete(id);
  res.json({ message: 'Consumer deleted' });
});

// Monitoring dashboard metrics endpoint
app.get('/api/metrics', async (req, res) => {
  try {
    let totalMessages = 0;
    let messagesPerSecond = 0;
    let totalQueues = 0;
    let totalExchanges = 0;
    let totalConnections = 0;
    let totalConsumers = 0;
    let totalQueueDepth = 0;
    let systemMemory = 0;
    let diskSpace = 0;

    if (useRealData) {
      // Fetch real metrics from RabbitMQ
      try {
        const [queues, exchanges, connections, overview] = await Promise.all([
          rabbitmqService.getQueues(),
          rabbitmqService.getExchanges(),
          rabbitmqService.getConnections(),
          rabbitmqService.getOverview()
        ]);

        totalQueues = queues.length;
        totalExchanges = exchanges.length;
        totalConnections = connections.length;
        totalQueueDepth = queues.reduce((sum, q) => sum + (q.messages || 0), 0);
        totalConsumers = queues.reduce((sum, q) => sum + (q.consumers || 0), 0);
        
        if (overview) {
          messagesPerSecond = overview.message_stats?.publish_details?.rate || 0;
          systemMemory = overview.memory_mb || 0;
          diskSpace = overview.disk_free || 0;
        }
      } catch (error) {
        console.error('Error fetching real metrics:', error);
        return res.status(500).json({
          error: 'Failed to fetch RabbitMQ metrics',
          message: error.message
        });
      }
    } else {
      return res.status(503).json({
        error: 'RabbitMQ not connected',
        message: 'Real-time metrics unavailable - RabbitMQ connection required'
      });
    }

    // Add virtual consumer metrics
    const activeVirtualConsumers = Array.from(virtualConsumers.values()).filter(c => c.status === 'running');
    const virtualConsumerMessages = activeVirtualConsumers.reduce((sum, c) => sum + c.messagesProcessed, 0);
    const virtualConsumerRate = activeVirtualConsumers.reduce((sum, c) => sum + c.messagesPerSecond, 0);

    // Combine real and virtual metrics
    totalMessages += virtualConsumerMessages;
    messagesPerSecond += virtualConsumerRate;
    totalConsumers += activeVirtualConsumers.length;

    res.json({
      totalMessages,
      messagesPerSecond: parseFloat(messagesPerSecond.toFixed(2)),
      totalQueues,
      totalExchanges,
      totalConnections,
      totalConsumers,
      totalQueueDepth,
      systemMemory,
      diskSpace,
      timestamp: Date.now(),
      dataSource: 'rabbitmq',
      virtualConsumers: {
        active: activeVirtualConsumers.length,
        total: virtualConsumers.size,
        messagesProcessed: virtualConsumerMessages,
        messagesPerSecond: parseFloat(virtualConsumerRate.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).json({
      error: 'Failed to generate metrics',
      message: error.message
    });
  }
});

// Test RabbitMQ connection endpoint
app.get('/api/test-connection', async (req, res) => {
  try {
    const result = await rabbitmqService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to test RabbitMQ connection'
    });
  }
});

// Dead Letter Queue Management Routes
app.get('/api/dead-letter-queues', async (req, res) => {
  try {
    if (!useRealData) {
      return res.json({
        success: true,
        data: [],
        message: 'RabbitMQ not connected - returning empty dead letter queues'
      });
    }

    const deadLetterQueues = await rabbitmqService.getDeadLetterQueues();
    res.json({
      success: true,
      data: deadLetterQueues
    });
  } catch (error) {
    console.error('Error fetching dead letter queues:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch dead letter queues'
    });
  }
});

app.get('/api/dead-letter-queues/:queueName/messages', async (req, res) => {
  try {
    if (!useRealData) {
      return res.json({
        success: true,
        data: [],
        message: 'RabbitMQ not connected - returning empty messages'
      });
    }

    const { queueName } = req.params;
    const messages = await rabbitmqService.getDeadLetterMessages(queueName);
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching dead letter messages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch dead letter messages'
    });
  }
});

app.post('/api/dead-letter-queues/configure', async (req, res) => {
  try {
    if (!useRealData) {
      return res.json({
        success: false,
        error: 'RabbitMQ not connected',
        message: 'Cannot configure dead letter queue without RabbitMQ connection'
      });
    }

    const { queueName, arguments: dlqArguments, strategy } = req.body;
    
    if (!queueName || !dlqArguments || !dlqArguments['x-dead-letter-exchange']) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Queue name and dead letter exchange are required'
      });
    }

    const result = await rabbitmqService.configureDeadLetterQueue(queueName, dlqArguments, strategy);
    res.json(result);
  } catch (error) {
    console.error('Error configuring dead letter queue:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to configure dead letter queue'
    });
  }
});

app.post('/api/dead-letter-queues/replay', async (req, res) => {
  try {
    if (!useRealData) {
      return res.json({
        success: false,
        error: 'RabbitMQ not connected',
        message: 'Cannot replay messages without RabbitMQ connection'
      });
    }

    const { 
      queueName, 
      messageIds, 
      targetExchange, 
      targetRoutingKey, 
      modifyPayload, 
      newPayload, 
      additionalHeaders, 
      delaySeconds = 0, 
      batchSize = 10 
    } = req.body;
    
    if (!queueName || !messageIds || !Array.isArray(messageIds) || !targetExchange) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Queue name, message IDs, and target exchange are required'
      });
    }

    const replayConfig = {
      targetExchange,
      targetRoutingKey,
      modifyPayload,
      newPayload,
      additionalHeaders,
      delaySeconds,
      batchSize
    };

    const result = await rabbitmqService.replayDeadLetterMessages(queueName, messageIds, replayConfig);
    res.json(result);
  } catch (error) {
    console.error('Error replaying dead letter messages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to replay dead letter messages'
    });
  }
});

app.delete('/api/dead-letter-queues/messages', async (req, res) => {
  try {
    if (!useRealData) {
      return res.json({
        success: false,
        error: 'RabbitMQ not connected',
        message: 'Cannot delete messages without RabbitMQ connection'
      });
    }

    const { queueName, messageIds } = req.body;
    
    if (!queueName || !messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Queue name and message IDs are required'
      });
    }

    const result = await rabbitmqService.deleteDeadLetterMessages(queueName, messageIds);
    res.json(result);
  } catch (error) {
    console.error('Error deleting dead letter messages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to delete dead letter messages'
    });
  }
});

app.post('/api/dead-letter-queues/export', async (req, res) => {
  try {
    if (!useRealData) {
      return res.status(400).json({
        success: false,
        error: 'RabbitMQ not connected',
        message: 'Cannot export messages without RabbitMQ connection'
      });
    }

    const { queueName, messageIds } = req.body;
    
    if (!queueName || !messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Queue name and message IDs are required'
      });
    }

    const result = await rabbitmqService.exportDeadLetterMessages(queueName, messageIds);
    
    if (!result.success) {
      return res.status(500).json(result);
    }

    const filename = `dlq-export-${queueName}-${new Date().toISOString().slice(0, 10)}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(result.data);
  } catch (error) {
    console.error('Error exporting dead letter messages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to export dead letter messages'
    });
  }
});

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`\n🚀 RabbitMQ Monitor Backend running on port ${PORT}`);
  console.log(`📊 SSE endpoint: http://localhost:${PORT}/events`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Retry connection: POST http://localhost:${PORT}/api/retry-connection`);
  
  if (useRealData) {
    console.log(`✅ Real-time monitoring active with RabbitMQ`);
  } else {
    console.log(`⚠️  Warning: RabbitMQ not connected - real-time features disabled`);
    console.log(`   Use the retry endpoint to attempt reconnection`);
  }
  console.log(`\n`);
});
