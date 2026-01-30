import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    openaiKey: process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Not set',
    openaiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => 
      k.includes('OPENAI') || 
      k.includes('SUPABASE') || 
      k.includes('RESEND') ||
      k.includes('TWILIO')
    ),
  });
}
