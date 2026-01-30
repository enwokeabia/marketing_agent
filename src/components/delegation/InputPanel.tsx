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
        <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mb-3">
          What would you like to delegate today?
        </h1>
        <p className="text-lg muted max-w-2xl mx-auto">
          Describe your outreach goal in plain English, and our AI will handle the rest—
          finding targets, personalizing messages, and preparing drafts for your approval.
        </p>
      </div>

      {/* Input Area */}
      <div className="relative">
        <div className="surface rounded-3xl overflow-hidden">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Reach out to 10 boutique hotels in NYC about wellness retreats"
            className="w-full bg-transparent px-6 py-5 text-lg border-none focus:ring-0 resize-none outline-none placeholder:text-[color:var(--muted-2)]"
            rows={3}
            disabled={isProcessing}
          />
          
          {/* Divider */}
          <div className="h-px w-full bg-[var(--border)]" />
          
          {/* Actions */}
          <div className="flex items-center justify-between px-4 py-3 bg-[color:var(--wash)]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm text-[color:var(--foreground)]/80 hover:text-[color:var(--foreground)] hover:bg-[color:var(--wash-2)] rounded-xl transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Examples</span>
              </button>
              
              <span className="hidden sm:inline text-xs muted">
                Press <span className="font-mono">⌘</span> + <span className="font-mono">Enter</span> to submit
              </span>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isProcessing}
              className={`
                focus-ring flex items-center gap-2 px-6 py-2.5 rounded-2xl font-medium
                transition-all duration-200 will-change-transform
                ${
                  !input.trim() || isProcessing
                    ? 'bg-[color:var(--wash-2)] text-[color:var(--muted)] cursor-not-allowed'
                    : 'bg-[color:rgba(152,255,44,0.18)] hover:bg-[color:rgba(152,255,44,0.26)] text-[color:var(--foreground)] shadow-[0_18px_50px_rgba(152,255,44,0.14)] hover:translate-y-[-1px]'
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
          <div className="absolute top-full left-0 right-0 mt-3 surface-solid rounded-2xl overflow-hidden z-10">
            <div className="px-4 py-3 bg-[color:var(--wash)] border-b border-[var(--border)]">
              <h3 className="text-sm font-medium text-[color:var(--foreground)]/85">Try one of these examples:</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {recentExamples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="focus-ring w-full px-4 py-3 text-left hover:bg-[color:var(--wash)] transition-colors border-b border-[var(--border)] last:border-0"
                >
                  <p className="text-sm text-[color:var(--foreground)]/80 line-clamp-2">{example}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[color:var(--foreground)]/80 shadow-[var(--shadow-2)]">
          <div className="w-2 h-2 rounded-full bg-[color:rgba(152,255,44,0.95)]" />
          <span>Targets found automatically</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[color:var(--foreground)]/80 shadow-[var(--shadow-2)]">
          <div className="w-2 h-2 rounded-full bg-[color:rgba(255,176,32,0.95)]" />
          <span>Messages personalized per target</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[color:var(--foreground)]/80 shadow-[var(--shadow-2)]">
          <div className="w-2 h-2 rounded-full bg-[color:rgba(255,59,48,0.80)]" />
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
    <div className="mt-8 p-6 surface-solid rounded-2xl">
      <h3 className="text-sm font-medium text-[color:var(--foreground)]/85 mb-4">
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
            <span className="px-3 py-1 bg-[color:rgba(255,176,32,0.18)] text-[color:var(--foreground)] rounded-full text-sm border border-[color:rgba(255,176,32,0.22)]">
              📍 {intent.location}
            </span>
          )}
          {intent.targetNiche && (
            <span className="px-3 py-1 bg-[color:rgba(255,59,48,0.10)] text-[color:var(--foreground)] rounded-full text-sm border border-[color:rgba(255,59,48,0.16)]">
              ✨ {intent.targetNiche}
            </span>
          )}
        </div>
      )}
      
      {intent.suggestions && intent.suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium muted uppercase tracking-[0.16em] mb-2">
            Suggestions
          </h4>
          <ul className="space-y-1">
            {intent.suggestions.map((suggestion, i) => (
              <li key={i} className="text-sm muted flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-[color:var(--muted-2)]" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <button
        onClick={onConfirm}
        className="focus-ring w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium transition bg-[color:rgba(152,255,44,0.18)] hover:bg-[color:rgba(152,255,44,0.26)] text-[color:var(--foreground)] shadow-[0_18px_50px_rgba(152,255,44,0.14)]"
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
    blue: 'bg-[color:rgba(255,176,32,0.10)] text-[color:var(--foreground)] border-[color:rgba(255,176,32,0.18)]',
    purple: 'bg-[color:var(--wash-2)] text-[color:var(--foreground)] border-[var(--border)]',
    green: 'bg-[color:rgba(152,255,44,0.12)] text-[color:var(--foreground)] border-[color:rgba(152,255,44,0.20)]',
    orange: 'bg-[color:rgba(255,176,32,0.12)] text-[color:var(--foreground)] border-[color:rgba(255,176,32,0.20)]',
    pink: 'bg-[color:rgba(255,59,48,0.08)] text-[color:var(--foreground)] border-[color:rgba(255,59,48,0.16)]',
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
