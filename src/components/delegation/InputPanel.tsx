'use client';

import React, { useState, useCallback } from 'react';
import { Send, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { ParsedIntent } from '@/types';

// ============================================
// Input Panel Component
// ============================================

interface InputPanelProps {
  onSubmit: (input: string) => Promise<void>;
  isProcessing?: boolean;
  recentExamples?: string[];
}

export function InputPanel({
  onSubmit,
  isProcessing = false,
  recentExamples = DEFAULT_EXAMPLES,
}: InputPanelProps) {
  const [input, setInput] = useState('');
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [showExamples, setShowExamples] = useState(true);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isProcessing) return;
    await onSubmit(input);
  }, [input, isProcessing, onSubmit]);

  const handleExampleClick = useCallback((example: string) => {
    setInput(example);
    setShowExamples(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          What would you like to delegate today?
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Describe your outreach goal in plain English, and our AI will handle the rest—
          finding targets, personalizing messages, and preparing drafts for your approval.
        </p>
      </div>

      {/* Input Area */}
      <div className="relative">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Reach out to 10 boutique hotels in NYC about wellness retreats"
            className="w-full px-6 py-5 text-lg border-none focus:ring-0 resize-none outline-none"
            rows={3}
            disabled={isProcessing}
          />
          
          {/* Divider */}
          <div className="border-t border-gray-100" />
          
          {/* Actions */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Examples</span>
              </button>
              
              <span className="text-xs text-gray-400">
                Press ⌘ + Enter to submit
              </span>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isProcessing}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white
                transition-all duration-200
                ${
                  !input.trim() || isProcessing
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Delegate</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Examples Dropdown */}
        {showExamples && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-10">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">Try one of these examples:</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {recentExamples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm text-gray-700 line-clamp-2">{example}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="flex items-center justify-center gap-8 mt-8">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Targets found automatically</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Messages personalized per target</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span>One-click approval</span>
        </div>
      </div>

      {/* Parsed Intent Preview */}
      {parsedIntent && (
        <IntentPreview intent={parsedIntent} onConfirm={handleSubmit} />
      )}
    </div>
  );
}

// ============================================
// Intent Preview Component
// ============================================

interface IntentPreviewProps {
  intent: ParsedIntent;
  onConfirm: () => void;
}

function IntentPreview({ intent, onConfirm }: IntentPreviewProps) {
  return (
    <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-4">
        Detected Intent (Confidence: {Math.round(intent.confidence * 100)}%)
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <IntentBadge
          label="Channel"
          value={intent.channel}
          color={getChannelColor(intent.channel)}
        />
        <IntentBadge
          label="Target"
          value={formatTargetType(intent.targetType)}
          color="blue"
        />
        <IntentBadge
          label="Purpose"
          value={formatPurpose(intent.purpose)}
          color="purple"
        />
        <IntentBadge
          label="Count"
          value={`${intent.count} targets`}
          color="green"
        />
      </div>
      
      {(intent.location || intent.targetNiche) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {intent.location && (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
              📍 {intent.location}
            </span>
          )}
          {intent.targetNiche && (
            <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
              ✨ {intent.targetNiche}
            </span>
          )}
        </div>
      )}
      
      {intent.suggestions && intent.suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Suggestions
          </h4>
          <ul className="space-y-1">
            {intent.suggestions.map((suggestion, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-gray-400" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <button
        onClick={onConfirm}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
      >
        <span>Start Campaign</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

interface IntentBadgeProps {
  label: string;
  value: string;
  color: string;
}

function IntentBadge({ label, value, color }: IntentBadgeProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200',
  };
  
  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color] || colorClasses.blue}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function getChannelColor(channel: string): string {
  const colors: Record<string, string> = {
    email: 'blue',
    dm: 'purple',
    whatsapp: 'green',
    generic: 'gray',
  };
  return colors[channel] || 'gray';
}

function formatTargetType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatPurpose(purpose: string): string {
  const labels: Record<string, string> = {
    partnership: 'Partnership',
    influencer_collaboration: 'Influencer',
    hiring: 'Hiring',
    brand_deal: 'Brand Deal',
    referral: 'Referral',
    sales: 'Sales',
    networking: 'Networking',
    general: 'General',
  };
  return labels[purpose] || purpose;
}

// ============================================
// Default Examples
// ============================================

const DEFAULT_EXAMPLES = [
  'Reach out to 10 boutique hotels in NYC about wellness retreats',
  'Contact 15 boutique hotels in NYC for influencer collaborations',
  'Email 30 startup founders hiring sales reps',
  'DM 10 creators in the fitness niche about brand deals',
  'Reach out to 20 restaurant owners in DC about partnerships',
  'Reach out to 25 real estate brokers in Miami about referrals',
  'Contact 5 sustainable fashion brands in LA for partnership',
  'Email 20 tech startups in SF about our analytics tool',
];
