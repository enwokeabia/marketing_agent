// Marketing Agent - LangGraph Orchestrator

import { 
  OutreachIntent, 
  ParsedIntent, 
  Target, 
  MessageDraft, 
  Campaign,
  AgentProgress,
  AgentStep,
} from '@/types';
import { 
  executeCampaign, 
  parseIntent, 
  searchTargets, 
  generateBulkEmails,
  handleConversation,
  IntentResult,
  TargetResult,
} from './openaiClient';
import { 
  createCampaign as dbCreateCampaign,
  createTargetsBatch,
  createMessagesBatch,
  updateCampaignStatus,
  getCampaignWithStats,
} from '@/lib/database/supabase';

// ============================================
// Helper Functions
// ============================================

function validateIntent(parsed: ParsedIntent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!parsed.targetType || parsed.targetType === 'generic') {
    errors.push('Please specify a target type (e.g., restaurant owner, startup founder)');
  }
  
  if (!parsed.purpose) {
    errors.push('Please specify a purpose (e.g., partnership, hiring)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

function formatIntentForAI(parsed: ParsedIntent): OutreachIntent {
  return {
    channel: parsed.channel as OutreachIntent['channel'],
    targetType: parsed.targetType as OutreachIntent['targetType'],
    targetNiche: parsed.targetNiche,
    location: parsed.location,
    purpose: parsed.purpose as OutreachIntent['purpose'],
    purposeDescription: parsed.purposeDescription,
    count: parsed.count,
    tone: parsed.tone,
  };
}

function formatIntentFromResult(result: IntentResult): OutreachIntent {
  return {
    channel: result.channel as OutreachIntent['channel'],
    targetType: result.targetType as OutreachIntent['targetType'],
    targetNiche: result.niche,
    location: result.location,
    purpose: result.purpose as OutreachIntent['purpose'],
    purposeDescription: result.purpose,
    count: result.count,
    tone: 'professional',
  };
}

function mapTargetResultToTarget(r: TargetResult, index: number): Target {
  const dataQuality: Target['dataQuality'] =
    r.relevanceScore >= 0.8 ? 'high' : r.relevanceScore >= 0.5 ? 'medium' : 'low';
  return {
    id: `target_${Date.now()}_${index}`,
    name: r.name,
    title: r.title,
    company: r.company,
    website: r.website,
    email: r.email,
    phone: r.phone,
    location: r.location,
    description: r.description,
    source: r.source,
    relevanceScore: r.relevanceScore,
    dataQuality,
    discoveredAt: new Date(),
  };
}

function selectChannel(intent: OutreachIntent): { channel: string; confidence: number; reason: string } {
  // Simple channel selection based on intent
  if (intent.purpose === 'influencer_collaboration' || intent.purpose === 'brand_deal') {
    return {
      channel: 'dm',
      confidence: 0.8,
      reason: 'Creator outreach typically works best via DMs',
    };
  }
  
  if (intent.purpose === 'hiring') {
    return {
      channel: 'email',
      confidence: 0.9,
      reason: 'Professional hiring outreach works best via email',
    };
  }
  
  // Default to email for business outreach
  return {
    channel: 'email',
    confidence: 0.7,
    reason: 'Email is most reliable for business outreach',
  };
}

function generateBatchMessages(
  intent: OutreachIntent,
  targets: Target[]
): MessageDraft[] {
  // This is a simplified version - the actual generation happens in openaiClient
  return targets.map((target, index) => ({
    id: `msg_${Date.now()}_${index}`,
    targetId: target.id,
    target,
    channel: intent.channel,
    subject: `Partnership with ${target.company || target.name}`,
    body: `Hi ${target.name},\n\nI'd love to connect about ${intent.purposeDescription}.\n\nBest`,
    tone: intent.tone || 'professional',
    personalization: {
      companyReference: true,
      recentNewsReference: false,
      mutualConnection: false,
      nicheSpecific: !!intent.targetNiche,
      locationSpecific: !!intent.location,
      customHooks: [],
    },
    qualityScore: 0.7,
    status: 'draft',
    generatedAt: new Date(),
  }));
}

// ============================================
// Agent State
// ============================================

interface AgentState {
  // Input
  rawInput: string;
  userId?: string;
  
  // Parsed state
  parsedIntent?: ParsedIntent;
  validatedIntent?: OutreachIntent;
  channelRecommendation?: ReturnType<typeof selectChannel>;
  
  // Discovery state
  targets?: Target[];
  targetDiscoveryResult?: {
    totalFound: number;
    searchQueries: string[];
    discoveryTime: number;
  };
  
  // Generation state
  messages?: MessageDraft[];
  
  // Campaign state
  campaign?: Campaign;
  
  // Progress tracking
  progress: AgentProgress;
  
  // Error state
  error?: string;
}

// ============================================
// Workflow Nodes
// ============================================

export async function parseInputNode(state: AgentState): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  
  try {
    // Parse the intent
    const parsedIntent = await parseIntent(state.rawInput);
    
    // Check if parsing was successful
    if (!parsedIntent.success) {
      return {
        error: parsedIntent.clarification || 'Failed to parse intent',
        progress: {
          ...state.progress,
          status: 'error',
          steps: [...state.progress.steps, {
            id: 'parse_input',
            name: 'Parse Input',
            status: 'failed',
            message: parsedIntent.clarification || 'Intent parsing failed',
            completedAt: new Date(),
          }],
          updatedAt: new Date(),
        },
      };
    }
    
    // Convert to OutreachIntent
    const intent = formatIntentFromResult(parsedIntent);
    const channelRecommendation = selectChannel(intent);
    
    // If channel was generic, use the recommendation
    if (intent.channel === 'generic') {
      intent.channel = channelRecommendation.channel as OutreachIntent['channel'];
    }
    
    const parseTime = Date.now() - startTime;
    
    // Convert IntentResult to ParsedIntent format
    const parsed: ParsedIntent = {
      rawInput: state.rawInput,
      channel: parsedIntent.channel as ParsedIntent['channel'],
      targetType: parsedIntent.targetType as ParsedIntent['targetType'],
      targetNiche: parsedIntent.niche,
      location: parsedIntent.location,
      purpose: parsedIntent.purpose,
      purposeDescription: parsedIntent.purpose,
      count: parsedIntent.count,
      tone: 'professional',
      confidence: parsedIntent.confidence,
    };
    
    return {
      parsedIntent: parsed,
      validatedIntent: intent,
      channelRecommendation,
      progress: {
        ...state.progress,
        currentStep: 2,
        totalSteps: 5,
        steps: [...state.progress.steps, {
          id: 'parse_input',
          name: 'Parse Input',
          status: 'completed',
          progress: 100,
          message: `Parsed intent: ${intent.targetType} via ${intent.channel}`,
          completedAt: new Date(),
        }, {
          id: 'select_channel',
          name: 'Select Channel',
          status: 'completed',
          progress: 100,
          message: `Selected ${channelRecommendation.channel} (${Math.round(channelRecommendation.confidence * 100)}% confidence)`,
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  } catch (error) {
    return {
      error: `Failed to parse input: ${error instanceof Error ? error.message : 'Unknown error'}`,
      progress: {
        ...state.progress,
        status: 'error',
        steps: [...state.progress.steps, {
          id: 'parse_input',
          name: 'Parse Input',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  }
}

export async function discoverTargetsNode(state: AgentState): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  
  if (!state.validatedIntent) {
    return {
      error: 'No validated intent available',
      progress: {
        ...state.progress,
        status: 'error',
        steps: [...state.progress.steps, {
          id: 'discover_targets',
          name: 'Discover Targets',
          status: 'failed',
          message: 'Missing intent data',
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  }
  
  try {
    const intent = state.validatedIntent;
    
    // Search for targets using OpenAI
    const rawTargets = await searchTargets({
      targetType: intent.targetType,
      location: intent.location,
      niche: intent.targetNiche,
      purpose: intent.purpose,
      count: intent.count,
    });
    const targets: Target[] = rawTargets.map(mapTargetResultToTarget);
    
    const discoveryTime = Date.now() - startTime;
    
    return {
      targets,
      targetDiscoveryResult: {
        totalFound: targets.length,
        searchQueries: [`${intent.targetType} in ${intent.location || 'unknown'}`],
        discoveryTime,
      },
      progress: {
        ...state.progress,
        currentStep: 3,
        totalSteps: 5,
        steps: [...state.progress.steps, {
          id: 'discover_targets',
          name: 'Discover Targets',
          status: 'completed',
          progress: 100,
          message: `Found ${targets.length} targets`,
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  } catch (error) {
    return {
      error: `Failed to discover targets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      progress: {
        ...state.progress,
        status: 'error',
        steps: [...state.progress.steps, {
          id: 'discover_targets',
          name: 'Discover Targets',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  }
}

export async function generateMessagesNode(state: AgentState): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  
  if (!state.validatedIntent || !state.targets) {
    return {
      error: 'No intent or targets available',
      progress: {
        ...state.progress,
        status: 'error',
        steps: [...state.progress.steps, {
          id: 'generate_messages',
          name: 'Generate Messages',
          status: 'failed',
          message: 'Missing data',
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  }
  
  try {
    // Generate messages for each target
    const messages = generateBatchMessages(
      state.validatedIntent,
      state.targets
    );
    
    const generationTime = Date.now() - startTime;
    const avgQuality = messages.reduce((sum, m) => sum + m.qualityScore, 0) / messages.length;
    
    return {
      messages,
      progress: {
        ...state.progress,
        currentStep: 4,
        totalSteps: 5,
        steps: [...state.progress.steps, {
          id: 'generate_messages',
          name: 'Generate Messages',
          status: 'completed',
          progress: 100,
          message: `Generated ${messages.length} messages (avg quality: ${Math.round(avgQuality * 100)}%)`,
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  } catch (error) {
    return {
      error: `Failed to generate messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      progress: {
        ...state.progress,
        status: 'error',
        steps: [...state.progress.steps, {
          id: 'generate_messages',
          name: 'Generate Messages',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  }
}

export async function createCampaignNode(state: AgentState): Promise<Partial<AgentState>> {
  const startTime = Date.now();
  
  if (!state.validatedIntent || !state.targets || !state.messages) {
    return {
      error: 'Missing campaign data',
      progress: {
        ...state.progress,
        status: 'error',
        steps: [...state.progress.steps, {
          id: 'create_campaign',
          name: 'Create Campaign',
          status: 'failed',
          message: 'Missing data',
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  }
  
  try {
    // For demo purposes, create a mock campaign without database
    const campaignId = `campaign_${Date.now()}`;
    
    const mockCampaign = {
      id: campaignId,
      name: `Campaign: ${state.validatedIntent.purposeDescription} - ${new Date().toLocaleDateString()}`,
      intent: state.validatedIntent,
      status: 'pending_approval' as const,
      settings: {
        channel: state.validatedIntent.channel,
        followUpEnabled: true,
        followUpDelay: 72,
        followUpMaxAttempts: 3,
        trackOpens: true,
        trackClicks: true,
      },
      stats: {
        totalTargets: state.targets.length,
        approvedMessages: 0,
        sentMessages: 0,
        deliveredMessages: 0,
        openedMessages: 0,
        clickedMessages: 0,
        repliedMessages: 0,
        bouncedMessages: 0,
        failedMessages: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      targets: state.targets,
      messages: state.messages,
    };
    
    return {
      campaign: mockCampaign,
      progress: {
        ...state.progress,
        currentStep: 5,
        totalSteps: 5,
        status: 'completed',
        steps: [...state.progress.steps, {
          id: 'create_campaign',
          name: 'Create Campaign',
          status: 'completed',
          progress: 100,
          message: `Campaign created with ${state.targets.length} targets and ${state.messages.length} messages`,
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  } catch (error) {
    return {
      error: `Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
      progress: {
        ...state.progress,
        status: 'error',
        steps: [...state.progress.steps, {
          id: 'create_campaign',
          name: 'Create Campaign',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        }],
        updatedAt: new Date(),
      },
    };
  }
}

// ============================================
// Database Helper Functions
// ============================================

let databaseAvailable: boolean | null = null;

async function checkDatabaseAvailable(): Promise<boolean> {
  if (databaseAvailable !== null) {
    return databaseAvailable;
  }
  
  try {
    const { getSupabaseClient } = await import('@/lib/database/supabase');
    getSupabaseClient();
    databaseAvailable = true;
    return true;
  } catch (error) {
    console.log('Database not available, using in-memory mode');
    databaseAvailable = false;
    return false;
  }
}

async function saveCampaignToDatabase(
  campaign: Campaign,
  targets: Target[],
  messages: MessageDraft[]
): Promise<{ saved: boolean; id: string }> {
  const dbAvailable = await checkDatabaseAvailable();
  
  if (!dbAvailable) {
    return { saved: false, id: campaign.id };
  }
  
  try {
    const dbCampaign = await dbCreateCampaign({
      name: campaign.name,
      intent: campaign.intent as unknown as Record<string, unknown>,
      settings: campaign.settings as unknown as Record<string, unknown>,
    });
    
    const dbCampaignId = dbCampaign.id;
    
    if (targets.length > 0) {
      await createTargetsBatch(
        targets.map((target) => ({
          campaignId: dbCampaignId,
          name: target.name,
          title: target.title,
          company: target.company,
          website: target.website,
          email: target.email,
          phone: target.phone,
          location: target.location,
          description: target.description,
          source: target.source,
          relevanceScore: target.relevanceScore,
        }))
      );
    }
    
    if (messages.length > 0) {
      await createMessagesBatch(
        messages.map((message) => ({
          campaignId: dbCampaignId,
          targetId: message.targetId,
          channel: message.channel,
          subject: message.subject,
          body: message.body,
          tone: message.tone,
          personalization: message.personalization,
          qualityScore: message.qualityScore,
        }))
      );
    }
    
    console.log(`Campaign saved to database: ${dbCampaignId}`);
    return { saved: true, id: dbCampaignId };
  } catch (error) {
    console.error('Failed to save campaign to database:', error);
    return { saved: false, id: campaign.id };
  }
}

async function updateCampaignInDatabase(
  campaignId: string,
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'COMPLETED'
): Promise<boolean> {
  const dbAvailable = await checkDatabaseAvailable();
  
  if (!dbAvailable) {
    return false;
  }
  
  try {
    const statusMap: Record<string, string> = {
      'PENDING_APPROVAL': 'PENDING_APPROVAL',
      'ACTIVE': 'ACTIVE',
      'COMPLETED': 'COMPLETED',
    };
    
    await updateCampaignStatus(campaignId, statusMap[status]);
    return true;
  } catch (error) {
    console.error('Failed to update campaign status:', error);
    return false;
  }
}

// ============================================
// Main Agent Runner
// ============================================

/** Progress payload when stage is 'complete' */
export interface RunAgentProgressData {
  targets?: number;
  emails?: number;
  avgQuality?: number;
  processingTime?: number;
}

export interface RunAgentParams {
  input: string;
  userId?: string;
  onProgress?: (progress: {
    stage: string;
    message: string;
    progress: number;
    data?: unknown;
  }) => void;
}

export async function runAgent(params: RunAgentParams): Promise<{
  success: boolean;
  campaign?: Campaign;
  progress: {
    stage: string;
    message: string;
    progress: number;
    data?: RunAgentProgressData;
  };
  error?: string;
}> {
  const startTime = Date.now();
  
  if (params.onProgress) {
    params.onProgress({
      stage: 'started',
      message: 'Understanding your request...',
      progress: 5,
    });
  }
  
  try {
    // Step 1: Parse intent with OpenAI
    if (params.onProgress) {
      params.onProgress({
        stage: 'parsing',
        message: 'Analyzing your request...',
        progress: 10,
      });
    }
    
    const intentResult = await parseIntent(params.input);
    
    if (!intentResult.success) {
      return {
        success: false,
        progress: {
          stage: 'error',
          message: intentResult.clarification || 'Could not understand your request',
          progress: 0,
        },
        error: intentResult.clarification,
      };
    }
    
    // Notify parsed
    if (params.onProgress) {
      params.onProgress({
        stage: 'intent_parsed',
        message: `Got it! Reaching out to ${intentResult.count} ${intentResult.targetType}${intentResult.location ? ` in ${intentResult.location}` : ''} about ${intentResult.purpose}`,
        progress: 20,
        data: intentResult,
      });
    }
    
    // Step 2: Search for targets
    if (params.onProgress) {
      params.onProgress({
        stage: 'searching',
        message: `Searching for ${intentResult.targetType}...`,
        progress: 30,
      });
    }
    
    const rawTargets = await searchTargets({
      targetType: intentResult.targetType,
      location: intentResult.location,
      niche: intentResult.niche,
      purpose: intentResult.purpose,
      count: intentResult.count,
    });
    const targets: Target[] = rawTargets.map(mapTargetResultToTarget);

    if (targets.length === 0) {
      return {
        success: false,
        progress: {
          stage: 'no_targets',
          message: "Couldn't find any targets. Try adjusting your search criteria.",
          progress: 40,
        },
        error: 'No targets found',
      };
    }
    
    // Notify targets found
    const avgRelevance = targets.reduce((sum, t) => sum + t.relevanceScore, 0) / targets.length;
    if (params.onProgress) {
      params.onProgress({
        stage: 'targets_found',
        message: `Found ${targets.length} targets! Quality score: ${Math.round(avgRelevance * 100)}%`,
        progress: 50,
        data: {
          targets: targets.slice(0, 5),
          total: targets.length,
          avgRelevance,
        },
      });
    }
    
    // Step 3: Generate emails
    if (params.onProgress) {
      params.onProgress({
        stage: 'generating',
        message: `Generating personalized messages for ${targets.length} targets...`,
        progress: 60,
      });
    }
    
    const emails = await generateBulkEmails({
      targets,
      purpose: intentResult.purpose,
      channel: intentResult.channel,
    });
    
    const avgEmailQuality = emails.reduce((sum, e) => sum + e.qualityScore, 0) / emails.length;
    
    // Step 4: Create campaign with database persistence
    const saveResult = await saveCampaignToDatabase(
      {
        id: `campaign_${Date.now()}`,
        name: `${intentResult.purpose} - ${intentResult.targetType}`,
        intent: {
          channel: intentResult.channel as 'email' | 'dm' | 'whatsapp' | 'generic',
          targetType: intentResult.targetType as 'restaurant_owner' | 'hotel_owner' | 'startup_founder' | 'creator' | 'real_estate_broker' | 'business_owner' | 'professional' | 'generic',
          location: intentResult.location,
          targetNiche: intentResult.niche,
          purpose: intentResult.purpose as 'partnership' | 'influencer_collaboration' | 'hiring' | 'brand_deal' | 'referral' | 'sales' | 'networking' | 'general',
          purposeDescription: intentResult.purpose,
          count: targets.length,
          tone: 'professional',
        },
        status: 'pending_approval',
        targets,
        messages: emails.map((e, i) => ({
          id: `msg_${i}`,
          targetId: targets[i].id,
          target: targets[i],
          channel: intentResult.channel as 'email' | 'dm' | 'whatsapp' | 'generic',
          subject: e.subject,
          body: e.body,
          tone: 'professional' as const,
          personalization: {
            companyReference: true,
            recentNewsReference: false,
            mutualConnection: false,
            nicheSpecific: !!intentResult.niche,
            locationSpecific: !!intentResult.location,
            customHooks: e.personalization,
          },
          qualityScore: e.qualityScore,
          status: 'draft' as const,
          generatedAt: new Date(),
        })),
        stats: {
          totalTargets: targets.length,
          approvedMessages: 0,
          sentMessages: 0,
          deliveredMessages: 0,
          openedMessages: 0,
          clickedMessages: 0,
          repliedMessages: 0,
          bouncedMessages: 0,
          failedMessages: 0,
        },
        settings: {
          channel: intentResult.channel as 'email' | 'dm' | 'whatsapp' | 'generic',
          followUpEnabled: true,
          followUpDelay: 72,
          followUpMaxAttempts: 3,
          trackOpens: true,
          trackClicks: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      targets.map((t, i) => ({
        id: `target_${Date.now()}_${i}`,
        name: t.name,
        title: t.title,
        company: t.company,
        website: t.website,
        email: t.email,
        phone: t.phone,
        location: t.location,
        description: t.description,
        source: t.source,
        relevanceScore: t.relevanceScore,
        dataQuality: t.email !== 'not found' ? 'high' : 'medium',
        discoveredAt: new Date(),
      })),
      emails.map((e, i) => ({
        id: `msg_${Date.now()}_${i}`,
        targetId: `target_${Date.now()}_${i}`,
        target: {
          id: `target_${Date.now()}_${i}`,
          name: targets[i].name,
          title: targets[i].title,
          company: targets[i].company,
          website: targets[i].website,
          email: targets[i].email,
          location: targets[i].location,
          source: targets[i].source,
          relevanceScore: targets[i].relevanceScore,
          dataQuality: 'medium',
          discoveredAt: new Date(),
        },
        channel: intentResult.channel as 'email' | 'dm' | 'whatsapp' | 'generic',
        subject: e.subject,
        body: e.body,
        tone: 'professional' as const,
        personalization: {
          companyReference: true,
          recentNewsReference: false,
          mutualConnection: false,
          nicheSpecific: !!intentResult.niche,
          locationSpecific: !!intentResult.location,
          customHooks: e.personalization,
        },
        qualityScore: e.qualityScore,
        status: 'draft' as const,
        generatedAt: new Date(),
      }))
    );
    
    // Create the final campaign object
    const campaign: Campaign = {
      id: saveResult.id,
      name: `${intentResult.purpose} - ${intentResult.targetType}`,
      intent: {
        channel: intentResult.channel as 'email' | 'dm' | 'whatsapp' | 'generic',
        targetType: intentResult.targetType as 'restaurant_owner' | 'hotel_owner' | 'startup_founder' | 'creator' | 'real_estate_broker' | 'business_owner' | 'professional' | 'generic',
        location: intentResult.location,
        targetNiche: intentResult.niche,
        purpose: intentResult.purpose as 'partnership' | 'influencer_collaboration' | 'hiring' | 'brand_deal' | 'referral' | 'sales' | 'networking' | 'general',
        purposeDescription: intentResult.purpose,
        count: targets.length,
        tone: 'professional',
      },
      status: 'pending_approval',
      targets: targets.map((t, i) => ({
        id: `target_${i}`,
        name: t.name,
        title: t.title,
        company: t.company,
        website: t.website,
        email: t.email,
        phone: t.phone,
        location: t.location,
        description: t.description,
        source: t.source,
        relevanceScore: t.relevanceScore,
        dataQuality: t.email !== 'not found' ? 'high' : 'medium',
        discoveredAt: new Date(),
      })),
      messages: emails.map((e, i) => ({
        id: `msg_${i}`,
        targetId: `target_${i}`,
        target: {
          id: `target_${i}`,
          name: targets[i].name,
          title: targets[i].title,
          company: targets[i].company,
          website: targets[i].website,
          email: targets[i].email,
          location: targets[i].location,
          source: targets[i].source,
          relevanceScore: targets[i].relevanceScore,
          dataQuality: 'medium',
          discoveredAt: new Date(),
        },
        channel: intentResult.channel as 'email' | 'dm' | 'whatsapp' | 'generic',
        subject: e.subject,
        body: e.body,
        tone: 'professional' as const,
        personalization: {
          companyReference: true,
          recentNewsReference: false,
          mutualConnection: false,
          nicheSpecific: !!intentResult.niche,
          locationSpecific: !!intentResult.location,
          customHooks: e.personalization,
        },
        qualityScore: e.qualityScore,
        status: 'draft' as const,
        generatedAt: new Date(),
      })),
      stats: {
        totalTargets: targets.length,
        approvedMessages: 0,
        sentMessages: 0,
        deliveredMessages: 0,
        openedMessages: 0,
        clickedMessages: 0,
        repliedMessages: 0,
        bouncedMessages: 0,
        failedMessages: 0,
      },
      settings: {
        channel: intentResult.channel as 'email' | 'dm' | 'whatsapp' | 'generic',
        followUpEnabled: true,
        followUpDelay: 72,
        followUpMaxAttempts: 3,
        trackOpens: true,
        trackClicks: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Final notification
    if (params.onProgress) {
      params.onProgress({
        stage: 'complete',
        message: `Ready! ${emails.length} personalized messages generated. Quality: ${Math.round(avgEmailQuality * 100)}%`,
        progress: 100,
        data: {
          targets: targets.length,
          emails: emails.length,
          avgQuality: Math.round(avgEmailQuality * 100),
          processingTime: Date.now() - startTime,
        },
      });
    }
    
    return {
      success: true,
      campaign,
      progress: {
        stage: 'complete',
        message: 'Campaign ready for approval',
        progress: 100,
        data: {
          targets: targets.length,
          emails: emails.length,
          avgQuality: Math.round(avgEmailQuality * 100),
        },
      },
    };
  } catch (error) {
    console.error('Agent error:', error);
    
    if (params.onProgress) {
      params.onProgress({
        stage: 'error',
        message: 'Something went wrong. Please try again.',
        progress: 0,
      });
    }
    
    return {
      success: false,
      progress: {
        stage: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        progress: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// Campaign Operations
// ============================================

export async function approveMessage(
  campaignId: string,
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbAvailable = await checkDatabaseAvailable();
    
    if (dbAvailable) {
      const { updateMessageStatus } = await import('@/lib/database/supabase');
      await updateMessageStatus(messageId, 'APPROVED');
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function rejectMessage(
  campaignId: string,
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbAvailable = await checkDatabaseAvailable();
    
    if (dbAvailable) {
      const { updateMessageStatus } = await import('@/lib/database/supabase');
      await updateMessageStatus(messageId, 'REJECTED');
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateMessageContent(
  messageId: string,
  newContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function launchCampaign(
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbAvailable = await checkDatabaseAvailable();
    
    if (dbAvailable) {
      await updateCampaignInDatabase(campaignId, 'ACTIVE');
      console.log(`Campaign launched: ${campaignId}`);
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
