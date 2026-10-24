/**
 * Cloudflare Worker: Privacy-Preserving Crash & Telemetry Reporter
 * Dedicated endpoint: /report
 * Accepts ONLY allow-listed technical metadata.
 * Strips and drops any extraneous or unexpected parameters.
 * ZERO financial data, transaction data, account names, or API keys are ever processed.
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-App-Version',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('FinanceFlow Telemetry Endpoint Active. Send POST to /report.', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    const url = new URL(request.url);
    if (!url.pathname.endsWith('/report')) {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    try {
      const body = await request.json();

      // STRICT ALLOW-LIST ENFORCEMENT:
      // Only extract technical fields. Drop anything else.
      const sanitizedReport = {
        errorMessage: String(body.errorMessage || 'Unknown client error').slice(0, 500),
        stackTrace: String(body.stackTrace || '').slice(0, 2000),
        appVersion: String(body.appVersion || '0.1.0').slice(0, 50),
        deviceType: ['desktop', 'mobile', 'tablet'].includes(body.deviceType) ? body.deviceType : 'unknown',
        os: String(body.os || 'unknown').slice(0, 50),
        browser: String(body.browser || 'unknown').slice(0, 50),
        timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
      };

      // In production, this can log to Cloudflare Tail, KV, or external logging service
      console.log('[CRASH_REPORT]', JSON.stringify(sanitizedReport));

      return new Response(JSON.stringify({ success: true, receivedAt: sanitizedReport.timestamp }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Malformed telemetry payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
