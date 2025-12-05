import { NextResponse } from 'next/server';
import logger from '../../../lib/logger';

/**
 * Production monitoring endpoint
 * Provides health check and system status
 */
export async function GET(req) {
  const startTime = Date.now();
  
  try {
    // Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
      VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID,
      SPOTIFY_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET: !!process.env.SPOTIFY_CLIENT_SECRET,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
    };

    // Check API endpoints
    const apiEndpoints = [
      '/api/intent',
      '/api/playlist/stream',
      '/api/playlist/llm',
      '/api/auth/session'
    ];

    // Basic health check
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel: {
        region: process.env.VERCEL_REGION,
        deployment: process.env.VERCEL_DEPLOYMENT_ID,
        env: process.env.VERCEL_ENV
      },
      environment_variables: envCheck,
      api_endpoints: apiEndpoints,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };

    // Log health check
    logger.info('Health check performed', {
      duration: Date.now() - startTime,
      environment: process.env.NODE_ENV
    });

    return NextResponse.json(healthStatus, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/api/health',
      duration: Date.now() - startTime
    });

    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST endpoint for detailed system diagnostics
 */
export async function POST(req) {
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const { action, context } = body;

    let result = {};

    switch (action) {
      case 'test_streaming':
        result = await testStreamingEndpoint();
        break;
      
      case 'test_intent':
        result = await testIntentEndpoint();
        break;
      
      case 'test_auth':
        result = await testAuthEndpoint();
        break;
      
      case 'get_logs':
        result = await getRecentLogs();
        break;
      
      default:
        return NextResponse.json({
          error: 'Invalid action',
          available_actions: ['test_streaming', 'test_intent', 'test_auth', 'get_logs']
        }, { status: 400 });
    }

    logger.info(`Diagnostic action: ${action}`, {
      duration: Date.now() - startTime,
      context
    });

    return NextResponse.json({
      action,
      result,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    });

  } catch (error) {
    logger.logError(error, {
      endpoint: '/api/health',
      action: 'POST',
      duration: Date.now() - startTime
    });

    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * Test streaming endpoint
 */
async function testStreamingEndpoint() {
  try {
    const testUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/playlist/stream`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream'
      }
    });

    return {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      error: error.message,
      status: 'failed'
    };
  }
}

/**
 * Test intent endpoint
 */
async function testIntentEndpoint() {
  try {
    const testUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/intent`;
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'test playlist',
        target_tracks: 5
      })
    });

    return {
      status: response.status,
      ok: response.ok
    };
  } catch (error) {
    return {
      error: error.message,
      status: 'failed'
    };
  }
}

/**
 * Test auth endpoint
 */
async function testAuthEndpoint() {
  try {
    const testUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/session`;
    const response = await fetch(testUrl);

    return {
      status: response.status,
      ok: response.ok
    };
  } catch (error) {
    return {
      error: error.message,
      status: 'failed'
    };
  }
}

/**
 * Get recent logs (simulated - in real production you'd connect to a logging service)
 */
async function getRecentLogs() {
  return {
    message: 'Log retrieval not implemented',
    note: 'In production, connect to Vercel logs or external logging service',
    suggestion: 'Use Vercel dashboard or external service like Sentry, LogRocket, etc.'
  };
}
