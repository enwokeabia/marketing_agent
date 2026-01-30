// Marketing Agent - Database Utilities

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SocialHandles, PersonalizationPoints } from '@/types';

// ============================================
// Supabase Client
// ============================================

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
  
  return supabaseClient;
}

// ============================================
// Campaign Operations
// ============================================

export interface CreateCampaignParams {
  name: string;
  intent: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export async function createCampaign(params: CreateCampaignParams) {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('Campaign')
    .insert({
      name: params.name,
      intent: params.intent,
      settings: params.settings,
      status: 'DRAFT',
      stats: {
        totalTargets: 0,
        approvedMessages: 0,
        sentMessages: 0,
        deliveredMessages: 0,
        openedMessages: 0,
        clickedMessages: 0,
        repliedMessages: 0,
        bouncedMessages: 0,
        failedMessages: 0,
      },
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getCampaign(campaignId: string) {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('Campaign')
    .select(`
      *,
      targets (*),
      messages (*)
    `)
    .eq('id', campaignId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCampaignStatus(
  campaignId: string,
  status: string
) {
  const client = getSupabaseClient();
  
  const updateData: Record<string, unknown> = { status };
  
  if (status === 'ACTIVE') {
    updateData.startedAt = new Date().toISOString();
  } else if (status === 'COMPLETED') {
    updateData.completedAt = new Date().toISOString();
  }
  
  const { data, error } = await client
    .from('Campaign')
    .update(updateData)
    .eq('id', campaignId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCampaignStats(
  campaignId: string,
  stats: Record<string, number>
) {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('Campaign')
    .update({ stats })
    .eq('id', campaignId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function listCampaigns(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const client = getSupabaseClient();
  
  let query = client
    .from('Campaign')
    .select('*')
    .order('createdAt', { ascending: false });
  
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

// ============================================
// Target Operations
// ============================================

export interface CreateTargetParams {
  campaignId: string;
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
  relevanceScore?: number;
  companyData?: Record<string, unknown>;
}

export async function createTarget(params: CreateTargetParams) {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('Target')
    .insert({
      campaignId: params.campaignId,
      name: params.name,
      title: params.title,
      company: params.company,
      website: params.website,
      email: params.email,
      phone: params.phone,
      socialHandles: params.socialHandles,
      location: params.location,
      niche: params.niche,
      description: params.description,
      source: params.source,
      relevanceScore: params.relevanceScore || 0,
      companyData: params.companyData,
      dataQuality: params.email ? 'MEDIUM' : 'LOW',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function createTargetsBatch(params: CreateTargetParams[]) {
  const client = getSupabaseClient();
  
  const records = params.map((p) => ({
    campaignId: p.campaignId,
    name: p.name,
    title: p.title,
    company: p.company,
    website: p.website,
    email: p.email,
    phone: p.phone,
    socialHandles: p.socialHandles,
    location: p.location,
    niche: p.niche,
    description: p.description,
    source: p.source,
    relevanceScore: p.relevanceScore || 0,
    companyData: p.companyData,
    dataQuality: p.email ? 'MEDIUM' : 'LOW',
  }));
  
  const { data, error } = await client
    .from('Target')
    .insert(records)
    .select();
  
  if (error) throw error;
  return data;
}

export async function getTargetsByCampaign(campaignId: string) {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('Target')
    .select('*')
    .eq('campaignId', campaignId)
    .order('relevanceScore', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function updateTargetEnrichment(
  targetId: string,
  enrichment: {
    email?: string;
    phone?: string;
    companyData?: Record<string, unknown>;
    dataQuality?: 'HIGH' | 'MEDIUM' | 'LOW';
  }
) {
  const client = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {
    enrichedAt: new Date().toISOString(),
  };
  
  if (enrichment.email) updateData.email = enrichment.email;
  if (enrichment.phone) updateData.phone = enrichment.phone;
  if (enrichment.companyData) updateData.enrichmentData = enrichment.companyData;
  if (enrichment.dataQuality) updateData.dataQuality = enrichment.dataQuality;
  
  const { data, error } = await client
    .from('Target')
    .update(updateData)
    .eq('id', targetId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// Message Operations
// ============================================

export interface CreateMessageParams {
  campaignId: string;
  targetId: string;
  channel: string;
  subject?: string;
  body: string;
  tone: string;
  personalization?: PersonalizationPoints;
  qualityScore?: number;
}

export async function createMessage(params: CreateMessageParams) {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('Message')
    .insert({
      campaignId: params.campaignId,
      targetId: params.targetId,
      channel: params.channel,
      subject: params.subject,
      body: params.body,
      tone: params.tone,
      personalization: params.personalization,
      qualityScore: params.qualityScore || 0,
      status: 'DRAFT',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function createMessagesBatch(params: CreateMessageParams[]) {
  const client = getSupabaseClient();
  
  const records = params.map((p) => ({
    campaignId: p.campaignId,
    targetId: p.targetId,
    channel: p.channel,
    subject: p.subject,
    body: p.body,
    tone: p.tone,
    personalization: p.personalization,
    qualityScore: p.qualityScore || 0,
    status: 'DRAFT',
  }));
  
  const { data, error } = await client
    .from('Message')
    .insert(records)
    .select();
  
  if (error) throw error;
  return data;
}

export async function updateMessageStatus(
  messageId: string,
  status: string,
  additionalData?: {
    sentAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
    externalId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const client = getSupabaseClient();
  
  const updateData: Record<string, unknown> = { status };
  
  if (additionalData) {
    if (additionalData.sentAt) updateData.sentAt = additionalData.sentAt;
    if (additionalData.openedAt) updateData.openedAt = additionalData.openedAt;
    if (additionalData.clickedAt) updateData.clickedAt = additionalData.clickedAt;
    if (additionalData.externalId) updateData.externalId = additionalData.externalId;
    if (additionalData.metadata) updateData.metadata = additionalData.metadata;
  }
  
  const { data, error } = await client
    .from('Message')
    .update(updateData)
    .eq('id', messageId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getMessagesByCampaign(campaignId: string) {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('Message')
    .select(`
      *,
      target:Target (*)
    `)
    .eq('campaignId', campaignId)
    .order('createdAt', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getPendingMessages(campaignId: string) {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('Message')
    .select(`
      *,
      target:Target (*)
    `)
    .eq('campaignId', campaignId)
    .eq('status', 'APPROVED')
    .order('createdAt', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// ============================================
// Follow-up Operations
// ============================================

export interface CreateFollowUpRuleParams {
  campaignId: string;
  trigger: string;
  delay: number;
  body: string;
  subject?: string;
  tone: string;
  maxAttempts?: number;
}

export async function createFollowUpRule(params: CreateFollowUpRuleParams) {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('FollowUpRule')
    .insert({
      campaignId: params.campaignId,
      trigger: params.trigger,
      delay: params.delay,
      body: params.body,
      subject: params.subject,
      tone: params.tone,
      maxAttempts: params.maxAttempts || 3,
      status: 'ACTIVE',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getFollowUpActionsPending() {
  const client = getSupabaseClient();
  
  const now = new Date().toISOString();
  
  const { data, error } = await client
    .from('FollowUpAction')
    .select(`
      *,
      rule:FollowUpRule (
        *,
        campaign:Campaign (*)
      ),
      message:Message (
        *,
        target:Target (*)
      )
    `)
    .eq('status', 'PENDING')
    .lte('scheduledAt', now)
    .order('scheduledAt', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function updateFollowUpActionStatus(
  actionId: string,
  status: string,
  result?: {
    sentAt?: Date;
    error?: string;
  }
) {
  const client = getSupabaseClient();
  
  const updateData: Record<string, unknown> = { status };
  
  if (result?.sentAt) updateData.sentAt = result.sentAt;
  if (result?.error) updateData.error = result.error;
  
  const { data, error } = await client
    .from('FollowUpAction')
    .update(updateData)
    .eq('id', actionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// Utility Functions
// ============================================

export async function getCampaignWithStats(campaignId: string) {
  const client = getSupabaseClient();
  
  const campaign = await getCampaign(campaignId);
  
  if (!campaign) return null;
  
  // Get message statistics
  const { data: messages } = await client
    .from('Message')
    .select('status')
    .eq('campaignId', campaignId);
  
  const stats = {
    total: messages?.length || 0,
    sent: messages?.filter(m => m.status === 'SENT' || m.status === 'DELIVERED').length || 0,
    opened: messages?.filter(m => m.status === 'OPENED').length || 0,
    replied: messages?.filter(m => m.status === 'REPLIED').length || 0,
    bounced: messages?.filter(m => m.status === 'BOUNCED').length || 0,
    failed: messages?.filter(m => m.status === 'FAILED').length || 0,
  };
  
  return {
    ...campaign,
    stats,
  };
}
