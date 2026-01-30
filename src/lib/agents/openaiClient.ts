// Marketing Agent - OpenAI Integration
// Handles: Intent parsing, web search, email generation

import OpenAI from 'openai';

// ============================================
// Lazy OpenAI Client Initialization
// ============================================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set. Please add it to your .env.local file.');
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  
  return openaiClient;
}

// ============================================
// Types
// ============================================

export interface OutreachRequest {
  input: string;
  userId?: string;
}

export interface IntentResult {
  success: boolean;
  targetType: string;
  location?: string;
  niche?: string;
  purpose: string;
  count: number;
  channel: string;
  confidence: number;
  clarification?: string;
}

export interface TargetResult {
  name: string;
  title?: string;
  company?: string;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  description?: string;
  relevanceScore: number;
  source: string;
}

export interface EmailResult {
  subject: string;
  body: string;
  personalization: string[];
  qualityScore: number;
}

export interface CampaignResult {
  success: boolean;
  intent: IntentResult;
  targets: TargetResult[];
  emails: EmailResult[];
  totalCost: number;
  processingTime: number;
  errors?: string[];
}

// ============================================
// Intent Parsing with OpenAI
// ============================================

export async function parseIntent(input: string): Promise<IntentResult> {
  try {
    const client = getOpenAIClient();
    
    const systemPrompt = `You are an outreach assistant. Parse the user's request and extract:
- target_type: restaurant_owner, hotel_owner, startup_founder, creator, real_estate_broker, business_owner, professional, generic
- location: city or region (optional)
- niche: specific industry or focus (optional) 
- purpose: partnership, influencer_collaboration, hiring, brand_deal, referral, sales, networking, general
- count: number of targets (default 10)
- channel: email, dm, whatsapp, generic (infer from request)

Respond with ONLY a JSON object. No markdown, no explanation.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',  // Fast and cheap
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      success: true,
      targetType: result.target_type || 'generic',
      location: result.location,
      niche: result.niche,
      purpose: result.purpose || 'general',
      count: result.count || 10,
      channel: result.channel || 'email',
      confidence: result.confidence || 0.8,
    };
  } catch (error) {
    console.error('Intent parsing error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error ? error.cause : undefined,
    });
    return {
      success: false,
      targetType: 'generic',
      purpose: 'general',
      count: 10,
      channel: 'email',
      confidence: 0,
      clarification: 'Failed to parse intent. Please rephrase your request.',
    };
  }
}

// ============================================
// Web Search for Targets
// ============================================

export async function searchTargets(params: {
  targetType: string;
  location?: string;
  niche?: string;
  purpose: string;
  count: number;
}): Promise<TargetResult[]> {
  try {
    // Build search query based on intent
    const searchQuery = buildSearchQuery(params);
    
    // Create a comprehensive prompt for GPT-4o to find and research targets
    const systemPrompt = `You are an expert researcher specializing in finding business contact information. 
Your task is to identify and research real businesses/professionals that match the given criteria.

CRITICAL RULES:
1. ONLY include REAL, VERIFIABLE businesses or professionals
2. If you cannot find real data, return an empty array - NEVER make up fake information
3. For each result, try to find: name, title, company, website, email, location, and description
4. Focus on businesses in the specified location and niche
5. Consider the purpose (partnership, hiring, etc.) when evaluating relevance

Return a JSON array with exactly the format below. Each result must be a REAL business or person:

{
  "results": [
    {
      "name": "Full name of the person",
      "title": "Their job title or role",
      "company": "Company name",
      "website": "Company website URL",
      "email": "contact email if publicly available, or 'not found'",
      "phone": "phone number if available, or 'not found'",
      "location": "City/Region",
      "description": "Brief description of what they do",
      "relevanceScore": 0.0-1.0 (how well they match the criteria),
      "whyRelevant": "Brief explanation of why this is a good match"
    }
  ]
}

If you cannot find ${params.count} real targets, return fewer results or an empty array. Do NOT fabricate information.`;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Find ${params.count} ${params.targetType}${params.niche ? ` in the ${params.niche} niche` : ''}${params.location ? ` in ${params.location}` : ''} for ${params.purpose}.

Please search your knowledge for real businesses and professionals matching this criteria. Focus on finding:
- Business owners, founders, or decision-makers
- Contact information (email, phone)
- Relevant company details

If you cannot find verifiable information, return an empty array rather than making up data.` },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    const resultText = response.choices[0].message.content || '';
    
    // Parse the JSON response
    let parsedResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = resultText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        parsedResult = parsed.results || parsed;
      } else {
        parsedResult = JSON.parse(resultText);
        parsedResult = parsedResult.results || parsedResult;
      }
    } catch (parseError) {
      console.error('Failed to parse search results:', parseError);
      console.log('Raw response:', resultText);
      // Try to extract any JSON-like structure
      try {
        const lines = resultText.split('\n');
        const jsonLines = lines.filter(line => line.trim().startsWith('{') || line.trim().startsWith('['));
        if (jsonLines.length > 0) {
          const jsonStr = jsonLines.join('\n');
          parsedResult = JSON.parse(jsonStr);
          parsedResult = parsedResult.results || parsedResult;
        }
      } catch {
        return [];
      }
    }

    if (!Array.isArray(parsedResult)) {
      console.error('Parsed result is not an array:', parsedResult);
      return [];
    }

    // Transform and validate results
    const targets: TargetResult[] = [];
    for (const item of parsedResult) {
      if (!item.name || item.name === 'Unknown') continue;
      
      // Only include if we have at least name and company
      if (!item.company) continue;
      
      targets.push({
        name: item.name || 'Unknown',
        title: item.title,
        company: item.company,
        website: item.website || '',
        email: item.email || 'not found',
        phone: item.phone || '',
        location: item.location || params.location || '',
        description: item.description || '',
        relevanceScore: Math.max(0, Math.min(1, item.relevanceScore || 0.7)),
        source: 'openai_research',
      });
    }

    console.log(`✅ Found ${targets.length} real targets via OpenAI research`);
    return targets.slice(0, params.count);
    
  } catch (error) {
    console.error('❌ Target search error:', error);
    
    // Return empty array on error - let the caller handle it
    return [];
  }
}

function buildSearchQuery(params: {
  targetType: string;
  location?: string;
  niche?: string;
  purpose: string;
  count: number;
}): string {
  const parts: string[] = [];
  
  // Target type
  const typeMap: Record<string, string> = {
    restaurant_owner: 'restaurants',
    hotel_owner: 'boutique hotels',
    startup_founder: 'startup founders',
    creator: 'content creators',
    real_estate_broker: 'real estate agents',
    business_owner: 'local businesses',
    professional: 'professionals',
  };
  
  parts.push(typeMap[params.targetType] || params.targetType);
  
  // Location
  if (params.location) {
    parts.push(params.location);
  }
  
  // Purpose context
  if (params.purpose === 'partnership') {
    parts.push('open to partnerships');
  } else if (params.purpose === 'hiring') {
    parts.push('hiring');
  } else if (params.purpose === 'brand_deal') {
    parts.push('brand collaborations');
  }
  
  return parts.join(' ');
}

// ============================================
// Generate Personalized Email
// ============================================

export async function generateEmail(params: {
  target: TargetResult;
  purpose: string;
  channel: string;
}): Promise<EmailResult> {
  try {
    const systemPrompt = `You are an expert copywriter specializing in cold outreach.

Rules:
- Be personalized, not generic
- Maximum 3 short paragraphs
- Professional but warm tone
- Include a clear call-to-action
- No fluff or filler
- Match the channel: email (formal), dm (casual)

Respond with ONLY a JSON object:
{
  "subject": "Email subject line (if email)",
  "body": "The message body",
  "personalization": ["specific detail 1", "specific detail 2"],
  "qualityScore": 0.0-1.0
}`;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `
Target: ${params.target.name}
Title: ${params.target.title}
Company: ${params.target.company}
Website: ${params.target.website}
Description: ${params.target.description}
Location: ${params.target.location}
Purpose: ${params.purpose}
Channel: ${params.channel}
        ` },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      subject: result.subject || `Partnership with ${params.target.company}`,
      body: result.body,
      personalization: result.personalization || [],
      qualityScore: result.qualityScore || 0.7,
    };
  } catch (error) {
    console.error('Email generation error:', error);
    return {
      subject: `Reaching out from ${params.target.company}`,
      body: `Hi ${params.target.name},\n\nI'd love to connect.\n\nBest`,
      personalization: [],
      qualityScore: 0.5,
    };
  }
}

// ============================================
// Generate Bulk Emails
// ============================================

export async function generateBulkEmails(params: {
  targets: TargetResult[];
  purpose: string;
  channel: string;
}): Promise<EmailResult[]> {
  const emails: EmailResult[] = [];
  
  // Process in parallel for speed
  const promises = params.targets.map(async (target) => {
    const email = await generateEmail({
      target,
      purpose: params.purpose,
      channel: params.channel,
    });
    return email;
  });
  
  emails.push(...await Promise.all(promises));
  
  return emails;
}

// ============================================
// Complete Campaign Execution
// ============================================

export async function executeCampaign(request: OutreachRequest): Promise<CampaignResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    // Step 1: Parse intent
    const intent = await parseIntent(request.input);
    
    if (!intent.success) {
      return {
        success: false,
        intent,
        targets: [],
        emails: [],
        totalCost: 0,
        processingTime: Date.now() - startTime,
        errors: [intent.clarification || 'Failed to parse intent'],
      };
    }
    
    // Step 2: Search for targets
    const targets = await searchTargets({
      targetType: intent.targetType,
      location: intent.location,
      niche: intent.niche,
      purpose: intent.purpose,
      count: intent.count,
    });
    
    if (targets.length === 0) {
      return {
        success: false,
        intent,
        targets: [],
        emails: [],
        totalCost: 0.01,
        processingTime: Date.now() - startTime,
        errors: ['No targets found. Try adjusting your search criteria.'],
      };
    }
    
    // Step 3: Generate emails
    const emails = await generateBulkEmails({
      targets,
      purpose: intent.purpose,
      channel: intent.channel,
    });
    
    // Calculate stats
    const avgQuality = emails.reduce((sum, e) => sum + e.qualityScore, 0) / emails.length;
    const estimatedCost = (intent.count * 0.005); // Rough estimate: ~$0.005 per target
    
    return {
      success: true,
      intent,
      targets,
      emails,
      totalCost: estimatedCost,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Campaign execution error:', error);
    return {
      success: false,
      intent: { success: false, targetType: 'generic', purpose: 'general', count: 10, channel: 'email', confidence: 0 },
      targets: [],
      emails: [],
      totalCost: 0,
      processingTime: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

// ============================================
// Conversation Handling
// ============================================

export async function handleConversation(params: {
  message: string;
  context?: {
    currentStage: 'intent' | 'targets' | 'emails' | 'sending' | 'complete';
    campaignData?: any;
  };
}): Promise<{
  response: string;
  action?: string;
  newContext?: any;
}> {
  const { message, context } = params;
  
  // Determine what the user wants to do
  const lowerMessage = message.toLowerCase();
  
  // ============================================
  // Feedback Commands
  // ============================================
  
  // Handle ratings (1-5 stars)
  const ratingMatch = lowerMessage.match(/^(\d)\s*(stars?|rating|out of 5)?/);
  if (ratingMatch && context?.campaignData?.id) {
    const rating = parseInt(ratingMatch[1]) as 1 | 2 | 3 | 4 | 5;
    if (rating >= 1 && rating <= 5) {
      return {
        response: `⭐ Thanks for the ${rating} star rating! Your feedback helps me improve.`,
        action: 'submit_rating',
        newContext: { 
          currentStage: context.currentStage,
          feedback: { type: 'campaign_rating', rating },
          campaignData: context.campaignData,
        },
      };
    }
  }
  
  // Handle thumbs up/down
  if (lowerMessage.includes('thumbs up') || lowerMessage.includes('👍') || lowerMessage.includes('good')) {
    return {
      response: '👍 Great! Glad the campaign is working well for you.',
      action: 'submit_feedback',
      newContext: { 
        currentStage: context?.currentStage,
        feedback: { type: 'message_rating', feedback: 'positive' },
      },
    };
  }
  
  if (lowerMessage.includes('thumbs down') || lowerMessage.includes('👎') || lowerMessage.includes('bad')) {
    return {
      response: '👎 Sorry to hear that. What could be improved?',
      action: 'request_feedback',
      newContext: { 
        currentStage: context?.currentStage,
        feedback: { type: 'message_rating', feedback: 'negative' },
      },
    };
  }
  
  // Handle "not good" or "could be better"
  if (lowerMessage.includes('not good') || lowerMessage.includes('could be better') || lowerMessage.includes('needs improvement')) {
    return {
      response: "I appreciate the honest feedback. What specifically could be improved? (targets, messages, timing, etc.)",
      action: 'request_detailed_feedback',
      newContext: { 
        currentStage: context?.currentStage,
        awaitingFeedback: true,
      },
    };
  }
  
  // Handle response received
  if (lowerMessage.includes('got a response') || lowerMessage.includes('replied') || lowerMessage.includes('they responded')) {
    const responseType = lowerMessage.includes('positive') || lowerMessage.includes('yes') || lowerMessage.includes('interested') 
      ? 'positive' 
      : lowerMessage.includes('not interested') || lowerMessage.includes('no') 
        ? 'negative' 
        : 'neutral';
    
    return {
      response: responseType === 'positive' 
        ? '🎉 Awesome! That\'s great to hear. Do you want to follow up or start a new campaign?'
        : responseType === 'negative'
          ? 'Okay, thanks for letting me know. That\'s valuable feedback for future campaigns.'
          : 'Got it! I\'ll note that response.',
      action: 'record_response',
      newContext: { 
        currentStage: context?.currentStage,
        feedback: { type: 'response_received', responseType },
      },
    };
  }
  
  // Handle target quality feedback
  if (lowerMessage.includes('target') && (lowerMessage.includes('wrong') || lowerMessage.includes('not accurate') || lowerMessage.includes('not real'))) {
    return {
      response: 'Thanks for flagging that target issue. I\'ll use this feedback to improve target discovery. Do you have any suggestions for better sources?',
      action: 'record_target_feedback',
      newContext: { 
        currentStage: context?.currentStage,
        feedback: { type: 'target_quality', feedback: 'inaccurate' },
      },
    };
  }
  
  // Handle "they replied" with details
  if (lowerMessage.includes('they said') || lowerMessage.includes('they wrote')) {
    const userReply = message.match(/(?:they said|they wrote)(?:\s*:?\s*|:\s*)?(.+)/i)?.[1]?.trim();
    return {
      response: 'Interesting! I\'ll log that response. This feedback helps me understand what works best.',
      action: 'record_response_with_note',
      newContext: { 
        currentStage: context?.currentStage,
        feedback: { type: 'response_received', userReply },
      },
    };
  }
  
  // Handle general feedback with comment
  if (lowerMessage.startsWith('feedback') || lowerMessage.startsWith('note:') || lowerMessage.startsWith('comment:')) {
    const comment = lowerMessage.replace(/^(feedback|note:|comment:)\s*/i, '').trim();
    return {
      response: '📝 Thanks for the feedback! I\'ve recorded it.',
      action: 'submit_feedback',
      newContext: { 
        currentStage: context?.currentStage,
        feedback: { type: 'campaign_rating', comment },
      },
    };
  }
  
  // ============================================
  // Approval Actions
  // ============================================
  
  // Handle approval actions
  if (context?.currentStage === 'targets') {
    if (lowerMessage.includes('yes') || lowerMessage.includes('send') || lowerMessage.includes('proceed')) {
      return {
        response: 'Great! Generating personalized emails for each target...',
        action: 'generate_emails',
        newContext: { currentStage: 'emails' },
      };
    }
    
    if (lowerMessage.includes('change') || lowerMessage.includes('different')) {
      return {
        response: 'What would you like to change? (location, number, purpose)',
        action: 'ask_changes',
      };
    }
    
    if (lowerMessage.includes('show') || lowerMessage.includes('see')) {
      return {
        response: `Here are the ${context.campaignData?.targets?.length || 0} targets I found. Reply 'Yes' to proceed.`,
        action: 'show_targets',
      };
    }
  }
  
  if (context?.currentStage === 'emails') {
    if (lowerMessage.includes('send') || lowerMessage.includes('go')) {
      return {
        response: '🚀 Starting to send messages now...',
        action: 'send_emails',
        newContext: { currentStage: 'sending' },
      };
    }
    
    if (lowerMessage.includes('review') || lowerMessage.includes('show')) {
      return {
        response: 'Here are your email drafts. Reply with the number to edit, or "Send all".',
        action: 'show_emails',
      };
    }
  }
  
  // ============================================
  // Help Command
  // ============================================
  
  if (lowerMessage.includes('help') || lowerMessage.includes('?')) {
    return {
      response: `🤖 Marketing Agent - How can I help?

📝 CREATE CAMPAIGNS
"Reach out to 10 restaurants in NYC about partnerships"

📊 CAMPAIGN STATUS
"Status" - Check campaign progress
"How's it going?" - See current results

⭐ GIVE FEEDBACK
"4 stars" or "rating: 5" - Rate the campaign
"Thumbs up/down" - Quick feedback
"Got a response: positive/negative" - Record replies
"They said [message]" - Log response content

🔄 ADJUST CAMPAIGNS
"Change location to Miami"
"Increase to 20 targets"

✅ APPROVE/ACT
"Send now" - Send all pending messages
"Review" - Show draft messages`,
      action: 'show_help',
    };
  }
  
  // ============================================
  // Default: treat as new campaign
  // ============================================
  
  return {
    response: "I'd be happy to help with that! Let me create a new outreach campaign.",
    action: 'new_campaign',
    newContext: { currentStage: 'intent' },
  };
}
