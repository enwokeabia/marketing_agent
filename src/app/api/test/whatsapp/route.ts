import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/integrations/whatsapp';

export async function GET() {
  try {
    // Test sending a message (will fail without a real recipient, but verifies config)
    const result = await sendWhatsAppMessage({
      to: 'whatsapp:+1234567890', // Test number
      body: 'Test message from Marketing Agent',
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      config: {
        phoneNumber: process.env.TWILIO_PHONE_NUMBER ? '✓ Set' : '✗ Not set',
        accountSid: process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Not set',
        authToken: process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Not set',
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
