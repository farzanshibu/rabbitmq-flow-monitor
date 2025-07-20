import RabbitMQConnection from '../../connection.js';
import dotenv from 'dotenv';

dotenv.config();

class DirectConsumer1 {
  constructor() {
    this.rabbitmq = new RabbitMQConnection();
    this.exchangeName = process.env.DIRECT_EXCHANGE || 'direct.exchange';
    this.queueName = process.env.DIRECT_QUEUE_1 || 'direct.queue.1';
    this.routingKey = process.env.DIRECT_ROUTING_KEY_1 || 'direct.key.1';
    this.consumerTag = 'direct-consumer-1';
    this.messageCount = 0;
    this.isConsuming = false;
  }

  async setup() {
    try {
      const channel = await this.rabbitmq.connect();
      
      // Declare direct exchange (idempotent)
      await channel.assertExchange(this.exchangeName, 'direct', {
        durable: true,
        autoDelete: false
      });
      
      // Declare queue
      await channel.assertQueue(this.queueName, {
        durable: true,
        autoDelete: false,
        exclusive: false
      });
      
      // Bind queue to exchange with routing key
      await channel.bindQueue(this.queueName, this.exchangeName, this.routingKey);
      
      console.log(`📥 Direct Consumer 1 setup complete:`);
      console.log(`   Exchange: ${this.exchangeName}`);
      console.log(`   Queue: ${this.queueName}`);
      console.log(`   Routing Key: ${this.routingKey}`);
      
      return channel;
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  async startConsuming() {
    if (this.isConsuming) {
      console.log('⚠️  Consumer 1 is already running');
      return;
    }

    try {
      const channel = await this.setup();
      this.isConsuming = true;
      
      // Set prefetch count for fair dispatching
      await channel.prefetch(1);
      
      console.log(`🎯 Direct Consumer 1 started - Listening on queue '${this.queueName}'`);
      console.log(`🔑 Bound to routing key: ${this.routingKey}`);
      
      // Start consuming messages
      await channel.consume(this.queueName, async (msg) => {
        if (msg === null) {
          console.log('⚠️  Consumer 1 cancelled');
          return;
        }
        
        try {
          this.messageCount++;
          const messageContent = JSON.parse(msg.content.toString());
          
          console.log(`📨 [Consumer 1] [${new Date().toLocaleTimeString()}] Received message #${this.messageCount}:`);
          console.log(`   Message ID: ${messageContent.id}`);
          console.log(`   Content: ${messageContent.content}`);
          console.log(`   Routing Key: ${messageContent.routingKey}`);
          console.log(`   Timestamp: ${messageContent.timestamp}`);
          
          // Simulate processing time
          await this.processMessage(messageContent);
          
          // Acknowledge the message
          channel.ack(msg);
          console.log(`✅ [Consumer 1] Message #${this.messageCount} processed and acknowledged`);
          
        } catch (error) {
          console.error(`❌ [Consumer 1] Error processing message:`, error.message);
          
          // Reject message and requeue it
          channel.nack(msg, false, true);
          console.log(`🔄 [Consumer 1] Message rejected and requeued`);
        }
      }, {
        consumerTag: this.consumerTag,
        noAck: false // Manual acknowledgment
      });
      
    } catch (error) {
      console.error('❌ Failed to start consuming:', error.message);
      this.isConsuming = false;
    }
  }

  async processMessage(messageContent) {
    // Simulate message processing time (500ms to 2s)
    const processingTime = Math.floor(Math.random() * 1500) + 500;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`⚙️  [Consumer 1] Processed message '${messageContent.id}' in ${processingTime}ms`);
        resolve();
      }, processingTime);
    });
  }

  async stop() {
    console.log('🛑 Stopping Direct Consumer 1...');
    try {
      if (this.isConsuming && this.rabbitmq.isConnected()) {
        const channel = this.rabbitmq.getChannel();
        await channel.cancel(this.consumerTag);
      }
    } catch (error) {
      console.error('❌ Error stopping consumer:', error.message);
    }
    
    this.isConsuming = false;
    await this.rabbitmq.disconnect();
  }

  getStats() {
    return {
      consumerTag: this.consumerTag,
      queueName: this.queueName,
      routingKey: this.routingKey,
      messagesProcessed: this.messageCount,
      isConsuming: this.isConsuming
    };
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📡 Received SIGINT, shutting down Consumer 1 gracefully...');
  if (consumer) {
    await consumer.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📡 Received SIGTERM, shutting down Consumer 1 gracefully...');
  if (consumer) {
    await consumer.stop();
  }
  process.exit(0);
});

// Start consumer if this file is run directly
const consumer = new DirectConsumer1();

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 Starting Direct Consumer 1...');
  consumer.startConsuming().catch(console.error);
}

export default DirectConsumer1;
