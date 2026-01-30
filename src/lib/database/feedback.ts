// Marketing Agent - Database Feedback (stub when no feedback table)

import type {
  CampaignFeedback,
  MessageFeedback,
  TargetFeedback,
  ResponseFeedback,
} from '@/lib/feedback';

const NOT_CONFIGURED = 'Feedback persistence not configured';

export async function createFeedback(
  _entry: CampaignFeedback
): Promise<{ id: string }> {
  throw new Error(NOT_CONFIGURED);
}

export async function createMessageFeedback(
  _entry: MessageFeedback
): Promise<{ id: string }> {
  throw new Error(NOT_CONFIGURED);
}

export async function createTargetFeedback(
  _entry: TargetFeedback
): Promise<{ id: string }> {
  throw new Error(NOT_CONFIGURED);
}

export async function createResponseFeedback(
  _entry: ResponseFeedback
): Promise<{ id: string }> {
  throw new Error(NOT_CONFIGURED);
}

export async function getFeedbackStats(_campaignId: string): Promise<{
  totalFeedback: number;
  avgRating?: number;
  positiveResponses: number;
  negativeResponses: number;
  targetAccuracy: number;
}> {
  throw new Error(NOT_CONFIGURED);
}
