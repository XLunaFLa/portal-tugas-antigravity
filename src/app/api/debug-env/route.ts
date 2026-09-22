import { NextResponse } from 'next/server';

export async function GET() {
  const envUrl = process.env.NINE_ROUTER_BASE_URL;
  const isVercel = Boolean(process.env.VERCEL);
  const fallbackUrl = 'https://pest-forwarding-personalized-much.trycloudflare.com/v1';
  const effectiveUrl = envUrl || fallbackUrl;

  let pingStatus = 'untested';
  let pingError = null;

  const activeTunnelUrl = 'https://pest-forwarding-personalized-much.trycloudflare.com/v1';
  let activeTunnelStatus = 'untested';
  let activeTunnelError = null;

  try {
    const res = await fetch(`${activeTunnelUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${process.env.NINE_ROUTER_API_KEY || 'sk-87aec067d631e9b8-zhlati-3571faa8'}`
      }
    });
    activeTunnelStatus = `HTTP ${res.status}`;
  } catch (err: any) {
    activeTunnelError = err.message || String(err);
  }

  return NextResponse.json({
    isVercel,
    hasEnvUrl: Boolean(envUrl),
    envUrl,
    activeTunnelUrl,
    activeTunnelStatus,
    activeTunnelError,
  });
}
