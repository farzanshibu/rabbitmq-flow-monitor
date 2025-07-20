import DirectProducer from './exchanges/direct/directProducer.js';
import FanoutProducer from './exchanges/fanout/fanoutProducer.js';
import TopicProducer from './exchanges/topic/topicProducer.js';
import DirectConsumer1 from './exchanges/direct/directConsumer1.js';
import DirectConsumer2 from './exchanges/direct/directConsumer2.js';
import FanoutConsumer1 from './exchanges/fanout/fanoutConsumer1.js';
import FanoutConsumer2 from './exchanges/fanout/fanoutConsumer2.js';
import TopicConsumer1 from './exchanges/topic/topicConsumer1.js';
import TopicConsumer2 from './exchanges/topic/topicConsumer2.js';
import RabbitMQSetup from './setup.js';

class RabbitMQService {
  constructor() {
    this.producers = {
      direct: new DirectProducer(),
      fanout: new FanoutProducer(),
      topic: new TopicProducer()
    };

    this.consumers = {
      direct1: new DirectConsumer1(),
      direct2: new DirectConsumer2(),
      fanout1: new FanoutConsumer1(),
      fanout2: new FanoutConsumer2(),
      topic1: new TopicConsumer1(),
      topic2: new TopicConsumer2()
    };

    this.setup = new RabbitMQSetup();
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing RabbitMQ Service...');
      
      // Setup infrastructure
      await this.setup.setupAll();
      
      console.log('✅ RabbitMQ Service initialized successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize RabbitMQ Service:', error.message);
      throw error;
    }
  }

  async startAllProducers() {
    console.log('\n📤 Starting all producers...');
    
    const producerPromises = Object.entries(this.producers).map(async ([type, producer]) => {
      try {
        await producer.startProducing();
        console.log(`✅ ${type.toUpperCase()} producer started`);
      } catch (error) {
        console.error(`❌ Failed to start ${type} producer:`, error.message);
      }
    });

    await Promise.allSettled(producerPromises);
    console.log('📤 All producers startup attempted');
  }

  async startAllConsumers() {
    console.log('\n📥 Starting all consumers...');
    
    const consumerPromises = Object.entries(this.consumers).map(async ([name, consumer]) => {
      try {
        await consumer.startConsuming();
        console.log(`✅ ${name.toUpperCase()} consumer started`);
      } catch (error) {
        console.error(`❌ Failed to start ${name} consumer:`, error.message);
      }
    });

    await Promise.allSettled(consumerPromises);
    console.log('📥 All consumers startup attempted');
  }

  async startAll() {
    if (this.isRunning) {
      console.log('⚠️  Service is already running');
      return;
    }

    try {
      await this.initialize();
      
      // Start consumers first
      await this.startAllConsumers();
      
      // Give consumers time to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Then start producers
      await this.startAllProducers();
      
      this.isRunning = true;
      console.log('\n🎉 RabbitMQ Service is fully operational!');
      console.log('\n📊 Service Status:');
      console.log('   📤 Producers: 3 (direct, fanout, topic)');
      console.log('   📥 Consumers: 6 (2 per exchange type)');
      console.log('   🔄 Auto-messaging: Active');
      
      this.printOperationalInfo();
      
    } catch (error) {
      console.error('❌ Failed to start service:', error.message);
      this.isRunning = false;
    }
  }

  async stopAll() {
    if (!this.isRunning) {
      console.log('⚠️  Service is not running');
      return;
    }

    console.log('\n🛑 Stopping RabbitMQ Service...');
    
    // Stop producers first
    console.log('📤 Stopping producers...');
    const producerPromises = Object.entries(this.producers).map(async ([type, producer]) => {
      try {
        await producer.stop();
        console.log(`✅ ${type.toUpperCase()} producer stopped`);
      } catch (error) {
        console.error(`❌ Error stopping ${type} producer:`, error.message);
      }
    });

    await Promise.allSettled(producerPromises);

    // Then stop consumers
    console.log('📥 Stopping consumers...');
    const consumerPromises = Object.entries(this.consumers).map(async ([name, consumer]) => {
      try {
        await consumer.stop();
        console.log(`✅ ${name.toUpperCase()} consumer stopped`);
      } catch (error) {
        console.error(`❌ Error stopping ${name} consumer:`, error.message);
      }
    });

    await Promise.allSettled(consumerPromises);

    this.isRunning = false;
    console.log('✅ RabbitMQ Service stopped successfully');
  }

  getStats() {
    const stats = {
      isRunning: this.isRunning,
      producers: {},
      consumers: {}
    };

    // Get producer stats
    Object.entries(this.producers).forEach(([type, producer]) => {
      stats.producers[type] = {
        messageCount: producer.messageCounter || 0,
        isProducing: producer.isProducing || false
      };
    });

    // Get consumer stats
    Object.entries(this.consumers).forEach(([name, consumer]) => {
      if (typeof consumer.getStats === 'function') {
        stats.consumers[name] = consumer.getStats();
      }
    });

    return stats;
  }

  printOperationalInfo() {
    console.log('\n📋 Operational Information:');
    console.log('\n🎯 Direct Exchange:');
    console.log('   - Producer sends alternating messages to 2 routing keys');
    console.log('   - Consumer 1 receives messages for "direct.key.1"');
    console.log('   - Consumer 2 receives messages for "direct.key.2"');
    
    console.log('\n📡 Fanout Exchange:');
    console.log('   - Producer broadcasts messages to ALL bound queues');
    console.log('   - Consumer 1 receives ALL broadcast messages');
    console.log('   - Consumer 2 receives ALL broadcast messages (duplicate)');
    
    console.log('\n🏷️  Topic Exchange:');
    console.log('   - Producer sends messages with various routing patterns');
    console.log('   - Consumer 1 receives ERROR and WARNING messages');
    console.log('   - Consumer 2 receives INFO and DEBUG messages');
    
    console.log('\n⚙️  Message Flow:');
    console.log('   - Messages sent every 2 seconds (configurable via .env)');
    console.log('   - All messages include timestamp and routing information');
    console.log('   - Consumers simulate processing time (500ms-2s)');
    console.log('   - Manual acknowledgment ensures reliable message delivery');
  }

  async testSingleMessages() {
    console.log('\n🧪 Testing single message publishing...');
    
    try {
      // Test direct exchange
      await this.producers.direct.publishSingleMessage('direct.key.1', {
        id: 'test-direct-1',
        content: 'Test direct message',
        type: 'test'
      });
      
      // Test fanout exchange
      await this.producers.fanout.publishSingleMessage({
        id: 'test-fanout-1',
        content: 'Test fanout broadcast',
        type: 'test'
      });
      
      // Test topic exchange
      await this.producers.topic.publishSingleMessage('app.error.critical', {
        id: 'test-topic-1',
        content: 'Test topic message',
        type: 'test'
      });
      
      console.log('✅ Single message tests completed');
    } catch (error) {
      console.error('❌ Single message test failed:', error.message);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📡 Received SIGINT, shutting down service gracefully...');
  if (service) {
    await service.stopAll();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📡 Received SIGTERM, shutting down service gracefully...');
  if (service) {
    await service.stopAll();
  }
  process.exit(0);
});

// Start service if this file is run directly
const service = new RabbitMQService();

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      console.log('🚀 Starting complete RabbitMQ service...');
      service.startAll().catch(console.error);
      break;
    case 'test':
      console.log('🧪 Running single message tests...');
      service.testSingleMessages().catch(console.error);
      break;
    case 'stats':
      console.log('📊 Service Statistics:');
      console.log(JSON.stringify(service.getStats(), null, 2));
      break;
    default:
      console.log('🐰 RabbitMQ Service Controller');
      console.log('Usage: node index.js [command]');
      console.log('Commands:');
      console.log('  start - Start all producers and consumers');
      console.log('  test  - Send single test messages');
      console.log('  stats - Display service statistics');
      console.log('\nExample: node index.js start');
      service.printOperationalInfo();
  }
}

export default RabbitMQService;
