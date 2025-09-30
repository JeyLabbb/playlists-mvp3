import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Debug endpoints only available in development" }, { status: 403 });
  }

  try {
    // For debug purposes, we'll simulate a token if none exists
    let token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token?.accessToken) {
      // Create a mock token for debugging
      token = {
        accessToken: "mock-token-for-debug",
        user: { name: "Debug User", email: "debug@example.com" }
      };
    }

    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get("prompt");
    const n = parseInt(searchParams.get("n")) || 50;

    if (!prompt) {
      return NextResponse.json({ 
        ok: false, 
        error: "Prompt parameter is required",
        timestamp: new Date().toISOString()
      }, { status: 422 });
    }

    const startTime = Date.now();

    // Call the intent parser
    const intentResponse = await fetch(`${req.nextUrl.origin}/api/intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token.accessToken}`
      },
      body: JSON.stringify({ prompt, target_tracks: n })
    });

    const intentData = await intentResponse.json();
    const endTime = Date.now();

    const debugInfo = {
      ok: true,
      prompt,
      target_tracks: n,
      intent: intentData,
      validation: {
        hasRequiredFields: validateIntent(intentData),
        missingFields: getMissingFields(intentData)
      },
      performance: {
        duration_ms: endTime - startTime,
        timestamp: new Date().toISOString()
      },
      environment: {
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "gpt-4.1"
      }
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error("Debug intent error:", error);
    return NextResponse.json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function validateIntent(intent) {
  const requiredFields = [
    "actividad", "vibes", "generos", "artistas_in", "artistas_out",
    "epoca", "idiomas", "tempo_bpm", "energy", "valence", "acousticness", "danceability",
    "duracion_total_min", "tamano_playlist", "reglas", "idioma_estricto", "instrumental_estricto", "diversidad_minima_autores",
    "seeds", "festival"
  ];
  
  return requiredFields.every(field => intent[field] !== undefined && intent[field] !== null);
}

function getMissingFields(intent) {
  const requiredFields = [
    "actividad", "vibes", "generos", "artistas_in", "artistas_out",
    "epoca", "idiomas", "tempo_bpm", "energy", "valence", "acousticness", "danceability",
    "duracion_total_min", "tamano_playlist", "reglas", "idioma_estricto", "instrumental_estricto", "diversidad_minima_autores",
    "seeds", "festival"
  ];
  
  return requiredFields.filter(field => intent[field] === undefined || intent[field] === null);
}
