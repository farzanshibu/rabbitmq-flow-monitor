import RabbitMQConnection from '../../connection.js';
import dotenv from 'dotenv';

dotenv.config();

class TopicProducer {
  constructor() {
    this.rabbitmq = new RabbitMQConnection();
    this.exchangeName = process.env.TOPIC_EXCHANGE || 'topic.exchange';
    this.routingKeys = [
      process.env.TOPIC_ROUTING_KEY_ERROR || 'app.error.critical',
      process.env.TOPIC_ROUTING_KEY_INFO || 'app.info.general',
      process.env.TOPIC_ROUTING_KEY_DEBUG || 'app.debug.verbose',
      'app.warning.minor',
      'app.info.user',
      'app.error.database',
      'app.debug.network'
    ];
    this.messageInterval = parseInt(process.env.MESSAGE_INTERVAL) || 2000;
    this.messageCounter = 0;
    this.isProducing = false;
  }

  async setup() {
    try {
      const channel = await this.rabbitmq.connect();
      
      // Declare topic exchange
      await channel.assertExchange(this.exchangeName, 'topic', {
        durable: true,
        autoDelete: false
      });
      
      console.log(`📤 Topic Exchange '${this.exchangeName}' declared successfully`);
      return channel;
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  async startProducing() {
    if (this.isProducing) {
      console.log('⚠️  Topic Producer is already running');
      return;
    }

    try {
      const channel = await this.setup();
      this.isProducing = true;
      
      console.log(`🚀 Starting Topic Producer - Publishing to exchange '${this.exchangeName}'`);
      console.log(`📊 Message interval: ${this.messageInterval}ms`);
      console.log(`🏷️  Type: TOPIC (pattern-based routing)`);
      console.log(`🔑 Available routing keys: ${this.routingKeys.join(', ')}`);
      
      const publishMessage = async () => {
        if (!this.isProducing) return;
        
        try {
          this.messageCounter++;
          
          // Select routing key based on message patterns
          const routingKey = this.routingKeys[this.messageCounter % this.routingKeys.length];
          const [app, level, category] = routingKey.split('.');
          
          const message = {
            id: `topic-${this.messageCounter}`,
            type: 'topic',
            content: `Topic message #${this.messageCounter} - ${level.toUpperCase()} in ${category}`,
            routingKey: routingKey,
            level: level,
            category: category,
            timestamp: new Date().toISOString(),
            producer: 'TopicProducer'
          };
          
          const messageBuffer = Buffer.from(JSON.stringify(message));
          
          // Publish message to topic exchange with pattern-based routing key
          const published = channel.publish(
            this.exchangeName,
            routingKey,
            messageBuffer,
            {
              persistent: true,
              messageId: message.id,
              timestamp: Date.now(),
              contentType: 'application/json',
              headers: {
                level: level,
                category: category
              }
            }
          );
          
          if (published) {
            console.log(`🏷️  [${new Date().toLocaleTimeString()}] Published message #${this.messageCounter} with pattern '${routingKey}'`);
          } else {
            console.log(`⚠️  Message #${this.messageCounter} could not be published (buffer full)`);
          }
          
        } catch (error) {
          console.error('❌ Error publishing message:', error.message);
        }
        
        // Schedule next message
        setTimeout(publishMessage, this.messageInterval);
      };
      
      // Start publishing
      publishMessage();
      
    } catch (error) {
      console.error('❌ Failed to start producing:', error.message);
      this.isProducing = false;
    }
  }

  async stop() {
    console.log('🛑 Stopping Topic Producer...');
    this.isProducing = false;
    await this.rabbitmq.disconnect();
  }

  // Method to publish a single message (for testing)
  async publishSingleMessage(routingKey, customMessage = null) {
    try {
      const channel = this.rabbitmq.getChannel();
      this.messageCounter++;
      
      const [app, level, category] = routingKey.split('.');
      
      const message = customMessage || {
        id: `topic-single-${this.messageCounter}`,
        type: 'topic',
        content: `Single topic message #${this.messageCounter} - ${level?.toUpperCase()} in ${category}`,
        routingKey: routingKey,
        level: level,
        category: category,
        timestamp: new Date().toISOString(),
        producer: 'TopicProducer'
      };
      
      const messageBuffer = Buffer.from(JSON.stringify(message));
      
      const published = channel.publish(
        this.exchangeName,
        routingKey,
        messageBuffer,
        {
          persistent: true,
          messageId: message.id,
          timestamp: Date.now(),
          contentType: 'application/json',
          headers: {
            level: level || 'unknown',
            category: category || 'unknown'
          }
        }
      );
      
      if (published) {
        console.log(`🏷️  Single message published with pattern '${routingKey}'`);
        return message;
      } else {
        console.log(`⚠️  Single message could not be published (buffer full)`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error publishing single message:', error.message);
      throw error;
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📡 Received SIGINT, shutting down gracefully...');
  if (producer) {
    await producer.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📡 Received SIGTERM, shutting down gracefully...');
  if (producer) {
    await producer.stop();
  }
  process.exit(0);
});

// Start producer if this file is run directly
const producer = new TopicProducer();

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🏷️  Starting Topic Exchange Producer...');
  producer.startProducing().catch(console.error);
}

export default TopicProducer;
