// Marketing Agent - Follow-up Automation

import { 
  FollowUpRule, 
  FollowUpAction, 
  FollowUpTrigger,
  MessageDraft,
  Campaign,
  MessageTone,
} from '@/types';
import { 
  createFollowUpRule, 
  getFollowUpActionsPending, 
  updateFollowUpActionStatus,
  getSupabaseClient,
} from '@/lib/database/supabase';

// ============================================
// Follow-up Rule Templates
// ============================================

interface FollowUpTemplate {
  trigger: FollowUpTrigger;
  delay: number; // in hours
  body: string;
  subject?: string;
  tone: MessageTone;
  maxAttempts: number;
  status: 'active' | 'paused' | 'completed';
}

export const FOLLOW_UP_TEMPLATES: Record<string, FollowUpTemplate> = {
  unopened_3_days: {
    trigger: 'unopened_after_days',
    delay: 72, // 3 days
    body: `Hi {{name}},

I wanted to follow up on my previous message about {{purpose}}. 

I understand you're busy, but I believe {{value_proposition}} could be really valuable for {{company}}.

Would you have 10 minutes this week for a quick call?

Best,
{{sender_name}}`,
    tone: 'professional',
    maxAttempts: 3,
    status: 'active',
  },
  
  unopened_7_days: {
    trigger: 'unopened_after_days',
    delay: 168, // 7 days
    body: `Hey {{name}},

Just checking in - I sent you a message last week about {{purpose}} and wanted to make sure it didn't get lost in your inbox.

{{alternative_value_prop}}

Happy to hop on a call whenever works for you.

Cheers,
{{sender_name}}`,
    tone: 'casual',
    maxAttempts: 2,
    status: 'active',
  },
  
  opened_no_reply: {
    trigger: 'opened_no_reply',
    delay: 48, // 2 days
    body: `Hi {{name}},

I noticed you opened my email about {{purpose}} - thanks for taking the time!

I'd love to hear your thoughts. Are there any questions I can answer?

{{sender_phone}}
{{sender_email}}`,
    tone: 'friendly',
    maxAttempts: 3,
    status: 'active',
  },
  
  clicked_no_reply: {
    trigger: 'clicked_no_reply',
    delay: 24, // 1 day
    body: `Hi {{name}},

Great to see you clicked on the link! Thanks for your interest in {{purpose}}.

Did you have a chance to review the details? I'd love to hear your feedback.

Best,
{{sender_name}}`,
    tone: 'professional',
    maxAttempts: 3,
    status: 'active',
  },
};

// ============================================
// Follow-up Engine
// ============================================

export interface CreateFollowUpParams {
  campaignId: string;
  triggerType: FollowUpTrigger;
  templateKey?: string;
  customDelay?: number;
  customBody?: string;
  customSubject?: string;
  maxAttempts?: number;
}

export async function createFollowUpRuleEngine(
  params: CreateFollowUpParams
): Promise<FollowUpRule> {
  const template = FOLLOW_UP_TEMPLATES[params.triggerType] || FOLLOW_UP_TEMPLATES.unopened_3_days;
  
  const rule = await createFollowUpRule({
    campaignId: params.campaignId,
    trigger: params.triggerType,
    delay: params.customDelay || template.delay,
    body: params.customBody || template.body,
    subject: params.customSubject,
    tone: template.tone,
    maxAttempts: params.maxAttempts || template.maxAttempts,
  });
  
  return rule;
}

// ============================================
// Follow-up Scheduler
// ============================================

export interface ScheduleFollowUpParams {
  ruleId: string;
  messageId: string;
  scheduledFor: Date;
}

export async function scheduleFollowUp(
  params: ScheduleFollowUpParams
): Promise<FollowUpAction> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('FollowUpAction')
    .insert({
      ruleId: params.ruleId,
      messageId: params.messageId,
      scheduledAt: params.scheduledFor.toISOString(),
      status: 'PENDING',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// Follow-up Processor
// ============================================

export async function processFollowUps(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const pendingActions = await getFollowUpActionsPending();
  
  let processed = 0;
  let sent = 0;
  let failed = 0;
  
  for (const action of pendingActions) {
    try {
      // Generate follow-up message based on original message
      const followUpMessage = generateFollowUpMessage(
        action.message,
        action.rule
      );
      
      // Send the follow-up
      const result = await sendFollowUp(followUpMessage);
      
      // Update action status
      await updateFollowUpActionStatus(action.id, result.success ? 'SENT' : 'FAILED', {
        sentAt: result.success ? new Date() : undefined,
        error: result.error,
      });
      
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
      
      processed++;
    } catch (error) {
      await updateFollowUpActionStatus(action.id, 'FAILED', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
      processed++;
    }
  }
  
  return { processed, sent, failed };
}

// ============================================
// Message Generation
// ============================================

function generateFollowUpMessage(
  originalMessage: MessageDraft | null,
  rule: FollowUpRule
): MessageDraft {
  // Get the follow-up template from the rule's message body
  // The rule.message contains the follow-up message content
  const followUpBody = typeof rule.message === 'string' 
    ? rule.message 
    : (rule.message?.body || 'Hi {{name}}, I wanted to follow up.');
  
  const followUpTone = typeof rule.message === 'string'
    ? 'professional'
    : (rule.message?.tone || 'professional');
  
  if (!originalMessage) {
    // Generate generic follow-up if original message is not available
    return {
      id: `followup_${Date.now()}`,
      targetId: '',
      target: {
        id: '',
        name: 'there',
        source: 'system',
        relevanceScore: 0,
        dataQuality: 'medium',
        discoveredAt: new Date(),
      },
      channel: 'email',
      body: followUpBody,
      tone: followUpTone,
      personalization: {
        companyReference: false,
        recentNewsReference: false,
        mutualConnection: false,
        nicheSpecific: false,
        locationSpecific: false,
        customHooks: ['Automated follow-up'],
      },
      qualityScore: 0.7,
      status: 'approved',
      generatedAt: new Date(),
    };
  }
  
  // Generate personalized follow-up based on original message
  return {
    id: `followup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    targetId: originalMessage.targetId,
    target: originalMessage.target,
    channel: originalMessage.channel,
    subject: followUpBody.substring(0, 100) + '...',
    body: followUpBody,
    tone: followUpTone,
    personalization: originalMessage.personalization,
    qualityScore: originalMessage.qualityScore * 0.9, // Slightly lower quality for follow-up
    status: 'approved',
    generatedAt: new Date(),
  };
}

// ============================================
// Send Integration
// ============================================

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendFollowUp(message: MessageDraft): Promise<SendResult> {
  // This would integrate with the actual sending logic
  // For now, it's a placeholder
  
  try {
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId: `sent_${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// Follow-up Rules Engine
// ============================================

export interface FollowUpConfig {
  enabled: boolean;
  rules: {
    trigger: FollowUpTrigger;
    delayHours: number;
    maxAttempts: number;
    enabled: boolean;
  }[];
}

export function createDefaultFollowUpConfig(): FollowUpConfig {
  return {
    enabled: true,
    rules: [
      {
        trigger: 'unopened_after_days',
        delayHours: 72,
        maxAttempts: 3,
        enabled: true,
      },
      {
        trigger: 'opened_no_reply',
        delayHours: 48,
        maxAttempts: 2,
        enabled: true,
      },
      {
        trigger: 'clicked_no_reply',
        delayHours: 24,
        maxAttempts: 2,
        enabled: true,
      },
    ],
  };
}

export function evaluateFollowUpTriggers(
  message: MessageDraft,
  config: FollowUpConfig
): FollowUpTrigger[] {
  const triggers: FollowUpTrigger[] = [];
  
  // Check if message was opened but no reply
  if (message.status === 'opened' && config.rules.find(r => r.trigger === 'opened_no_reply' && r.enabled)) {
    triggers.push('opened_no_reply');
  }
  
  // Check if message was clicked but no reply
  if (message.status === 'clicked' && config.rules.find(r => r.trigger === 'clicked_no_reply' && r.enabled)) {
    triggers.push('clicked_no_reply');
  }
  
  // Check if message was unopened after delay
  const currentStatus = message.status as string;
  const sentAt = message.sentAt;
  
  // Only trigger if message hasn't been opened
  const isOpened = currentStatus === 'opened' || currentStatus === 'clicked' || currentStatus === 'replied';
  
  if ((currentStatus === 'sent' || currentStatus === 'delivered') && sentAt && !isOpened) {
    const hoursSinceSent = (Date.now() - new Date(sentAt).getTime()) / (1000 * 60 * 60);
    
    const unopenedRule = config.rules.find(r => r.trigger === 'unopened_after_days' && r.enabled);
    if (unopenedRule && hoursSinceSent >= unopenedRule.delayHours) {
      triggers.push('unopened_after_days');
    }
  }
  
  return triggers;
}

// ============================================
// Follow-up Analytics
// ============================================

export interface FollowUpAnalytics {
  totalFollowUpsSent: number;
  followUpReplyRate: number;
  followUpOpenRate: number;
  bestPerformingTemplate: string;
  averageResponseTime: number;
}

export function calculateFollowUpAnalytics(campaign: Campaign): FollowUpAnalytics {
  const messages = campaign.messages || [];
  const originalMessages = messages.filter(m => !m.id.startsWith('followup'));
  const followUpMessages = messages.filter(m => m.id.startsWith('followup'));
  
  const followUpReplies = followUpMessages.filter(m => m.status === 'replied').length;
  const followUpOpens = followUpMessages.filter(m => m.status === 'opened').length;
  
  return {
    totalFollowUpsSent: followUpMessages.length,
    followUpReplyRate: followUpMessages.length > 0 
      ? (followUpReplies / followUpMessages.length) * 100 
      : 0,
    followUpOpenRate: followUpMessages.length > 0 
      ? (followUpOpens / followUpMessages.length) * 100 
      : 0,
    bestPerformingTemplate: 'unopened_3_days', // Would calculate based on actual data
    averageResponseTime: 48, // Hours - would calculate from actual data
  };
}
