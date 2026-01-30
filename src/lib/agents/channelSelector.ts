// Marketing Agent - Channel Selector

import { OutreachChannel, OutreachIntent, TargetType, OutreachPurpose } from '@/types';

// ============================================
// Channel Selection Logic
// ============================================

interface ChannelRecommendation {
  channel: OutreachChannel;
  confidence: number;
  reason: string;
  alternatives?: OutreachChannel[];
}

export function selectChannel(intent: OutreachIntent): ChannelRecommendation {
  // If channel is explicitly specified, use it
  if (intent.channel !== 'generic') {
    return {
      channel: intent.channel,
      confidence: 1.0,
      reason: `Channel explicitly specified: ${intent.channel}`,
    };
  }
  
  // Otherwise, recommend based on target type and purpose
  const recommendations = analyzeChannelFit(intent);
  
  // Sort by confidence and return top recommendation
  const sorted = recommendations.sort((a, b) => b.confidence - a.confidence);
  const top = sorted[0];
  
  // Add alternatives (extract just the channels)
  top.alternatives = sorted
    .filter(r => r.channel !== top.channel && r.confidence > 0.3)
    .map(r => r.channel);
  
  return top;
}

function analyzeChannelFit(intent: OutreachIntent): ChannelRecommendation[] {
  const recommendations: ChannelRecommendation[] = [];
  
  // Creator/Influencer targets - prefer DMs
  if (isCreatorTarget(intent.targetType)) {
    recommendations.push({
      channel: 'dm',
      confidence: 0.85,
      reason: 'Creators and influencers typically respond better to direct messages on social platforms',
    });
    
    recommendations.push({
      channel: 'email',
      confidence: 0.6,
      reason: 'Email can work but may have lower response rates for creators',
    });
  }
  
  // B2B targets (restaurants, hotels, real estate, startups)
  if (isB2BTarget(intent.targetType)) {
    recommendations.push({
      channel: 'email',
      confidence: 0.9,
      reason: 'Professional channels like email are standard for B2B outreach',
    });
    
    // LinkedIn DMs for founders/professionals
    if (intent.targetType === 'startup_founder' || intent.targetType === 'professional') {
      recommendations.push({
        channel: 'dm',
        confidence: 0.7,
        reason: 'LinkedIn DMs can be effective for startup founders and professionals',
      });
    }
  }
  
  // Hiring purposes - prefer professional channels
  if (isHiringPurpose(intent.purpose)) {
    recommendations.push({
      channel: 'email',
      confidence: 0.95,
      reason: 'Hiring inquiries are most professional via email',
    });
    
    recommendations.push({
      channel: 'dm',
      confidence: 0.5,
      reason: 'Direct messages may seem less professional for hiring',
    });
  }
  
  // Partnership/Collaboration - depends on target
  if (isPartnershipPurpose(intent.purpose)) {
    if (isCreatorTarget(intent.targetType)) {
      recommendations.push({
        channel: 'dm',
        confidence: 0.8,
        reason: 'Creators often prefer DMs for collaboration inquiries',
      });
    } else {
      recommendations.push({
        channel: 'email',
        confidence: 0.85,
        reason: 'Partnership inquiries to businesses are best via email',
      });
    }
  }
  
  // Location-based outreach
  if (intent.location) {
    recommendations.push({
      channel: 'email',
      confidence: 0.8,
      reason: 'Email is reliable for location-based business outreach',
    });
  }
  
  // WhatsApp for certain niches
  if (isWhatsAppAppropriate(intent)) {
    recommendations.push({
      channel: 'whatsapp',
      confidence: 0.7,
      reason: 'WhatsApp is popular in certain regions and for certain business types',
    });
  }
  
  // Default fallback
  if (recommendations.length === 0) {
    recommendations.push({
      channel: 'email',
      confidence: 0.7,
      reason: 'Email is the default and most reliable channel for outreach',
    });
  }
  
  return recommendations;
}

// ============================================
// Helper Functions
// ============================================

function isCreatorTarget(targetType: TargetType): boolean {
  return targetType === 'creator';
}

function isB2BTarget(targetType: TargetType): boolean {
  return [
    'restaurant_owner',
    'hotel_owner',
    'real_estate_broker',
    'business_owner',
    'startup_founder',
  ].includes(targetType);
}

function isHiringPurpose(purpose: OutreachPurpose): boolean {
  return purpose === 'hiring';
}

function isPartnershipPurpose(purpose: OutreachPurpose): boolean {
  return [
    'partnership',
    'influencer_collaboration',
    'brand_deal',
  ].includes(purpose);
}

function isWhatsAppAppropriate(intent: OutreachIntent): boolean {
  // WhatsApp is often better for certain use cases
  if (intent.location?.toLowerCase().includes('miami')) {
    return true;
  }
  
  if (intent.targetType === 'restaurant_owner' && intent.purpose === 'partnership') {
    return true;
  }
  
  return false;
}

// ============================================
// Channel Configuration
// ============================================

export interface ChannelConfig {
  channel: OutreachChannel;
  displayName: string;
  icon: string;
  maxLength: number;
  features: {
    hasSubject: boolean;
    supportsHtml: boolean;
    hasPreview: boolean;
    trackingSupported: boolean;
  };
  bestPractices: string[];
}

export function getChannelConfig(channel: OutreachChannel): ChannelConfig {
  const configs: Record<OutreachChannel, ChannelConfig> = {
    email: {
      channel: 'email',
      displayName: 'Email',
      icon: 'mail',
      maxLength: 10000,
      features: {
        hasSubject: true,
        supportsHtml: true,
        hasPreview: true,
        trackingSupported: true,
      },
      bestPractices: [
        'Keep subject lines under 50 characters',
        'Personalize the opening with specific details',
        'Include a clear call-to-action',
        'Add a professional signature',
        'Test on mobile devices',
      ],
    },
    dm: {
      channel: 'dm',
      displayName: 'Direct Message',
      icon: 'message',
      maxLength: 500,
      features: {
        hasSubject: false,
        supportsHtml: false,
        hasPreview: true,
        trackingSupported: false,
      },
      bestPractices: [
        'Keep messages under 280 characters when possible',
        'Reference specific content from their profile',
        'Be direct and concise',
        'Avoid sounding overly promotional',
        'End with an open-ended question',
      ],
    },
    whatsapp: {
      channel: 'whatsapp',
      displayName: 'WhatsApp',
      icon: 'phone',
      maxLength: 4096,
      features: {
        hasSubject: false,
        supportsHtml: false,
        hasPreview: true,
        trackingSupported: true,
      },
      bestPractices: [
        'Use a friendly, conversational tone',
        'Keep messages concise and scannable',
        'Use emojis appropriately',
        'Include a clear next step',
        'Be mindful of time zones',
      ],
    },
    generic: {
      channel: 'generic',
      displayName: 'Generic',
      icon: 'send',
      maxLength: 5000,
      features: {
        hasSubject: false,
        supportsHtml: true,
        hasPreview: true,
        trackingSupported: true,
      },
      bestPractices: [
        'Choose a specific channel for better results',
        'Personalize the message',
        'Keep it concise and focused',
        'Include a clear value proposition',
      ],
    },
  };
  
  return configs[channel];
}

// ============================================
// Channel Selection UI Helper
// ============================================

export function getChannelDisplayInfo(channel: OutreachChannel): {
  label: string;
  description: string;
  icon: string;
  color: string;
} {
  const configs: Record<OutreachChannel, { label: string; description: string; icon: string; color: string }> = {
    email: {
      label: 'Email',
      description: 'Professional email outreach with tracking',
      icon: 'Mail',
      color: 'blue',
    },
    dm: {
      label: 'Direct Message',
      description: 'Social media DMs on Twitter/X, LinkedIn, or Instagram',
      icon: 'MessageSquare',
      color: 'purple',
    },
    whatsapp: {
      label: 'WhatsApp',
      description: 'Messaging via WhatsApp Business',
      icon: 'Phone',
      color: 'green',
    },
    generic: {
      label: 'Auto-detect',
      description: 'Let us choose the best channel based on your targets',
      icon: 'Sparkles',
      color: 'gray',
    },
  };
  
  return configs[channel];
}

// ============================================
// Channel Validation
// ============================================

export function validateChannelForIntent(
  channel: OutreachChannel,
  intent: OutreachIntent
): { valid: boolean; warning?: string } {
  const config = getChannelConfig(channel);
  
  // Check if channel is appropriate for the intent
  if (channel === 'dm' && isB2BTarget(intent.targetType) && intent.purpose === 'hiring') {
    return {
      valid: true,
      warning: 'Hiring inquiries via DM may seem unprofessional. Consider using email instead.',
    };
  }
  
  if (channel === 'whatsapp' && isB2BTarget(intent.targetType) && intent.purpose === 'hiring') {
    return {
      valid: true,
      warning: 'Hiring inquiries via WhatsApp may seem unprofessional for B2B.',
    };
  }
  
  return { valid: true };
}
