import RabbitMQSetup from './setup.js';

console.log('🚀 Running RabbitMQ Infrastructure Setup...');

const setup = new RabbitMQSetup();

async function runSetup() {
  try {
    await setup.setupAll();
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 What was created:');
    console.log('✅ 3 Exchanges: direct.exchange, fanout.exchange, topic.exchange');
    console.log('✅ 6 Queues: 2 for each exchange type');
    console.log('✅ All necessary bindings configured');
    console.log('\n🚀 Ready to start producers and consumers!');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

runSetup();
