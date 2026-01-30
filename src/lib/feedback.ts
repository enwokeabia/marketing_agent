// Marketing Agent - User Feedback Collection

import { SocialHandles } from '@/types';

// ============================================
// Feedback Types
// ============================================

export type FeedbackType = 
  | 'campaign_rating'
  | 'message_rating'
  | 'target_quality'
  | 'response_received'
  | 'conversion_success';

export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface CampaignFeedback {
  campaignId: string;
  userId?: string;
  rating?: RatingValue;
  comment?: string;
  targetsFound: number;
  messagesUseful: number;
  wouldRecommend: boolean;
  submittedAt: Date;
}

export interface MessageFeedback {
  messageId: string;
  campaignId: string;
  targetId: string;
  rating?: RatingValue;
  feedback?: 'positive' | 'negative' | 'neutral';
  reason?: string;
  userReply?: string;
  submittedAt: Date;
}

export interface TargetFeedback {
  targetId: string;
  campaignId: string;
  rating: RatingValue;
  feedback?: 'accurate' | 'inaccurate' | 'not_reachable' | 'wrong_person';
  notes?: string;
  submittedAt: Date;
}

export interface ResponseFeedback {
  campaignId: string;
  targetId: string;
  messageId: string;
  responseType: 'positive' | 'negative' | 'neutral' | 'out_of_office' | 'not_interested';
  notes?: string;
  followUpNeeded: boolean;
  submittedAt: Date;
}

export type FeedbackEntry = 
  | { type: 'campaign'; data: CampaignFeedback }
  | { type: 'message'; data: MessageFeedback }
  | { type: 'target'; data: TargetFeedback }
  | { type: 'response'; data: ResponseFeedback };

// ============================================
// In-Memory Feedback Storage (Fallback)
// ============================================

let feedbackStore: FeedbackEntry[] = [];

// ============================================
// Database Functions
// ============================================

/**
 * Check if database is available for storing feedback
 */
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const { getSupabaseClient } = await import('@/lib/database/supabase');
    getSupabaseClient();
    return true;
  } catch {
    return false;
  }
}

/**
 * Save campaign feedback
 */
export async function saveCampaignFeedback(
  feedback: Omit<CampaignFeedback, 'submittedAt'>
): Promise<{ success: boolean; id?: string }> {
  const dbAvailable = await isDatabaseAvailable();
  
  const feedbackEntry: CampaignFeedback = {
    ...feedback,
    submittedAt: new Date(),
  };
  
  if (dbAvailable) {
    try {
      const { createFeedback } = await import('@/lib/database/feedback');
      const result = await createFeedback(feedbackEntry);
      return { success: true, id: result.id };
    } catch (error) {
      console.error('Failed to save campaign feedback to database:', error);
    }
  }
  
  // Fallback to in-memory storage
  feedbackStore.push({ type: 'campaign', data: feedbackEntry });
  console.log(`💾 Campaign feedback saved (in-memory): ${feedback.campaignId}`);
  return { success: true, id: `mem_${Date.now()}` };
}

/**
 * Save message feedback (thumbs up/down, ratings)
 */
export async function saveMessageFeedback(
  feedback: Omit<MessageFeedback, 'submittedAt'>
): Promise<{ success: boolean; id?: string }> {
  const dbAvailable = await isDatabaseAvailable();
  
  const feedbackEntry: MessageFeedback = {
    ...feedback,
    submittedAt: new Date(),
  };
  
  if (dbAvailable) {
    try {
      const { createMessageFeedback } = await import('@/lib/database/feedback');
      const result = await createMessageFeedback(feedbackEntry);
      return { success: true, id: result.id };
    } catch (error) {
      console.error('Failed to save message feedback to database:', error);
    }
  }
  
  // Fallback to in-memory storage
  feedbackStore.push({ type: 'message', data: feedbackEntry });
  console.log(`💾 Message feedback saved (in-memory): ${feedback.messageId}`);
  return { success: true, id: `mem_${Date.now()}` };
}

/**
 * Save target quality feedback
 */
export async function saveTargetFeedback(
  feedback: Omit<TargetFeedback, 'submittedAt'>
): Promise<{ success: boolean; id?: string }> {
  const dbAvailable = await isDatabaseAvailable();
  
  const feedbackEntry: TargetFeedback = {
    ...feedback,
    submittedAt: new Date(),
  };
  
  if (dbAvailable) {
    try {
      const { createTargetFeedback } = await import('@/lib/database/feedback');
      const result = await createTargetFeedback(feedbackEntry);
      return { success: true, id: result.id };
    } catch (error) {
      console.error('Failed to save target feedback to database:', error);
    }
  }
  
  // Fallback to in-memory storage
  feedbackStore.push({ type: 'target', data: feedbackEntry });
  console.log(`💾 Target feedback saved (in-memory): ${feedback.targetId}`);
  return { success: true, id: `mem_${Date.now()}` };
}

/**
 * Save response feedback (when target responds)
 */
export async function saveResponseFeedback(
  feedback: Omit<ResponseFeedback, 'submittedAt'>
): Promise<{ success: boolean; id?: string }> {
  const dbAvailable = await isDatabaseAvailable();
  
  const feedbackEntry: ResponseFeedback = {
    ...feedback,
    submittedAt: new Date(),
  };
  
  if (dbAvailable) {
    try {
      const { createResponseFeedback } = await import('@/lib/database/feedback');
      const result = await createResponseFeedback(feedbackEntry);
      return { success: true, id: result.id };
    } catch (error) {
      console.error('Failed to save response feedback to database:', error);
    }
  }
  
  // Fallback to in-memory storage
  feedbackStore.push({ type: 'response', data: feedbackEntry });
  console.log(`💾 Response feedback saved (in-memory)`);
  return { success: true, id: `mem_${Date.now()}` };
}

// ============================================
// Feedback Analysis
// ============================================

/**
 * Get feedback statistics for a campaign
 */
export async function getCampaignFeedbackStats(campaignId: string): Promise<{
  totalFeedback: number;
  avgRating?: number;
  positiveResponses: number;
  negativeResponses: number;
  targetAccuracy: number;
}> {
  const dbAvailable = await isDatabaseAvailable();
  
  if (dbAvailable) {
    try {
      const { getFeedbackStats } = await import('@/lib/database/feedback');
      return await getFeedbackStats(campaignId);
    } catch (error) {
      console.error('Failed to get feedback stats from database:', error);
    }
  }
  
  // Calculate from in-memory store
  const campaignFeedback = feedbackStore.filter(
    (f): f is { type: 'campaign'; data: CampaignFeedback } => 
      f.type === 'campaign' && f.data.campaignId === campaignId
  );
  
  const messageFeedback = feedbackStore.filter(
    (f): f is { type: 'message'; data: MessageFeedback } => 
      f.type === 'message' && f.data.campaignId === campaignId
  );
  
  const responseFeedback = feedbackStore.filter(
    (f): f is { type: 'response'; data: ResponseFeedback } => 
      f.type === 'response' && f.data.campaignId === campaignId
  );
  
  const targetFeedback = feedbackStore.filter(
    (f): f is { type: 'target'; data: TargetFeedback } => 
      f.type === 'target' && f.data.campaignId === campaignId
  );
  
  const ratings = campaignFeedback.map(f => f.data.rating).filter(Boolean) as RatingValue[];
  const avgRating = ratings.length > 0 
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
    : undefined;
  
  const positiveResponses = responseFeedback.filter(
    f => f.data.responseType === 'positive'
  ).length;
  
  const negativeResponses = responseFeedback.filter(
    f => f.data.responseType === 'negative' || f.data.responseType === 'not_interested'
  ).length;
  
  const accurateTargets = targetFeedback.filter(
    f => f.data.feedback === 'accurate'
  ).length;
  
  const targetAccuracy = targetFeedback.length > 0 
    ? accurateTargets / targetFeedback.length 
    : 0;
  
  return {
    totalFeedback: campaignFeedback.length + messageFeedback.length + responseFeedback.length + targetFeedback.length,
    avgRating,
    positiveResponses,
    negativeResponses,
    targetAccuracy,
  };
}

/**
 * Get all stored feedback (for debugging/admin)
 */
export function getStoredFeedback(): FeedbackEntry[] {
  return [...feedbackStore];
}

/**
 * Clear stored feedback (for testing)
 */
export function clearStoredFeedback(): void {
  feedbackStore = [];
  console.log('🗑️ Feedback store cleared');
}
