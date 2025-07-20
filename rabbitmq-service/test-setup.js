import RabbitMQConnection from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing RabbitMQ Setup...');

async function testSetup() {
  try {
    console.log('🔗 Connecting to RabbitMQ...');
    const rabbitmq = new RabbitMQConnection();
    const channel = await rabbitmq.connect();
    
    console.log('✅ Connected successfully!');
    
    // Create a test exchange
    console.log('📤 Creating test exchange...');
    await channel.assertExchange('test.exchange', 'direct', {
      durable: true,
      autoDelete: false
    });
    console.log('✅ Test exchange created');
    
    // Create a test queue
    console.log('📥 Creating test queue...');
    await channel.assertQueue('test.queue', {
      durable: true,
      autoDelete: false,
      exclusive: false
    });
    console.log('✅ Test queue created');
    
    // Bind queue to exchange
    console.log('🔗 Creating binding...');
    await channel.bindQueue('test.queue', 'test.exchange', 'test.key');
    console.log('✅ Binding created');
    
    // Clean up test resources
    console.log('🧹 Cleaning up test resources...');
    await channel.deleteQueue('test.queue');
    await channel.deleteExchange('test.exchange');
    console.log('✅ Cleanup completed');
    
    await rabbitmq.disconnect();
    console.log('✅ All tests passed! RabbitMQ setup is working correctly.');
    
  } catch (error) {
    console.error('❌ Setup test failed:', error.message);
  }
}

testSetup();
