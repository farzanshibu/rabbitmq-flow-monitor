import RabbitMQConnection from '../../connection.js';
import dotenv from 'dotenv';

dotenv.config();

class FanoutProducer {
  constructor() {
    this.rabbitmq = new RabbitMQConnection();
    this.exchangeName = process.env.FANOUT_EXCHANGE || 'fanout.exchange';
    this.messageInterval = parseInt(process.env.MESSAGE_INTERVAL) || 2000;
    this.messageCounter = 0;
    this.isProducing = false;
  }

  async setup() {
    try {
      const channel = await this.rabbitmq.connect();
      
      // Declare fanout exchange
      await channel.assertExchange(this.exchangeName, 'fanout', {
        durable: true,
        autoDelete: false
      });
      
      console.log(`📤 Fanout Exchange '${this.exchangeName}' declared successfully`);
      return channel;
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  async startProducing() {
    if (this.isProducing) {
      console.log('⚠️  Fanout Producer is already running');
      return;
    }

    try {
      const channel = await this.setup();
      this.isProducing = true;
      
      console.log(`🚀 Starting Fanout Producer - Publishing to exchange '${this.exchangeName}'`);
      console.log(`📊 Message interval: ${this.messageInterval}ms`);
      console.log(`📡 Type: FANOUT (broadcasts to all bound queues)`);
      
      const publishMessage = async () => {
        if (!this.isProducing) return;
        
        try {
          this.messageCounter++;
          
          const message = {
            id: `fanout-${this.messageCounter}`,
            type: 'fanout',
            content: `Fanout broadcast message #${this.messageCounter}`,
            timestamp: new Date().toISOString(),
            producer: 'FanoutProducer',
            broadcast: true
          };
          
          const messageBuffer = Buffer.from(JSON.stringify(message));
          
          // Publish message to fanout exchange (routing key is ignored)
          const published = channel.publish(
            this.exchangeName,
            '', // Routing key is ignored for fanout exchanges
            messageBuffer,
            {
              persistent: true,
              messageId: message.id,
              timestamp: Date.now(),
              contentType: 'application/json'
            }
          );
          
          if (published) {
            console.log(`📡 [${new Date().toLocaleTimeString()}] Broadcasted message #${this.messageCounter} to ALL bound queues`);
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
    console.log('🛑 Stopping Fanout Producer...');
    this.isProducing = false;
    await this.rabbitmq.disconnect();
  }

  // Method to publish a single message (for testing)
  async publishSingleMessage(customMessage = null) {
    try {
      const channel = this.rabbitmq.getChannel();
      this.messageCounter++;
      
      const message = customMessage || {
        id: `fanout-single-${this.messageCounter}`,
        type: 'fanout',
        content: `Single fanout broadcast #${this.messageCounter}`,
        timestamp: new Date().toISOString(),
        producer: 'FanoutProducer',
        broadcast: true
      };
      
      const messageBuffer = Buffer.from(JSON.stringify(message));
      
      const published = channel.publish(
        this.exchangeName,
        '', // Routing key is ignored for fanout
        messageBuffer,
        {
          persistent: true,
          messageId: message.id,
          timestamp: Date.now(),
          contentType: 'application/json'
        }
      );
      
      if (published) {
        console.log(`📡 Single fanout message broadcasted to ALL bound queues`);
        return message;
      } else {
        console.log(`⚠️  Single fanout message could not be published (buffer full)`);
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
const producer = new FanoutProducer();

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📡 Starting Fanout Exchange Producer...');
  producer.startProducing().catch(console.error);
}

export default FanoutProducer;
