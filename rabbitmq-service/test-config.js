// Simple test to check if the setup works
console.log('🧪 Testing RabbitMQ Service Setup...');

import dotenv from 'dotenv';
dotenv.config();

console.log('✅ dotenv imported successfully');

console.log('📋 Environment Configuration:');
console.log(`   RabbitMQ Host: ${process.env.RABBITMQ_HOST || 'localhost'}`);
console.log(`   RabbitMQ Port: ${process.env.RABBITMQ_PORT || '5672'}`);
console.log(`   Message Interval: ${process.env.MESSAGE_INTERVAL || '2000'}ms`);

console.log('\n📤 Exchange Names:');
console.log(`   Direct: ${process.env.DIRECT_EXCHANGE || 'direct.exchange'}`);
console.log(`   Fanout: ${process.env.FANOUT_EXCHANGE || 'fanout.exchange'}`);
console.log(`   Topic: ${process.env.TOPIC_EXCHANGE || 'topic.exchange'}`);

console.log('\n📥 Queue Names:');
console.log(`   Direct Queues: ${process.env.DIRECT_QUEUE_1 || 'direct.queue.1'}, ${process.env.DIRECT_QUEUE_2 || 'direct.queue.2'}`);
console.log(`   Fanout Queues: ${process.env.FANOUT_QUEUE_1 || 'fanout.queue.1'}, ${process.env.FANOUT_QUEUE_2 || 'fanout.queue.2'}`);
console.log(`   Topic Queues: ${process.env.TOPIC_QUEUE_1 || 'topic.queue.1'}, ${process.env.TOPIC_QUEUE_2 || 'topic.queue.2'}`);

console.log('\n🔑 Routing Keys:');
console.log(`   Direct Keys: ${process.env.DIRECT_ROUTING_KEY_1 || 'direct.key.1'}, ${process.env.DIRECT_ROUTING_KEY_2 || 'direct.key.2'}`);
console.log(`   Topic Patterns: ${process.env.TOPIC_ROUTING_KEY_ERROR || 'app.error.critical'}, ${process.env.TOPIC_ROUTING_KEY_INFO || 'app.info.general'}, ${process.env.TOPIC_ROUTING_KEY_DEBUG || 'app.debug.verbose'}`);

console.log('\n🎯 Service Architecture:');
console.log('   📤 3 Producers (1 per exchange type)');
console.log('   📥 6 Consumers (2 per exchange type)');
console.log('   🔄 Automatic message publishing every 2 seconds');
console.log('   ⚙️  Manual acknowledgment with error handling');

console.log('\n✅ Configuration test completed successfully!');
console.log('\n📋 Next Steps:');
console.log('   1. Ensure RabbitMQ server is running on localhost:5672');
console.log('   2. Run: npm run setup (to create exchanges and queues)');
console.log('   3. Run: npm start (to start all producers and consumers)');
console.log('   4. Or run: npm run dev (for development mode)');

// Test if amqplib can be imported
try {
  console.log('\n🧪 Testing amqplib import...');
  const amqp = await import('amqplib');
  console.log('✅ amqplib imported successfully');
  
  // Try to connect to RabbitMQ (non-blocking test)
  console.log('\n🔗 Testing RabbitMQ connection...');
  try {
    const connection = await amqp.connect('amqp://guest:guest@localhost:5672/');
    console.log('✅ RabbitMQ connection successful!');
    await connection.close();
    console.log('✅ Connection closed successfully');
  } catch (error) {
    console.log('⚠️  RabbitMQ connection failed:', error.message);
    console.log('   Make sure RabbitMQ server is running on localhost:5672');
    console.log('   You can start it with: rabbitmq-server');
  }
} catch (error) {
  console.log('❌ amqplib import failed:', error.message);
}
