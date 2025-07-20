import RabbitMQConnection from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

class RabbitMQSetup {
  constructor() {
    this.rabbitmq = new RabbitMQConnection();
    this.config = {
      exchanges: {
        direct: process.env.DIRECT_EXCHANGE || 'direct.exchange',
        fanout: process.env.FANOUT_EXCHANGE || 'fanout.exchange',
        topic: process.env.TOPIC_EXCHANGE || 'topic.exchange'
      },
      queues: {
        direct: [
          process.env.DIRECT_QUEUE_1 || 'direct.queue.1',
          process.env.DIRECT_QUEUE_2 || 'direct.queue.2'
        ],
        fanout: [
          process.env.FANOUT_QUEUE_1 || 'fanout.queue.1',
          process.env.FANOUT_QUEUE_2 || 'fanout.queue.2'
        ],
        topic: [
          process.env.TOPIC_QUEUE_1 || 'topic.queue.1',
          process.env.TOPIC_QUEUE_2 || 'topic.queue.2'
        ]
      },
      routingKeys: {
        direct: [
          process.env.DIRECT_ROUTING_KEY_1 || 'direct.key.1',
          process.env.DIRECT_ROUTING_KEY_2 || 'direct.key.2'
        ],
        topic: {
          patterns: [
            'app.error.*',    // Topic Consumer 1
            'app.warning.*',  // Topic Consumer 1
            'app.info.*',     // Topic Consumer 2
            'app.debug.*'     // Topic Consumer 2
          ]
        }
      }
    };
  }

  async setupAll() {
    try {
      console.log('🚀 Starting RabbitMQ Infrastructure Setup...');
      const channel = await this.rabbitmq.connect();

      await this.setupExchanges(channel);
      await this.setupQueues(channel);
      await this.setupBindings(channel);

      console.log('✅ RabbitMQ infrastructure setup completed successfully!');
      console.log('\n📊 Setup Summary:');
      console.log(`   ✓ 3 Exchanges created (direct, fanout, topic)`);
      console.log(`   ✓ 6 Queues created (2 per exchange type)`);
      console.log(`   ✓ All bindings configured`);
      console.log('\n🎯 Ready for producers and consumers!');
      
      await this.rabbitmq.disconnect();
      return true;
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      await this.rabbitmq.disconnect();
      throw error;
    }
  }

  async setupExchanges(channel) {
    console.log('\n📤 Setting up exchanges...');
    
    // Direct Exchange
    await channel.assertExchange(this.config.exchanges.direct, 'direct', {
      durable: true,
      autoDelete: false
    });
    console.log(`   ✓ Direct exchange: ${this.config.exchanges.direct}`);

    // Fanout Exchange
    await channel.assertExchange(this.config.exchanges.fanout, 'fanout', {
      durable: true,
      autoDelete: false
    });
    console.log(`   ✓ Fanout exchange: ${this.config.exchanges.fanout}`);

    // Topic Exchange
    await channel.assertExchange(this.config.exchanges.topic, 'topic', {
      durable: true,
      autoDelete: false
    });
    console.log(`   ✓ Topic exchange: ${this.config.exchanges.topic}`);
  }

  async setupQueues(channel) {
    console.log('\n📥 Setting up queues...');
    
    // Direct Queues
    for (const queueName of this.config.queues.direct) {
      await channel.assertQueue(queueName, {
        durable: true,
        autoDelete: false,
        exclusive: false
      });
      console.log(`   ✓ Direct queue: ${queueName}`);
    }

    // Fanout Queues
    for (const queueName of this.config.queues.fanout) {
      await channel.assertQueue(queueName, {
        durable: true,
        autoDelete: false,
        exclusive: false
      });
      console.log(`   ✓ Fanout queue: ${queueName}`);
    }

    // Topic Queues
    for (const queueName of this.config.queues.topic) {
      await channel.assertQueue(queueName, {
        durable: true,
        autoDelete: false,
        exclusive: false
      });
      console.log(`   ✓ Topic queue: ${queueName}`);
    }
  }

  async setupBindings(channel) {
    console.log('\n🔗 Setting up bindings...');
    
    // Direct Exchange Bindings
    await channel.bindQueue(
      this.config.queues.direct[0], 
      this.config.exchanges.direct, 
      this.config.routingKeys.direct[0]
    );
    console.log(`   ✓ ${this.config.queues.direct[0]} → ${this.config.exchanges.direct} (${this.config.routingKeys.direct[0]})`);

    await channel.bindQueue(
      this.config.queues.direct[1], 
      this.config.exchanges.direct, 
      this.config.routingKeys.direct[1]
    );
    console.log(`   ✓ ${this.config.queues.direct[1]} → ${this.config.exchanges.direct} (${this.config.routingKeys.direct[1]})`);

    // Fanout Exchange Bindings (no routing key needed)
    for (const queueName of this.config.queues.fanout) {
      await channel.bindQueue(queueName, this.config.exchanges.fanout, '');
      console.log(`   ✓ ${queueName} → ${this.config.exchanges.fanout} (fanout - all messages)`);
    }

    // Topic Exchange Bindings
    // Topic Consumer 1: Error and Warning messages
    await channel.bindQueue(this.config.queues.topic[0], this.config.exchanges.topic, 'app.error.*');
    await channel.bindQueue(this.config.queues.topic[0], this.config.exchanges.topic, 'app.warning.*');
    console.log(`   ✓ ${this.config.queues.topic[0]} → ${this.config.exchanges.topic} (app.error.*, app.warning.*)`);

    // Topic Consumer 2: Info and Debug messages
    await channel.bindQueue(this.config.queues.topic[1], this.config.exchanges.topic, 'app.info.*');
    await channel.bindQueue(this.config.queues.topic[1], this.config.exchanges.topic, 'app.debug.*');
    console.log(`   ✓ ${this.config.queues.topic[1]} → ${this.config.exchanges.topic} (app.info.*, app.debug.*)`);
  }

  async cleanupAll() {
    try {
      console.log('🧹 Cleaning up RabbitMQ infrastructure...');
      const channel = await this.rabbitmq.connect();

      // Delete queues first (to remove bindings)
      const allQueues = [
        ...this.config.queues.direct,
        ...this.config.queues.fanout,
        ...this.config.queues.topic
      ];

      for (const queueName of allQueues) {
        try {
          await channel.deleteQueue(queueName);
          console.log(`   ✓ Deleted queue: ${queueName}`);
        } catch (error) {
          console.log(`   ⚠️  Queue ${queueName} may not exist: ${error.message}`);
        }
      }

      // Delete exchanges
      const allExchanges = Object.values(this.config.exchanges);
      for (const exchangeName of allExchanges) {
        try {
          await channel.deleteExchange(exchangeName);
          console.log(`   ✓ Deleted exchange: ${exchangeName}`);
        } catch (error) {
          console.log(`   ⚠️  Exchange ${exchangeName} may not exist: ${error.message}`);
        }
      }

      console.log('✅ Cleanup completed!');
      await this.rabbitmq.disconnect();
      return true;
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      await this.rabbitmq.disconnect();
      throw error;
    }
  }

  printConfiguration() {
    console.log('\n📋 RabbitMQ Configuration:');
    console.log('\n📤 Exchanges:');
    Object.entries(this.config.exchanges).forEach(([type, name]) => {
      console.log(`   ${type.toUpperCase()}: ${name}`);
    });

    console.log('\n📥 Queues:');
    Object.entries(this.config.queues).forEach(([type, queues]) => {
      console.log(`   ${type.toUpperCase()}:`);
      queues.forEach(queue => console.log(`     - ${queue}`));
    });

    console.log('\n🔑 Routing Configuration:');
    console.log('   DIRECT:');
    this.config.routingKeys.direct.forEach((key, index) => {
      console.log(`     - ${key} → ${this.config.queues.direct[index]}`);
    });
    console.log('   FANOUT:');
    console.log('     - (broadcasts to all bound queues)');
    console.log('   TOPIC:');
    console.log('     - app.error.*, app.warning.* → topic.queue.1');
    console.log('     - app.info.*, app.debug.* → topic.queue.2');
  }
}

// Command line interface
const setup = new RabbitMQSetup();

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      console.log('🚀 Setting up RabbitMQ infrastructure...');
      setup.setupAll().catch(console.error);
      break;
    case 'cleanup':
      console.log('🧹 Cleaning up RabbitMQ infrastructure...');
      setup.cleanupAll().catch(console.error);
      break;
    case 'config':
      setup.printConfiguration();
      break;
    default:
      console.log('📋 RabbitMQ Setup Utility');
      console.log('Usage: node setup.js [command]');
      console.log('Commands:');
      console.log('  setup   - Create all exchanges, queues, and bindings');
      console.log('  cleanup - Delete all exchanges and queues');
      console.log('  config  - Display current configuration');
      console.log('\nExample: node setup.js setup');
      setup.printConfiguration();
  }
}

export default RabbitMQSetup;
