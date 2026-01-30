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
import { parseIntent, validateIntent, formatIntentForAI } from './intentParser';
import { selectChannel } from './channelSelector';
import { generateMessage, generateBatchMessages } from './messageGenerator';

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
    const parsedIntent = parseIntent(state.rawInput);
    
    // Validate the parsed intent
    const validation = validateIntent(parsedIntent);
    
    if (!validation.valid) {
      return {
        error: `Intent parsing failed: ${validation.errors.join(', ')}`,
        progress: {
          ...state.progress,
          status: 'error',
          steps: [...state.progress.steps, {
            id: 'parse_input',
            name: 'Parse Input',
            status: 'failed',
            message: validation.errors.join(', '),
            completedAt: new Date(),
          }],
          updatedAt: new Date(),
        },
      };
    }
    
    // Select channel
    const intent = formatIntentForAI(parsedIntent);
    const channelRecommendation = selectChannel(intent);
    
    // If channel was generic, use the recommendation
    if (intent.channel === 'generic') {
      intent.channel = channelRecommendation.channel;
    }
    
    const parseTime = Date.now() - startTime;
    
    return {
      parsedIntent,
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
    
    // Generate search queries based on intent
    const searchQueries = generateSearchQueries(intent);
    
    // Discover targets (mock implementation - would integrate with actual search APIs)
    const targets = await discoverTargets(searchQueries, intent);
    
    const discoveryTime = Date.now() - startTime;
    
    return {
      targets,
      targetDiscoveryResult: {
        totalFound: targets.length,
        searchQueries,
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
          message: `Found ${targets.length} targets via ${searchQueries.length} search queries`,
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
// Target Discovery (Mock Implementation)
// ============================================

function generateSearchQueries(intent: OutreachIntent): string[] {
  const queries: string[] = [];
  
  // Generate queries based on intent
  const targetType = intent.targetType.replace(/_/g, ' ');
  const location = intent.location ? ` in ${intent.location}` : '';
  const niche = intent.targetNiche ? ` in the ${intent.targetNiche}` : '';
  const purpose = intent.purposeDescription;
  
  // Primary query
  queries.push(`${targetType}${location} ${purpose}`);
  
  // Alternative queries for diversity
  queries.push(`${targetType} owners${location}`);
  queries.push(`${targetType}${niche}${location}`);
  
  // Specific variations based on type
  if (intent.targetType === 'restaurant_owner') {
    queries.push(`restaurant owners${location} looking for partnerships`);
    queries.push(`food businesses${location} expansion`);
  } else if (intent.targetType === 'hotel_owner') {
    queries.push(`boutique hotels${location}`);
    queries.push(`hospitality businesses${location}`);
  } else if (intent.targetType === 'startup_founder') {
    queries.push(`startup founders${location} hiring`);
    queries.push(`tech founders${location} growth`);
  } else if (intent.targetType === 'creator') {
    queries.push(`${intent.targetNiche || 'content'} creators${location}`);
    queries.push(`influencers${location} brand partnerships`);
  } else if (intent.targetType === 'real_estate_broker') {
    queries.push(`real estate agents${location}`);
    queries.push(`property professionals${location}`);
  }
  
  return queries.slice(0, 5); // Limit to 5 queries
}

async function discoverTargets(
  queries: string[],
  intent: OutreachIntent
): Promise<Target[]> {
  // Mock implementation - in production, this would integrate with:
  // - Serper/Tavily for web search
  // - Hunter/Apollo for email enrichment
  // - LinkedIn API for professional data
  // - Social media APIs for creator discovery
  
  const mockTargets: Target[] = [
    {
      id: `target_${Date.now()}_1`,
      name: 'Sarah Johnson',
      title: 'Owner & Founder',
      company: 'Urban Bites Restaurant',
      website: 'https://urbanbites.com',
      email: 'sarah@urbanbites.com',
      location: intent.location || 'New York, NY',
      description: 'Modern American cuisine restaurant in Brooklyn',
      source: 'web_search',
      relevanceScore: 0.92,
      dataQuality: 'medium',
      discoveredAt: new Date(),
    },
    {
      id: `target_${Date.now()}_2`,
      name: 'Michael Chen',
      title: 'Executive Chef & Owner',
      company: 'Sakura Japanese Kitchen',
      website: 'https://sakuranyc.com',
      email: 'michael@sakuranyc.com',
      location: intent.location || 'New York, NY',
      description: 'Upscale Japanese dining experience',
      source: 'web_search',
      relevanceScore: 0.88,
      dataQuality: 'medium',
      discoveredAt: new Date(),
    },
    {
      id: `target_${Date.now()}_3`,
      name: 'Emily Rodriguez',
      title: 'Restaurant Group Director',
      company: 'Flavor Collective',
      website: 'https://flavorcollective.com',
      email: 'emily@flavorcollective.com',
      location: intent.location || 'New York, NY',
      description: 'Restaurant group with 5 locations',
      source: 'web_search',
      relevanceScore: 0.85,
      dataQuality: 'high',
      discoveredAt: new Date(),
    },
  ];
  
  // Adjust count based on intent
  const targetCount = Math.min(intent.count, mockTargets.length);
  
  return mockTargets.slice(0, targetCount);
}

// ============================================
// Main Agent Runner
// ============================================

export interface RunAgentParams {
  input: string;
  userId?: string;
  onProgress?: (progress: AgentProgress) => void;
}

export async function runAgent(params: RunAgentParams): Promise<{
  success: boolean;
  campaign?: Campaign;
  progress: AgentProgress;
  error?: string;
}> {
  // Initialize state
  const initialState: AgentState = {
    rawInput: params.input,
    userId: params.userId,
    progress: {
      sessionId: `session_${Date.now()}`,
      steps: [{
        id: 'parse_input',
        name: 'Parse Input',
        status: 'in_progress',
        progress: 0,
        startedAt: new Date(),
      }],
      currentStep: 1,
      totalSteps: 5,
      status: 'running',
      startedAt: new Date(),
      updatedAt: new Date(),
    },
  };
  
  // Progress callback
  if (params.onProgress) {
    params.onProgress(initialState.progress);
  }
  
  try {
    // Step 1: Parse input and select channel
    let state = await parseInputNode(initialState) as AgentState;
    if (state.error) throw new Error(state.error);
    if (params.onProgress && state.progress) {
      params.onProgress(state.progress);
    }
    
    // Step 2: Discover targets
    state = await discoverTargetsNode(state) as AgentState;
    if (state.error) throw new Error(state.error);
    if (params.onProgress && state.progress) {
      params.onProgress(state.progress);
    }
    
    // Step 3: Generate messages
    state = await generateMessagesNode(state) as AgentState;
    if (state.error) throw new Error(state.error);
    if (params.onProgress && state.progress) {
      params.onProgress(state.progress);
    }
    
    // Step 4: Create campaign
    state = await createCampaignNode(state) as AgentState;
    if (state.error) throw new Error(state.error);
    if (params.onProgress && state.progress) {
      params.onProgress(state.progress);
    }
    
    return {
      success: true,
      campaign: state.campaign,
      progress: state.progress,
    };
  } catch (error) {
    const errorState: AgentState = {
      ...initialState,
      error: error instanceof Error ? error.message : 'Unknown error',
      progress: {
        ...initialState.progress,
        status: 'error',
        updatedAt: new Date(),
      },
    };
    
    return {
      success: false,
      progress: errorState.progress,
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
    // In production, update the message status in the database
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
    // In production, update the message status in the database
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
    // In production, update the message content in the database
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
  // For demo, just return success without database
  return { success: true };
}
