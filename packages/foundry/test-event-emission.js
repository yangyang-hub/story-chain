#!/usr/bin/env node

import { ethers } from 'ethers';

// Contract ABI - just the parts we need
const contractABI = [
  {
    "type": "function",
    "name": "createStory",
    "inputs": [
      {"name": "ipfsHash", "type": "string"},
      {"name": "forkFee", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "event",
    "name": "StoryCreated",
    "inputs": [
      {"name": "storyId", "type": "uint256", "indexed": true},
      {"name": "author", "type": "address", "indexed": true},
      {"name": "ipfsHash", "type": "string", "indexed": false}
    ],
    "anonymous": false
  }
];

const contractAddress = '0xa15bb66138824a1c7167f5e85b957d04dd34e468';
const rpcUrl = 'http://127.0.0.1:8545'; // Local anvil node

async function testEventEmission() {
  try {
    // Connect to the provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get the first account from anvil (assuming it's running)
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts available. Make sure anvil is running.');
    }
    
    const signer = accounts[0];
    console.log('Using account:', await signer.getAddress());
    
    // Connect to the contract
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    console.log('Contract connected at:', contractAddress);
    
    // Set up event listener
    console.log('Setting up event listener...');
    contract.on('StoryCreated', (storyId, author, ipfsHash, event) => {
      console.log('🎉 StoryCreated event received!');
      console.log('  - Story ID:', storyId.toString());
      console.log('  - Author:', author);
      console.log('  - IPFS Hash:', ipfsHash);
      console.log('  - Block Number:', event.log.blockNumber);
      console.log('  - Transaction Hash:', event.log.transactionHash);
      
      // Exit after receiving the event
      process.exit(0);
    });
    
    // Call createStory
    console.log('Calling createStory...');
    const tx = await contract.createStory(
      'QmTestStoryHash123',  // ipfsHash
      ethers.parseEther('0.001')  // forkFee (0.001 ETH)
    );
    
    console.log('Transaction sent:', tx.hash);
    console.log('Waiting for transaction to be mined...');
    
    const receipt = await tx.wait();
    console.log('Transaction mined in block:', receipt.blockNumber);
    
    // Check if events were emitted in the receipt
    const storyCreatedEvents = receipt.logs.filter(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === 'StoryCreated';
      } catch {
        return false;
      }
    });
    
    if (storyCreatedEvents.length > 0) {
      console.log('✅ Found StoryCreated events in transaction receipt:');
      storyCreatedEvents.forEach((log, index) => {
        const parsed = contract.interface.parseLog(log);
        console.log(`  Event ${index + 1}:`);
        console.log(`    - Story ID: ${parsed.args.storyId}`);
        console.log(`    - Author: ${parsed.args.author}`);
        console.log(`    - IPFS Hash: ${parsed.args.ipfsHash}`);
      });
    } else {
      console.log('❌ No StoryCreated events found in transaction receipt');
    }
    
    // Wait a bit for the event listener
    console.log('Waiting for event listener (5 seconds)...');
    setTimeout(() => {
      console.log('❌ Event listener timeout - no events received');
      process.exit(1);
    }, 5000);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the test
testEventEmission();