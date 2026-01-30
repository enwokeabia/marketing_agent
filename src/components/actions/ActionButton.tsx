'use client';

import React, { useState } from 'react';
import { Send, Calendar, Download, ChevronDown, ExternalLink, Loader2, Check, Mail, MessageSquare, Phone } from 'lucide-react';

// ============================================
// Action Button Component
// ============================================

interface ActionButtonProps {
  onSend?: () => Promise<void>;
  onExport?: () => Promise<void>;
  onSchedule?: (date: Date) => Promise<void>;
  approvedCount: number;
  isProcessing?: boolean;
}

export function ActionButton({
  onSend,
  onExport,
  onSchedule,
  approvedCount,
  isProcessing = false,
}: ActionButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [actionStatus, setActionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSend = async () => {
    if (!onSend || approvedCount === 0 || isProcessing) return;
    
    setActionStatus('loading');
    try {
      await onSend();
      setActionStatus('success');
      setTimeout(() => setActionStatus('idle'), 2000);
    } catch (error) {
      setActionStatus('error');
      setTimeout(() => setActionStatus('idle'), 2000);
    }
  };

  const handleExport = async () => {
    if (!onExport || approvedCount === 0 || isProcessing) return;
    
    setActionStatus('loading');
    try {
      await onExport();
      setActionStatus('success');
      setTimeout(() => setActionStatus('idle'), 2000);
    } catch (error) {
      setActionStatus('error');
      setTimeout(() => setActionStatus('idle'), 2000);
    }
  };

  const handleSchedule = async () => {
    if (!onSchedule || approvedCount === 0 || !selectedDate || !selectedTime) return;
    
    const scheduledDate = new Date(`${selectedDate}T${selectedTime}`);
    setActionStatus('loading');
    try {
      await onSchedule(scheduledDate);
      setActionStatus('success');
      setShowScheduleModal(false);
      setTimeout(() => setActionStatus('idle'), 2000);
    } catch (error) {
      setActionStatus('error');
      setTimeout(() => setActionStatus('idle'), 2000);
    }
  };

  const getStatusIcon = () => {
    switch (actionStatus) {
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'success':
        return <Check className="w-5 h-5" />;
      case 'error':
        return <span className="text-red-500">✕</span>;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (actionStatus) {
      case 'loading':
        return 'Processing...';
      case 'success':
        return 'Done!';
      case 'error':
        return 'Failed';
      default:
        return null;
    }
  };

  return (
    <>
      <div className="relative">
        {/* Main Button */}
        <button
          onClick={handleSend}
          disabled={approvedCount === 0 || isProcessing || actionStatus === 'loading'}
          className={`
            focus-ring flex items-center gap-2 px-6 py-3 rounded-2xl font-medium
            transition-all duration-200 will-change-transform
            ${
              approvedCount === 0 || isProcessing
                ? 'bg-[color:var(--wash-2)] text-[color:var(--muted)] cursor-not-allowed'
                : 'bg-[color:rgba(152,255,44,0.18)] hover:bg-[color:rgba(152,255,44,0.26)] text-[color:var(--foreground)] shadow-[0_18px_50px_rgba(152,255,44,0.14)] hover:translate-y-[-1px]'
            }
          `}
        >
          {getStatusIcon() || <Send className="w-5 h-5" />}
          <span>
            {actionStatus === 'idle' 
              ? `Send ${approvedCount} Messages` 
              : getStatusText()
            }
          </span>
          <ChevronDown className="w-4 h-4 opacity-70" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute top-full right-0 mt-3 w-60 surface-solid rounded-2xl overflow-hidden z-20">
            <button
              onClick={() => {
                handleSend();
                setShowMenu(false);
              }}
              disabled={approvedCount === 0 || isProcessing}
              className="focus-ring w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[color:var(--wash)] transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-[color:var(--foreground)]/80" />
              <div>
                <p className="font-medium text-[color:var(--foreground)]">Send Now</p>
                <p className="text-sm muted">Deliver immediately</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                setShowScheduleModal(true);
                setShowMenu(false);
              }}
              disabled={approvedCount === 0 || isProcessing}
              className="focus-ring w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[color:var(--wash)] transition-colors disabled:opacity-50"
            >
              <Calendar className="w-5 h-5 text-[color:var(--foreground)]/80" />
              <div>
                <p className="font-medium text-[color:var(--foreground)]">Schedule</p>
                <p className="text-sm muted">Pick a send time</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                handleExport();
                setShowMenu(false);
              }}
              disabled={approvedCount === 0 || isProcessing}
              className="focus-ring w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[color:var(--wash)] transition-colors disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-[color:var(--foreground)]/80" />
              <div>
                <p className="font-medium text-[color:var(--foreground)]">Export</p>
                <p className="text-sm muted">Download as CSV/JSON</p>
              </div>
            </button>
            
            <div className="border-t border-[var(--border)] pt-2 pb-2">
              <p className="px-4 py-2 text-xs muted uppercase tracking-[0.18em]">
                Integrations
              </p>
              
              <button
                onClick={() => {
                  // Would trigger n8n/Zapier webhook
                  setShowMenu(false);
                }}
                className="focus-ring w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[color:var(--wash)] transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-[color:var(--muted-2)]" />
                <span className="text-sm muted">Send via n8n</span>
              </button>
              
              <button
                onClick={() => {
                  // Would trigger Zapier webhook
                  setShowMenu(false);
                }}
                className="focus-ring w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[color:var(--wash)] transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-[color:var(--muted-2)]" />
                <span className="text-sm muted">Send via Zapier</span>
              </button>
            </div>
          </div>
        )}

        {/* Click outside to close */}
        {showMenu && (
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowMenu(false)}
          />
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onDateChange={setSelectedDate}
          onTimeChange={setSelectedTime}
          onConfirm={handleSchedule}
          onCancel={() => setShowScheduleModal(false)}
          isProcessing={actionStatus === 'loading'}
        />
      )}
    </>
  );
}

// ============================================
// Schedule Modal Component
// ============================================

interface ScheduleModalProps {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

function ScheduleModal({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  onConfirm,
  onCancel,
  isProcessing = false,
}: ScheduleModalProps) {
  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];
  
  // Get default time (9 AM next day)
  const defaultTime = '09:00';

  return (
    <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-50">
      <div className="surface-solid rounded-3xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-display text-2xl">Schedule Messages</h2>
          <p className="text-sm muted mt-1">
            Choose when to send your approved messages
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--foreground)]/85 mb-2">
              Send Date
            </label>
            <input
              type="date"
              value={selectedDate || today}
              onChange={(e) => onDateChange(e.target.value)}
              min={today}
              className="focus-ring w-full px-4 py-2.5 border border-[var(--border-2)] bg-[var(--surface-solid)] rounded-2xl outline-none"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--foreground)]/85 mb-2">
              Send Time
            </label>
            <input
              type="time"
              value={selectedTime || defaultTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="focus-ring w-full px-4 py-2.5 border border-[var(--border-2)] bg-[var(--surface-solid)] rounded-2xl outline-none"
            />
          </div>

          {/* Quick Options */}
          <div>
            <label className="block text-sm font-medium text-[color:var(--foreground)]/85 mb-2">
              Quick Select
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  onDateChange(tomorrow.toISOString().split('T')[0]);
                  onTimeChange('09:00');
                }}
                className="focus-ring px-3 py-2 text-sm border border-[var(--border)] bg-[color:var(--wash)] hover:bg-[color:var(--wash-2)] rounded-xl transition-colors"
              >
                Tomorrow 9AM
              </button>
              <button
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  onDateChange(nextWeek.toISOString().split('T')[0]);
                  onTimeChange('09:00');
                }}
                className="focus-ring px-3 py-2 text-sm border border-[var(--border)] bg-[color:var(--wash)] hover:bg-[color:var(--wash-2)] rounded-xl transition-colors"
              >
                Next Week
              </button>
              <button
                onClick={() => {
                  const nextMonth = new Date();
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  onDateChange(nextMonth.toISOString().split('T')[0]);
                  onTimeChange('09:00');
                }}
                className="focus-ring px-3 py-2 text-sm border border-[var(--border)] bg-[color:var(--wash)] hover:bg-[color:var(--wash-2)] rounded-xl transition-colors"
              >
                Next Month
              </button>
            </div>
          </div>

          {/* Timezone Info */}
          <div className="flex items-center gap-2 text-sm muted">
            <Calendar className="w-4 h-4" />
            <span>Times are in your local timezone (EST)</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[color:var(--wash)] border-t border-[var(--border)]">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="focus-ring px-4 py-2 text-sm text-[color:var(--foreground)]/75 hover:bg-[color:var(--wash-2)] rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing || !selectedDate || !selectedTime}
            className={`
              focus-ring flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium
              transition-colors
              ${
                isProcessing || !selectedDate || !selectedTime
                  ? 'bg-[color:var(--wash-2)] text-[color:var(--muted)] cursor-not-allowed'
                  : 'bg-[color:rgba(152,255,44,0.18)] hover:bg-[color:rgba(152,255,44,0.26)] text-[color:var(--foreground)]'
              }
            `}
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Schedule</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Channel Selector Component
// ============================================

interface ChannelSelectorProps {
  selectedChannel: string;
  onChange: (channel: string) => void;
  disabled?: boolean;
}

export function ChannelSelector({
  selectedChannel,
  onChange,
  disabled = false,
}: ChannelSelectorProps) {
  const channels = [
    { id: 'email', name: 'Email', icon: Mail, description: 'Professional outreach with tracking' },
    { id: 'dm', name: 'Direct Message', icon: MessageSquare, description: 'Social media DMs' },
    { id: 'whatsapp', name: 'WhatsApp', icon: Phone, description: 'Messaging via WhatsApp' },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[color:var(--foreground)]/85">
        Send Channel
      </label>
      <div className="grid grid-cols-3 gap-3">
        {channels.map((channel) => {
          const Icon = channel.icon;
          const isSelected = selectedChannel === channel.id;
          
          return (
            <button
              key={channel.id}
              onClick={() => onChange(channel.id)}
              disabled={disabled}
              className={`
                focus-ring flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all
                ${
                  isSelected
                    ? 'border-[color:rgba(152,255,44,0.45)] bg-[color:rgba(152,255,44,0.10)]'
                    : 'border-[var(--border)] hover:border-[var(--border-2)] bg-[var(--surface-solid)]'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Icon className={`w-6 h-6 ${isSelected ? 'text-[color:var(--foreground)]' : 'text-[color:var(--muted-2)]'}`} />
              <span className={`font-medium ${isSelected ? 'text-[color:var(--foreground)]' : 'text-[color:var(--foreground)]/80'}`}>
                {channel.name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs muted">
        {channels.find(c => c.id === selectedChannel)?.description}
      </p>
    </div>
  );
}

// ============================================
// Export Options Component
// ============================================

interface ExportOptionsProps {
  onExport: (format: 'csv' | 'json' | 'vcard') => Promise<void>;
  disabled?: boolean;
}

export function ExportOptions({ onExport, disabled = false }: ExportOptionsProps) {
  const formats = [
    { id: 'csv', name: 'CSV', description: 'Spreadsheet-compatible format', icon: Download },
    { id: 'json', name: 'JSON', description: 'Structured data format', icon: Download },
    { id: 'vcard', name: 'vCard', description: 'Contact import format', icon: Download },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[color:var(--foreground)]/85">
        Export Format
      </label>
      <div className="grid grid-cols-3 gap-3">
        {formats.map((format) => {
          const Icon = format.icon;
          
          return (
            <button
              key={format.id}
              onClick={() => onExport(format.id as 'csv' | 'json' | 'vcard')}
              disabled={disabled}
              className={`
                focus-ring flex flex-col items-center gap-2 p-4 rounded-2xl border border-[var(--border)] 
                hover:border-[var(--border-2)] hover:bg-[color:var(--wash)] transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <Icon className="w-5 h-5 text-[color:var(--muted-2)]" />
              <span className="font-medium text-[color:var(--foreground)]/85">{format.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
