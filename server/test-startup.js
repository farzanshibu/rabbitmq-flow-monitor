#!/usr/bin/env node

// Simple test to verify the server can start without mock data
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing server startup without mock data dependencies...');

try {
  // Check if all required files exist
  const fs = await import('fs');
  
  const requiredFiles = [
    'package.json',
    'index.js',
    'rabbitmqService.js'
  ];
  
  console.log('\n📁 Checking required files:');
  for (const file of requiredFiles) {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) {
      throw new Error(`Required file missing: ${file}`);
    }
  }
  
  console.log('\n🔍 Checking for mock data imports in index.js...');
  const indexContent = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  
  const mockImports = [
    '../src/data/mockTopology.js',
    'mockTopology',
    'generateMockMetrics',
    'generateMockMessageFlow'
  ];
  
  const foundMockRefs = mockImports.filter(ref => indexContent.includes(ref));
  
  if (foundMockRefs.length > 0) {
    console.log('❌ Found mock data references:');
    foundMockRefs.forEach(ref => console.log(`  - ${ref}`));
    throw new Error('Mock data references still present in index.js');
  } else {
    console.log('✅ No mock data references found');
  }
  
  console.log('\n🚀 Server should start without mock data errors');
  console.log('   Run: npm start');
  console.log('   Or:  node index.js');
  
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
}
