#!/usr/bin/env tsx
// Marketing Agent - Integration Test Script
// Run with: npx tsx test-agent.ts

// Load environment variables FIRST, before any imports
import * as fs from 'fs';
import * as path from 'path';

// The .env.local is in the parent directory of marketing-agent
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  console.log('✅ Loaded environment variables from .env.local');
} else {
  console.log('⚠️ Warning: .env.local not found at', envPath);
}

// Now import the modules
import { runAgent } from './src/lib/agents/orchestrator';
import { parseIntent, searchTargets, generateBulkEmails } from './src/lib/agents/openaiClient';
import { saveCampaignFeedback, saveMessageFeedback, getCampaignFeedbackStats } from './src/lib/feedback';

async function runTests() {
  console.log('🧪 Marketing Agent - Integration Tests\n');
  console.log('='.repeat(60));
  
  // Test 1: Intent Parsing
  console.log('\n📝 Test 1: Intent Parsing');
  console.log('-'.repeat(40));
  
  const testInputs = [
    'Reach out to 5 restaurant owners in NYC about partnerships',
    'Find 10 startup founders in SF for hiring',
    'Contact 3 real estate agents in Miami about referrals',
    'Send messages to creators in LA about brand deals',
  ];
  
  for (const input of testInputs) {
    console.log(`\nInput: "${input}"`);
    const result = await parseIntent(input);
    console.log(`  ✓ Target: ${result.targetType}`);
    console.log(`  ✓ Location: ${result.location || 'None'}`);
    console.log(`  ✓ Purpose: ${result.purpose}`);
    console.log(`  ✓ Count: ${result.count}`);
    console.log(`  ✓ Channel: ${result.channel}`);
    console.log(`  ✓ Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  }
  
  // Test 2: Target Discovery (if API key available)
  console.log('\n\n🔍 Test 2: Target Discovery');
  console.log('-'.repeat(40));
  console.log('(Note: Uses OpenAI knowledge base - may return real or empty results)');
  
  try {
    const targets = await searchTargets({
      targetType: 'restaurant_owner',
      location: 'New York',
      purpose: 'partnership',
      count: 3,
    });
    
    console.log(`\nFound ${targets.length} targets:`);
    for (const target of targets) {
      console.log(`\n  ${target.name}`);
      console.log(`    Title: ${target.title || 'N/A'}`);
      console.log(`    Company: ${target.company || 'N/A'}`);
      console.log(`    Email: ${target.email || 'N/A'}`);
      console.log(`    Relevance: ${(target.relevanceScore * 100).toFixed(0)}%`);
    }
  } catch (error) {
    console.log(`\n❌ Target discovery failed: ${error}`);
  }
  
  // Test 3: Message Generation
  console.log('\n\n✉️ Test 3: Message Generation');
  console.log('-'.repeat(40));
  
  try {
    const testTargets = await searchTargets({
      targetType: 'restaurant_owner',
      location: 'New York',
      purpose: 'partnership',
      count: 2,
    });
    
    if (testTargets.length > 0) {
      const messages = await generateBulkEmails({
        targets: testTargets,
        purpose: 'partnership',
        channel: 'email',
      });
      
      console.log(`\nGenerated ${messages.length} messages:`);
      for (const msg of messages) {
        console.log(`\n  Subject: ${msg.subject}`);
        console.log(`  Quality: ${(msg.qualityScore * 100).toFixed(0)}%`);
        console.log(`  Personalization: ${msg.personalization.join(', ')}`);
        console.log(`  Body preview: ${msg.body.substring(0, 100)}...`);
      }
    } else {
      console.log('\n⚠️ No targets found for message generation test');
    }
  } catch (error) {
    console.log(`\n❌ Message generation failed: ${error}`);
  }
  
  // Test 4: Full Campaign Flow
  console.log('\n\n🚀 Test 4: Full Campaign Flow');
  console.log('-'.repeat(40));
  
  const campaignInput = 'Reach out to 3 restaurants in NYC about partnerships';
  console.log(`\nInput: "${campaignInput}"`);
  
  try {
    const result = await runAgent({
      input: campaignInput,
      onProgress: (progress) => {
        console.log(`  ${progress.message}`);
      },
    });
    
    if (result.success) {
      console.log(`\n✅ Campaign created successfully!`);
      console.log(`  Campaign ID: ${result.campaign?.id}`);
      console.log(`  Targets: ${result.campaign?.targets.length}`);
      console.log(`  Messages: ${result.campaign?.messages.length}`);
      console.log(`  Avg Quality: ${result.progress.data?.avgQuality}%`);
    } else {
      console.log(`\n❌ Campaign creation failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`\n❌ Campaign flow error: ${error}`);
  }
  
  // Test 5: Feedback Collection
  console.log('\n\n⭐ Test 5: Feedback Collection');
  console.log('-'.repeat(40));
  
  // Test campaign feedback
  await saveCampaignFeedback({
    campaignId: 'test_campaign_001',
    rating: 4,
    comment: 'Good targets, could use more variety',
    targetsFound: 5,
    messagesUseful: 4,
    wouldRecommend: true,
  });
  
  // Test message feedback
  await saveMessageFeedback({
    messageId: 'msg_001',
    campaignId: 'test_campaign_001',
    targetId: 'target_001',
    rating: 5,
    feedback: 'positive',
  });
  
  console.log('\n✅ Feedback collected successfully!');
  
  // Get feedback stats
  const stats = await getCampaignFeedbackStats('test_campaign_001');
  console.log('\n📊 Campaign Feedback Stats:');
  console.log(`  Total Feedback: ${stats.totalFeedback}`);
  console.log(`  Avg Rating: ${stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'}`);
  console.log(`  Positive Responses: ${stats.positiveResponses}`);
  console.log(`  Target Accuracy: ${(stats.targetAccuracy * 100).toFixed(0)}%`);
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Tests Complete!');
  console.log('\nNext steps:');
  console.log('1. Add your API keys to .env.local');
  console.log('2. Run: npm run dev');
  console.log('3. Test via WhatsApp or web interface');
}

runTests().catch(console.error);
