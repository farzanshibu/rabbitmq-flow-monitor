# RabbitMQ Service

A comprehensive RabbitMQ service implementation demonstrating all three exchange types (Direct, Fanout, Topic) with automated producers and consumers.

## 📁 Project Structure

```
rabbitmq-service/
├── package.json              # Dependencies and scripts
├── .env                      # Configuration
├── connection.js             # RabbitMQ connection manager
├── setup.js                  # Infrastructure setup utility
├── index.js                  # Main service controller
├── test-all.js               # Comprehensive test suite
└── exchanges/
    ├── direct/
    │   ├── directProducer.js     # Direct exchange producer
    │   ├── directConsumer1.js    # Consumer for routing key 1
    │   └── directConsumer2.js    # Consumer for routing key 2
    ├── fanout/
    │   ├── fanoutProducer.js     # Fanout exchange producer
    │   ├── fanoutConsumer1.js    # Fanout consumer 1
    │   └── fanoutConsumer2.js    # Fanout consumer 2
    └── topic/
        ├── topicProducer.js      # Topic exchange producer
        ├── topicConsumer1.js     # Error/Warning handler
        └── topicConsumer2.js     # Info/Debug handler
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Edit `.env` file for your RabbitMQ setup:
```env
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
MESSAGE_INTERVAL=2000
```

### 3. Setup Infrastructure
```bash
npm run setup
```

### 4. Start All Services
```bash
npm start
```

Or run individual components:
```bash
# Start all producers
npm run start:all-producers

# Start all consumers  
npm run start:consumers

# Development mode (both producers and consumers)
npm run dev
```

## 📊 Exchange Types

### 🎯 Direct Exchange
- **Exchange**: `direct.exchange`
- **Queues**: `direct.queue.1`, `direct.queue.2`
- **Routing**: Exact routing key matching
- **Producer**: Alternates between routing keys
- **Consumers**: Each consumer bound to specific routing key

### 📡 Fanout Exchange
- **Exchange**: `fanout.exchange`
- **Queues**: `fanout.queue.1`, `fanout.queue.2`
- **Routing**: Broadcasts to all bound queues
- **Producer**: Sends identical messages to all consumers
- **Consumers**: Both receive every message

### 🏷️ Topic Exchange
- **Exchange**: `topic.exchange`
- **Queues**: `topic.queue.1`, `topic.queue.2`
- **Routing**: Pattern-based routing with wildcards
- **Producer**: Sends messages with various routing patterns
- **Consumer 1**: Handles `app.error.*` and `app.warning.*`
- **Consumer 2**: Handles `app.info.*` and `app.debug.*`

## 🛠️ Available Scripts

```bash
# Setup infrastructure
npm run setup

# Start all services
npm start

# Start individual components
npm run start:direct
npm run start:fanout
npm run start:topic
npm run start:all-producers
npm run start:consumers

# Development (watch mode)
npm run dev

# Run tests
npm test
```

## 📋 Management Commands

### Setup Infrastructure
```bash
node setup.js setup     # Create exchanges, queues, bindings
node setup.js cleanup   # Delete all infrastructure
node setup.js config    # Show configuration
```

### Service Control
```bash
node index.js start     # Start complete service
node index.js test      # Run single message tests
node index.js stats     # Show service statistics
```

## 🔧 Configuration Options

### Environment Variables
- `RABBITMQ_HOST`: RabbitMQ server host (default: localhost)
- `RABBITMQ_PORT`: RabbitMQ server port (default: 5672)
- `RABBITMQ_USERNAME`: Username (default: guest)
- `RABBITMQ_PASSWORD`: Password (default: guest)
- `MESSAGE_INTERVAL`: Producer message interval in ms (default: 2000)

### Exchange Names
- `DIRECT_EXCHANGE`: Direct exchange name
- `FANOUT_EXCHANGE`: Fanout exchange name
- `TOPIC_EXCHANGE`: Topic exchange name

### Queue Names
- `DIRECT_QUEUE_1`, `DIRECT_QUEUE_2`: Direct queues
- `FANOUT_QUEUE_1`, `FANOUT_QUEUE_2`: Fanout queues
- `TOPIC_QUEUE_1`, `TOPIC_QUEUE_2`: Topic queues

## 📈 Message Flow

### Direct Exchange Flow
```
Producer → direct.exchange → [routing key] → specific queue → consumer
```

### Fanout Exchange Flow
```
Producer → fanout.exchange → ALL queues → ALL consumers
```

### Topic Exchange Flow
```
Producer → topic.exchange → [pattern matching] → matching queues → consumers
```

## 🔄 Features

### Producers
- ✅ Automatic message generation every 2 seconds
- ✅ Unique message IDs and timestamps
- ✅ Configurable routing keys and patterns
- ✅ Graceful shutdown handling
- ✅ Single message testing capability

### Consumers
- ✅ Manual message acknowledgment
- ✅ Error handling with message requeuing
- ✅ Simulated processing time (500ms-2s)
- ✅ Fair message dispatching (prefetch=1)
- ✅ Statistics tracking
- ✅ Graceful shutdown handling

### Infrastructure
- ✅ Durable exchanges and queues
- ✅ Persistent messages
- ✅ Automatic binding setup
- ✅ Connection recovery
- ✅ Setup and cleanup utilities

## 📊 Monitoring

### Real-time Statistics
Each consumer tracks:
- Messages processed count
- Processing status
- Queue name and routing information
- Performance metrics

### Logging
Comprehensive logging includes:
- Message publishing confirmations
- Message consumption details
- Processing times
- Error handling
- Connection status

## 🧪 Testing

### Run Complete Test Suite
```bash
npm test
```

### Manual Testing
```bash
# Test single messages
node index.js test

# Check service stats
node index.js stats

# Test individual components
node exchanges/direct/directProducer.js
node exchanges/direct/directConsumer1.js
```

## 🔧 Troubleshooting

### Connection Issues
1. Ensure RabbitMQ server is running
2. Check connection settings in `.env`
3. Verify user permissions

### Message Flow Issues
1. Check exchange and queue existence
2. Verify binding configurations
3. Monitor consumer logs for errors

### Performance Issues
1. Adjust `MESSAGE_INTERVAL` in `.env`
2. Monitor queue depths
3. Check consumer processing times

## 🎯 Use Cases

This service demonstrates:
- **Direct Exchange**: Point-to-point messaging with exact routing
- **Fanout Exchange**: Broadcasting and event notification
- **Topic Exchange**: Selective routing based on patterns
- **Producer-Consumer Patterns**: Reliable message processing
- **Error Handling**: Message acknowledgment and requeuing
- **Scalability**: Multiple consumers per queue type

Perfect for learning RabbitMQ concepts and building production-ready messaging systems!
