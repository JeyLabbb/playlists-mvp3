import { NextResponse } from 'next/server';
import { getPleiaServerUser } from '@/lib/auth/serverUser';
import fs from 'fs';
import path from 'path';

// Feedback data file path
const FEEDBACK_FILE = path.join(process.cwd(), 'data', 'feedback.json');

// Load existing feedback
function loadFeedback() {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const data = fs.readFileSync(FEEDBACK_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[ADMIN-FEEDBACK] Error loading feedback data:', error);
  }
  return [];
}

export async function GET(request) {
  try {
    // Check authentication
    const user = await getPleiaServerUser();
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load feedback data
    const allFeedback = loadFeedback();
    
    // Sort by creation date (newest first) and limit to 200
    const sortedFeedback = allFeedback
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 200);

    // Calculate some basic stats
    const stats = {
      total: allFeedback.length,
      averageRating: allFeedback.length > 0 
        ? (allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length).toFixed(2)
        : 0,
      ratingDistribution: {
        5: allFeedback.filter(f => f.rating === 5).length,
        4: allFeedback.filter(f => f.rating === 4).length,
        3: allFeedback.filter(f => f.rating === 3).length,
        2: allFeedback.filter(f => f.rating === 2).length,
        1: allFeedback.filter(f => f.rating === 1).length,
      },
      consentRate: allFeedback.length > 0
        ? ((allFeedback.filter(f => f.consent).length / allFeedback.length) * 100).toFixed(1)
        : 0
    };

    return NextResponse.json({
      feedback: sortedFeedback,
      stats,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ADMIN-FEEDBACK] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
