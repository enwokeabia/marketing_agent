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
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Check className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No messages to review</h3>
        <p className="text-gray-600">
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
          <h2 className="text-xl font-semibold text-gray-900">
            Approval Queue
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {pendingMessages.length} pending, {approvedMessages.length} approved
          </p>
        </div>
        
        {pendingMessages.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={onApproveAll}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Approve All</span>
            </button>
            <button
              onClick={onSendAll}
              disabled={isProcessing || approvedMessages.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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
    <div className={`bg-white rounded-xl border transition-all duration-200 ${
      isExpanded ? 'border-blue-300 shadow-md' : 'border-gray-200 shadow-sm'
    }`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 rounded-t-xl"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-4">
          {/* Target Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
              {target.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{target.name}</h3>
              <p className="text-sm text-gray-500">
                {target.title}{target.company ? ` at ${target.company}` : ''}
              </p>
            </div>
          </div>
          
          {/* Quality Badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${qualityColor}`}>
            Quality: {Math.round(message.qualityScore * 100)}%
          </div>
          
          {/* Channel Badge */}
          <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 capitalize">
            {message.channel}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Message Preview */}
          <div className="p-4">
            {message.subject && (
              <div className="mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Subject
                </span>
                <p className="text-gray-900 font-medium">{message.subject}</p>
              </div>
            )}
            
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Message
              </span>
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => onEditChange(e.target.value)}
                  className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                />
              ) : (
                <p className="mt-2 text-gray-700 whitespace-pre-wrap">{message.body}</p>
              )}
            </div>

            {/* Personalization Details */}
            {message.personalization && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Personalization Points
                </h4>
                <div className="flex flex-wrap gap-2">
                  {message.personalization.companyReference && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Company Reference
                    </span>
                  )}
                  {message.personalization.nicheSpecific && (
                    <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs">
                      Niche Specific
                    </span>
                  )}
                  {message.personalization.locationSpecific && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                      Location Specific
                    </span>
                  )}
                  {message.personalization.recentNewsReference && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      News Reference
                    </span>
                  )}
                  {message.personalization.customHooks.map((hook, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      {hook}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
            <div className="flex gap-2">
              <button
                onClick={onCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {isCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
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
                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                  
                  {isEditing ? (
                    <>
                      <button
                        onClick={onCancelEdit}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={onSaveEdit}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
                        className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={onApprove}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
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
    return 'bg-green-100 text-green-700';
  } else if (score >= 0.6) {
    return 'bg-yellow-100 text-yellow-700';
  } else {
    return 'bg-red-100 text-red-700';
  }
}
