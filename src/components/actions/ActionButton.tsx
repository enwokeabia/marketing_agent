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
            flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white
            transition-all duration-200
            ${
              approvedCount === 0 || isProcessing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
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
          <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-20">
            <button
              onClick={() => {
                handleSend();
                setShowMenu(false);
              }}
              disabled={approvedCount === 0 || isProcessing}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Send Now</p>
                <p className="text-sm text-gray-500">Deliver immediately</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                setShowScheduleModal(true);
                setShowMenu(false);
              }}
              disabled={approvedCount === 0 || isProcessing}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Schedule</p>
                <p className="text-sm text-gray-500">Pick a send time</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                handleExport();
                setShowMenu(false);
              }}
              disabled={approvedCount === 0 || isProcessing}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Export</p>
                <p className="text-sm text-gray-500">Download as CSV/JSON</p>
              </div>
            </button>
            
            <div className="border-t border-gray-100 pt-2 pb-2">
              <p className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide">
                Integrations
              </p>
              
              <button
                onClick={() => {
                  // Would trigger n8n/Zapier webhook
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Send via n8n</span>
              </button>
              
              <button
                onClick={() => {
                  // Would trigger Zapier webhook
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Send via Zapier</span>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Schedule Messages</h2>
          <p className="text-sm text-gray-600 mt-1">
            Choose when to send your approved messages
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send Date
            </label>
            <input
              type="date"
              value={selectedDate || today}
              onChange={(e) => onDateChange(e.target.value)}
              min={today}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send Time
            </label>
            <input
              type="time"
              value={selectedTime || defaultTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Quick Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Next Month
              </button>
            </div>
          </div>

          {/* Timezone Info */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Times are in your local timezone (EST)</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing || !selectedDate || !selectedTime}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg font-medium
              transition-colors
              ${
                isProcessing || !selectedDate || !selectedTime
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
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
      <label className="block text-sm font-medium text-gray-700">
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
                flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                {channel.name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">
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
      <label className="block text-sm font-medium text-gray-700">
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
                flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 
                hover:border-gray-300 hover:bg-gray-50 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <Icon className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-700">{format.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
