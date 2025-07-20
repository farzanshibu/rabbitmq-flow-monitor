import axios from 'axios';

class RabbitMQService {
  constructor(config) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 15672,
      username: config.username || 'guest',
      password: config.password || 'guest',
      protocol: config.protocol || 'http'
    };
    
    this.baseURL = `${this.config.protocol}://${this.config.host}:${this.config.port}/api`;
    this.auth = {
      username: this.config.username,
      password: this.config.password
    };
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      auth: this.auth,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async testConnection() {
    try {
      const response = await this.client.get('/overview');
      return {
        success: true,
        data: response.data,
        message: 'Successfully connected to RabbitMQ Management API'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to connect to RabbitMQ Management API'
      };
    }
  }

  async getQueues() {
    try {
      const response = await this.client.get('/queues');
      return response.data.map(queue => ({
        id: queue.name,
        name: queue.name,
        vhost: queue.vhost,
        messages: queue.messages || 0,
        consumers: queue.consumers || 0,
        messageRate: queue.message_stats?.publish_details?.rate || 0,
        consumerRate: queue.message_stats?.deliver_get_details?.rate || 0,
        state: queue.state,
        durable: queue.durable,
        autoDelete: queue.auto_delete,
        type: 'queue',
        position: { x: 0, y: 0 }, // Will be positioned dynamically
        data: {
          label: queue.name,
          status: queue.state === 'running' ? 'active' : 'idle',
          messageCount: queue.messages || 0,
          consumerCount: queue.consumers || 0,
          messageRate: queue.message_stats?.publish_details?.rate || 0,
          durable: queue.durable,
          metrics: {
            messages: queue.messages || 0,
            consumers: queue.consumers || 0,
            messageRate: queue.message_stats?.publish_details?.rate || 0,
            consumerRate: queue.message_stats?.deliver_get_details?.rate || 0,
            memory: queue.memory || 0,
            status: queue.state === 'running' ? 'active' : 'idle'
          }
        }
      }));
    } catch (error) {
      console.error('Error fetching queues:', error);
      throw error;
    }
  }

  async getExchanges() {
    try {
      const response = await this.client.get('/exchanges');
      return response.data
        .filter(exchange => exchange.name !== '') // Filter out default exchange
        .map(exchange => ({
          id: exchange.name,
          name: exchange.name,
          vhost: exchange.vhost,
          type: `exchange-${exchange.type}`, // Prefix with 'exchange-' to match frontend node types
          exchangeType: exchange.type,
          durable: exchange.durable,
          autoDelete: exchange.auto_delete,
          messageRateIn: exchange.message_stats?.publish_in_details?.rate || 0,
          messageRateOut: exchange.message_stats?.publish_out_details?.rate || 0,
          position: { x: 0, y: 0 }, // Will be positioned dynamically
          data: {
            label: exchange.name,
            type: exchange.type,
            status: 'active',
            durable: exchange.durable,
            metrics: {
              messageRateIn: exchange.message_stats?.publish_in_details?.rate || 0,
              messageRateOut: exchange.message_stats?.publish_out_details?.rate || 0,
              status: 'active'
            }
          }
        }));
    } catch (error) {
      console.error('Error fetching exchanges:', error);
      throw error;
    }
  }

  async getBindings() {
    try {
      const response = await this.client.get('/bindings');
      return response.data.map(binding => ({
        id: `${binding.source}-${binding.destination}`,
        source: binding.source,
        destination: binding.destination,
        destinationType: binding.destination_type,
        routingKey: binding.routing_key,
        vhost: binding.vhost,
        arguments: binding.arguments
      }));
    } catch (error) {
      console.error('Error fetching bindings:', error);
      throw error;
    }
  }

  async getConnections() {
    try {
      const response = await this.client.get('/connections');
      return response.data.map(conn => ({
        id: conn.name,
        name: conn.name,
        host: conn.host,
        port: conn.port,
        peerHost: conn.peer_host,
        peerPort: conn.peer_port,
        state: conn.state,
        channels: conn.channels || 0,
        user: conn.user,
        vhost: conn.vhost,
        protocol: conn.protocol,
        connectedAt: conn.connected_at
      }));
    } catch (error) {
      console.error('Error fetching connections:', error);
      throw error;
    }
  }

  async getChannels() {
    try {
      const response = await this.client.get('/channels');
      return response.data.map(channel => ({
        id: channel.name,
        name: channel.name,
        connection: channel.connection_details?.name,
        number: channel.number,
        user: channel.user,
        vhost: channel.vhost,
        state: channel.state,
        messagesUnacknowledged: channel.messages_unacknowledged || 0,
        messagesUncommitted: channel.messages_uncommitted || 0,
        ackMode: channel.acks_uncommitted || 0,
        consumersCount: channel.consumer_count || 0
      }));
    } catch (error) {
      console.error('Error fetching channels:', error);
      throw error;
    }
  }

  async getOverview() {
    try {
      const response = await this.client.get('/overview');
      return {
        managementVersion: response.data.management_version,
        rabbitMQVersion: response.data.rabbitmq_version,
        erlangVersion: response.data.erlang_version,
        totalQueues: response.data.object_totals?.queues || 0,
        totalExchanges: response.data.object_totals?.exchanges || 0,
        totalConnections: response.data.object_totals?.connections || 0,
        totalChannels: response.data.object_totals?.channels || 0,
        totalConsumers: response.data.object_totals?.consumers || 0,
        messageStats: response.data.message_stats || {},
        queueTotals: response.data.queue_totals || {}
      };
    } catch (error) {
      console.error('Error fetching overview:', error);
      throw error;
    }
  }

  async getNodes() {
    try {
      const response = await this.client.get('/nodes');
      return response.data.map(node => ({
        id: node.name,
        name: node.name,
        type: node.type,
        running: node.running,
        memUsed: node.mem_used || 0,
        memLimit: node.mem_limit || 0,
        diskFree: node.disk_free || 0,
        diskFreeLimit: node.disk_free_limit || 0,
        fdUsed: node.fd_used || 0,
        fdTotal: node.fd_total || 0,
        socketsUsed: node.sockets_used || 0,
        socketsTotal: node.sockets_total || 0,
        uptime: node.uptime || 0
      }));
    } catch (error) {
      console.error('Error fetching nodes:', error);
      throw error;
    }
  }

  // Generate topology data with real RabbitMQ data
  async getTopologyData() {
    try {
      const [queues, exchanges, bindings, consumers, connections] = await Promise.all([
        this.getQueues(),
        this.getExchanges(),
        this.getBindings(),
        this.getConsumers(),
        this.getDetailedConnections()
      ]);

      // Create consumer nodes from active consumers
      const consumerNodes = consumers.map((consumer, index) => ({
        id: `consumer-${consumer.consumerTag}`,
        type: 'consumer',
        position: { x: 0, y: 0 }, // Will be positioned by auto-alignment
        data: {
          label: `Consumer: ${consumer.consumerTag}`,
          consumerTag: consumer.consumerTag,
          queue: consumer.queue,
          channel: consumer.channel,
          connection: consumer.connection,
          ackRequired: consumer.ackRequired,
          prefetchCount: consumer.prefetchCount,
          activity: consumer.activity,
          user: consumer.user,
          status: consumer.activity === 'up' ? 'active' : 'idle',
          metrics: {
            activity: consumer.activity,
            prefetchCount: consumer.prefetchCount || 0,
            ackRequired: consumer.ackRequired || false
          }
        }
      }));

      // Create producer nodes based on active connections that are publishing
      const producerNodes = connections
        .filter(conn => {
          // Identify producers by client properties or connection patterns
          const clientProps = conn.clientProperties || {};
          const isProducer = clientProps.connection_name?.includes('producer') || 
                           clientProps.platform?.includes('producer') ||
                           conn.name?.includes('producer') ||
                           (conn.sendCnt > 0 && conn.sendOct > conn.recvOct); // More sending than receiving
          return isProducer;
        })
        .map((conn, index) => ({
          id: `producer-${conn.name}`,
          type: 'producer',
          position: { x: 0, y: 0 }, // Will be positioned by auto-alignment
          data: {
            label: `Producer: ${conn.name}`,
            connectionName: conn.name,
            host: conn.host,
            port: conn.port,
            user: conn.user,
            vhost: conn.vhost,
            protocol: conn.protocol,
            channels: conn.channels,
            status: conn.state === 'running' ? 'active' : 'idle',
            metrics: {
              messagesSent: conn.sendCnt || 0,
              bytesSent: conn.sendOct || 0,
              channels: conn.channels || 0,
              state: conn.state
            }
          }
        }));

      // If no producer connections found, create default producers based on exchanges
      if (producerNodes.length === 0) {
        const defaultProducers = exchanges
          .filter(exchange => !exchange.name.startsWith('amq.'))
          .map((exchange, index) => ({
            id: `producer-${exchange.name}`,
            type: 'producer',
            position: { x: 0, y: 0 },
            data: {
              label: `${exchange.exchangeType.charAt(0).toUpperCase() + exchange.exchangeType.slice(1)} Producer`,
              targetExchange: exchange.name,
              exchangeType: exchange.exchangeType,
              status: 'active',
              metrics: {
                targetExchange: exchange.name,
                messagesSent: 0,
                exchangeType: exchange.exchangeType
              }
            }
          }));
        producerNodes.push(...defaultProducers);
      }

      // Enhanced auto-alignment algorithm for better visualization
      this.autoAlignNodes(exchanges, queues, bindings, consumerNodes, producerNodes);

      // Create edges from bindings
      const bindingEdges = bindings.map((binding, index) => ({
        id: `edge-${binding.source || 'amq.default'}-${binding.destination}-${binding.routingKey || 'default'}-${index}`,
        source: binding.source || 'amq.default',
        target: binding.destination,
        type: 'smoothstep',
        animated: true,
        style: {
          strokeWidth: 2,
          stroke: '#64748b',
        },
        markerEnd: {
          type: 'arrowclosed',
          width: 20,
          height: 20,
          color: '#64748b',
        },
        label: binding.routingKey || '',
        labelStyle: { 
          fill: '#64748b', 
          fontSize: 12, 
          fontWeight: 500 
        },
        labelBgStyle: { 
          fill: 'white', 
          fillOpacity: 0.8 
        },
        data: {
          routingKey: binding.routingKey,
          destinationType: binding.destinationType
        }
      }));

      // Create edges from producers to exchanges
      const producerEdges = producerNodes.map(producer => {
        const targetExchange = producer.data.targetExchange || 
                             exchanges.find(ex => producer.id.includes(ex.name.replace('.exchange', '')))?.name ||
                             exchanges[0]?.name;
        
        if (targetExchange) {
          return {
            id: `producer-edge-${producer.id}-${targetExchange}`,
            source: producer.id,
            target: targetExchange,
            type: 'smoothstep',
            animated: true,
            style: {
              strokeWidth: 2,
              stroke: '#059669', // Green for producer to exchange
            },
            markerEnd: {
              type: 'arrowclosed',
              width: 16,
              height: 16,
              color: '#059669',
            },
            data: {
              type: 'producer-connection'
            }
          };
        }
        return null;
      }).filter(Boolean);

      // Create edges from queues to consumers
      const consumerEdges = consumerNodes.map(consumer => {
        const queueName = consumer.data.queue;
        if (queueName) {
          return {
            id: `consumer-edge-${queueName}-${consumer.id}`,
            source: queueName,
            target: consumer.id,
            type: 'smoothstep',
            animated: true,
            style: {
              strokeWidth: 2,
              stroke: '#7c3aed', // Purple for queue to consumer
            },
            markerEnd: {
              type: 'arrowclosed',
              width: 16,
              height: 16,
              color: '#7c3aed',
            },
            data: {
              type: 'consumer-connection'
            }
          };
        }
        return null;
      }).filter(Boolean);

      // Combine all edges
      const edges = [...bindingEdges, ...producerEdges, ...consumerEdges];

      // Combine all nodes
      const nodes = [...producerNodes, ...exchanges, ...queues, ...consumerNodes];

      return {
        nodes,
        edges,
        metadata: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          producers: producerNodes.length,
          exchanges: exchanges.length,
          queues: queues.length,
          consumers: consumerNodes.length,
          bindings: bindings.length,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error generating topology data:', error);
      throw error;
    }
  }

  // Enhanced auto-alignment algorithm
  autoAlignNodes(exchanges, queues, bindings, consumerNodes = [], producerNodes = []) {
    // Store references for use in other methods
    this.currentExchanges = exchanges;
    this.currentQueues = queues;
    this.currentConsumers = consumerNodes;
    this.currentProducers = producerNodes;
    
    const LAYER_WIDTH = 300;
    const NODE_HEIGHT = 100;
    const VERTICAL_SPACING = 30;
    const HORIZONTAL_SPACING = 50;
    
    // Position producers on the left (layer 0)
    producerNodes.forEach((producer, index) => {
      producer.position = {
        x: 50,
        y: 100 + index * (NODE_HEIGHT + VERTICAL_SPACING)
      };
    });
    
    // Position exchanges in the middle (layer 1)
    exchanges.forEach((exchange, index) => {
      exchange.position = {
        x: 50 + LAYER_WIDTH,
        y: 100 + index * (NODE_HEIGHT + VERTICAL_SPACING)
      };
    });
    
    // Position queues next to exchanges (layer 2)
    queues.forEach((queue, index) => {
      queue.position = {
        x: 50 + LAYER_WIDTH * 2,
        y: 100 + index * (NODE_HEIGHT + VERTICAL_SPACING)
      };
    });
    
    // Position consumers on the right (layer 3)
    consumerNodes.forEach((consumer, index) => {
      consumer.position = {
        x: 50 + LAYER_WIDTH * 3,
        y: 100 + index * (NODE_HEIGHT + VERTICAL_SPACING)
      };
    });
    
    // Fine-tune positions to minimize edge crossings and improve layout
    this.optimizeLayout(exchanges, queues, bindings, consumerNodes, producerNodes);
  }

  // Optimize layout to reduce overlaps and improve visual flow
  optimizeLayout(exchanges, queues, bindings, consumerNodes, producerNodes) {
    // Group related queues near their bound exchanges
    bindings.forEach(binding => {
      const sourceExchange = exchanges.find(ex => ex.id === binding.source);
      const targetQueue = queues.find(q => q.id === binding.destination);
      
      if (sourceExchange && targetQueue) {
        // Position queue close to its exchange vertically
        targetQueue.position.y = sourceExchange.position.y + Math.random() * 50 - 25;
      }
    });
    
    // Position consumers near their queues
    consumerNodes.forEach(consumer => {
      const queueName = consumer.data.queue;
      const relatedQueue = queues.find(q => q.id === queueName);
      
      if (relatedQueue) {
        consumer.position.y = relatedQueue.position.y + Math.random() * 30 - 15;
      }
    });
    
    // Position producers near their target exchanges
    producerNodes.forEach(producer => {
      const targetExchange = producer.data.targetExchange;
      const relatedExchange = exchanges.find(ex => ex.id === targetExchange);
      
      if (relatedExchange) {
        producer.position.y = relatedExchange.position.y + Math.random() * 30 - 15;
      }
    });
  }

  // Build a connection graph to understand data flow
  buildConnectionGraph(exchanges, queues, bindings) {
    const graph = new Map();
    
    // Initialize all nodes
    [...exchanges, ...queues].forEach(node => {
      graph.set(node.id, { 
        id: node.id, 
        type: node.type, 
        outgoing: [], 
        incoming: [],
        layer: -1
      });
    });
    
    // Add connections based on bindings
    bindings.forEach(binding => {
      const source = binding.source || 'amq.default';
      const target = binding.destination;
      
      if (graph.has(source) && graph.has(target)) {
        graph.get(source).outgoing.push(target);
        graph.get(target).incoming.push(source);
      }
    });
    
    return graph;
  }

  // Calculate layers using topological sorting
  calculateLayers(graph) {
    const layers = [];
    const visited = new Set();
    const inDegree = new Map();
    
    // Calculate in-degrees
    graph.forEach((node, nodeId) => {
      inDegree.set(nodeId, node.incoming.length);
    });
    
    // Find nodes with no incoming edges (sources)
    let currentLayer = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        currentLayer.push(nodeId);
      }
    });
    
    while (currentLayer.length > 0) {
      layers.push([...currentLayer]);
      const nextLayer = [];
      
      currentLayer.forEach(nodeId => {
        visited.add(nodeId);
        const node = graph.get(nodeId);
        
        // Update in-degrees of connected nodes
        node.outgoing.forEach(targetId => {
          if (!visited.has(targetId)) {
            const newDegree = inDegree.get(targetId) - 1;
            inDegree.set(targetId, newDegree);
            
            if (newDegree === 0) {
              nextLayer.push(targetId);
            }
          }
        });
      });
      
      currentLayer = nextLayer;
    }
    
    // Handle any remaining nodes (cycles or disconnected)
    const remaining = [];
    graph.forEach((node, nodeId) => {
      if (!visited.has(nodeId)) {
        remaining.push(nodeId);
      }
    });
    
    if (remaining.length > 0) {
      layers.push(remaining);
    }
    
    return layers;
  }

  // Fine-tune positions to minimize edge crossings
  minimizeEdgeCrossings(exchanges, queues, bindings) {
    const allNodes = [...exchanges, ...queues];
    const MAX_ITERATIONS = 3;
    
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let improved = false;
      
      // Group nodes by X position (layers)
      const layers = new Map();
      allNodes.forEach(node => {
        const x = node.position.x;
        if (!layers.has(x)) {
          layers.set(x, []);
        }
        layers.get(x).push(node);
      });
      
      // Sort each layer to minimize crossings
      layers.forEach((layerNodes, x) => {
        if (layerNodes.length > 1) {
          const sorted = this.sortLayerNodes(layerNodes, bindings);
          
          // Update Y positions
          sorted.forEach((node, index) => {
            const newY = 100 + index * 160;
            if (Math.abs(node.position.y - newY) > 10) {
              node.position.y = newY;
              improved = true;
            }
          });
        }
      });
      
      if (!improved) break;
    }
  }

  // Sort nodes in a layer to minimize crossings
  sortLayerNodes(nodes, bindings) {
    const allNodes = [...this.currentExchanges || [], ...this.currentQueues || []];
    
    return nodes.sort((a, b) => {
      // Calculate average target Y position for outgoing edges
      const aTargets = bindings
        .filter(binding => (binding.source || 'amq.default') === a.id)
        .map(binding => binding.destination);
      
      const bTargets = bindings
        .filter(binding => (binding.source || 'amq.default') === b.id)
        .map(binding => binding.destination);
      
      const getAverageTargetY = (targets) => {
        if (targets.length === 0) return a.position.y;
        
        const targetNodes = allNodes.filter(node => targets.includes(node.id));
        const sum = targetNodes.reduce((acc, node) => acc + node.position.y, 0);
        return targetNodes.length > 0 ? sum / targetNodes.length : a.position.y;
      };
      
      const avgA = getAverageTargetY(aTargets);
      const avgB = getAverageTargetY(bTargets);
      
      return avgA - avgB;
    });
  }

  // CRUD Operations for Exchanges
  async createExchange(vhost = '%2F', exchangeName, exchangeData) {
    try {
      const response = await this.client.put(`/exchanges/${vhost}/${exchangeName}`, {
        type: exchangeData.type,
        durable: exchangeData.durable,
        auto_delete: exchangeData.autoDelete,
        internal: exchangeData.internal,
        arguments: exchangeData.arguments || {}
      });
      return {
        success: true,
        data: response.data,
        message: `Exchange "${exchangeName}" created successfully`
      };
    } catch (error) {
      console.error('Error creating exchange:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: `Failed to create exchange "${exchangeName}"`
      };
    }
  }

  async deleteExchange(vhost = '%2F', exchangeName) {
    try {
      const response = await this.client.delete(`/exchanges/${vhost}/${exchangeName}`);
      return {
        success: true,
        data: response.data,
        message: `Exchange "${exchangeName}" deleted successfully`
      };
    } catch (error) {
      console.error('Error deleting exchange:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: `Failed to delete exchange "${exchangeName}"`
      };
    }
  }

  // CRUD Operations for Queues
  async createQueue(vhost = '%2F', queueName, queueData) {
    try {
      const response = await this.client.put(`/queues/${vhost}/${queueName}`, {
        durable: queueData.durable,
        auto_delete: queueData.autoDelete,
        arguments: queueData.arguments || {}
      });
      return {
        success: true,
        data: response.data,
        message: `Queue "${queueName}" created successfully`
      };
    } catch (error) {
      console.error('Error creating queue:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: `Failed to create queue "${queueName}"`
      };
    }
  }

  async deleteQueue(vhost = '%2F', queueName) {
    try {
      const response = await this.client.delete(`/queues/${vhost}/${queueName}`);
      return {
        success: true,
        data: response.data,
        message: `Queue "${queueName}" deleted successfully`
      };
    } catch (error) {
      console.error('Error deleting queue:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: `Failed to delete queue "${queueName}"`
      };
    }
  }

  // Binding Operations
  async createBinding(vhost = '%2F', exchangeName, queueName, routingKey = '', bindingArgs = {}) {
    try {
      const response = await this.client.post(`/bindings/${vhost}/e/${exchangeName}/q/${queueName}`, {
        routing_key: routingKey,
        arguments: bindingArgs
      });
      return {
        success: true,
        data: response.data,
        message: `Binding created between exchange "${exchangeName}" and queue "${queueName}"`
      };
    } catch (error) {
      console.error('Error creating binding:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: `Failed to create binding between "${exchangeName}" and "${queueName}"`
      };
    }
  }

  async deleteBinding(vhost = '%2F', exchangeName, queueName, routingKey, propertiesKey) {
    try {
      const response = await this.client.delete(`/bindings/${vhost}/e/${exchangeName}/q/${queueName}/${propertiesKey}`);
      return {
        success: true,
        data: response.data,
        message: `Binding deleted between exchange "${exchangeName}" and queue "${queueName}"`
      };
    } catch (error) {
      console.error('Error deleting binding:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: `Failed to delete binding between "${exchangeName}" and "${queueName}"`
      };
    }
  }

  async getConsumers() {
    try {
      const response = await this.client.get('/consumers');
      return response.data.map(consumer => ({
        id: `${consumer.queue?.name}-${consumer.consumer_tag}`,
        consumerTag: consumer.consumer_tag,
        queue: consumer.queue?.name,
        channel: consumer.channel_details?.name,
        connection: consumer.channel_details?.connection_name,
        ackRequired: consumer.ack_required,
        prefetchCount: consumer.prefetch_count,
        arguments: consumer.arguments || {},
        exclusivity: consumer.exclusive,
        activity: consumer.activity_status || 'unknown',
        user: consumer.channel_details?.user
      }));
    } catch (error) {
      console.error('Error fetching consumers:', error);
      throw error;
    }
  }

  async getQueueDetails(queueName, vhost = '/') {
    try {
      const [queueResponse, bindingsResponse, consumersResponse] = await Promise.all([
        this.client.get(`/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}`),
        this.client.get(`/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}/bindings`),
        this.client.get('/consumers')
      ]);

      const queue = queueResponse.data;
      const bindings = bindingsResponse.data || [];
      const allConsumers = consumersResponse.data || [];
      
      // Filter consumers for this specific queue
      const queueConsumers = allConsumers.filter(consumer => 
        consumer.queue && consumer.queue.name === queueName
      );

      return {
        name: queue.name,
        messages: queue.messages || 0,
        consumers: queue.consumers || 0,
        messageRate: queue.message_stats?.publish_details?.rate || 0,
        consumerRate: queue.message_stats?.deliver_get_details?.rate || 0,
        memory: queue.memory || 0,
        state: queue.state || 'unknown',
        durable: queue.durable || false,
        autoDelete: queue.auto_delete || false,
        arguments: queue.arguments || {},
        bindings: bindings.map(binding => ({
          source: binding.source,
          destination: binding.destination,
          routingKey: binding.routing_key || ''
        })),
        connectedConsumers: queueConsumers.map(consumer => ({
          id: consumer.consumer_tag,
          consumerTag: consumer.consumer_tag,
          channel: consumer.channel_details?.name || '',
          connection: consumer.channel_details?.connection_name || '',
          ackRequired: consumer.ack_required || false,
          activity: consumer.activity_status || 'unknown'
        }))
      };
    } catch (error) {
      console.error('Error fetching queue details:', error);
      throw error;
    }
  }

  async getQueueMessages(queueName, count = 10, ackMode = 'ack_requeue_true', vhost = '/') {
    try {
      const response = await this.client.post(
        `/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}/get`,
        {
          count: count,
          ackmode: ackMode,
          encoding: 'auto',
          truncate: 50000
        }
      );

      return response.data.map((message, index) => ({
        id: message.properties?.message_id || `msg-${index}`,
        payload: message.payload || '',
        properties: {
          messageId: message.properties?.message_id,
          timestamp: message.properties?.timestamp,
          contentType: message.properties?.content_type,
          deliveryMode: message.properties?.delivery_mode,
          priority: message.properties?.priority,
          correlationId: message.properties?.correlation_id,
          replyTo: message.properties?.reply_to,
          expiration: message.properties?.expiration,
          userId: message.properties?.user_id,
          appId: message.properties?.app_id,
          headers: message.properties?.headers || {}
        },
        routingKey: message.routing_key || '',
        exchange: message.exchange || '',
        redeliveryCount: message.redelivered_count || 0,
        size: message.payload_bytes || 0
      }));
    } catch (error) {
      console.error('Error fetching queue messages:', error);
      if (error.response?.status === 400) {
        // Queue might be empty or not accessible
        return [];
      }
      throw error;
    }
  }

  async publishToQueue(queueName, payload, routingKey = '', properties = {}, vhost = '/') {
    try {
      const response = await this.client.post(
        `/exchanges/${encodeURIComponent(vhost)}/amq.default/publish`,
        {
          properties: {
            delivery_mode: 2,
            content_type: 'application/json',
            ...properties
          },
          routing_key: queueName, // For direct publishing to queue
          payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
          payload_encoding: 'string'
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error publishing to queue:', error);
      throw error;
    }
  }

  async purgeQueue(queueName, vhost = '/') {
    try {
      const response = await this.client.delete(
        `/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}/contents`
      );
      return response.data;
    } catch (error) {
      console.error('Error purging queue:', error);
      throw error;
    }
  }

  async getDetailedConnections() {
    try {
      const response = await this.client.get('/connections');
      return response.data.map(conn => ({
        id: conn.name,
        name: conn.name,
        host: conn.host,
        port: conn.port,
        peerHost: conn.peer_host,
        peerPort: conn.peer_port,
        state: conn.state,
        channels: conn.channels || 0,
        user: conn.user,
        vhost: conn.vhost,
        protocol: conn.protocol,
        connectedAt: conn.connected_at,
        clientProperties: conn.client_properties || {},
        type: this.determineConnectionType(conn),
        recvCnt: conn.recv_cnt || 0,
        sendCnt: conn.send_cnt || 0,
        recvOct: conn.recv_oct || 0,
        sendOct: conn.send_oct || 0
      }));
    } catch (error) {
      console.error('Error fetching detailed connections:', error);
      throw error;
    }
  }

  determineConnectionType(connection) {
    // Try to determine if connection is producer, consumer, or management based on available info
    const clientProps = connection.client_properties || {};
    const product = clientProps.product?.toLowerCase() || '';
    const platform = clientProps.platform?.toLowerCase() || '';
    
    // Check for common producer/consumer libraries
    if (product.includes('pika') || product.includes('celery') || product.includes('kombu')) {
      return 'consumer'; // Python libraries often used for consumers
    }
    if (product.includes('amqp') || product.includes('rabbitmq-client')) {
      return 'producer'; // Java/Node.js client libraries
    }
    if (platform.includes('management') || product.includes('management')) {
      return 'management';
    }
    
    // Fallback based on channel count and activity
    if (connection.channels > 1) {
      return 'producer'; // Producers often use multiple channels
    }
    
    return 'unknown';
  }

  // Message Publishing
  async publishMessage(vhost = '%2F', exchangeName, messageData) {
    try {
      const response = await this.client.post(`/exchanges/${vhost}/${exchangeName}/publish`, {
        properties: messageData.properties || {},
        routing_key: messageData.routingKey || '',
        payload: messageData.payload || '',
        payload_encoding: messageData.payloadEncoding || 'string'
      });
      
      if (response.data.routed) {
        return {
          success: true,
          data: response.data,
          message: `Message published successfully to exchange "${exchangeName}"`
        };
      } else {
        return {
          success: false,
          error: 'Message was not routed to any queue',
          message: `Message published but not routed - check bindings for exchange "${exchangeName}"`
        };
      }
    } catch (error) {
      console.error('Error publishing message:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: `Failed to publish message to exchange "${exchangeName}"`
      };
    }
  }

  // Get real-time metrics for all components
  async getRealTimeMetrics() {
    try {
      const [overview, queues, exchanges, connections] = await Promise.all([
        this.getOverview(),
        this.getQueues(),
        this.getExchanges(),
        this.getConnections()
      ]);

      return {
        overview,
        queues: queues.map(q => ({
          id: q.id,
          messages: q.data.metrics.messages,
          messageRate: q.data.metrics.messageRate,
          consumers: q.data.metrics.consumers,
          consumerRate: q.data.metrics.consumerRate,
          status: q.data.metrics.status
        })),
        exchanges: exchanges.map(e => ({
          id: e.id,
          messageRateIn: e.data.metrics.messageRateIn,
          messageRateOut: e.data.metrics.messageRateOut,
          status: e.data.metrics.status
        })),
        connections: connections.map(c => ({
          id: c.id,
          state: c.state,
          channels: c.channels
        })),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      throw error;
    }
  }

  // Dead Letter Queue Management
  async getDeadLetterQueues() {
    try {
      const response = await this.client.get('/queues');
      const deadLetterQueues = response.data.filter(queue => 
        queue.arguments && 
        queue.arguments['x-dead-letter-exchange'] &&
        queue.name.includes('dlq') || queue.name.includes('dead') || queue.name.includes('failed')
      );

      return deadLetterQueues.map(queue => ({
        name: queue.name,
        durable: queue.durable,
        autoDelete: queue.auto_delete,
        arguments: queue.arguments,
        messageCount: queue.messages || 0,
        consumerCount: queue.consumers || 0,
        messageRate: queue.message_stats?.publish_details?.rate || 0,
        originalQueue: queue.arguments['x-original-queue'] || null,
        deadLetterExchange: queue.arguments['x-dead-letter-exchange'] || null
      }));
    } catch (error) {
      console.error('Error fetching dead letter queues:', error);
      throw error;
    }
  }

  async getDeadLetterMessages(queueName) {
    try {
      // Get messages from queue using get API (this will consume them temporarily)
      const response = await this.client.post(`/queues/%2F/${encodeURIComponent(queueName)}/get`, {
        count: 100, // Limit to 100 messages
        requeue: true, // Put messages back in queue
        encoding: 'auto'
      });

      return response.data.map((msg, index) => ({
        id: `${queueName}-${msg.message_count || index}`,
        payload: msg.payload,
        properties: {
          messageId: msg.properties?.message_id,
          timestamp: msg.properties?.timestamp,
          expiration: msg.properties?.expiration,
          userId: msg.properties?.user_id,
          appId: msg.properties?.app_id,
          correlationId: msg.properties?.correlation_id,
          replyTo: msg.properties?.reply_to,
          headers: msg.properties?.headers || {}
        },
        routingKey: msg.routing_key || '',
        exchange: msg.exchange || '',
        originalQueue: msg.properties?.headers?.['x-original-queue'] || 'unknown',
        deadLetterReason: this.determineDeadLetterReason(msg.properties?.headers),
        deadLetterTime: msg.properties?.headers?.['x-death']?.[0]?.time || new Date().toISOString(),
        redeliveryCount: msg.redelivered ? 1 : 0,
        originalExchange: msg.properties?.headers?.['x-death']?.[0]?.exchange,
        originalRoutingKey: msg.properties?.headers?.['x-death']?.[0]?.['routing-keys']?.[0]
      }));
    } catch (error) {
      console.error('Error fetching dead letter messages:', error);
      throw error;
    }
  }

  determineDeadLetterReason(headers) {
    if (!headers || !headers['x-death']) return 'rejected';
    
    const death = headers['x-death'][0];
    return death.reason || 'rejected';
  }

  async configureDeadLetterQueue(queueName, dlqArguments, strategy = 'at-most-once') {
    try {
      // Update the queue with dead letter exchange configuration
      const response = await this.client.put(`/queues/%2F/${encodeURIComponent(queueName)}`, {
        durable: true,
        auto_delete: false,
        arguments: {
          ...dlqArguments,
          'x-dead-letter-strategy': strategy
        }
      });

      return {
        success: true,
        data: response.data,
        message: `Dead letter queue configuration applied to "${queueName}"`
      };
    } catch (error) {
      console.error('Error configuring dead letter queue:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: `Failed to configure dead letter queue for "${queueName}"`
      };
    }
  }

  async replayDeadLetterMessages(queueName, messageIds, replayConfig) {
    try {
      // Get the specific messages to replay
      const messages = await this.getDeadLetterMessages(queueName);
      const messagesToReplay = messages.filter(msg => messageIds.includes(msg.id));

      let successCount = 0;
      const errors = [];

      for (const message of messagesToReplay) {
        try {
          // Prepare the message for replay
          let payload = message.payload;
          if (replayConfig.modifyPayload && replayConfig.newPayload) {
            payload = replayConfig.newPayload;
          }

          const properties = {
            ...message.properties,
            ...(replayConfig.additionalHeaders || {}),
            headers: {
              ...message.properties.headers,
              ...(replayConfig.additionalHeaders || {}),
              'x-replayed-at': new Date().toISOString(),
              'x-replay-source': queueName
            }
          };

          // Add delay if specified
          if (replayConfig.delaySeconds > 0) {
            await new Promise(resolve => setTimeout(resolve, replayConfig.delaySeconds * 1000));
          }

          // Publish the message to the target exchange
          await this.publishMessage('%2F', replayConfig.targetExchange, {
            payload,
            routingKey: replayConfig.targetRoutingKey || message.routingKey,
            properties,
            payloadEncoding: 'string'
          });

          successCount++;

          // Remove the message from the dead letter queue
          // Note: This is a simplified approach. In practice, you might want to use a more sophisticated method
          await this.client.delete(`/queues/%2F/${encodeURIComponent(queueName)}/messages`, {
            data: {
              count: 1,
              requeue: false,
              encoding: 'auto'
            }
          });

        } catch (error) {
          console.error(`Error replaying message ${message.id}:`, error);
          errors.push({
            messageId: message.id,
            error: error.message
          });
        }

        // Respect batch size
        if (successCount % replayConfig.batchSize === 0) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between batches
        }
      }

      return {
        success: true,
        data: {
          successCount,
          totalCount: messagesToReplay.length,
          errors
        },
        message: `Successfully replayed ${successCount} out of ${messagesToReplay.length} messages`
      };
    } catch (error) {
      console.error('Error replaying dead letter messages:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: 'Failed to replay dead letter messages'
      };
    }
  }

  async deleteDeadLetterMessages(queueName, messageIds) {
    try {
      // This is a simplified approach - in practice, you'd need to implement
      // a more sophisticated message deletion mechanism
      const deleteCount = messageIds.length;
      
      const response = await this.client.delete(`/queues/%2F/${encodeURIComponent(queueName)}/contents`);

      return {
        success: true,
        data: { deletedCount: deleteCount },
        message: `Deleted ${deleteCount} messages from queue "${queueName}"`
      };
    } catch (error) {
      console.error('Error deleting dead letter messages:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: `Failed to delete messages from queue "${queueName}"`
      };
    }
  }

  async exportDeadLetterMessages(queueName, messageIds) {
    try {
      const messages = await this.getDeadLetterMessages(queueName);
      const messagesToExport = messages.filter(msg => messageIds.includes(msg.id));

      const exportData = {
        exportedAt: new Date().toISOString(),
        queueName,
        messageCount: messagesToExport.length,
        messages: messagesToExport.map(msg => ({
          ...msg,
          exportNote: 'Exported from dead letter queue for analysis/replay'
        }))
      };

      return {
        success: true,
        data: exportData,
        message: `Exported ${messagesToExport.length} messages from queue "${queueName}"`
      };
    } catch (error) {
      console.error('Error exporting dead letter messages:', error);
      return {
        success: false,
        error: error.response?.data?.reason || error.message,
        message: `Failed to export messages from queue "${queueName}"`
      };
    }
  }

  // Get detailed exchange information
  async getExchangeDetails(exchangeName, vhost = '/') {
    try {
      const [exchangeResponse, bindingsResponse] = await Promise.all([
        this.client.get(`/exchanges/${encodeURIComponent(vhost)}/${encodeURIComponent(exchangeName)}`),
        this.client.get(`/exchanges/${encodeURIComponent(vhost)}/${encodeURIComponent(exchangeName)}/bindings/source`)
      ]);

      const exchange = exchangeResponse.data;
      const bindings = bindingsResponse.data || [];

      return {
        name: exchange.name,
        type: exchange.type,
        durable: exchange.durable,
        autoDelete: exchange.auto_delete,
        internal: exchange.internal,
        arguments: exchange.arguments || {},
        messageStats: {
          publishIn: exchange.message_stats?.publish_in || 0,
          publishOut: exchange.message_stats?.publish_out || 0,
          publishInDetails: exchange.message_stats?.publish_in_details || { rate: 0 },
          publishOutDetails: exchange.message_stats?.publish_out_details || { rate: 0 }
        },
        bindings: bindings.map(binding => ({
          destination: binding.destination,
          destinationType: binding.destination_type,
          routingKey: binding.routing_key,
          arguments: binding.arguments || {}
        })),
        vhost: exchange.vhost,
        user_who_performed_action: exchange.user_who_performed_action
      };
    } catch (error) {
      console.error('Error fetching exchange details:', error);
      throw error;
    }
  }

  // Get producer details (simulated based on connections and channels)
  async getProducerDetails(producerName) {
    try {
      // Since RabbitMQ doesn't track "producers" as first-class entities,
      // we'll simulate this by looking at connections and channels that publish messages
      const [connectionsResponse, channelsResponse] = await Promise.all([
        this.client.get('/connections'),
        this.client.get('/channels')
      ]);

      const connections = connectionsResponse.data || [];
      const channels = channelsResponse.data || [];

      // Try to find a connection/channel that matches our producer name pattern
      const matchingConnection = connections.find(conn => 
        conn.name.includes(producerName) || conn.client_properties?.connection_name === producerName
      );

      const producerChannels = channels.filter(channel => 
        channel.connection_details?.name?.includes(producerName) ||
        (matchingConnection && channel.connection_details?.name === matchingConnection.name)
      );

      return {
        id: producerName,
        name: producerName,
        status: matchingConnection ? matchingConnection.state : 'unknown',
        connection: matchingConnection ? {
          name: matchingConnection.name,
          host: matchingConnection.host,
          port: matchingConnection.port,
          user: matchingConnection.user,
          vhost: matchingConnection.vhost,
          protocol: matchingConnection.protocol,
          state: matchingConnection.state,
          channels: matchingConnection.channels || 0
        } : null,
        channels: producerChannels.map(channel => ({
          name: channel.name,
          number: channel.number,
          user: channel.user,
          vhost: channel.vhost,
          state: channel.state,
          messagesUnacknowledged: channel.messages_unacknowledged || 0,
          messagesUnconfirmed: channel.messages_unconfirmed || 0,
          publishRate: channel.message_stats?.publish_details?.rate || 0
        })),
        messageStats: {
          totalPublished: producerChannels.reduce((sum, ch) => sum + (ch.message_stats?.publish || 0), 0),
          publishRate: producerChannels.reduce((sum, ch) => sum + (ch.message_stats?.publish_details?.rate || 0), 0)
        },
        lastActivity: matchingConnection?.connected_at
      };
    } catch (error) {
      console.error('Error fetching producer details:', error);
      throw error;
    }
  }

  // Get consumer details
  async getConsumerDetails(consumerName) {
    try {
      const [consumersResponse, channelsResponse] = await Promise.all([
        this.client.get('/consumers'),
        this.client.get('/channels')
      ]);

      const consumers = consumersResponse.data || [];
      const channels = channelsResponse.data || [];

      // Find the specific consumer
      const consumer = consumers.find(c => 
        c.consumer_tag === consumerName || 
        `${c.queue?.name}-${c.consumer_tag}` === consumerName ||
        c.consumer_tag.includes(consumerName)
      );

      if (!consumer) {
        throw new Error(`Consumer ${consumerName} not found`);
      }

      // Find the associated channel
      const channel = channels.find(ch => ch.name === consumer.channel_details?.name);

      return {
        id: `${consumer.queue?.name}-${consumer.consumer_tag}`,
        consumerTag: consumer.consumer_tag,
        queue: consumer.queue?.name || 'unknown',
        channel: consumer.channel_details?.name,
        connection: consumer.channel_details?.connection_name,
        ackRequired: consumer.ack_required,
        prefetchCount: consumer.prefetch_count,
        arguments: consumer.arguments || {},
        exclusivity: consumer.exclusive,
        activity: consumer.activity_status || 'unknown',
        user: consumer.channel_details?.user,
        channelDetails: channel ? {
          name: channel.name,
          number: channel.number,
          user: channel.user,
          vhost: channel.vhost,
          state: channel.state,
          messagesUnacknowledged: channel.messages_unacknowledged || 0,
          prefetchCount: channel.prefetch_count || 0,
          consumerCount: channel.consumer_count || 0
        } : null,
        messageStats: {
          deliverRate: channel?.message_stats?.deliver_details?.rate || 0,
          ackRate: channel?.message_stats?.ack_details?.rate || 0,
          rejectRate: channel?.message_stats?.reject_details?.rate || 0,
          totalDelivered: channel?.message_stats?.deliver || 0,
          totalAcked: channel?.message_stats?.ack || 0
        }
      };
    } catch (error) {
      console.error('Error fetching consumer details:', error);
      throw error;
    }
  }
}

export default RabbitMQService;
