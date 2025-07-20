import RabbitMQConnection from '../../connection.js';
import dotenv from 'dotenv';

dotenv.config();

class FanoutConsumer1 {
  constructor() {
    this.rabbitmq = new RabbitMQConnection();
    this.exchangeName = process.env.FANOUT_EXCHANGE || 'fanout.exchange';
    this.queueName = process.env.FANOUT_QUEUE_1 || 'fanout.queue.1';
    this.consumerTag = 'fanout-consumer-1';
    this.messageCount = 0;
    this.isConsuming = false;
  }

  async setup() {
    try {
      const channel = await this.rabbitmq.connect();
      
      // Declare fanout exchange (idempotent)
      await channel.assertExchange(this.exchangeName, 'fanout', {
        durable: true,
        autoDelete: false
      });
      
      // Declare queue
      await channel.assertQueue(this.queueName, {
        durable: true,
        autoDelete: false,
        exclusive: false
      });
      
      // Bind queue to fanout exchange (no routing key needed)
      await channel.bindQueue(this.queueName, this.exchangeName, '');
      
      console.log(`📥 Fanout Consumer 1 setup complete:`);
      console.log(`   Exchange: ${this.exchangeName} (FANOUT)`);
      console.log(`   Queue: ${this.queueName}`);
      console.log(`   Routing: Receives ALL messages from fanout exchange`);
      
      return channel;
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  async startConsuming() {
    if (this.isConsuming) {
      console.log('⚠️  Fanout Consumer 1 is already running');
      return;
    }

    try {
      const channel = await this.setup();
      this.isConsuming = true;
      
      // Set prefetch count for fair dispatching
      await channel.prefetch(1);
      
      console.log(`🎯 Fanout Consumer 1 started - Listening on queue '${this.queueName}'`);
      console.log(`📡 Will receive ALL messages broadcasted to fanout exchange`);
      
      // Start consuming messages
      await channel.consume(this.queueName, async (msg) => {
        if (msg === null) {
          console.log('⚠️  Fanout Consumer 1 cancelled');
          return;
        }
        
        try {
          this.messageCount++;
          const messageContent = JSON.parse(msg.content.toString());
          
          console.log(`📨 [Fanout Consumer 1] [${new Date().toLocaleTimeString()}] Received broadcast #${this.messageCount}:`);
          console.log(`   Message ID: ${messageContent.id}`);
          console.log(`   Content: ${messageContent.content}`);
          console.log(`   Broadcast: ${messageContent.broadcast}`);
          console.log(`   Timestamp: ${messageContent.timestamp}`);
          
          // Simulate processing time
          await this.processMessage(messageContent);
          
          // Acknowledge the message
          channel.ack(msg);
          console.log(`✅ [Fanout Consumer 1] Broadcast #${this.messageCount} processed and acknowledged`);
          
        } catch (error) {
          console.error(`❌ [Fanout Consumer 1] Error processing message:`, error.message);
          
          // Reject message and requeue it
          channel.nack(msg, false, true);
          console.log(`🔄 [Fanout Consumer 1] Message rejected and requeued`);
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
        console.log(`⚙️  [Fanout Consumer 1] Processed broadcast '${messageContent.id}' in ${processingTime}ms`);
        resolve();
      }, processingTime);
    });
  }

  async stop() {
    console.log('🛑 Stopping Fanout Consumer 1...');
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
      exchangeType: 'fanout',
      messagesProcessed: this.messageCount,
      isConsuming: this.isConsuming
    };
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📡 Received SIGINT, shutting down Fanout Consumer 1 gracefully...');
  if (consumer) {
    await consumer.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📡 Received SIGTERM, shutting down Fanout Consumer 1 gracefully...');
  if (consumer) {
    await consumer.stop();
  }
  process.exit(0);
});

// Start consumer if this file is run directly
const consumer = new FanoutConsumer1();

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📡 Starting Fanout Consumer 1...');
  consumer.startConsuming().catch(console.error);
}

export default FanoutConsumer1;
