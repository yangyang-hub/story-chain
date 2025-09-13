// Test script to verify environment variable control for foundry network
const { execSync } = require('child_process');

// Test 1: Default behavior (should include foundry)
console.log('🧪 Testing default configuration (foundry enabled)...');
try {
  const output = execSync('node -e "console.log(JSON.stringify(require(\'./packages/nextjs/scaffold.config.ts\').default.targetNetworks.map(n => ({name: n.name, id: n.id}))))"', {
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log('✅ Default config networks:', JSON.parse(output));
} catch (error) {
  console.log('❌ Default config test failed:', error.message);
}

// Test 2: Foundry disabled
console.log('\n🧪 Testing with foundry disabled...');
try {
  const output = execSync('NEXT_PUBLIC_ENABLE_FOUNDRY=false node -e "console.log(JSON.stringify(require(\'./packages/nextjs/scaffold.config.ts\').default.targetNetworks.map(n => ({name: n.name, id: n.id}))))"', {
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log('✅ Foundry disabled config networks:', JSON.parse(output));
} catch (error) {
  console.log('❌ Foundry disabled config test failed:', error.message);
}

console.log('\n📝 Instructions for Vercel deployment:');
console.log('   Set environment variable: NEXT_PUBLIC_ENABLE_FOUNDRY=false');
console.log('   This will disable the foundry local network in production.');