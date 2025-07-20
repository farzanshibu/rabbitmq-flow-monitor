import RabbitMQConnection from '../../connection.js';
import dotenv from 'dotenv';

dotenv.config();

class DirectProducer {
  constructor() {
    this.rabbitmq = new RabbitMQConnection();
    this.exchangeName = process.env.DIRECT_EXCHANGE || 'direct.exchange';
    this.routingKeys = [
      process.env.DIRECT_ROUTING_KEY_1 || 'direct.key.1',
      process.env.DIRECT_ROUTING_KEY_2 || 'direct.key.2'
    ];
    this.messageInterval = parseInt(process.env.MESSAGE_INTERVAL) || 2000;
    this.messageCounter = 0;
    this.isProducing = false;
  }

  async setup() {
    try {
      const channel = await this.rabbitmq.connect();
      
      // Declare direct exchange
      await channel.assertExchange(this.exchangeName, 'direct', {
        durable: true,
        autoDelete: false
      });
      
      console.log(`📤 Direct Exchange '${this.exchangeName}' declared successfully`);
      return channel;
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  async startProducing() {
    if (this.isProducing) {
      console.log('⚠️  Producer is already running');
      return;
    }

    try {
      const channel = await this.setup();
      this.isProducing = true;
      
      console.log(`🚀 Starting Direct Producer - Publishing to exchange '${this.exchangeName}'`);
      console.log(`📊 Message interval: ${this.messageInterval}ms`);
      console.log(`🔑 Routing keys: ${this.routingKeys.join(', ')}`);
      
      const publishMessage = async () => {
        if (!this.isProducing) return;
        
        try {
          // Alternate between routing keys
          const routingKey = this.routingKeys[this.messageCounter % this.routingKeys.length];
          this.messageCounter++;
          
          const message = {
            id: `direct-${this.messageCounter}`,
            type: 'direct',
            content: `Direct message #${this.messageCounter}`,
            routingKey: routingKey,
            timestamp: new Date().toISOString(),
            producer: 'DirectProducer'
          };
          
          const messageBuffer = Buffer.from(JSON.stringify(message));
          
          // Publish message to direct exchange with specific routing key
          const published = channel.publish(
            this.exchangeName,
            routingKey,
            messageBuffer,
            {
              persistent: true,
              messageId: message.id,
              timestamp: Date.now(),
              contentType: 'application/json'
            }
          );
          
          if (published) {
            console.log(`📤 [${new Date().toLocaleTimeString()}] Published message #${this.messageCounter} to routing key '${routingKey}'`);
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
    console.log('🛑 Stopping Direct Producer...');
    this.isProducing = false;
    await this.rabbitmq.disconnect();
  }

  // Method to publish a single message (for testing)
  async publishSingleMessage(routingKey, customMessage = null) {
    try {
      const channel = this.rabbitmq.getChannel();
      this.messageCounter++;
      
      const message = customMessage || {
        id: `direct-single-${this.messageCounter}`,
        type: 'direct',
        content: `Single direct message #${this.messageCounter}`,
        routingKey: routingKey,
        timestamp: new Date().toISOString(),
        producer: 'DirectProducer'
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
          contentType: 'application/json'
        }
      );
      
      if (published) {
        console.log(`📤 Single message published to routing key '${routingKey}'`);
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
const producer = new DirectProducer();

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 Starting Direct Exchange Producer...');
  producer.startProducing().catch(console.error);
}

export default DirectProducer;
