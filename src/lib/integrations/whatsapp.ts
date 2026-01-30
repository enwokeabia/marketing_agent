// Marketing Agent - WhatsApp Integration via Twilio

import twilio from 'twilio';

// ============================================
// Initialize Twilio Client
// ============================================

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize client (lazy loading to avoid errors during build)
let twilioClient: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local');
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

// ============================================
// Send WhatsApp Message
// ============================================

export interface SendWhatsAppParams {
  to: string;  // Format: "whatsapp:+1234567890" or just "+1234567890"
  body: string;
  mediaUrl?: string[];  // For images, etc.
}

export async function sendWhatsAppMessage(params: SendWhatsAppParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Validate configuration
    if (!phoneNumber) {
      console.log('📱 WhatsApp message (mock):', params.body);
      return { 
        success: true, 
        messageId: `mock_${Date.now()}` 
      };
    }
    
    // Ensure 'to' has whatsapp: prefix
    const to = params.to.startsWith('whatsapp:') 
      ? params.to 
      : `whatsapp:${params.to}`;
    
    const from = `whatsapp:${phoneNumber}`;
    
    const client = getClient();
    
    const message = await client.messages.create({
      body: params.body,
      from,
      to,
      mediaUrl: params.mediaUrl,
    });
    
    console.log(`✅ WhatsApp message sent: ${message.sid}`);
    
    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error('❌ Failed to send WhatsApp message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// Send Bulk WhatsApp Messages
// ============================================

export async function sendBulkWhatsAppMessages(
  messages: Array<{
    to: string;
    body: string;
  }>,
  options?: {
    delayMs?: number;
    onProgress?: (sent: number, total: number) => void;
  }
): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    try {
      const result = await sendWhatsAppMessage(message);
      
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`Failed to send to ${message.to}: ${result.error}`);
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Error sending to ${message.to}: ${error}`);
    }
    
    // Progress callback
    if (options?.onProgress) {
      options.onProgress(results.sent + results.failed, messages.length);
    }
    
    // Delay between messages to avoid rate limiting
    if (i < messages.length - 1 && options?.delayMs) {
      await new Promise(resolve => setTimeout(resolve, options.delayMs));
    }
  }
  
  return results;
}

// ============================================
// Send Campaign Notification
// ============================================

export async function sendCampaignNotification(params: {
  userPhone: string;
  campaignId: string;
  status: 'started' | 'sent' | 'opened' | 'replied' | 'completed';
  stats?: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
  };
}): Promise<boolean> {
  const messages = {
    started: `🚀 Campaign Started!\n\nYour outreach campaign #${params.campaignId.slice(-6)} is now active. I'll keep you updated on progress.`,
    
    sent: `✅ All Messages Sent!\n\n📊 Campaign #${params.campaignId.slice(-6)} Complete:\n• Total: ${params.stats?.total || 0}\n• Sent: ${params.stats?.sent || 0}\n• Delivered: ${params.stats?.delivered || 0}\n\nTracking responses now...`,
    
    opened: `👀 Updates for Campaign #${params.campaignId.slice(-6)}:\n\n📬 Delivered: ${params.stats?.delivered || 0}\n👀 Opened: ${params.stats?.opened || 0}\n✉️  Replied: ${params.stats?.replied || 0}\n\nOpen rate: ${Math.round(((params.stats?.opened || 0) / (params.stats?.sent || 1)) * 100)}%`,
    
    replied: `🎉 Great News!\n\nCampaign #${params.campaignId.slice(-6)} has received ${params.stats?.replied || 0} replies! Check your email for details.`,
    
    completed: `🏁 Campaign Completed!\n\nFinal results for #${params.campaignId.slice(-6)}:\n• Sent: ${params.stats?.sent || 0}\n• Opened: ${params.stats?.opened || 0}\n• Replied: ${params.stats?.replied || 0}\n\nReply "Help" for commands or "New campaign" to start another.`,
  };
  
  const result = await sendWhatsAppMessage({
    to: params.userPhone,
    body: messages[params.status],
  });
  
  return result.success;
}

// ============================================
// Format Message for WhatsApp
// ============================================

export function formatForWhatsApp(text: string): string {
  // WhatsApp supports limited markdown
  // Bold: *text*
  // Italic: _text_
  // Strikethrough: ~text~
  // Code: ```
  
  let formatted = text;
  
  // Convert markdown to WhatsApp format
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '*$1*');  // Bold
  formatted = formatted.replace(/_(.*?)_/g, '_$1_');          // Italic
  formatted = formatted.replace(/~~(.*?)~~/g, '~$1~');        // Strikethrough
  formatted = formatted.replace(/```([\s\S]*?)```/g, '```\n$1\n```');  // Code blocks
  
  return formatted;
}

// ============================================
// Parse Incoming Message
// ============================================

export interface ParsedIncomingMessage {
  from: string;
  body: string;
  messageSid: string;
  timestamp: Date;
}

export function parseIncomingMessage(formData: FormData): ParsedIncomingMessage {
  return {
    from: formData.get('From') as string,
    body: formData.get('Body') as string,
    messageSid: formData.get('MessageSid') as string,
    timestamp: new Date(formData.get('Timestamp') as string || Date.now()),
  };
}

// ============================================
// Webhook Verification (for initial setup)
// ============================================

export function verifyTwilioWebhook(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!accountSid || !authToken) {
    return false;  // Can't verify without credentials
  }
  
  return twilio.validateRequest(
    authToken,
    signature,
    url,
    params
  );
}
