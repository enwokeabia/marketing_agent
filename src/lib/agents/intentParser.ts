// Marketing Agent - Intent Parser

import { 
  OutreachIntent, 
  ParsedIntent, 
  OutreachChannel, 
  TargetType,
  OutreachPurpose,
  MessageTone 
} from '@/types';

// ============================================
// Intent Parsing Logic
// ============================================

const CHANNEL_PATTERNS: Record<OutreachChannel, RegExp[]> = {
  email: [
    /\bemail\s+\d+/i,
    /\bemail\s+(me|us|them)/i,
    /\bsend\s+(an?\s+)?email/i,
    /\bvia\s+email/i,
    /\bmail\s+to/i,
    /\bwrite\s+(them|him|her)\s+an?\s+email/i,
  ],
  dm: [
    /\bdm\s+\d+/i,
    /\bdirect\s+message/i,
    /\bmessage\s+(on\s+)?(twitter|x|linkedin|instagram)/i,
    /\breach\s+out\s+(on|via)\s+(twitter|x|linkedin)/i,
    /\bsend\s+a\s+dm/i,
  ],
  whatsapp: [
    /\bwhatsapp/i,
    /\bmessage\s+(on\s+)?whatsapp/i,
    /\bsend\s+(a\s+)?whatsapp/i,
  ],
  generic: [
    /\breach\s+out\s+to/i,
    /\bcontact\s+\d+/i,
    /\bconnect\s+with/i,
    /\boutreach\s+to/i,
    /\bget\s+in\s+touch\s+with/i,
    /\bapproach/i,
  ],
};

const TARGET_TYPE_PATTERNS: Record<TargetType, RegExp[]> = {
  restaurant_owner: [
    /\brestaurant\s+(owner|manager|proprietor)/i,
    /\brestaurant\s+owners?/i,
    /\bfood\s+(places?|business|establishments?)/i,
    /\beateries/i,
    /\bdining\s+(places?|establishments?|venues?)/i,
    /\bchef\s+(owners?|proprietors?)/i,
  ],
  hotel_owner: [
    /\bhotel\s+(owner|manager|proprietor)/i,
    /\bboutique\s+hotels?/i,
    /\bluxury\s+hotels?/i,
    /\bhotels?\s+in/i,
    /\baccommodations?/i,
    /\bhospitality\s+(business|industry|owners?)/i,
  ],
  startup_founder: [
    /\bfounder[s]?/i,
    /\bco-?founder[s]?/i,
    /\bstartup\s+(founder|ceo|owner)/i,
    /\bstartup\s+founder[s]?/i,
    /\btech\s+founder[s]?/i,
    /\bentrepreneur[s]?/i,
  ],
  creator: [
    /\bcreator[s]?/i,
    /\binfluencer[s]?/i,
    /\bcontent\s+creator[s]?/i,
    /\b(youtuber|streamer|blogger|vlogger)/i,
    /\bsocial\s+media\s+(creator|influencer|star)/i,
    /\bdigital\s+creator[s]?/i,
  ],
  real_estate_broker: [
    /\breal\s+estate\s+(agent|broker|owner|professional)/i,
    /\brealtor[s]?/i,
    /\bproperty\s+(agent|broker|dealer)/i,
    /\breal\s+estate\s+professional[s]?/i,
  ],
  business_owner: [
    /\bbusiness\s+owner[s]?/i,
    /\bcompany\s+owner[s]?/i,
    /\bentrepreneur[s]?/i,
    /\bsmall\s+business\s+owner[s]?/i,
    /\blocal\s+business\s+owner[s]?/i,
  ],
  professional: [
    /\bprofessional[s]?/i,
    /\bexpert[s]?/i,
    /\bspecialist[s]?/i,
    /\bconsultant[s]?/i,
  ],
  generic: [],
};

const NICHE_PATTERNS: [RegExp, string][] = [
  [/\bfitness\s+(creator|influencer|coach|trainer|brand)/i, 'fitness'],
  [/\bwellness\s+(creator|influencer|brand)/i, 'wellness'],
  [/\bsustainable\s+(fashion|clothing|brand)/i, 'sustainable fashion'],
  [/\bfashion\s+(creator|influencer|brand|designer)/i, 'fashion'],
  [/\btravel\s+(creator|influencer|blogger)/i, 'travel'],
  [/\bfood\s+(creator|influencer|blogger|chef)/i, 'food'],
  [/\btech\s+(creator|influencer|reviewer)/i, 'tech'],
  [/\blifestyle\s+(creator|influencer)/i, 'lifestyle'],
  [/\bbeauty\s+(creator|influencer|brand)/i, 'beauty'],
];

const PURPOSE_PATTERNS: Record<OutreachPurpose, RegExp[]> = {
  partnership: [
    /\bpartnership[s]?/i,
    /\bcollaborat(e|ion|ing)/i,
    /\bwork\s+together/i,
    /\bteam\s+up/i,
    /\bjoint\s+venture/i,
    /\bco-?brand/i,
  ],
  influencer_collaboration: [
    /\binfluencer\s+(collaboration|deal|partnership)/i,
    /\bcreator\s+(collaboration|deal|partnership)/i,
    /\bambassador\s+program/i,
    /\bbrand\s+deal[s]?/i,
    /\bpromotional\s+collaboration/i,
  ],
  hiring: [
    /\bhire[s]?/i,
    /\brecruit(ing|ment)?/i,
    /\blooking\s+for\s+(a\s+)?(sales rep|employee|team\s+member)/i,
    /\bjob\s+opening[s]?/i,
    /\btalent\s+acquisition/i,
  ],
  brand_deal: [
    /\bbrand\s+deal[s]?/i,
    /\bbrand\s+collaboration[s]?/i,
    /\bpaid\s+partnership/i,
    /\bsponsored\s+(content|post)/i,
  ],
  referral: [
    /\breferral[s]?/i,
    /\brefer\s+(us|me|our)/i,
    /\brecommend(ation|ing)?/i,
    /\bclient\s+referral[s]?/i,
  ],
  sales: [
    /\bsale[s]?/i,
    /\boffer[s]?/i,
    /\bproduct\s+demo/i,
    /\bpricing\s+plan[s]?/i,
    /\bbuy\s+our/i,
  ],
  networking: [
    /\bnetwork(ing)?/i,
    /\bconnect(ion)?/i,
    /\bmeet\s+(and\s+)?greet/i,
    /\bprofessional\s+connection/i,
  ],
  general: [
    /\boutreach/i,
    /\breach\s+out/i,
    /\bcontact\s+(them|us)/i,
    /\bget\s+in\s+touch/i,
  ],
};

const TONE_PATTERNS: Record<MessageTone, RegExp[]> = {
  professional: [
    /\bprofessional(ly)?/i,
    /\bbusiness(like)?/i,
    /\bformal(ly)?/i,
    /\bcorporate/i,
    /\bproper/i,
  ],
  casual: [
    /\bcasual(ly)?/i,
    /\bfriendly/i,
    /\brelaxed/i,
    /\bchill/i,
    /\bchill\s+and\s+friendly/i,
  ],
  direct: [
    /\bdirect(ly)?/i,
    /\bstraightforward/i,
    /\bto\s+the\s+point/i,
    /\bno-?nonsense/i,
  ],
  friendly: [
    /\bfriendly/i,
    /\bwarm/i,
    /\bapproachable/i,
  ],
};

// ============================================
// Main Intent Parser
// ============================================

export function parseIntent(input: string): ParsedIntent {
  const lowerInput = input.toLowerCase();
  
  // Extract count
  const count = extractCount(lowerInput);
  
  // Detect channel
  const channel = detectChannel(lowerInput);
  
  // Detect target type
  const targetType = detectTargetType(lowerInput);
  
  // Detect niche
  const niche = detectNiche(lowerInput);
  
  // Detect location
  const location = detectLocation(lowerInput);
  
  // Detect purpose
  const { purpose, purposeDescription } = detectPurpose(lowerInput);
  
  // Detect tone
  const tone = detectTone(lowerInput);
  
  // Calculate confidence
  const confidence = calculateConfidence({
    channel,
    targetType,
    purpose,
    count,
    hasNiche: !!niche,
    hasLocation: !!location,
  });
  
  // Generate suggestions
  const suggestions = generateSuggestions({
    channel,
    targetType,
    purpose,
    niche,
    location,
  });
  
  return {
    rawInput: input,
    channel,
    targetType,
    targetNiche: niche,
    location,
    purpose: purposeDescription,
    purposeDescription: purposeDescription,
    count,
    tone,
    confidence,
    suggestions,
  };
}

// ============================================
// Extraction Helpers
// ============================================

function extractCount(input: string): number {
  const numberWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    'fifteen': 15, 'twenty': 20, 'twenty-five': 25, 'thirty': 30,
  };
  
  // Try to find numeric pattern
  const numericMatch = input.match(/(\d+)/);
  if (numericMatch) {
    return parseInt(numericMatch[1], 10);
  }
  
  // Try to find word number
  for (const [word, number] of Object.entries(numberWords)) {
    const pattern = new RegExp(`\\b${word}\\b`);
    if (pattern.test(input)) {
      return number;
    }
  }
  
  // Default to 10
  return 10;
}

function detectChannel(input: string): OutreachChannel {
  for (const [channel, patterns] of Object.entries(CHANNEL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        return channel as OutreachChannel;
      }
    }
  }
  
  // Default to generic
  return 'generic';
}

function detectTargetType(input: string): TargetType {
  for (const [targetType, patterns] of Object.entries(TARGET_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        return targetType as TargetType;
      }
    }
  }
  
  // Try to extract from context
  const extracted = extractTargetFromContext(input);
  if (extracted) {
    return extracted;
  }
  
  return 'generic';
}

function extractTargetFromContext(input: string): TargetType | null {
  // Look for patterns like "X in Y" or "about X"
  const patterns = [
    /(?:boutique\s+)?hotels?/i,
    /restaurant[s]?/i,
    /startup[s]?/i,
    /founder[s]?/i,
    /creator[s]?/i,
    /influencer[s]?/i,
    /real\s+estate\s+(agent|broker)s?/i,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const matched = match[0].toLowerCase();
      
      if (matched.includes('hotel')) return 'hotel_owner';
      if (matched.includes('restaurant')) return 'restaurant_owner';
      if (matched.includes('founder') || matched.includes('startup')) return 'startup_founder';
      if (matched.includes('creator') || matched.includes('influencer')) return 'creator';
      if (matched.includes('real estate') || matched.includes('broker') || matched.includes('agent')) return 'real_estate_broker';
    }
  }
  
  return null;
}

function detectNiche(input: string): string | undefined {
  for (const [pattern, niche] of NICHE_PATTERNS) {
    if (pattern.test(input)) {
      return niche;
    }
  }
  
  return undefined;
}

function detectLocation(input: string): string | undefined {
  const US_CITIES: Record<string, string> = {
    'nyc': 'New York, NY',
    'new york': 'New York, NY',
    'ny': 'New York, NY',
    'los angeles': 'Los Angeles, CA',
    'la': 'Los Angeles, CA',
    'sf': 'San Francisco, CA',
    'san francisco': 'San Francisco, CA',
    'chicago': 'Chicago, IL',
    'miami': 'Miami, FL',
    'dc': 'Washington, DC',
    'washington': 'Washington, DC',
    'boston': 'Boston, MA',
    'seattle': 'Seattle, WA',
    'austin': 'Austin, TX',
    'denver': 'Denver, CO',
    'atlanta': 'Atlanta, GA',
    'charlotte': 'Charlotte, NC',
    'dallas': 'Dallas, TX',
    'houston': 'Houston, TX',
    'philadelphia': 'Philadelphia, PA',
    'phoenix': 'Phoenix, AZ',
    'san diego': 'San Diego, CA',
    'san jose': 'San Jose, CA',
  };
  
  for (const [keyword, location] of Object.entries(US_CITIES)) {
    if (input.includes(keyword)) {
      return location;
    }
  }
  
  return undefined;
}

function detectPurpose(input: string): { purpose: OutreachPurpose; purposeDescription: string } {
  for (const [purpose, patterns] of Object.entries(PURPOSE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        const description = extractPurposeDescription(input, purpose);
        return {
          purpose: purpose as OutreachPurpose,
          purposeDescription: description,
        };
      }
    }
  }
  
  return {
    purpose: 'general',
    purposeDescription: 'general outreach',
  };
}

function extractPurposeDescription(input: string, purpose: string): string {
  // Extract the purpose context from the input
  const purposePhrases: Record<string, RegExp[]> = {
    partnership: [
      /about\s+(a\s+)?partnership/i,
      /for\s+(a\s+)?partnership/i,
      /regarding\s+(a\s+)?partnership/i,
    ],
    influencer_collaboration: [
      /for\s+influencer\s+collaboration/i,
      /about\s+influencer/i,
      /for\s+creator\s+collaboration/i,
    ],
    hiring: [
      /hiring\s+\w+/i,
      /looking\s+for\s+\w+/i,
      /about\s+(a\s+)?job/i,
    ],
    brand_deal: [
      /for\s+brand\s+deal/i,
      /about\s+(a\s+)?brand\s+deal/i,
      /for\s+brand\s+collaboration/i,
    ],
    referral: [
      /about\s+referral/i,
      /for\s+referral/i,
      /for\s+referrals/i,
    ],
  };
  
  const patterns = purposePhrases[purpose] || [];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[0].replace(/^(about|for)\s+/i, '').trim();
    }
  }
  
  return `${purpose} outreach`;
}

function detectTone(input: string): MessageTone {
  for (const [tone, patterns] of Object.entries(TONE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        return tone as MessageTone;
      }
    }
  }
  
  // Default based on channel
  if (input.includes('dm') || input.includes('direct message')) {
    return 'casual';
  }
  
  return 'professional';
}

function calculateConfidence(params: {
  channel: OutreachChannel;
  targetType: TargetType;
  purpose: OutreachPurpose;
  count: number;
  hasNiche: boolean;
  hasLocation: boolean;
}): number {
  let confidence = 0.5;
  
  // Channel detection
  if (params.channel !== 'generic') confidence += 0.15;
  
  // Target type detection
  if (params.targetType !== 'generic') confidence += 0.15;
  
  // Purpose detection
  if (params.purpose !== 'general') confidence += 0.1;
  
  // Specificity
  if (params.hasNiche) confidence += 0.05;
  if (params.hasLocation) confidence += 0.05;
  
  // Reasonable count
  if (params.count >= 1 && params.count <= 50) confidence += 0.05;
  
  return Math.min(confidence, 1);
}

function generateSuggestions(params: {
  channel?: OutreachChannel;
  targetType?: TargetType;
  purpose?: string;
  niche?: string;
  location?: string;
}): string[] {
  const suggestions: string[] = [];
  
  if (!params.channel || params.channel === 'generic') {
    suggestions.push('Consider specifying a channel (Email, DM, WhatsApp)');
  }
  
  if (!params.location && !params.niche) {
    suggestions.push('Adding a location or niche will help find more relevant targets');
  }
  
  if (params.purpose === 'general') {
    suggestions.push('Being more specific about the purpose (partnership, hiring, etc.) will improve message relevance');
  }
  
  return suggestions;
}

// ============================================
// Intent Validation
// ============================================

export function validateIntent(parsed: ParsedIntent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (parsed.count < 1 || parsed.count > 100) {
    errors.push('Target count should be between 1 and 100');
  }
  
  if (parsed.confidence < 0.5) {
    errors.push('Could not confidently parse your intent. Please be more specific.');
  }
  
  if (parsed.targetType === 'generic' && !parsed.targetNiche) {
    errors.push('Consider specifying what type of targets you want to reach');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Intent Formatting for AI
// ============================================

export function formatIntentForAI(parsed: ParsedIntent): OutreachIntent {
  return {
    channel: parsed.channel,
    targetType: parsed.targetType,
    targetNiche: parsed.targetNiche,
    location: parsed.location,
    purpose: parsed.purpose as OutreachPurpose,
    purposeDescription: parsed.purposeDescription,
    count: parsed.count,
    tone: parsed.tone,
  };
}
