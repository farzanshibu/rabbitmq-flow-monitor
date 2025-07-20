import RabbitMQService from './index.js';

async function runTests() {
  console.log('🧪 Starting RabbitMQ Service Tests...');
  
  const service = new RabbitMQService();
  
  try {
    // Initialize the service
    console.log('\n1️⃣  Initializing service...');
    await service.initialize();
    
    // Start consumers
    console.log('\n2️⃣  Starting consumers...');
    await service.startAllConsumers();
    
    // Wait for consumers to be ready
    console.log('\n⏳ Waiting for consumers to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test single messages
    console.log('\n3️⃣  Testing single messages...');
    await service.testSingleMessages();
    
    // Wait for messages to be processed
    console.log('\n⏳ Waiting for message processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Show stats
    console.log('\n4️⃣  Service Statistics:');
    const stats = service.getStats();
    console.log(JSON.stringify(stats, null, 2));
    
    // Start producers for continuous testing
    console.log('\n5️⃣  Starting continuous message flow...');
    await service.startAllProducers();
    
    console.log('\n✅ All tests completed! Service is running...');
    console.log('📊 Monitor the console for real-time message flow');
    console.log('🛑 Press Ctrl+C to stop the service');
    
    // Keep the process running
    setInterval(() => {
      const currentStats = service.getStats();
      console.log(`\n📈 [${new Date().toLocaleTimeString()}] Quick Stats:`);
      
      Object.entries(currentStats.producers).forEach(([type, stats]) => {
        console.log(`   📤 ${type.toUpperCase()}: ${stats.messageCount} messages sent`);
      });
      
      Object.entries(currentStats.consumers).forEach(([name, stats]) => {
        console.log(`   📥 ${name.toUpperCase()}: ${stats.messagesProcessed} messages processed`);
      });
    }, 30000); // Show stats every 30 seconds
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await service.stopAll();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📡 Test interrupted, cleaning up...');
  process.exit(0);
});

// Run tests
runTests().catch(console.error);
