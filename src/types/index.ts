// Marketing Agent - Core Types

// ============================================
// Intent & Outreach Types
// ============================================

export type OutreachChannel = 'email' | 'dm' | 'whatsapp' | 'generic';

export type TargetType = 
  | 'restaurant_owner'
  | 'hotel_owner'
  | 'startup_founder'
  | 'creator'
  | 'real_estate_broker'
  | 'business_owner'
  | 'professional'
  | 'generic';

export type OutreachPurpose =
  | 'partnership'
  | 'influencer_collaboration'
  | 'hiring'
  | 'brand_deal'
  | 'referral'
  | 'sales'
  | 'networking'
  | 'general';

export type MessageTone = 'professional' | 'casual' | 'direct' | 'friendly';

export interface OutreachIntent {
  channel: OutreachChannel;
  targetType: TargetType;
  targetNiche?: string;
  location?: string;
  purpose: OutreachPurpose;
  purposeDescription?: string;
  count: number;
  tone?: MessageTone;
  customInstructions?: string;
}

export interface ParsedIntent {
  rawInput: string;
  channel: OutreachChannel;
  targetType: TargetType;
  targetNiche?: string;
  location?: string;
  purpose: string;
  purposeDescription: string;
  count: number;
  tone: MessageTone;
  confidence: number;
  suggestions?: string[];
}

// ============================================
// Target & Discovery Types
// ============================================

export interface Target {
  id: string;
  name: string;
  title?: string;
  company?: string;
  website?: string;
  email?: string;
  phone?: string;
  socialHandles?: SocialHandles;
  location?: string;
  niche?: string;
  description?: string;
  source: string;
  relevanceScore: number;
  dataQuality: 'high' | 'medium' | 'low';
  discoveredAt: Date;
  enrichedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface SocialHandles {
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
}

export interface TargetDiscoveryResult {
  targets: Target[];
  totalFound: number;
  totalUsed: number;
  searchQueries: string[];
  discoveryTime: number;
  sources: string[];
}

export interface CompanyIntelligence {
  targetId: string;
  companyName: string;
  industry: string;
  companySize?: string;
  foundingYear?: number;
  headquarters?: string;
  mission?: string;
  recentNews?: string[];
  keyProducts?: string[];
  partnerships?: string[];
  socialProof?: {
    followers?: number;
    engagement?: number;
    metrics?: Record<string, number>;
  };
  enrichmentData?: Record<string, unknown>;
}

// ============================================
// Message Generation Types
// ============================================

export interface MessageDraft {
  id: string;
  targetId: string;
  target: Target;
  channel: OutreachChannel;
  subject?: string;
  body: string;
  tone: MessageTone;
  personalization: PersonalizationPoints;
  qualityScore: number;
  variations?: MessageDraft[];
  status: 'draft' | 'approved' | 'pending' | 'sending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed' | 'cancelled';
  generatedAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
}

export interface PersonalizationPoints {
  companyReference: boolean;
  recentNewsReference: boolean;
  mutualConnection: boolean;
  nicheSpecific: boolean;
  locationSpecific: boolean;
  customHooks: string[];
}

export interface MessageTemplate {
  id: string;
  channel: OutreachChannel;
  targetType: TargetType;
  purpose: OutreachPurpose;
  tone: MessageTone;
  subject?: string;
  template: string;
  variables: string[];
  examples?: string[];
}

// ============================================
// Campaign Types
// ============================================

export interface Campaign {
  id: string;
  name: string;
  intent: OutreachIntent;
  status: CampaignStatus;
  targets: Target[];
  messages: MessageDraft[];
  stats: CampaignStats;
  settings: CampaignSettings;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type CampaignStatus = 
  | 'draft'
  | 'discovering'
  | 'generating'
  | 'pending_approval'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface CampaignStats {
  totalTargets: number;
  approvedMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  openedMessages: number;
  clickedMessages: number;
  repliedMessages: number;
  bouncedMessages: number;
  failedMessages: number;
}

export interface CampaignSettings {
  channel: OutreachChannel;
  sendRate?: number;
  sendWindow?: {
    startHour: number;
    endHour: number;
    timezone: string;
  };
  followUpEnabled: boolean;
  followUpDelay: number;
  followUpMaxAttempts: number;
  trackOpens: boolean;
  trackClicks: boolean;
}

// ============================================
// Integration Types
// ============================================

export interface SendResult {
  success: boolean;
  messageId?: string;
  channel: OutreachChannel;
  targetId: string;
  error?: string;
  sentAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ExportData {
  format: 'csv' | 'json' | 'vcard';
  data: string;
  filename: string;
  mimeType: string;
}

export interface ScheduleConfig {
  campaignId: string;
  sendAt: Date;
  timezone: string;
  batchSize?: number;
  intervalMinutes?: number;
}

export interface IntegrationConfig {
  channel: OutreachChannel;
  provider: string;
  credentials: Record<string, string>;
  settings?: Record<string, unknown>;
  enabled: boolean;
}

// ============================================
// Follow-up Types
// ============================================

export interface FollowUpRule {
  id: string;
  campaignId: string;
  trigger: FollowUpTrigger;
  delay: number; // in hours
  message: MessageDraft;
  maxAttempts: number;
  status: 'active' | 'paused' | 'completed';
}

export type FollowUpTrigger = 
  | 'unopened_after_days'
  | 'opened_no_reply'
  | 'clicked_no_reply'
  | 'bounced'
  | 'manual';

export interface FollowUpAction {
  ruleId: string;
  targetId: string;
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'skipped';
  result?: SendResult;
}

// ============================================
// API & Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: Date;
    requestId?: string;
    processingTime?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  suggestion?: string;
}

export interface AgentStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AgentProgress {
  sessionId: string;
  campaignId?: string;
  steps: AgentStep[];
  currentStep: number;
  totalSteps: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  startedAt: Date;
  updatedAt: Date;
}

// ============================================
// UI State Types
// ============================================

export interface ApprovalItem {
  draft: MessageDraft;
  target: Target;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  editedContent?: string;
}

export interface DashboardFilter {
  status?: CampaignStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  channel?: OutreachChannel[];
}

export interface NotificationSettings {
  emailOnComplete: boolean;
  emailOnReply: boolean;
  slackWebhook?: string;
}
