'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Mail, MessageSquare, Eye, MousePointer, Calendar, TrendingUp, Users, Send } from 'lucide-react';

// ============================================
// Dashboard Component
// ============================================

interface DashboardProps {
  campaigns: CampaignSummary[];
  overallStats: OverallStats;
}

export function Dashboard({ campaigns, overallStats }: DashboardProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl leading-tight">Campaign Dashboard</h1>
        <p className="muted mt-1">Track your outreach performance</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Send}
          label="Total Sent"
          value={overallStats.totalSent}
          color="blue"
        />
        <StatCard
          icon={Eye}
          label="Opened"
          value={overallStats.totalOpened}
          color="green"
        />
        <StatCard
          icon={MousePointer}
          label="Clicked"
          value={overallStats.totalClicked}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Response Rate"
          value={`${overallStats.responseRate}%`}
          color="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="surface rounded-3xl p-6">
          <h2 className="font-display text-xl mb-4">
            Message Performance
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overallStats.performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255,255,255,0.80)',
                    border: '1px solid rgba(20,18,15,0.14)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="sent" fill="#98ff2c" radius={[6, 6, 0, 0]} />
                <Bar dataKey="opened" fill="#ffb020" radius={[6, 6, 0, 0]} />
                <Bar dataKey="clicked" fill="#ff3b30" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="surface rounded-3xl p-6">
          <h2 className="font-display text-xl mb-4">
            Channel Distribution
          </h2>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overallStats.channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {overallStats.channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {overallStats.channelData.map((channel) => (
              <div key={channel.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: channel.color }}
                />
                <span className="text-sm muted">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="surface rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[color:rgba(20,18,15,0.03)]">
          <h2 className="font-display text-xl">Recent Campaigns</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {campaigns.map((campaign) => (
            <CampaignRow key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-[color:rgba(152,255,44,0.14)] text-[color:var(--accent-ink)] border-[color:rgba(152,255,44,0.22)]',
    green: 'bg-[color:rgba(255,176,32,0.14)] text-[color:var(--foreground)] border-[color:rgba(255,176,32,0.22)]',
    purple: 'bg-[color:rgba(20,18,15,0.06)] text-[color:var(--foreground)] border-[var(--border)]',
    orange: 'bg-[color:rgba(255,59,48,0.10)] text-[color:var(--foreground)] border-[color:rgba(255,59,48,0.16)]',
  };

  return (
    <div className="surface rounded-2xl p-4">
      <div className={`w-10 h-10 rounded-xl border ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-semibold text-[color:var(--foreground)]">{value}</p>
      <p className="text-sm muted">{label}</p>
    </div>
  );
}

// ============================================
// Campaign Row Component
// ============================================

interface CampaignRowProps {
  campaign: CampaignSummary;
}

function CampaignRow({ campaign }: CampaignRowProps) {
  const statusColors: Record<string, string> = {
    draft: 'bg-[color:rgba(20,18,15,0.06)] text-[color:var(--foreground)]/80 border-[var(--border)]',
    active: 'bg-[color:rgba(152,255,44,0.12)] text-[color:var(--foreground)] border-[color:rgba(152,255,44,0.20)]',
    paused: 'bg-[color:rgba(255,176,32,0.14)] text-[color:var(--foreground)] border-[color:rgba(255,176,32,0.22)]',
    completed: 'bg-[color:rgba(152,255,44,0.10)] text-[color:var(--foreground)] border-[color:rgba(152,255,44,0.18)]',
    cancelled: 'bg-[color:rgba(255,59,48,0.10)] text-[color:var(--foreground)] border-[color:rgba(255,59,48,0.16)]',
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  return (
    <div className="px-6 py-4 hover:bg-[color:rgba(20,18,15,0.03)] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl border border-[var(--border)] bg-[color:rgba(20,18,15,0.06)] flex items-center justify-center text-[color:var(--foreground)] font-medium shadow-[0_10px_28px_rgba(20,18,15,0.10)]">
            {campaign.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-medium text-[color:var(--foreground)]">{campaign.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[campaign.status]}`}>
                {getStatusLabel(campaign.status)}
              </span>
              <span className="text-xs muted">
                Created {formatDate(campaign.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-lg font-semibold text-[color:var(--foreground)]">{campaign.targets}</p>
            <p className="text-xs muted">Targets</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[color:var(--foreground)]">{campaign.sent}</p>
            <p className="text-xs muted">Sent</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[color:var(--foreground)]">{campaign.openRate}%</p>
            <p className="text-xs muted">Open Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[color:var(--foreground)]">{campaign.replyRate}%</p>
            <p className="text-xs muted">Reply Rate</p>
          </div>
          
          <button className="focus-ring px-4 py-2 text-sm text-[color:var(--foreground)]/85 hover:bg-[color:rgba(20,18,15,0.06)] rounded-xl font-medium transition-colors">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Types & Utilities
// ============================================

interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  targets: number;
  sent: number;
  openRate: number;
  replyRate: number;
  createdAt: string;
}

interface OverallStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  responseRate: number;
  performanceData: Array<{
    name: string;
    sent: number;
    opened: number;
    clicked: number;
  }>;
  channelData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
}

// ============================================
// Empty State
// ============================================

export function EmptyDashboard() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 grid place-items-center rounded-3xl border border-[var(--border)] bg-[var(--surface-solid)] shadow-[var(--shadow-2)]">
        <BarChart className="w-10 h-10 text-[color:var(--muted-2)]" />
      </div>
      <h2 className="font-display text-2xl mb-2">No campaigns yet</h2>
      <p className="muted max-w-md mx-auto">
        Create your first outreach campaign by describing your goal in plain English.
        Our AI will handle the rest!
      </p>
    </div>
  );
}
