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
        <h1 className="text-2xl font-bold text-gray-900">Campaign Dashboard</h1>
        <p className="text-gray-600 mt-1">Track your outreach performance</p>
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicked" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                <span className="text-sm text-gray-600">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Campaigns</h2>
        </div>
        <div className="divide-y divide-gray-100">
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
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
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
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
            {campaign.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{campaign.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                {getStatusLabel(campaign.status)}
              </span>
              <span className="text-xs text-gray-500">
                Created {formatDate(campaign.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{campaign.targets}</p>
            <p className="text-xs text-gray-500">Targets</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{campaign.sent}</p>
            <p className="text-xs text-gray-500">Sent</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{campaign.openRate}%</p>
            <p className="text-xs text-gray-500">Open Rate</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">{campaign.replyRate}%</p>
            <p className="text-xs text-gray-500">Reply Rate</p>
          </div>
          
          <button className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
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
      <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
        <BarChart className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Create your first outreach campaign by describing your goal in plain English.
        Our AI will handle the rest!
      </p>
    </div>
  );
}
