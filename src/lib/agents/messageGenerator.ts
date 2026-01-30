// Marketing Agent - Message Generator

import { 
  OutreachIntent, 
  MessageDraft, 
  Target, 
  MessageTemplate,
  OutreachChannel,
  MessageTone,
  PersonalizationPoints,
} from '@/types';
import { getChannelConfig } from './channelSelector';

// ============================================
// Message Generation Engine
// ============================================

export interface GenerateMessageParams {
  intent: OutreachIntent;
  target: Target;
  companyIntelligence?: {
    recentNews?: string[];
    products?: string[];
    mission?: string;
    socialProof?: {
      followers?: number;
      engagement?: number;
    };
  };
  customContext?: {
    senderName?: string;
    senderCompany?: string;
    senderWebsite?: string;
    customHook?: string;
  };
}

export function generateMessage(params: GenerateMessageParams): MessageDraft {
  const { intent, target, companyIntelligence, customContext } = params;
  
  const channelConfig = getChannelConfig(intent.channel);
  
  // Generate personalization points
  const personalization = analyzePersonalization({
    intent,
    target,
    companyIntelligence,
    customContext,
  });
  
  // Select appropriate template
  const template = selectTemplate(intent);
  
  // Generate the message body
  const body = renderTemplate({
    template,
    intent,
    target,
    companyIntelligence,
    customContext,
  });
  
  // Generate subject line if applicable
  const subject = channelConfig.features.hasSubject
    ? generateSubjectLine(intent, target, customContext)
    : undefined;
  
  // Calculate quality score
  const qualityScore = calculateQualityScore(personalization, intent);
  
  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    targetId: target.id,
    target,
    channel: intent.channel,
    subject,
    body,
    tone: intent.tone || 'professional',
    personalization,
    qualityScore,
    status: 'draft',
    generatedAt: new Date(),
  };
}

// ============================================
// Template Selection
// ============================================

function selectTemplate(intent: OutreachIntent): MessageTemplate {
  const templates = getTemplatesForChannel(intent.channel);
  
  // Filter by target type and purpose
  const matching = templates.filter(
    t => t.targetType === intent.targetType && t.purpose === intent.purpose
  );
  
  if (matching.length > 0) {
    return matching[0];
  }
  
  // Fall back to generic template
  const generic = templates.find(t => t.targetType === 'generic' && t.purpose === 'general');
  return generic || templates[0];
}

function getTemplatesForChannel(channel: OutreachChannel): MessageTemplate[] {
  const baseTemplates: Omit<MessageTemplate, 'channel'>[] = [
    // ============================================
    // Partnership Templates
    // ============================================
    {
      id: 'partnership_b2b',
      targetType: 'business_owner',
      purpose: 'partnership',
      tone: 'professional',
      subject: 'Partnership Opportunity for {{company}}',
      template: `Hi {{name}},

I've been following {{company}} and I'm impressed by {{personalization_hook}}.

I'm {{sender_name}} from {{sender_company}}, and we're interested in exploring a partnership that could benefit both of our audiences.

{{value_proposition}}

Would you be open to a quick call this week to discuss how we might work together?

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_company}}
{{sender_website}}`,
      variables: ['name', 'company', 'personalization_hook', 'sender_name', 'sender_company', 'value_proposition', 'sender_title', 'sender_website'],
    },
    {
      id: 'partnership_creator',
      targetType: 'creator',
      purpose: 'partnership',
      tone: 'casual',
      template: `Hey {{name}}! 

I've been loving your content ({{recent_post_reference}}) and think there's a great opportunity for us to collaborate.

{{value_proposition}}

Would love to chat more if you're interested! 

{{sender_name}}
{{sender_company}}`,
      variables: ['name', 'recent_post_reference', 'value_proposition', 'sender_name', 'sender_company'],
    },
    // ============================================
    // Influencer Collaboration Templates
    // ============================================
    {
      id: 'influencer_collab',
      targetType: 'creator',
      purpose: 'influencer_collaboration',
      tone: 'friendly',
      template: `Hi {{name}}!

I've been following your {{niche}} content and absolutely love your style ({{specific_content_reference}}).

I'm {{sender_name}} from {{sender_company}}, and we're launching {{campaign_description}} and think you'd be a perfect fit.

{{collaboration_details}}

Let me know if you'd be open to exploring this opportunity!

Best,
{{sender_name}}`,
      variables: ['name', 'niche', 'specific_content_reference', 'sender_name', 'sender_company', 'campaign_description', 'collaboration_details'],
    },
    // ============================================
    // Hiring Templates
    // ============================================
    {
      id: 'hiring_founder',
      targetType: 'startup_founder',
      purpose: 'hiring',
      tone: 'professional',
      subject: 'Hiring for {{role}} at {{sender_company}}',
      template: `Hi {{name}},

I noticed {{company}} is growing rapidly, and I wanted to reach out about an opportunity that might interest you or someone in your network.

{{sender_company}} is looking for {{role}} to join our team. {{job_description}}

{{why_interesting}}

Are you aware of anyone in your network who might be a great fit? Or would you be open to a brief conversation?

Best,
{{sender_name}}
{{sender_title}}
{{sender_company}}`,
      variables: ['name', 'company', 'role', 'job_description', 'why_interesting', 'sender_name', 'sender_title', 'sender_company'],
    },
    // ============================================
    // Brand Deal Templates
    // ============================================
    {
      id: 'brand_deal',
      targetType: 'creator',
      purpose: 'brand_deal',
      tone: 'casual',
      template: `Hi {{name}}! 

Love what you're doing in the {{niche}} space! Your {{specific_content}} was {{compliment}}.

I'm {{sender_name}} from {{sender_company}}, and we'd love to work with you on {{deal_description}}.

{{deal_details}}

Let me know if you're interested and we can discuss further!

Cheers,
{{sender_name}}`,
      variables: ['name', 'niche', 'specific_content', 'compliment', 'sender_name', 'sender_company', 'deal_description', 'deal_details'],
    },
    // ============================================
    // Referral Templates
    // ============================================
    {
      id: 'referral_realtor',
      targetType: 'real_estate_broker',
      purpose: 'referral',
      tone: 'professional',
      subject: 'Referral Partnership Opportunity',
      template: `Hi {{name}},

I work with clients who are looking to {{service_type}} in {{location}}, and I believe we could refer business to each other.

{{sender_company}} specializes in {{specialization}}, and I've helped {{success_metric}} clients achieve their goals.

Would you be open to a brief call to discuss how we can support each other's clients?

Best regards,
{{sender_name}}
{{sender_company}}
{{sender_phone}}`,
      variables: ['name', 'service_type', 'location', 'sender_company', 'specialization', 'success_metric', 'sender_name', 'sender_phone'],
    },
    // ============================================
    // Generic/Default Templates
    // ============================================
    {
      id: 'generic_professional',
      targetType: 'generic',
      purpose: 'general',
      tone: 'professional',
      subject: 'Reaching out from {{sender_company}}',
      template: `Hi {{name}},

I wanted to reach out regarding {{purpose_description}}.

{{sender_company}} {{company_description}}

{{specific_value}}

Would you be available for a brief call this week?

Best,
{{sender_name}}
{{sender_company}}
{{sender_website}}`,
      variables: ['name', 'purpose_description', 'sender_company', 'company_description', 'specific_value', 'sender_name', 'sender_website'],
    },
    {
      id: 'generic_casual',
      targetType: 'generic',
      purpose: 'general',
      tone: 'casual',
      template: `Hey {{name}}!

Quick intro — I'm {{sender_name}} from {{sender_company}}.

{{context_hook}}

{{value_prop}}

Interested in chatting? 

{{sender_name}}`,
      variables: ['name', 'sender_name', 'sender_company', 'context_hook', 'value_prop'],
    },
  ];
  
  return baseTemplates.map(t => ({
    ...t,
    channel,
  }));
}

// ============================================
// Template Rendering
// ============================================

interface RenderParams {
  template: MessageTemplate;
  intent: OutreachIntent;
  target: Target;
  companyIntelligence?: {
    recentNews?: string[];
    products?: string[];
    mission?: string;
    socialProof?: {
      followers?: number;
      engagement?: number;
    };
  };
  customContext?: {
    senderName?: string;
    senderCompany?: string;
    senderWebsite?: string;
    customHook?: string;
  };
}

function renderTemplate(params: RenderParams): string {
  let { template, intent, target, companyIntelligence, customContext } = params;
  
  let body = template.template;
  
  // Replace all variables
  body = body.replace(/\{\{name\}\}/g, target.name || 'there');
  body = body.replace(/\{\{company\}\}/g, target.company || '');
  body = body.replace(/\{\{title\}\}/g, target.title || '');
  body = body.replace(/\{\{location\}\}/g, target.location || intent.location || '');
  body = body.replace(/\{\{niche\}\}/g, target.niche || intent.targetNiche || '');
  
  // Sender info
  body = body.replace(/\{\{sender_name\}\}/g, customContext?.senderName || '[Your Name]');
  body = body.replace(/\{\{sender_company\}\}/g, customContext?.senderCompany || '[Your Company]');
  body = body.replace(/\{\{sender_website\}\}/g, customContext?.senderWebsite || '');
  body = body.replace(/\{\{sender_title\}\}/g, customContext?.senderName ? 'Founder/CEO' : '[Your Title]');
  body = body.replace(/\{\{sender_phone\}\}/g, customContext?.senderName ? '[Your Phone]' : '');
  
  // Purpose-specific replacements
  body = body.replace(/\{\{purpose_description\}\}/g, intent.purposeDescription || 'connecting');
  
  // Company intelligence replacements
  if (companyIntelligence) {
    body = body.replace(
      /\{\{personalization_hook\}\}/g,
      companyIntelligence.mission || 
      `what you've built with ${target.company}` ||
      'your work'
    );
    
    body = body.replace(
      /\{\{recent_post_reference\}\}/g,
      companyIntelligence.recentNews?.[0] || 
      'your recent content' ||
      'your content'
    );
    
    body = body.replace(
      /\{\{specific_content_reference\}\}/g,
      companyIntelligence.recentNews?.[0] || 
      'your style' ||
      'your approach'
    );
    
    body = body.replace(
      /\{\{compliment\}\}/g,
      companyIntelligence.socialProof?.followers 
        ? `really resonated with your ${companyIntelligence.socialProof.followers > 10000 ? 'large' : 'growing'} audience`
        : 'really stood out'
    );
  } else {
    body = body.replace(/\{\{personalization_hook\}\}/g, 'what you\'re building');
    body = body.replace(/\{\{recent_post_reference\}\}/g, 'your content');
    body = body.replace(/\{\{specific_content_reference\}\}/g, 'your approach');
    body = body.replace(/\{\{compliment\}\}/g, 'caught my attention');
  }
  
  // Context-specific replacements
  body = body.replace(/\{\{context_hook\}\}/g, customContext?.customHook || 'Coming across your profile');
  body = body.replace(/\{\{value_prop\}\}/g, getValueProposition(intent));
  body = body.replace(/\{\{value_proposition\}\}/g, getValueProposition(intent));
  
  // Purpose-specific replacements
  if (intent.purpose === 'hiring') {
    body = body.replace(/\{\{role\}\}/g, 'sales representatives');
    body = body.replace(/\{\{job_description\}\}/g, 'to help us scale our sales operations');
    body = body.replace(
      /\{\{why_interesting\}\}/g,
      `We've grown 3x in the last year and are looking for talented individuals to join our mission`
    );
  }
  
  if (intent.purpose === 'influencer_collaboration') {
    body = body.replace(/\{\{campaign_description\}\}/g, 'an exciting new campaign');
    body = body.replace(/\{\{collaboration_details\}\}/g, 'We\'d love to discuss rates and creative freedom');
  }
  
  if (intent.purpose === 'brand_deal') {
    body = body.replace(/\{\{deal_description\}\}/g, 'a paid partnership opportunity');
    body = body.replace(/\{\{deal_details\}\}/g, 'Competitive rates + creative control');
  }
  
  if (intent.purpose === 'referral') {
    body = body.replace(/\{\{service_type\}\}/g, 'buy or sell properties');
    body = body.replace(/\{\{specialization\}\}/g, 'luxury residential real estate');
    body = body.replace(/\{\{success_metric\}\}/g, '100+');
  }
  
  // Company description
  body = body.replace(
    /\{\{company_description\}\}/g,
    customContext?.senderCompany 
      ? `helps businesses streamline their outreach and partnership development`
      : 'working on something exciting'
  );
  
  body = body.replace(
    /\{\{specific_value\}\}/g,
    `We help companies like ${target.company || 'yours'} reach their partnership goals`
  );
  
  return body.trim();
}

function generateSubjectLine(
  intent: OutreachIntent,
  target: Target,
  customContext?: { senderName?: string; senderCompany?: string }
): string {
  const subjects: Record<string, string> = {
    partnership: `Partnership Opportunity for ${target.company || 'Your Company'}`,
    influencer_collaboration: `Collaboration Opportunity for ${target.name}`,
    hiring: `${intent.purposeDescription || 'Job Opportunity'} at ${customContext?.senderCompany || 'Our Company'}`,
    brand_deal: `Paid Partnership with ${customContext?.senderCompany || 'Us'}`,
    referral: `Referral Partnership - ${target.location || 'Your Area'}`,
    sales: `Quick question for ${target.company || 'you'}`,
    networking: `Introduction from ${customContext?.senderName || 'someone'}`,
    general: `Reaching out from ${customContext?.senderCompany || customContext?.senderName || '...'}`,
  };
  
  return subjects[intent.purpose] || subjects.general;
}

// ============================================
// Personalization Analysis
// ============================================

function analyzePersonalization(params: {
  intent: OutreachIntent;
  target: Target;
  companyIntelligence?: {
    recentNews?: string[];
    products?: string[];
    mission?: string;
    socialProof?: {
      followers?: number;
      engagement?: number;
    };
  };
  customContext?: {
    senderName?: string;
    senderCompany?: string;
    customHook?: string;
  };
}): PersonalizationPoints {
  const { target, companyIntelligence, customContext } = params;
  
  const personalization: PersonalizationPoints = {
    companyReference: !!target.company,
    recentNewsReference: !!(companyIntelligence?.recentNews?.length),
    mutualConnection: false, // Would need social graph data
    nicheSpecific: !!(target.niche || params.intent.targetNiche),
    locationSpecific: !!(target.location || params.intent.location),
    customHooks: [],
  };
  
  // Add custom hooks based on available data
  if (companyIntelligence?.mission) {
    personalization.customHooks.push(`Referenced company mission: "${companyIntelligence.mission.substring(0, 100)}..."`);
  }
  
  if (companyIntelligence?.recentNews?.length) {
    personalization.customHooks.push(`Referenced recent news: ${companyIntelligence.recentNews[0].substring(0, 80)}...`);
  }
  
  if (companyIntelligence?.socialProof?.followers) {
    personalization.customHooks.push(`Acknowledged audience size (${formatNumber(companyIntelligence.socialProof.followers)} followers)`);
  }
  
  if (customContext?.customHook) {
    personalization.customHooks.push(`Custom hook: ${customContext.customHook}`);
  }
  
  return personalization;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// ============================================
// Quality Scoring
// ============================================

function calculateQualityScore(
  personalization: PersonalizationPoints,
  intent: OutreachIntent
): number {
  let score = 0.5; // Base score
  
  // Personalization bonuses
  if (personalization.companyReference) score += 0.1;
  if (personalization.recentNewsReference) score += 0.15;
  if (personalization.nicheSpecific) score += 0.1;
  if (personalization.locationSpecific) score += 0.1;
  if (personalization.customHooks.length > 0) score += Math.min(personalization.customHooks.length * 0.05, 0.1);
  
  // Purpose clarity bonus
  if (intent.purpose !== 'general') score += 0.05;
  
  return Math.min(score, 1);
}

// ============================================
// Value Proposition Helper
// ============================================

function getValueProposition(intent: OutreachIntent): string {
  const valueProps: Record<string, string> = {
    partnership: 'We help brands build valuable partnerships that drive mutual growth.',
    influencer_collaboration: 'We create authentic creator partnerships that resonate with audiences.',
    hiring: 'Join a fast-growing team with equity, great culture, and meaningful work.',
    brand_deal: 'We offer competitive rates with full creative freedom for our partners.',
    referral: 'We refer clients to trusted professionals and expect reciprocation.',
    sales: 'Our solution has helped similar businesses achieve significant results.',
    networking: 'I\'d love to learn more about what you\'re working on.',
    general: 'I think there could be a mutually beneficial opportunity here.',
  };
  
  return valueProps[intent.purpose] || valueProps.general;
}

// ============================================
// Message Variation Generator
// ============================================

export function generateMessageVariations(
  baseDraft: MessageDraft,
  intent: OutreachIntent
): MessageDraft[] {
  const variations: MessageDraft[] = [];
  
  // Tone variations
  if (intent.tone !== baseDraft.tone) {
    const toneVariations: Record<MessageTone, MessageTone> = {
      professional: 'casual',
      casual: 'professional',
      direct: 'friendly',
      friendly: 'direct',
    };
    
    const alternateTone = toneVariations[baseDraft.tone];
    variations.push({
      ...baseDraft,
      id: `${baseDraft.id}_tone_${alternateTone}`,
      tone: alternateTone,
      body: baseDraft.body, // Would need to regenerate for true variation
      qualityScore: baseDraft.qualityScore * 0.9, // Slightly lower score
    });
  }
  
  // Length variations
  const shortVersion: MessageDraft = {
    ...baseDraft,
    id: `${baseDraft.id}_short`,
    body: shortenMessage(baseDraft.body),
    qualityScore: baseDraft.qualityScore * 0.85,
  };
  variations.push(shortVersion);
  
  return variations;
}

function shortenMessage(body: string): string {
  // Simple shortening logic - would need more sophisticated approach in production
  const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 3) {
    return sentences.slice(0, 3).join('. ') + '.';
  }
  return body;
}

// ============================================
// Batch Message Generation
// ============================================

export function generateBatchMessages(
  intent: OutreachIntent,
  targets: Target[],
  companyIntelligenceMap?: Map<string, NonNullable<Parameters<typeof generateMessage>[0]['companyIntelligence']>>
): MessageDraft[] {
  return targets.map(target => {
    const intelligence = companyIntelligenceMap?.get(target.id);
    return generateMessage({
      intent,
      target,
      companyIntelligence: intelligence,
    });
  });
}
