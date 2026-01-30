// Marketing Agent - Email Integration (Resend, SendGrid, etc.)

import { MessageDraft, SendResult } from '@/types';

// ============================================
// Email Provider Interface
// ============================================

export interface EmailProvider {
  name: string;
  send(params: SendEmailParams): Promise<SendResult>;
  sendBulk(params: SendBulkEmailParams): Promise<BulkSendResult>;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendBulkEmailParams {
  messages: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
  }>;
  from?: string;
}

export interface BulkSendResult {
  sent: number;
  failed: number;
  results: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

// ============================================
// Resend Integration
// ============================================

export async function sendWithResend(params: SendEmailParams): Promise<SendResult> {
  try {
    // Dynamic import to avoid build errors
    const { Resend } = await import('resend');
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: params.from || 'outreach@yourdomain.com',
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });
    
    console.log(`✅ Email sent via Resend: ${result.data?.id}`);
    
    return {
      success: true,
      messageId: result.data?.id,
      channel: 'email',
      targetId: params.to,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error('❌ Resend error:', error);
    return {
      success: false,
      channel: 'email',
      targetId: params.to,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// SendGrid Integration
// ============================================

export async function sendWithSendGrid(params: SendEmailParams): Promise<SendResult> {
  try {
    const sgMail = await import('@sendgrid/mail');
    
    if (process.env.SENDGRID_API_KEY) {
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
    }
    
    await sgMail.default.send({
      to: params.to,
      from: params.from || 'noreply@yourdomain.com',
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    
    console.log(`✅ Email sent via SendGrid`);
    
    return {
      success: true,
      messageId: `sg_${Date.now()}`,
      channel: 'email',
      targetId: params.to,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error('❌ SendGrid error:', error);
    return {
      success: false,
      channel: 'email',
      targetId: params.to,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// Unified Email Sender (Auto-detect provider)
// ============================================

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  // Use Resend if API key is available
  if (process.env.RESEND_API_KEY) {
    return sendWithResend(params);
  }
  
  // Use SendGrid if API key is available
  if (process.env.SENDGRID_API_KEY) {
    return sendWithSendGrid(params);
  }
  
  // Mock mode for demo
  console.log(`📧 Email (mock): ${params.to} - ${params.subject}`);
  return {
    success: true,
    messageId: `mock_${Date.now()}`,
    channel: 'email',
    targetId: params.to,
    sentAt: new Date(),
  };
}

// ============================================
// Send Bulk Emails
// ============================================

export async function sendBulkEmails(
  messages: MessageDraft[],
  options?: {
    delayMs?: number;
    onProgress?: (sent: number, total: number) => void;
  }
): Promise<BulkSendResult> {
  const results: BulkSendResult = {
    sent: 0,
    failed: 0,
    results: [],
  };
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    try {
      const result = await sendEmail({
        to: message.target.email || '',
        subject: message.subject || '',
        html: message.body,
      });
      
      if (result.success) {
        results.sent++;
        results.results.push({
          to: message.target.email || '',
          success: true,
          messageId: result.messageId,
        });
      } else {
        results.failed++;
        results.results.push({
          to: message.target.email || '',
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      results.failed++;
      results.results.push({
        to: message.target.email || '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    // Progress callback
    if (options?.onProgress) {
      options.onProgress(results.sent + results.failed, messages.length);
    }
    
    // Delay between sends to avoid rate limiting
    if (i < messages.length - 1 && options?.delayMs) {
      await new Promise(resolve => setTimeout(resolve, options.delayMs));
    }
  }
  
  return results;
}

// ============================================
// Convert Draft to Email
// ============================================

export function draftToEmail(draft: MessageDraft): {
  subject: string;
  html: string;
  text: string;
} {
  // Convert markdown-like content to HTML
  const html = convertToHtml(draft.body);
  const text = convertToPlainText(draft.body);
  
  return {
    subject: draft.subject || 'Reaching out...',
    html,
    text,
  };
}

// ============================================
// Content Converters
// ============================================

function convertToHtml(markdown: string): string {
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Paragraphs
  html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
${html}
<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
  <p>This message was sent by Marketing Agent. <a href="https://yourdomain.com">Unsubscribe</a></p>
</div></div>`;
  
  return html;
}

function convertToPlainText(markdown: string): string {
  let text = markdown;
  
  // Remove markdown formatting
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');
  text = text.replace(/^#+ /gim, '');
  text = text.replace(/\n/g, '\n');
  
  return text;
}

// ============================================
// Campaign Email Sender
// ============================================

export async function sendCampaignEmails(
  messages: MessageDraft[],
  campaignSettings?: {
    sendRate?: number;  // emails per minute
    startHour?: number; // local time
    endHour?: number;
  }
): Promise<BulkSendResult> {
  // Calculate delay between emails
  const delayMs = campaignSettings?.sendRate 
    ? (60000 / campaignSettings.sendRate)  // Convert per minute to ms
    : 1000;  // Default 1 second
  
  return sendBulkEmails(messages, {
    delayMs,
    onProgress: (sent, total) => {
      console.log(`📧 Email progress: ${sent}/${total} sent`);
    },
  });
}
