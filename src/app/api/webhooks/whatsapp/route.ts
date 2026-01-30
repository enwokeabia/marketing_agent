// Marketing Agent - Twilio WhatsApp Webhook Handler

import { NextRequest, NextResponse } from 'next/server';
import { parseIntent, validateIntent } from '@/lib/agents/intentParser';
import { runAgent } from '@/lib/agents/orchestrator';
import { processConversationReply } from '@/lib/agents/conversationManager';
import { sendWhatsAppMessage } from '@/lib/integrations/whatsapp';

// ============================================
// POST - Handle incoming WhatsApp messages
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData();
    
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const profileName = formData.get('ProfileName') as string || 'there';
    
    // Clean up the phone number (remove 'whatsapp:' prefix if present)
    const cleanFrom = from.replace('whatsapp:', '').replace('sms:', '');
    
    console.log(`📱 Received message from ${cleanFrom}: "${body}"`);
    
    // Check if user has an active conversation
    const context = await processConversationReply({
      userId: cleanFrom,
      message: body,
      profileName,
    });
    
    // Generate response
    let responseText = '';
    
    if (context.action === 'new_campaign') {
      // New campaign request
      responseText = await handleNewCampaign(body, cleanFrom, profileName);
    } else if (context.action === 'approval') {
      // User is approving/reviewing a campaign
      responseText = await handleApproval(context, body);
    } else if (context.action === 'status_check') {
      // User wants status update
      responseText = await handleStatusCheck(context);
    } else if (context.action === 'help') {
      responseText = getHelpText();
    } else if (context.action === 'error') {
      responseText = `❌ ${context.error}`;
    }
    
    // Send response back to WhatsApp
    await sendWhatsAppMessage({
      to: from,
      body: responseText,
    });
    
    // Return TwiML response
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(responseText)}</Message>
</Response>`,
      {
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, something went wrong. Please try again.</Message>
</Response>`,
      {
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  }
}

// ============================================
// Message Handlers
// ============================================

async function handleNewCampaign(
  userMessage: string,
  userId: string,
  profileName: string
): Promise<string> {
  // Parse the user's intent
  const parsedIntent = parseIntent(userMessage);
  const validation = validateIntent(parsedIntent);
  
  if (!validation.valid) {
    return `🤔 I didn't quite understand that. ${validation.errors[0]}\n\nTry something like: "Reach out to 10 hotels in NYC about partnerships"`;
  }
  
  try {
    // Run the agent to create the campaign
    const result = await runAgent({
      input: userMessage,
      userId,
      onProgress: (progress) => {
        console.log(`Progress for ${userId}:`, progress.status);
      },
    });
    
    if (result.success) {
      const intent = parsedIntent;
      const targetCount = result.campaign?.targets?.length || intent.count;
      const messageCount = result.campaign?.messages?.length || intent.count;
      
      return `✅ Got it, ${profileName}! 🎯

📋 Campaign Details:
• Target: ${formatTargetType(intent.targetType)} 
• Location: ${intent.location || 'Not specified'}
• Purpose: ${intent.purposeDescription}
• Targets found: ${targetCount}
• Messages generated: ${messageCount}

Quality Score: ${Math.round(result.campaign?.messages?.reduce((sum, m) => sum + m.qualityScore, 0) / (messageCount || 1) * 100) || 85}%

━━━━━━━━━━━━━━━━━━━━━━
What would you like to do?

1️⃣ "Send now" - Send all messages immediately
2️⃣ "Review" - I'll show you the drafts first
3️⃣ "Change [location/number]" - Adjust the targeting
4️⃣ "Help" - See all commands`;
    } else {
      return `❌ I had trouble creating that campaign: ${result.error}\n\nTry rephrasing your request?`;
    }
  } catch (error) {
    console.error('Campaign creation error:', error);
    return `❌ Something went wrong while creating the campaign. Please try again.`;
  }
}

async function handleApproval(
  context: Awaited<ReturnType<typeof processConversationReply>>,
  userMessage: string
): Promise<string> {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('send') || lowerMessage.includes('go') || lowerMessage.includes('yes')) {
    // User wants to send
    return `🚀 Starting to send messages now...\n\nI'll notify you when they're all sent and track responses!`;
  }
  
  if (lowerMessage.includes('review') || lowerMessage.includes('see') || lowerMessage.includes('show')) {
    // User wants to review drafts
    return `📝 Here are the drafts:\n\n${generateDraftSummary(context)}\n\nReply with "Edit [number]" to modify a draft, or "Send now" to proceed.`;
  }
  
  if (lowerMessage.includes('change') || lowerMessage.includes('adjust')) {
    return `🔄 What would you like to change?\n\n• "Change location to [city]" \n• "Change number to [number]"\n• "Different purpose"`;
  }
  
  // Default response
  return `I see you're working on a campaign. Reply with:\n• "Send now" to proceed\n• "Review" to see drafts\n• "Change..." to adjust settings`;
}

async function handleStatusCheck(
  context: Awaited<ReturnType<typeof processConversationReply>>
): Promise<string> {
  // Mock status for demo
  return `📊 Campaign Status:

✅ Messages sent: 10
📬 Delivered: 8
👀 Opened: 3
✉️  Replied: 1

🕐 Next follow-up scheduled for: Tomorrow

Reply "Help" for all commands.`;
}

// ============================================
// Utility Functions
// ============================================

function formatTargetType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateDraftSummary(context: any): string {
  // Generate a summary of draft messages
  return `Draft 1: Partnership outreach to Urban Bites
Draft 2: Partnership outreach to Sakura Japanese Kitchen  
Draft 3: Partnership outreach to Flavor Collective`;
}

function getHelpText(): string {
  return `🤖 Marketing Agent - Available Commands:

📝 CREATE CAMPAIGNS
"Reach out to [number] [type] in [location] about [purpose]"
Example: "Reach out to 10 hotels in NYC about partnerships"

📊 CHECK STATUS
"Status" or "How's it going?"

🔄 ADJUST CAMPAIGNS
"Change location to Miami"
"Increase to 20 targets"

✅ APPROVE/ACT
"Send now" - Send all pending messages
"Review" - Show draft messages

❓ GET HELP
"Help" - Show this message

What would you like to do?`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
