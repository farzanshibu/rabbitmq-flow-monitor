import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.config = {
      host: process.env.RABBITMQ_HOST || 'localhost',
      port: process.env.RABBITMQ_PORT || 5672,
      username: process.env.RABBITMQ_USERNAME || 'guest',
      password: process.env.RABBITMQ_PASSWORD || 'guest',
      vhost: process.env.RABBITMQ_VHOST || '/'
    };
  }

  async connect() {
    try {
      const connectionString = `amqp://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}${this.config.vhost}`;
      console.log(`🔗 Connecting to RabbitMQ at ${this.config.host}:${this.config.port}...`);
      
      this.connection = await amqp.connect(connectionString);
      this.channel = await this.connection.createChannel();
      
      console.log('✅ Successfully connected to RabbitMQ');
      
      // Set up connection error handlers
      this.connection.on('error', (err) => {
        console.error('❌ RabbitMQ connection error:', err.message);
      });
      
      this.connection.on('close', () => {
        console.log('🔌 RabbitMQ connection closed');
      });
      
      return this.channel;
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log('🔌 Disconnected from RabbitMQ');
    } catch (error) {
      console.error('❌ Error disconnecting from RabbitMQ:', error.message);
    }
  }

  getChannel() {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available. Call connect() first.');
    }
    return this.channel;
  }

  isConnected() {
    return this.connection && this.channel && !this.connection.connection.destroyed;
  }
}

export default RabbitMQConnection;
