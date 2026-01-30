// Marketing Agent - Conversation Manager

import { OutreachIntent } from '@/types';

// ============================================
// Conversation Context Interface
// ============================================

export interface ConversationContext {
  userId: string;
  profileName: string;
  currentAction: 'new_campaign' | 'approval' | 'status_check' | 'help' | 'error' | 'idle';
  campaignId?: string;
  campaignData?: {
    targets: number;
    messages: number;
    channel: string;
    status: string;
  };
  lastIntent?: OutreachIntent;
  createdAt: Date;
  updatedAt: Date;
  step?: string;
  pendingAction?: string;
}

// In-memory storage for conversation contexts (use Redis/database in production)
const conversationContexts = new Map<string, ConversationContext>();

// ============================================
// Process Incoming Message
// ============================================

export async function processConversationReply(params: {
  userId: string;
  message: string;
  profileName: string;
}): Promise<ConversationContext & { action: string; error?: string }> {
  const { userId, message, profileName } = params;
  const lowerMessage = message.toLowerCase().trim();
  
  // Get or create context
  let context = conversationContexts.get(userId);
  
  if (!context) {
    context = createNewContext(userId, profileName);
  }
  
  // Check for help command
  if (lowerMessage === 'help' || lowerMessage === '?') {
    context.currentAction = 'help';
    context.updatedAt = new Date();
    saveContext(userId, context);
    return { ...context, action: 'help' };
  }
  
  // Check for status command
  if (lowerMessage === 'status' || lowerMessage === 'how\'s it going' || lowerMessage.includes('status check')) {
    context.currentAction = 'status_check';
    context.updatedAt = new Date();
    saveContext(userId, context);
    return { ...context, action: 'status_check' };
  }
  
  // Check for approval-related commands
  const approvalKeywords = ['send', 'go', 'yes', 'review', 'show', 'drafts', 'edit', 'change', 'adjust'];
  if (approvalKeywords.some(keyword => lowerMessage.includes(keyword)) && context.campaignId) {
    context.currentAction = 'approval';
    context.pendingAction = detectApprovalAction(lowerMessage);
    context.updatedAt = new Date();
    saveContext(userId, context);
    return { ...context, action: 'approval' };
  }
  
  // Check for new campaign indicators
  const newCampaignKeywords = [
    'reach out', 'contact', 'email', 'dm', 'message', 
    'outreach', 'connect with', 'get in touch'
  ];
  
  if (newCampaignKeywords.some(keyword => lowerMessage.includes(keyword))) {
    // Reset context for new campaign
    context = createNewContext(userId, profileName);
    context.currentAction = 'new_campaign';
    context.updatedAt = new Date();
    saveContext(userId, context);
    return { ...context, action: 'new_campaign' };
  }
  
  // Default: treat as new campaign request
  context.currentAction = 'new_campaign';
  context.updatedAt = new Date();
  saveContext(userId, context);
  return { ...context, action: 'new_campaign' };
}

// ============================================
// Create New Context
// ============================================

function createNewContext(userId: string, profileName: string): ConversationContext {
  return {
    userId,
    profileName,
    currentAction: 'idle',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================
// Detect Approval Action
// ============================================

function detectApprovalAction(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes('send') || lower.includes('go') || lower.includes('yes')) {
    return 'send';
  }
  
  if (lower.includes('review') || lower.includes('show') || lower.includes('see')) {
    return 'review';
  }
  
  if (lower.includes('edit') || lower.includes('change') || lower.includes('adjust')) {
    return 'edit';
  }
  
  return 'unknown';
}

// ============================================
// Update Campaign in Context
// ============================================

export function updateCampaignInContext(
  userId: string,
  campaignId: string,
  campaignData: {
    targets: number;
    messages: number;
    channel: string;
    status: string;
  }
): void {
  let context = conversationContexts.get(userId);
  
  if (!context) {
    context = createNewContext(userId, 'there');
  }
  
  context.campaignId = campaignId;
  context.campaignData = campaignData;
  context.currentAction = 'approval';
  context.updatedAt = new Date();
  
  saveContext(userId, context);
}

// ============================================
// Clear Context
// ============================================

export function clearContext(userId: string): void {
  conversationContexts.delete(userId);
}

// ============================================
// Save Context (In-memory for demo, use Redis in production)
// ============================================

function saveContext(userId: string, context: ConversationContext): void {
  // In production, save to Redis/database
  conversationContexts.set(userId, context);
  
  // Clean up old contexts (older than 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  for (const [key, ctx] of conversationContexts.entries()) {
    if (ctx.updatedAt < oneDayAgo) {
      conversationContexts.delete(key);
    }
  }
}

// ============================================
// Get Context
// ============================================

export function getContext(userId: string): ConversationContext | undefined {
  return conversationContexts.get(userId);
}

// ============================================
// Generate Contextual Response
// ============================================

export function generateContextualResponse(
  context: ConversationContext,
  userMessage: string
): string {
  switch (context.currentAction) {
    case 'new_campaign':
      return `I'd love to help you with that! Creating a new outreach campaign...`;
    
    case 'approval':
      if (context.pendingAction === 'send') {
        return `🚀 Sending your campaign now! I'll notify you when it's complete.`;
      }
      if (context.pendingAction === 'review') {
        return `📝 Here are your draft messages:\n\n${generateDraftList(context)}\n\nReply "Send now" to proceed or "Edit [number]" to make changes.`;
      }
      return `What would you like to do with this campaign?`;
    
    case 'status_check':
      return generateStatusReport(context);
    
    case 'help':
      return getHelpText();
    
    default:
      return `How can I help you with your outreach today?`;
  }
}

// ============================================
// Generate Draft List
// ============================================

function generateDraftList(context: ConversationContext): string {
  if (!context.campaignData) {
    return 'No drafts available.';
  }
  
  let result = '';
  for (let i = 1; i <= context.campaignData.messages; i++) {
    result += `Draft ${i}: [Message preview...]\n`;
  }
  return result;
}

// ============================================
// Generate Status Report
// ============================================

function generateStatusReport(context: ConversationContext): string {
  if (!context.campaignData) {
    return `No active campaigns found. Create one by describing your outreach goal!`;
  }
  
  const { targets, messages, channel, status } = context.campaignData;
  
  return `📊 Campaign Status

📋 Status: ${status}
🎯 Targets: ${targets}
✉️  Messages: ${messages}
📱 Channel: ${channel}

📈 Performance:
• Sent: ${messages}
• Delivered: ${Math.floor(messages * 0.9)}
• Opened: ${Math.floor(messages * 0.4)}
• Replied: ${Math.floor(messages * 0.1)}

What would you like to do next?`;
}

// ============================================
// Help Text
// ============================================

export function getHelpText(): string {
  return `🤖 Marketing Agent - Available Commands

📝 CREATE CAMPAIGNS
"Reach out to [number] [type] in [location] about [purpose]"
Examples:
• "Reach out to 10 hotels in NYC about partnerships"
• "Contact 20 restaurant owners in Miami about referrals"
• "Email 30 startup founders about hiring"

📊 CHECK STATUS
• "Status" - See campaign progress
• "How's it going?" - Check updates

✅ APPROVE/ACT
• "Send now" - Send all messages
• "Review" - See draft messages
• "Edit [number]" - Modify a draft

🔄 ADJUST
• "Change location to [city]"
• "Change number to [number]"
• "Different purpose"

❓ GET HELP
• "Help" - Show this message

Just describe what you want to accomplish!`;
}

// ============================================
// Conversation Flow States
// ============================================

export type ConversationState = 
  | 'idle'
  | 'parsing_intent'
  | 'discovering_targets'
  | 'generating_messages'
  | 'awaiting_approval'
  | 'sending'
  | 'completed'
  | 'error';

export function getNextState(
  currentState: ConversationState,
  event: string
): ConversationState {
  const stateMachine: Record<ConversationState, Record<string, ConversationState>> = {
    idle: {
      new_campaign: 'parsing_intent',
    },
    parsing_intent: {
      intent_parsed: 'discovering_targets',
      error: 'error',
    },
    discovering_targets: {
      targets_found: 'generating_messages',
      error: 'error',
    },
    generating_messages: {
      messages_ready: 'awaiting_approval',
      error: 'error',
    },
    awaiting_approval: {
      send: 'sending',
      completed: 'completed',
    },
    sending: {
      sent: 'completed',
      error: 'error',
    },
    completed: {
      new_campaign: 'parsing_intent',
    },
    error: {
      retry: 'idle',
    },
  };
  
  return stateMachine[currentState]?.[event] || 'idle';
}
