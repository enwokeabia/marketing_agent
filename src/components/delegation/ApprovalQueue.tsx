'use client';

import React, { useState } from 'react';
import { Check, X, Edit3, Send, ChevronDown, ChevronUp, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import { MessageDraft, Target } from '@/types';

// ============================================
// Approval Queue Component
// ============================================

interface ApprovalQueueProps {
  messages: MessageDraft[];
  onApprove: (messageId: string) => Promise<void>;
  onReject: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, newContent: string) => Promise<void>;
  onSend: (messageId: string) => Promise<void>;
  onApproveAll: () => Promise<void>;
  onSendAll: () => Promise<void>;
  isProcessing?: boolean;
}

export function ApprovalQueue({
  messages,
  onApprove,
  onReject,
  onEdit,
  onSend,
  onApproveAll,
  onSendAll,
  isProcessing = false,
}: ApprovalQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pendingMessages = messages.filter(m => m.status === 'draft');
  const approvedMessages = messages.filter(m => m.status === 'approved');

  const handleCopy = async (message: MessageDraft) => {
    const text = message.subject 
      ? `Subject: ${message.subject}\n\n${message.body}`
      : message.body;
    
    await navigator.clipboard.writeText(text);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEditing = (message: MessageDraft) => {
    setEditingId(message.id);
    setEditContent(message.body);
    setExpandedId(message.id);
  };

  const saveEdit = async (messageId: string) => {
    await onEdit(messageId, editContent);
    setEditingId(null);
    setEditContent('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 grid place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] shadow-[var(--shadow-2)]">
          <Check className="w-8 h-8 text-[color:var(--muted-2)]" />
        </div>
        <h3 className="font-display text-xl mb-2">No messages to review</h3>
        <p className="muted">
          Messages will appear here after the AI generates them based on your request.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl leading-tight">
            Approval Queue
          </h2>
          <p className="text-sm muted mt-1">
            {pendingMessages.length} pending, {approvedMessages.length} approved
          </p>
        </div>
        
        {pendingMessages.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={onApproveAll}
              disabled={isProcessing}
              className="focus-ring flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] text-[color:var(--foreground)]/80 font-medium shadow-[var(--shadow-2)] hover:translate-y-[-1px] transition disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Check className="w-4 h-4" />
              <span>Approve All</span>
            </button>
            <button
              onClick={onSendAll}
              disabled={isProcessing || approvedMessages.length === 0}
              className="focus-ring flex items-center gap-2 px-4 py-2 rounded-xl border border-[color:rgba(152,255,44,0.55)] bg-[color:rgba(152,255,44,0.18)] hover:bg-[color:rgba(152,255,44,0.26)] text-[color:var(--foreground)] font-medium shadow-[0_18px_50px_rgba(152,255,44,0.14)] hover:translate-y-[-1px] transition disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Send className="w-4 h-4" />
              <span>Send All ({approvedMessages.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            isExpanded={expandedId === message.id}
            isEditing={editingId === message.id}
            editContent={editContent}
            isCopied={copiedId === message.id}
            isProcessing={isProcessing}
            onToggleExpand={() => setExpandedId(expandedId === message.id ? null : message.id)}
            onApprove={() => onApprove(message.id)}
            onReject={() => onReject(message.id)}
            onStartEdit={() => startEditing(message)}
            onSaveEdit={() => saveEdit(message.id)}
            onCancelEdit={cancelEdit}
            onEditChange={setEditContent}
            onCopy={() => handleCopy(message)}
            onSend={() => onSend(message.id)}
            target={message.target}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Message Card Component
// ============================================

interface MessageCardProps {
  message: MessageDraft;
  isExpanded: boolean;
  isEditing: boolean;
  editContent: string;
  isCopied: boolean;
  isProcessing: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (value: string) => void;
  onCopy: () => void;
  onSend: () => void;
  target: Target;
}

function MessageCard({
  message,
  isExpanded,
  isEditing,
  editContent,
  isCopied,
  isProcessing,
  onToggleExpand,
  onApprove,
  onReject,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onCopy,
  onSend,
  target,
}: MessageCardProps) {
  const qualityColor = getQualityColor(message.qualityScore);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isExpanded
          ? 'bg-[var(--surface-solid)] border-[color:rgba(152,255,44,0.45)] shadow-[0_22px_60px_rgba(152,255,44,0.10)]'
          : 'bg-[var(--surface)] border-[var(--border)] shadow-[var(--shadow-2)]'
      }`}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer rounded-t-2xl hover:bg-[color:rgba(20,18,15,0.03)]"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-4">
          {/* Target Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl border border-[var(--border)] bg-[color:rgba(20,18,15,0.06)] flex items-center justify-center text-[color:var(--foreground)] font-medium shadow-[0_10px_28px_rgba(20,18,15,0.10)]">
              {target.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-medium text-[color:var(--foreground)]">{target.name}</h3>
              <p className="text-sm muted">
                {target.title}{target.company ? ` at ${target.company}` : ''}
              </p>
            </div>
          </div>
          
          {/* Quality Badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${qualityColor}`}>
            Quality: {Math.round(message.qualityScore * 100)}%
          </div>
          
          {/* Channel Badge */}
          <div className="px-3 py-1 bg-[color:rgba(20,18,15,0.06)] border border-[var(--border)] rounded-full text-xs font-medium text-[color:var(--foreground)]/75 capitalize">
            {message.channel}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[color:var(--muted-2)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[color:var(--muted-2)]" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--border)]">
          {/* Message Preview */}
          <div className="p-4">
            {message.subject && (
              <div className="mb-3">
                <span className="text-xs font-medium muted uppercase tracking-[0.18em]">
                  Subject
                </span>
                <p className="text-[color:var(--foreground)] font-medium">{message.subject}</p>
              </div>
            )}
            
            <div>
              <span className="text-xs font-medium muted uppercase tracking-[0.18em]">
                Message
              </span>
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => onEditChange(e.target.value)}
                  className="focus-ring w-full mt-2 p-3 bg-[var(--surface-solid)] border border-[var(--border-2)] rounded-xl outline-none"
                  rows={6}
                />
              ) : (
                <p className="mt-2 text-[color:var(--foreground)]/80 whitespace-pre-wrap leading-relaxed">{message.body}</p>
              )}
            </div>

            {/* Personalization Details */}
            {message.personalization && (
              <div className="mt-4 p-4 bg-[color:rgba(20,18,15,0.04)] border border-[var(--border)] rounded-xl">
                <h4 className="text-xs font-medium muted uppercase tracking-[0.18em] mb-3">
                  Personalization Points
                </h4>
                <div className="flex flex-wrap gap-2">
                  {message.personalization.companyReference && (
                    <span className="px-2.5 py-1 bg-[color:rgba(255,176,32,0.16)] text-[color:var(--foreground)] rounded-full text-xs border border-[color:rgba(255,176,32,0.22)]">
                      Company Reference
                    </span>
                  )}
                  {message.personalization.nicheSpecific && (
                    <span className="px-2.5 py-1 bg-[color:rgba(255,59,48,0.10)] text-[color:var(--foreground)] rounded-full text-xs border border-[color:rgba(255,59,48,0.16)]">
                      Niche Specific
                    </span>
                  )}
                  {message.personalization.locationSpecific && (
                    <span className="px-2.5 py-1 bg-[color:rgba(20,18,15,0.06)] text-[color:var(--foreground)] rounded-full text-xs border border-[var(--border)]">
                      Location Specific
                    </span>
                  )}
                  {message.personalization.recentNewsReference && (
                    <span className="px-2.5 py-1 bg-[color:rgba(152,255,44,0.12)] text-[color:var(--foreground)] rounded-full text-xs border border-[color:rgba(152,255,44,0.20)]">
                      News Reference
                    </span>
                  )}
                  {message.personalization.customHooks.map((hook, i) => (
                    <span key={i} className="px-2.5 py-1 bg-[color:rgba(20,18,15,0.06)] text-[color:var(--foreground)]/80 rounded-full text-xs border border-[var(--border)]">
                      {hook}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-4 bg-[color:rgba(20,18,15,0.03)] border-t border-[var(--border)] rounded-b-2xl">
            <div className="flex gap-2">
              <button
                onClick={onCopy}
                className="focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm text-[color:var(--foreground)]/80 hover:text-[color:var(--foreground)] hover:bg-[color:rgba(20,18,15,0.06)] rounded-xl transition-colors"
              >
                {isCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-[color:rgba(152,255,44,0.95)]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              
              {target.website && (
                <a
                  href={target.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring flex items-center gap-1.5 px-3 py-1.5 text-sm text-[color:var(--foreground)]/80 hover:text-[color:var(--foreground)] hover:bg-[color:rgba(20,18,15,0.06)] rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Visit Website</span>
                </a>
              )}
            </div>
            
            <div className="flex gap-2">
              {message.status === 'draft' ? (
                <>
                  <button
                    onClick={onReject}
                    disabled={isProcessing}
                    className="focus-ring flex items-center gap-1.5 px-4 py-2 text-sm text-[color:var(--foreground)] hover:bg-[color:rgba(255,59,48,0.10)] rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                  
                  {isEditing ? (
                    <>
                      <button
                        onClick={onCancelEdit}
                        className="focus-ring px-4 py-2 text-sm text-[color:var(--foreground)]/75 hover:bg-[color:rgba(20,18,15,0.06)] rounded-xl font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={onSaveEdit}
                        className="focus-ring flex items-center gap-1.5 px-4 py-2 text-sm bg-[color:rgba(152,255,44,0.18)] hover:bg-[color:rgba(152,255,44,0.26)] text-[color:var(--foreground)] rounded-xl font-medium transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save & Approve</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={onStartEdit}
                        disabled={isProcessing}
                        className="focus-ring flex items-center gap-1.5 px-4 py-2 text-sm text-[color:var(--foreground)]/75 hover:bg-[color:rgba(20,18,15,0.06)] rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={onApprove}
                        disabled={isProcessing}
                        className="focus-ring flex items-center gap-1.5 px-4 py-2 text-sm bg-[color:rgba(152,255,44,0.18)] hover:bg-[color:rgba(152,255,44,0.26)] text-[color:var(--foreground)] rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                    </>
                  )}
                </>
              ) : message.status === 'approved' ? (
                <button
                  onClick={onSend}
                  disabled={isProcessing}
                  className="focus-ring flex items-center gap-1.5 px-4 py-2 text-sm bg-[color:rgba(152,255,44,0.18)] hover:bg-[color:rgba(152,255,44,0.26)] text-[color:var(--foreground)] rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Now</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function getQualityColor(score: number): string {
  if (score >= 0.8) {
    return 'bg-[color:rgba(152,255,44,0.12)] text-[color:var(--foreground)] border border-[color:rgba(152,255,44,0.20)]';
  } else if (score >= 0.6) {
    return 'bg-[color:rgba(255,176,32,0.16)] text-[color:var(--foreground)] border border-[color:rgba(255,176,32,0.22)]';
  } else {
    return 'bg-[color:rgba(255,59,48,0.10)] text-[color:var(--foreground)] border border-[color:rgba(255,59,48,0.16)]';
  }
}
