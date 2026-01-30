import { NextRequest, NextResponse } from 'next/server';
import { runAgent, approveMessage, rejectMessage, updateMessageContent, launchCampaign } from '@/lib/agents/orchestrator';

// ============================================
// POST - Run Agent
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, userId } = body;
    
    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Input is required and must be a string' } },
        { status: 400 }
      );
    }
    
    // Run the agent
    const result = await runAgent({
      input,
      userId,
      onProgress: (progress) => {
        // In production, you could stream progress updates
        console.log('Agent progress:', progress);
      },
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          campaignId: result.campaign?.id,
          progress: result.progress,
          stats: {
            targetsFound: result.campaign?.targets?.length || 0,
            messagesGenerated: result.campaign?.messages?.length || 0,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - new Date(result.progress.startedAt).getTime(),
        },
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'AGENT_ERROR', 
            message: result.error || 'Agent execution failed',
            suggestion: 'Try rephrasing your request or reducing the target count',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Agent API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'An internal error occurred',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Get Agent Status
// ============================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaignId');
  
  if (!campaignId) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_PARAM', message: 'Campaign ID is required' } },
      { status: 400 }
    );
  }
  
  try {
    // In production, fetch campaign status from database
    return NextResponse.json({
      success: true,
      data: {
        campaignId,
        status: 'active',
        progress: 65,
        messagesSent: 3,
        messagesOpened: 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch campaign status' } 
      },
      { status: 500 }
    );
  }
}
