import RabbitMQConnection from '../../connection.js';
import dotenv from 'dotenv';

dotenv.config();

class TopicConsumer1 {
  constructor() {
    this.rabbitmq = new RabbitMQConnection();
    this.exchangeName = process.env.TOPIC_EXCHANGE || 'topic.exchange';
    this.queueName = process.env.TOPIC_QUEUE_1 || 'topic.queue.1';
    this.bindingPatterns = [
      'app.error.*',    // All error messages
      'app.warning.*'   // All warning messages
    ];
    this.consumerTag = 'topic-consumer-1';
    this.messageCount = 0;
    this.isConsuming = false;
  }

  async setup() {
    try {
      const channel = await this.rabbitmq.connect();
      
      // Declare topic exchange (idempotent)
      await channel.assertExchange(this.exchangeName, 'topic', {
        durable: true,
        autoDelete: false
      });
      
      // Declare queue
      await channel.assertQueue(this.queueName, {
        durable: true,
        autoDelete: false,
        exclusive: false
      });
      
      // Bind queue to exchange with multiple patterns
      for (const pattern of this.bindingPatterns) {
        await channel.bindQueue(this.queueName, this.exchangeName, pattern);
        console.log(`🔗 Bound queue '${this.queueName}' to pattern '${pattern}'`);
      }
      
      console.log(`📥 Topic Consumer 1 setup complete:`);
      console.log(`   Exchange: ${this.exchangeName} (TOPIC)`);
      console.log(`   Queue: ${this.queueName}`);
      console.log(`   Patterns: ${this.bindingPatterns.join(', ')}`);
      console.log(`   Focus: ERROR and WARNING messages`);
      
      return channel;
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      throw error;
    }
  }

  async startConsuming() {
    if (this.isConsuming) {
      console.log('⚠️  Topic Consumer 1 is already running');
      return;
    }

    try {
      const channel = await this.setup();
      this.isConsuming = true;
      
      // Set prefetch count for fair dispatching
      await channel.prefetch(1);
      
      console.log(`🎯 Topic Consumer 1 started - Listening on queue '${this.queueName}'`);
      console.log(`🏷️  Will receive messages matching patterns: ${this.bindingPatterns.join(', ')}`);
      
      // Start consuming messages
      await channel.consume(this.queueName, async (msg) => {
        if (msg === null) {
          console.log('⚠️  Topic Consumer 1 cancelled');
          return;
        }
        
        try {
          this.messageCount++;
          const messageContent = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          
          console.log(`📨 [Topic Consumer 1] [${new Date().toLocaleTimeString()}] Received message #${this.messageCount}:`);
          console.log(`   Message ID: ${messageContent.id}`);
          console.log(`   Content: ${messageContent.content}`);
          console.log(`   Routing Key: ${routingKey}`);
          console.log(`   Level: ${messageContent.level}`);
          console.log(`   Category: ${messageContent.category}`);
          console.log(`   Matched Pattern: ${this.getMatchedPattern(routingKey)}`);
          console.log(`   Timestamp: ${messageContent.timestamp}`);
          
          // Simulate processing time
          await this.processMessage(messageContent, routingKey);
          
          // Acknowledge the message
          channel.ack(msg);
          console.log(`✅ [Topic Consumer 1] Message #${this.messageCount} processed and acknowledged`);
          
        } catch (error) {
          console.error(`❌ [Topic Consumer 1] Error processing message:`, error.message);
          
          // Reject message and requeue it
          channel.nack(msg, false, true);
          console.log(`🔄 [Topic Consumer 1] Message rejected and requeued`);
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

  getMatchedPattern(routingKey) {
    for (const pattern of this.bindingPatterns) {
      const regex = new RegExp(pattern.replace(/\*/g, '[^.]+'));
      if (regex.test(routingKey)) {
        return pattern;
      }
    }
    return 'unknown';
  }

  async processMessage(messageContent, routingKey) {
    // Simulate message processing time (500ms to 2s)
    const processingTime = Math.floor(Math.random() * 1500) + 500;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const urgency = routingKey.includes('error') ? 'HIGH' : 'MEDIUM';
        console.log(`⚙️  [Topic Consumer 1] Processed ${urgency} priority message '${messageContent.id}' in ${processingTime}ms`);
        resolve();
      }, processingTime);
    });
  }

  async stop() {
    console.log('🛑 Stopping Topic Consumer 1...');
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
      exchangeType: 'topic',
      bindingPatterns: this.bindingPatterns,
      messagesProcessed: this.messageCount,
      isConsuming: this.isConsuming
    };
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📡 Received SIGINT, shutting down Topic Consumer 1 gracefully...');
  if (consumer) {
    await consumer.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📡 Received SIGTERM, shutting down Topic Consumer 1 gracefully...');
  if (consumer) {
    await consumer.stop();
  }
  process.exit(0);
});

// Start consumer if this file is run directly
const consumer = new TopicConsumer1();

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🏷️  Starting Topic Consumer 1 (ERROR & WARNING handler)...');
  consumer.startConsuming().catch(console.error);
}

export default TopicConsumer1;
