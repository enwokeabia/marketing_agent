'use client';

import React, { useState } from 'react';
import { InputPanel } from '@/components/delegation/InputPanel';
import { ApprovalQueue } from '@/components/delegation/ApprovalQueue';
import { ActionButton } from '@/components/actions/ActionButton';
import { MessageDraft, Campaign, AgentProgress } from '@/types';
import { Loader2, CheckCircle, ArrowRight } from 'lucide-react';

// ============================================
// Main Campaign Page
// ============================================

export default function CampaignPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<AgentProgress | null>(null);
  const [step, setStep] = useState<'input' | 'review' | 'sending' | 'complete'>('input');

  const handleSubmit = async (input: string) => {
    setIsProcessing(true);
    setStep('review');
    
    try {
      const response = await fetch('/api/agents/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const apiData = result.data;
        
        // Use the campaign data from the API if available
        if (apiData.campaign) {
          // Transform the API campaign to our Campaign type
          const apiCampaign = apiData.campaign;
          const newCampaign: Campaign = {
            id: apiCampaign.id || apiData.campaignId || `campaign_${Date.now()}`,
            name: apiCampaign.name || `Campaign: ${input.substring(0, 50)}...`,
            intent: apiCampaign.intent || {
              channel: 'email' as const,
              targetType: 'generic' as const,
              purpose: 'general' as const,
              purposeDescription: 'outreach',
              count: apiData.stats?.targetsFound || 3,
              tone: 'professional' as const,
            },
            status: apiCampaign.status || 'pending_approval',
            targets: apiCampaign.targets || [],
            messages: apiCampaign.messages || [],
            stats: apiCampaign.stats || {
              totalTargets: apiData.stats?.targetsFound || 0,
              approvedMessages: 0,
              sentMessages: 0,
              deliveredMessages: 0,
              openedMessages: 0,
              clickedMessages: 0,
              repliedMessages: 0,
              bouncedMessages: 0,
              failedMessages: 0,
            },
            settings: apiCampaign.settings || {
              channel: 'email' as const,
              followUpEnabled: true,
              followUpDelay: 72,
              followUpMaxAttempts: 3,
              trackOpens: true,
              trackClicks: true,
            },
            createdAt: apiCampaign.createdAt ? new Date(apiCampaign.createdAt) : new Date(),
            updatedAt: apiCampaign.updatedAt ? new Date(apiCampaign.updatedAt) : new Date(),
          };
          setCampaign(newCampaign);
        } else {
          // Fallback if no campaign data (legacy/simplified response)
          const newCampaign: Campaign = {
            id: apiData.campaignId || `campaign_${Date.now()}`,
            name: `Campaign: ${input.substring(0, 50)}...`,
            intent: {
              channel: 'email' as const,
              targetType: 'generic' as const,
              purpose: 'general' as const,
              purposeDescription: 'outreach',
              count: apiData.stats?.targetsFound || 3,
              tone: 'professional' as const,
            },
            status: 'pending_approval',
            targets: [],
            messages: [],
            stats: {
              totalTargets: apiData.stats?.targetsFound || 0,
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
              channel: 'email' as const,
              followUpEnabled: true,
              followUpDelay: 72,
              followUpMaxAttempts: 3,
              trackOpens: true,
              trackClicks: true,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setCampaign(newCampaign);
        }
      } else {
        console.error('Agent error:', result.error);
        alert(`Error: ${result.error.message || 'Unknown error'}`);
        setStep('input');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit request. Please try again.');
      setStep('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (messageId: string) => {
    // Update local state
    if (campaign) {
      const updatedMessages = campaign.messages.map(m =>
        m.id === messageId ? { ...m, status: 'approved' as const } : m
      );
      setCampaign({ ...campaign, messages: updatedMessages });
    }
  };

  const handleReject = async (messageId: string) => {
    // Update local state - remove or mark as rejected
    if (campaign) {
      const updatedMessages = campaign.messages.map(m =>
        m.id === messageId ? { ...m, status: 'failed' as const } : m
      );
      setCampaign({ ...campaign, messages: updatedMessages });
    }
  };

  const handleEdit = async (messageId: string, newContent: string) => {
    // Update local state
    if (campaign) {
      const updatedMessages = campaign.messages.map(m =>
        m.id === messageId ? { ...m, body: newContent, status: 'approved' as const } : m
      );
      setCampaign({ ...campaign, messages: updatedMessages });
    }
  };

  const handleSend = async (messageId?: string) => {
    setStep('sending');
    
    try {
      // Simulate sending
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (campaign) {
        const updatedMessages = campaign.messages.map(m => {
          if (!messageId || m.id === messageId) {
            return { ...m, status: 'sent' as const };
          }
          return m;
        });
        setCampaign({ ...campaign, messages: updatedMessages });
      }
      
      setStep('complete');
    } catch (error) {
      console.error('Send error:', error);
      alert('Failed to send messages. Please try again.');
    }
  };

  const handleApproveAll = async () => {
    if (campaign) {
      const updatedMessages = campaign.messages.map(m => ({
        ...m,
        status: 'approved' as const,
      }));
      setCampaign({ ...campaign, messages: updatedMessages });
    }
  };

  const handleSendAll = async () => {
    await handleSend();
  };

  const handleExport = async () => {
    if (!campaign) return;
    
    const exportData = campaign.messages.map(m => ({
      target: m.target.name,
      email: m.target.email,
      company: m.target.company,
      subject: m.subject || '',
      body: m.body,
      status: m.status,
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign.id}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSchedule = async (date: Date) => {
    alert(`Messages scheduled for ${date.toLocaleString()}`);
    setStep('complete');
  };

  // Render different steps
  switch (step) {
    case 'review':
      return (
        <ReviewStep
          campaign={campaign}
          onApprove={handleApprove}
          onReject={handleReject}
          onEdit={handleEdit}
          onSend={handleSend}
          onApproveAll={handleApproveAll}
          onSendAll={handleSendAll}
          onExport={handleExport}
          onSchedule={handleSchedule}
          onBack={() => setStep('input')}
        />
      );
    
    case 'sending':
      return <SendingStep />;
    
    case 'complete':
      return <CompleteStep campaign={campaign} onNewCampaign={() => {
        setCampaign(null);
        setStep('input');
      }} />;
    
    default:
      return (
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <InputPanel
              onSubmit={handleSubmit}
              isProcessing={isProcessing}
            />
          </div>
        </main>
      );
  }
}

// ============================================
// Review Step Component
// ============================================

interface ReviewStepProps {
  campaign: Campaign | null;
  onApprove: (messageId: string) => Promise<void>;
  onReject: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, newContent: string) => Promise<void>;
  onSend: (messageId?: string) => Promise<void>;
  onApproveAll: () => Promise<void>;
  onSendAll: () => Promise<void>;
  onExport: () => Promise<void>;
  onSchedule: (date: Date) => Promise<void>;
  onBack: () => void;
}

function ReviewStep({
  campaign,
  onApprove,
  onReject,
  onEdit,
  onSend,
  onApproveAll,
  onSendAll,
  onExport,
  onSchedule,
  onBack,
}: ReviewStepProps) {
  if (!campaign) return null;
  
  const approvedCount = campaign.messages.filter(m => m.status === 'approved').length;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {campaign.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {campaign.messages.length} messages generated
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onExport}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Export
              </button>
              
              <ActionButton
                onSend={onSendAll}
                onExport={onExport}
                onSchedule={onSchedule}
                approvedCount={approvedCount}
                isProcessing={false}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <ApprovalQueue
          messages={campaign.messages}
          onApprove={onApprove}
          onReject={onReject}
          onEdit={onEdit}
          onSend={onSend}
          onApproveAll={onApproveAll}
          onSendAll={onSendAll}
          isProcessing={false}
        />
      </div>
    </main>
  );
}

// ============================================
// Sending Step Component
// ============================================

function SendingStep() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Sending Messages...
        </h2>
        <p className="text-gray-600">
          Your messages are being delivered. This may take a moment.
        </p>
      </div>
    </main>
  );
}

// ============================================
// Complete Step Component
// ============================================

interface CompleteStepProps {
  campaign: Campaign | null;
  onNewCampaign: () => void;
}

function CompleteStep({ campaign, onNewCampaign }: CompleteStepProps) {
  const sentCount = campaign?.messages.filter(m => m.status === 'sent').length || 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Campaign Sent Successfully!
          </h1>
          
          <p className="text-gray-600 mb-8">
            {sentCount} messages have been delivered to your targets.
            We'll track opens and replies automatically.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onNewCampaign}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              <span>Start New Campaign</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ============================================
// Mock Data Generator
// ============================================

function createMockCampaign(data: { stats: { targetsFound: number; messagesGenerated: number } }): Campaign {
  const mockMessages: MessageDraft[] = [
    {
      id: 'msg_1',
      targetId: 'target_1',
      target: {
        id: 'target_1',
        name: 'Sarah Johnson',
        title: 'Owner & Founder',
        company: 'Urban Bites Restaurant',
        website: 'https://urbanbites.com',
        email: 'sarah@urbanbites.com',
        location: 'New York, NY',
        description: 'Modern American cuisine in Brooklyn',
        source: 'web_search',
        relevanceScore: 0.92,
        dataQuality: 'medium',
        discoveredAt: new Date(),
      },
      channel: 'email',
      subject: 'Partnership Opportunity for Urban Bites',
      body: `Hi Sarah,

I've been following Urban Bites and I'm impressed by what you've built with your modern American cuisine concept in Brooklyn.

I'm [Your Name] from [Your Company], and we're interested in exploring a partnership that could benefit both of our audiences.

We help restaurants like yours increase customer engagement through targeted marketing campaigns. Our recent partnership with a similar restaurant resulted in a 40% increase in repeat customers.

Would you be open to a quick call this week to discuss how we might work together?

Best regards,
[Your Name]
[Your Company]`,
      tone: 'professional',
      personalization: {
        companyReference: true,
        recentNewsReference: false,
        mutualConnection: false,
        nicheSpecific: true,
        locationSpecific: true,
        customHooks: ['Restaurant marketing partnership value prop'],
      },
      qualityScore: 0.88,
      status: 'draft',
      generatedAt: new Date(),
    },
    {
      id: 'msg_2',
      targetId: 'target_2',
      target: {
        id: 'target_2',
        name: 'Michael Chen',
        title: 'Executive Chef & Owner',
        company: 'Sakura Japanese Kitchen',
        website: 'https://sakuranyc.com',
        email: 'michael@sakuranyc.com',
        location: 'New York, NY',
        description: 'Upscale Japanese dining experience',
        source: 'web_search',
        relevanceScore: 0.85,
        dataQuality: 'medium',
        discoveredAt: new Date(),
      },
      channel: 'email',
      subject: 'Partnership Opportunity for Sakura',
      body: `Hi Michael,

I've been following Sakura Japanese Kitchen and I'm impressed by your upscale dining experience in NYC.

I'm [Your Name] from [Your Company], and we're interested in exploring a partnership that could benefit both of our audiences.

We help restaurants like yours reach new customers through targeted marketing. Our recent campaign for a Japanese restaurant increased their weekend reservations by 60%.

Would you be open to a quick call this week to discuss how we might work together?

Best regards,
[Your Name]
[Your Company]`,
      tone: 'professional',
      personalization: {
        companyReference: true,
        recentNewsReference: false,
        mutualConnection: false,
        nicheSpecific: true,
        locationSpecific: true,
        customHooks: ['Japanese restaurant case study'],
      },
      qualityScore: 0.85,
      status: 'draft',
      generatedAt: new Date(),
    },
    {
      id: 'msg_3',
      targetId: 'target_3',
      target: {
        id: 'target_3',
        name: 'Emily Rodriguez',
        title: 'Restaurant Group Director',
        company: 'Flavor Collective',
        website: 'https://flavorcollective.com',
        email: 'emily@flavorcollective.com',
        location: 'New York, NY',
        description: 'Restaurant group with 5 locations',
        source: 'web_search',
        relevanceScore: 0.82,
        dataQuality: 'high',
        discoveredAt: new Date(),
      },
      channel: 'email',
      subject: 'Partnership Opportunity for Flavor Collective',
      body: `Hi Emily,

I've been following Flavor Collective and I'm impressed by your restaurant group with 5 successful locations.

I'm [Your Name] from [Your Company], and we're interested in exploring a partnership that could benefit both of our audiences.

We help multi-location restaurant groups streamline their marketing operations. Our platform can help Flavor Collective maintain brand consistency while scaling your outreach efforts.

Would you be open to a quick call this week to discuss how we might work together?

Best regards,
[Your Name]
[Your Company]`,
      tone: 'professional',
      personalization: {
        companyReference: true,
        recentNewsReference: false,
        mutualConnection: false,
        nicheSpecific: true,
        locationSpecific: true,
        customHooks: ['Multi-location restaurant group focus'],
      },
      qualityScore: 0.83,
      status: 'draft',
      generatedAt: new Date(),
    },
  ];

  return {
    id: `campaign_${Date.now()}`,
    name: 'Restaurant Partnership Outreach',
    intent: {
      channel: 'email',
      targetType: 'restaurant_owner',
      purpose: 'partnership',
      purposeDescription: 'partnership opportunities',
      count: 3,
      tone: 'professional',
    },
    status: 'pending_approval',
    targets: mockMessages.map(m => m.target),
    messages: mockMessages,
    stats: {
      totalTargets: mockMessages.length,
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
      channel: 'email',
      followUpEnabled: true,
      followUpDelay: 72,
      followUpMaxAttempts: 3,
      trackOpens: true,
      trackClicks: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
