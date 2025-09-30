/**
 * Mock Spotify API for development and testing
 */

// Mock tracks data with valid Spotify IDs (22 characters)
const MOCK_TRACKS = [
  {
    id: "4iV5W9uYEdYUVa79Axb7Rh",
    name: "Weightless",
    artists: ["Lofi Artist"],
    artist_ids: ["1vCWHaC5f2uS3yhpwWbIA6"],
    uri: "spotify:track:sjFFQgsaVfgf6BSl6XRGOWiV5W9uYEdYUVa79Axb7Rh",
    popularity: 80,
    open_url: "https://open.spotify.com/track/sjFFQgsaVfgf6BSl6XRGOWiV5W9uYEdYUVa79Axb7Rh",
    audio_features: {
      tempo: 85,
      energy: 0.3,
      valence: 0.4,
      acousticness: 0.8,
      danceability: 0.4,
      instrumentalness: 0.9
    }
  },
  {
    id: "5jV5W9uYEdYUVa79Axb7Ri",
    name: "Teardrop",
    artists: ["Lofi Artist"],
    artist_ids: ["1vCWHaC5f2uS3yhpwWbIA6"],
    uri: "spotify:track:onyaQvs7djeH2owCVHThGWjV5W9uYEdYUVa79Axb7Ri",
    popularity: 78,
    open_url: "https://open.spotify.com/track/onyaQvs7djeH2owCVHThGWjV5W9uYEdYUVa79Axb7Ri",
    audio_features: {
      tempo: 88,
      energy: 0.35,
      valence: 0.45,
      acousticness: 0.75,
      danceability: 0.45,
      instrumentalness: 0.85
    }
  },
  {
    id: "6kV5W9uYEdYUVa79Axb7Rj",
    name: "Porcelain",
    artists: ["Lofi Artist"],
    artist_ids: ["1vCWHaC5f2uS3yhpwWbIA6"],
    uri: "spotify:track:qHMbi5Sgv1KYJsDwgPPmCAkV5W9uYEdYUVa79Axb7Rj",
    popularity: 76,
    open_url: "https://open.spotify.com/track/qHMbi5Sgv1KYJsDwgPPmCAkV5W9uYEdYUVa79Axb7Rj",
    audio_features: {
      tempo: 82,
      energy: 0.28,
      valence: 0.38,
      acousticness: 0.85,
      danceability: 0.38,
      instrumentalness: 0.92
    }
  },
  {
    id: "RIhHpaIi9XIBL2MRyI4DkH",
    name: "Breathe Me",
    artists: ["Ambient Producer"],
    artist_ids: ["QAj0ltUdl4kteK7zOYjZAJ"],
    uri: "spotify:track:RIhHpaIi9XIBL2MRyI4DkH",
    popularity: 75,
    open_url: "https://open.spotify.com/track/RIhHpaIi9XIBL2MRyI4DkH",
    audio_features: {
      tempo: 90,
      energy: 0.25,
      valence: 0.35,
      acousticness: 0.9,
      danceability: 0.3,
      instrumentalness: 0.95
    }
  },
  {
    id: "rivDyyssXspmhVJX3580Es",
    name: "One More Time",
    artists: ["Workout Artist"],
    artist_ids: ["J6NFqJftZ1aEtGaxaHsR35"],
    uri: "spotify:track:rivDyyssXspmhVJX3580Es",
    popularity: 85,
    open_url: "https://open.spotify.com/track/rivDyyssXspmhVJX3580Es",
    audio_features: {
      tempo: 165,
      energy: 0.8,
      valence: 0.6,
      acousticness: 0.2,
      danceability: 0.8,
      instrumentalness: 0.1
    }
  },
  {
    id: "sjFFQgsaVfgf6BSl6XRGOW",
    name: "Around the World",
    artists: ["Fitness DJ"],
    artist_ids: ["5NGdTolEWczJYPgf036X7h"],
    uri: "spotify:track:sjFFQgsaVfgf6BSl6XRGOW",
    popularity: 82,
    open_url: "https://open.spotify.com/track/sjFFQgsaVfgf6BSl6XRGOW",
    audio_features: {
      tempo: 170,
      energy: 0.85,
      valence: 0.7,
      acousticness: 0.15,
      danceability: 0.85,
      instrumentalness: 0.05
    }
  },
  {
    id: "onyaQvs7djeH2owCVHThGW",
    name: "Get Lucky",
    artists: ["Latin Artist"],
    artist_ids: ["SZ4MLWUQdYcGdkMWTKtaVD"],
    uri: "spotify:track:onyaQvs7djeH2owCVHThGW",
    popularity: 90,
    open_url: "https://open.spotify.com/track:5",
    audio_features: {
      tempo: 95,
      energy: 0.7,
      valence: 0.8,
      acousticness: 0.3,
      danceability: 0.9,
      instrumentalness: 0.0
    }
  },
  // Reggaeton tracks
  {
    id: "reggaeton001",
    name: "Dakiti",
    artists: ["Bad Bunny", "Jhay Cortez"],
    artist_ids: ["badbunny123", "jhaycortez123"],
    uri: "spotify:track:reggaeton001",
    popularity: 95,
    open_url: "https://open.spotify.com/track/reggaeton001",
    audio_features: {
      tempo: 90,
      energy: 0.8,
      valence: 0.7,
      acousticness: 0.1,
      danceability: 0.9,
      instrumentalness: 0.0
    }
  },
  {
    id: "reggaeton002",
    name: "Tusa",
    artists: ["Karol G", "Nicki Minaj"],
    artist_ids: ["karolg123", "nickiminaj123"],
    uri: "spotify:track:reggaeton002",
    popularity: 92,
    open_url: "https://open.spotify.com/track/reggaeton002",
    audio_features: {
      tempo: 95,
      energy: 0.75,
      valence: 0.8,
      acousticness: 0.2,
      danceability: 0.85,
      instrumentalness: 0.0
    }
  },
  {
    id: "reggaeton003",
    name: "Con Calma",
    artists: ["Daddy Yankee", "Snow"],
    artist_ids: ["daddyyankee123", "snow123"],
    uri: "spotify:track:reggaeton003",
    popularity: 88,
    open_url: "https://open.spotify.com/track/reggaeton003",
    audio_features: {
      tempo: 85,
      energy: 0.7,
      valence: 0.75,
      acousticness: 0.15,
      danceability: 0.8,
      instrumentalness: 0.0
    }
  },
  {
    id: "reggaeton004",
    name: "Mi Gente",
    artists: ["J Balvin", "Willy William"],
    artist_ids: ["jbalvin123", "willywilliam123"],
    uri: "spotify:track:reggaeton004",
    popularity: 90,
    open_url: "https://open.spotify.com/track/reggaeton004",
    audio_features: {
      tempo: 88,
      energy: 0.85,
      valence: 0.8,
      acousticness: 0.1,
      danceability: 0.9,
      instrumentalness: 0.0
    }
  },
  {
    id: "reggaeton005",
    name: "X (EQUIS)",
    artists: ["Nicky Jam", "J Balvin"],
    artist_ids: ["nickjam123", "jbalvin123"],
    uri: "spotify:track:reggaeton005",
    popularity: 87,
    open_url: "https://open.spotify.com/track/reggaeton005",
    audio_features: {
      tempo: 92,
      energy: 0.8,
      valence: 0.75,
      acousticness: 0.2,
      danceability: 0.85,
      instrumentalness: 0.0
    }
  },
  {
    id: "reggaeton006",
    name: "La Modelo",
    artists: ["Ozuna", "Cardi B"],
    artist_ids: ["ozuna123", "cardib123"],
    uri: "spotify:track:reggaeton006",
    popularity: 89,
    open_url: "https://open.spotify.com/track/reggaeton006",
    audio_features: {
      tempo: 87,
      energy: 0.75,
      valence: 0.7,
      acousticness: 0.15,
      danceability: 0.8,
      instrumentalness: 0.0
    }
  },
  {
    id: "reggaeton007",
    name: "Te Boté",
    artists: ["Nio García", "Casper Mágico", "Ozuna", "Bad Bunny", "Nicky Jam"],
    artist_ids: ["niogarcia123", "caspermagico123", "ozuna123", "badbunny123", "nickjam123"],
    uri: "spotify:track:reggaeton007",
    popularity: 93,
    open_url: "https://open.spotify.com/track/reggaeton007",
    audio_features: {
      tempo: 90,
      energy: 0.8,
      valence: 0.75,
      acousticness: 0.1,
      danceability: 0.9,
      instrumentalness: 0.0
    }
  },
  {
    id: "reggaeton008",
    name: "Bichota",
    artists: ["Karol G"],
    artist_ids: ["karolg123"],
    uri: "spotify:track:reggaeton008",
    popularity: 91,
    open_url: "https://open.spotify.com/track/reggaeton008",
    audio_features: {
      tempo: 88,
      energy: 0.85,
      valence: 0.8,
      acousticness: 0.1,
      danceability: 0.9,
      instrumentalness: 0.0
    }
  },
  {
    id: "reggaeton009",
    name: "Despacito",
    artists: ["Luis Fonsi", "Daddy Yankee"],
    artist_ids: ["luisfonsi123", "daddyyankee123"],
    uri: "spotify:track:reggaeton009",
    popularity: 98,
    open_url: "https://open.spotify.com/track/reggaeton009",
    audio_features: {
      tempo: 89,
      energy: 0.7,
      valence: 0.8,
      acousticness: 0.2,
      danceability: 0.85,
      instrumentalness: 0.0
    }
  },
  {
    id: "reggaeton010",
    name: "Baila Baila Baila",
    artists: ["Ozuna"],
    artist_ids: ["ozuna123"],
    uri: "spotify:track:reggaeton010",
    popularity: 86,
    open_url: "https://open.spotify.com/track/reggaeton010",
    audio_features: {
      tempo: 91,
      energy: 0.8,
      valence: 0.8,
      acousticness: 0.1,
      danceability: 0.9,
      instrumentalness: 0.0
    }
  },
  {
    id: "qHMbi5Sgv1KYJsDwgPPmCA",
    name: "Blinding Lights",
    artists: ["Pop Artist"],
    artist_ids: ["HNirji3B7ZAMvOUiQ2i573"],
    uri: "spotify:track:qHMbi5Sgv1KYJsDwgPPmCA",
    popularity: 88,
    open_url: "https://open.spotify.com/track/qHMbi5Sgv1KYJsDwgPPmCA",
    audio_features: {
      tempo: 120,
      energy: 0.6,
      valence: 0.75,
      acousticness: 0.4,
      danceability: 0.7,
      instrumentalness: 0.0
    }
  },
  {
    id: "lP9Ou1BHGFH3xAbyxRKNQ4",
    name: "Clair de Lune",
    artists: ["Synth Artist"],
    artist_ids: ["F8JuStNWWC1PvzYaGBsbvz"],
    uri: "spotify:track:lP9Ou1BHGFH3xAbyxRKNQ4",
    popularity: 70,
    open_url: "https://open.spotify.com/track/lP9Ou1BHGFH3xAbyxRKNQ4",
    audio_features: {
      tempo: 110,
      energy: 0.5,
      valence: 0.3,
      acousticness: 0.1,
      danceability: 0.6,
      instrumentalness: 0.8
    }
  },
  {
    id: "iN1mC1zMiKTSs8qr1YGDML",
    name: "Uptown Funk",
    artists: ["Festival Artist"],
    artist_ids: ["T2LOrObY8ZzZ0whz7BTJu0"],
    uri: "spotify:track:iN1mC1zMiKTSs8qr1YGDML",
    popularity: 92,
    open_url: "https://open.spotify.com/track/iN1mC1zMiKTSs8qr1YGDML",
    audio_features: {
      tempo: 128,
      energy: 0.9,
      valence: 0.85,
      acousticness: 0.2,
      danceability: 0.9,
      instrumentalness: 0.0
    }
  },
  {
    id: "sXhsqUS4krOS0kfyq1JHG9",
    name: "River Flows in You",
    artists: ["Ambient Producer"],
    artist_ids: ["QAj0ltUdl4kteK7zOYjZAJ"],
    uri: "spotify:track:sXhsqUS4krOS0kfyq1JHG9",
    popularity: 72,
    open_url: "https://open.spotify.com/track/sXhsqUS4krOS0kfyq1JHG9",
    audio_features: {
      tempo: 75,
      energy: 0.2,
      valence: 0.3,
      acousticness: 0.9,
      danceability: 0.2,
      instrumentalness: 0.95
    }
  },
  {
    id: "kJr9vXKVeGQH9Fv6MUoEvd",
    name: "Comptine d'un autre été",
    artists: ["Ambient Producer"],
    artist_ids: ["QAj0ltUdl4kteK7zOYjZAJ"],
    uri: "spotify:track:kJr9vXKVeGQH9Fv6MUoEvd",
    popularity: 74,
    open_url: "https://open.spotify.com/track/kJr9vXKVeGQH9Fv6MUoEvd",
    audio_features: {
      tempo: 80,
      energy: 0.25,
      valence: 0.35,
      acousticness: 0.85,
      danceability: 0.25,
      instrumentalness: 0.9
    }
  },
  {
    id: "Z73zCNRLSPVoXAhFZSSPso",
    name: "Shape of You",
    artists: ["Workout Artist"],
    artist_ids: ["J6NFqJftZ1aEtGaxaHsR35"],
    uri: "spotify:track:Z73zCNRLSPVoXAhFZSSPso",
    popularity: 83,
    open_url: "https://open.spotify.com/track/Z73zCNRLSPVoXAhFZSSPso",
    audio_features: {
      tempo: 160,
      energy: 0.75,
      valence: 0.65,
      acousticness: 0.25,
      danceability: 0.75,
      instrumentalness: 0.1
    }
  },
  {
    id: "8zvjgemv4AIbL2iaZhsBbW",
    name: "Despacito",
    artists: ["Fitness DJ"],
    artist_ids: ["5NGdTolEWczJYPgf036X7h"],
    uri: "spotify:track:8zvjgemv4AIbL2iaZhsBbW",
    popularity: 81,
    open_url: "https://open.spotify.com/track/8zvjgemv4AIbL2iaZhsBbW",
    audio_features: {
      tempo: 155,
      energy: 0.8,
      valence: 0.7,
      acousticness: 0.2,
      danceability: 0.8,
      instrumentalness: 0.05
    }
  },
  {
    id: "CXkGHcRMU0GjFuHpJtEKkQ",
    name: "Havana",
    artists: ["Latin Artist"],
    artist_ids: ["SZ4MLWUQdYcGdkMWTKtaVD"],
    uri: "spotify:track:CXkGHcRMU0GjFuHpJtEKkQ",
    popularity: 89,
    open_url: "https://open.spotify.com/track/CXkGHcRMU0GjFuHpJtEKkQ",
    audio_features: {
      tempo: 100,
      energy: 0.65,
      valence: 0.75,
      acousticness: 0.35,
      danceability: 0.85,
      instrumentalness: 0.0
    }
  },
  {
    id: "0c9wbezcHY1JH8yr5ADUbf",
    name: "Watermelon Sugar",
    artists: ["Pop Artist"],
    artist_ids: ["HNirji3B7ZAMvOUiQ2i573"],
    uri: "spotify:track:0c9wbezcHY1JH8yr5ADUbf",
    popularity: 87,
    open_url: "https://open.spotify.com/track/0c9wbezcHY1JH8yr5ADUbf",
    audio_features: {
      tempo: 125,
      energy: 0.55,
      valence: 0.7,
      acousticness: 0.45,
      danceability: 0.65,
      instrumentalness: 0.0
    }
  },
  {
    id: "zTnx4jk8lvk82GUXrMksfa",
    name: "Nuvole Bianche",
    artists: ["Synth Artist"],
    artist_ids: ["F8JuStNWWC1PvzYaGBsbvz"],
    uri: "spotify:track:zTnx4jk8lvk82GUXrMksfa",
    popularity: 68,
    open_url: "https://open.spotify.com/track/zTnx4jk8lvk82GUXrMksfa",
    audio_features: {
      tempo: 110,
      energy: 0.4,
      valence: 0.5,
      acousticness: 0.6,
      danceability: 0.5,
      instrumentalness: 0.8
    }
  },
  {
    id: "tN5ufx4jmM07YIjOwWuUmK",
    name: "Closer",
    artists: ["Festival Artist"],
    artist_ids: ["T2LOrObY8ZzZ0whz7BTJu0"],
    uri: "spotify:track:tN5ufx4jmM07YIjOwWuUmK",
    popularity: 92,
    open_url: "https://open.spotify.com/track/tN5ufx4jmM07YIjOwWuUmK",
    audio_features: {
      tempo: 128,
      energy: 0.9,
      valence: 0.8,
      acousticness: 0.1,
      danceability: 0.9,
      instrumentalness: 0.0
    }
  },
  // Additional tracks for more variety
  {
    id: "a1b2c3d4e5f6g7h8i9j0k1",
    name: "Midnight City",
    artists: ["Synth Artist"],
    artist_ids: ["F8JuStNWWC1PvzYaGBsbvz"],
    uri: "spotify:track:a1b2c3d4e5f6g7h8i9j0k1",
    popularity: 85,
    open_url: "https://open.spotify.com/track:a1b2c3d4e5f6g7h8i9j0k1",
    audio_features: {
      tempo: 95,
      energy: 0.7,
      valence: 0.6,
      acousticness: 0.2,
      danceability: 0.8,
      instrumentalness: 0.1
    }
  },
  {
    id: "b2c3d4e5f6g7h8i9j0k1l2",
    name: "Drive",
    artists: ["Pop Artist"],
    artist_ids: ["HNirji3B7ZAMvOUiQ2i573"],
    uri: "spotify:track:b2c3d4e5f6g7h8i9j0k1l2",
    popularity: 88,
    open_url: "https://open.spotify.com/track:b2c3d4e5f6g7h8i9j0k1l2",
    audio_features: {
      tempo: 100,
      energy: 0.6,
      valence: 0.7,
      acousticness: 0.3,
      danceability: 0.7,
      instrumentalness: 0.0
    }
  },
  {
    id: "c3d4e5f6g7h8i9j0k1l2m3",
    name: "Nightcall",
    artists: ["Synth Artist"],
    artist_ids: ["F8JuStNWWC1PvzYaGBsbvz"],
    uri: "spotify:track:c3d4e5f6g7h8i9j0k1l2m3",
    popularity: 82,
    open_url: "https://open.spotify.com/track:c3d4e5f6g7h8i9j0k1l2m3",
    audio_features: {
      tempo: 85,
      energy: 0.5,
      valence: 0.4,
      acousticness: 0.1,
      danceability: 0.6,
      instrumentalness: 0.2
    }
  },
  {
    id: "d4e5f6g7h8i9j0k1l2m3n4",
    name: "Sunset Boulevard",
    artists: ["Ambient Producer"],
    artist_ids: ["QAj0ltUdl4kteK7zOYjZAJ"],
    uri: "spotify:track:d4e5f6g7h8i9j0k1l2m3n4",
    popularity: 75,
    open_url: "https://open.spotify.com/track:d4e5f6g7h8i9j0k1l2m3n4",
    audio_features: {
      tempo: 70,
      energy: 0.3,
      valence: 0.5,
      acousticness: 0.8,
      danceability: 0.4,
      instrumentalness: 0.9
    }
  },
  {
    id: "e5f6g7h8i9j0k1l2m3n4o5",
    name: "Highway Star",
    artists: ["Workout Artist"],
    artist_ids: ["J6NFqJftZ1aEtGaxaHsR35"],
    uri: "spotify:track:e5f6g7h8i9j0k1l2m3n4o5",
    popularity: 90,
    open_url: "https://open.spotify.com/track:e5f6g7h8i9j0k1l2m3n4o5",
    audio_features: {
      tempo: 140,
      energy: 0.9,
      valence: 0.8,
      acousticness: 0.1,
      danceability: 0.8,
      instrumentalness: 0.0
    }
  },
  {
    id: "f6g7h8i9j0k1l2m3n4o5p6",
    name: "Road Trip",
    artists: ["Pop Artist"],
    artist_ids: ["HNirji3B7ZAMvOUiQ2i573"],
    uri: "spotify:track:f6g7h8i9j0k1l2m3n4o5p6",
    popularity: 87,
    open_url: "https://open.spotify.com/track:f6g7h8i9j0k1l2m3n4o5p6",
    audio_features: {
      tempo: 110,
      energy: 0.7,
      valence: 0.8,
      acousticness: 0.4,
      danceability: 0.8,
      instrumentalness: 0.0
    }
  },
  {
    id: "g7h8i9j0k1l2m3n4o5p6q7",
    name: "Nostalgia",
    artists: ["Lofi Artist"],
    artist_ids: ["1vCWHaC5f2uS3yhpwWbIA6"],
    uri: "spotify:track:g7h8i9j0k1l2m3n4o5p6q7",
    popularity: 79,
    open_url: "https://open.spotify.com/track:g7h8i9j0k1l2m3n4o5p6q7",
    audio_features: {
      tempo: 80,
      energy: 0.4,
      valence: 0.6,
      acousticness: 0.7,
      danceability: 0.5,
      instrumentalness: 0.8
    }
  },
  {
    id: "h8i9j0k1l2m3n4o5p6q7r8",
    name: "City Lights",
    artists: ["Synth Artist"],
    artist_ids: ["F8JuStNWWC1PvzYaGBsbvz"],
    uri: "spotify:track:h8i9j0k1l2m3n4o5p6q7r8",
    popularity: 83,
    open_url: "https://open.spotify.com/track:h8i9j0k1l2m3n4o5p6q7r8",
    audio_features: {
      tempo: 90,
      energy: 0.6,
      valence: 0.7,
      acousticness: 0.2,
      danceability: 0.7,
      instrumentalness: 0.1
    }
  },
  {
    id: "i9j0k1l2m3n4o5p6q7r8s9",
    name: "Golden Hour",
    artists: ["Ambient Producer"],
    artist_ids: ["QAj0ltUdl4kteK7zOYjZAJ"],
    uri: "spotify:track:i9j0k1l2m3n4o5p6q7r8s9",
    popularity: 76,
    open_url: "https://open.spotify.com/track:i9j0k1l2m3n4o5p6q7r8s9",
    audio_features: {
      tempo: 75,
      energy: 0.3,
      valence: 0.8,
      acousticness: 0.9,
      danceability: 0.3,
      instrumentalness: 0.7
    }
  },
  {
    id: "j0k1l2m3n4o5p6q7r8s9t0",
    name: "Midnight Drive",
    artists: ["Fitness DJ"],
    artist_ids: ["5NGdTolEWczJYPgf036X7h"],
    uri: "spotify:track:j0k1l2m3n4o5p6q7r8s9t0",
    popularity: 84,
    open_url: "https://open.spotify.com/track:j0k1l2m3n4o5p6q7r8s9t0",
    audio_features: {
      tempo: 120,
      energy: 0.8,
      valence: 0.7,
      acousticness: 0.1,
      danceability: 0.8,
      instrumentalness: 0.0
    }
  },
  // Additional tracks for LLM songs
  {
    id: "k1l2m3n4o5p6q7r8s9t0u1",
    name: "Take It Easy",
    artists: ["Eagles"],
    artist_ids: ["eagles123"],
    uri: "spotify:track:k1l2m3n4o5p6q7r8s9t0u1",
    popularity: 95,
    open_url: "https://open.spotify.com/track:k1l2m3n4o5p6q7r8s9t0u1",
    audio_features: {
      tempo: 90,
      energy: 0.6,
      valence: 0.7,
      acousticness: 0.4,
      danceability: 0.65,
      instrumentalness: 0.0
    }
  },
  {
    id: "l2m3n4o5p6q7r8s9t0u1v2",
    name: "Dreams",
    artists: ["Fleetwood Mac"],
    artist_ids: ["fleetwood123"],
    uri: "spotify:track:l2m3n4o5p6q7r8s9t0u1v2",
    popularity: 92,
    open_url: "https://open.spotify.com/track:l2m3n4o5p6q7r8s9t0u1v2",
    audio_features: {
      tempo: 85,
      energy: 0.5,
      valence: 0.6,
      acousticness: 0.6,
      danceability: 0.6,
      instrumentalness: 0.0
    }
  },
  {
    id: "m3n4o5p6q7r8s9t0u1v2w3",
    name: "Fast Car",
    artists: ["Tracy Chapman"],
    artist_ids: ["tracy123"],
    uri: "spotify:track:m3n4o5p6q7r8s9t0u1v2w3",
    popularity: 88,
    open_url: "https://open.spotify.com/track:m3n4o5p6q7r8s9t0u1v2w3",
    audio_features: {
      tempo: 95,
      energy: 0.4,
      valence: 0.5,
      acousticness: 0.8,
      danceability: 0.5,
      instrumentalness: 0.0
    }
  },
  {
    id: "n4o5p6q7r8s9t0u1v2w3x4",
    name: "Runnin' Down a Dream",
    artists: ["Tom Petty"],
    artist_ids: ["tompetty123"],
    uri: "spotify:track:n4o5p6q7r8s9t0u1v2w3x4",
    popularity: 89,
    open_url: "https://open.spotify.com/track:n4o5p6q7r8s9t0u1v2w3x4",
    audio_features: {
      tempo: 100,
      energy: 0.7,
      valence: 0.8,
      acousticness: 0.2,
      danceability: 0.7,
      instrumentalness: 0.0
    }
  },
  {
    id: "o5p6q7r8s9t0u1v2w3x4y5",
    name: "Here Comes the Sun",
    artists: ["The Beatles"],
    artist_ids: ["beatles123"],
    uri: "spotify:track:o5p6q7r8s9t0u1v2w3x4y5",
    popularity: 96,
    open_url: "https://open.spotify.com/track:o5p6q7r8s9t0u1v2w3x4y5",
    audio_features: {
      tempo: 80,
      energy: 0.6,
      valence: 0.9,
      acousticness: 0.5,
      danceability: 0.6,
      instrumentalness: 0.0
    }
  },
  {
    id: "p6q7r8s9t0u1v2w3x4y5z6",
    name: "Hotel California",
    artists: ["Eagles"],
    artist_ids: ["eagles123"],
    uri: "spotify:track:p6q7r8s9t0u1v2w3x4y5z6",
    popularity: 94,
    open_url: "https://open.spotify.com/track:p6q7r8s9t0u1v2w3x4y5z6",
    audio_features: {
      tempo: 75,
      energy: 0.5,
      valence: 0.4,
      acousticness: 0.3,
      danceability: 0.4,
      instrumentalness: 0.0
    }
  },
  {
    id: "q7r8s9t0u1v2w3x4y5z6a7",
    name: "Sweet Child O' Mine",
    artists: ["Guns N' Roses"],
    artist_ids: ["gunsnroses123"],
    uri: "spotify:track:q7r8s9t0u1v2w3x4y5z6a7",
    popularity: 93,
    open_url: "https://open.spotify.com/track:q7r8s9t0u1v2w3x4y5z6a7",
    audio_features: {
      tempo: 125,
      energy: 0.8,
      valence: 0.7,
      acousticness: 0.1,
      danceability: 0.6,
      instrumentalness: 0.0
    }
  },
  {
    id: "r8s9t0u1v2w3x4y5z6a7b8",
    name: "Africa",
    artists: ["Toto"],
    artist_ids: ["toto123"],
    uri: "spotify:track:r8s9t0u1v2w3x4y5z6a7b8",
    popularity: 91,
    open_url: "https://open.spotify.com/track:r8s9t0u1v2w3x4y5z6a7b8",
    audio_features: {
      tempo: 95,
      energy: 0.6,
      valence: 0.8,
      acousticness: 0.2,
      danceability: 0.7,
      instrumentalness: 0.0
    }
  },
  {
    id: "s9t0u1v2w3x4y5z6a7b8c9",
    name: "Don't Stop Believin'",
    artists: ["Journey"],
    artist_ids: ["journey123"],
    uri: "spotify:track:s9t0u1v2w3x4y5z6a7b8c9",
    popularity: 90,
    open_url: "https://open.spotify.com/track:s9t0u1v2w3x4y5z6a7b8c9",
    audio_features: {
      tempo: 105,
      energy: 0.7,
      valence: 0.9,
      acousticness: 0.1,
      danceability: 0.7,
      instrumentalness: 0.0
    }
  },
  {
    id: "t0u1v2w3x4y5z6a7b8c9d0",
    name: "Good Riddance (Time of Your Life)",
    artists: ["Green Day"],
    artist_ids: ["greenday123"],
    uri: "spotify:track:t0u1v2w3x4y5z6a7b8c9d0",
    popularity: 87,
    open_url: "https://open.spotify.com/track:t0u1v2w3x4y5z6a7b8c9d0",
    audio_features: {
      tempo: 70,
      energy: 0.3,
      valence: 0.6,
      acousticness: 0.9,
      danceability: 0.4,
      instrumentalness: 0.0
    }
  },
  // Additional tracks for better variety and larger playlists
  {
    id: "u1v2w3x4y5z6a7b8c9d0e1",
    name: "Bohemian Rhapsody",
    artists: ["Queen"],
    artist_ids: ["queen123"],
    uri: "spotify:track:u1v2w3x4y5z6a7b8c9d0e1",
    popularity: 98,
    open_url: "https://open.spotify.com/track:u1v2w3x4y5z6a7b8c9d0e1",
    audio_features: {
      tempo: 72,
      energy: 0.6,
      valence: 0.8,
      acousticness: 0.2,
      danceability: 0.5,
      instrumentalness: 0.0
    }
  },
  {
    id: "v2w3x4y5z6a7b8c9d0e1f2",
    name: "Stairway to Heaven",
    artists: ["Led Zeppelin"],
    artist_ids: ["ledzeppelin123"],
    uri: "spotify:track:v2w3x4y5z6a7b8c9d0e1f2",
    popularity: 96,
    open_url: "https://open.spotify.com/track:v2w3x4y5z6a7b8c9d0e1f2",
    audio_features: {
      tempo: 80,
      energy: 0.5,
      valence: 0.4,
      acousticness: 0.3,
      danceability: 0.3,
      instrumentalness: 0.1
    }
  },
  {
    id: "w3x4y5z6a7b8c9d0e1f2g3",
    name: "Imagine",
    artists: ["John Lennon"],
    artist_ids: ["johnlennon123"],
    uri: "spotify:track:w3x4y5z6a7b8c9d0e1f2g3",
    popularity: 94,
    open_url: "https://open.spotify.com/track:w3x4y5z6a7b8c9d0e1f2g3",
    audio_features: {
      tempo: 76,
      energy: 0.4,
      valence: 0.6,
      acousticness: 0.7,
      danceability: 0.4,
      instrumentalness: 0.0
    }
  },
  {
    id: "x4y5z6a7b8c9d0e1f2g3h4",
    name: "Born to Run",
    artists: ["Bruce Springsteen"],
    artist_ids: ["brucespringsteen123"],
    uri: "spotify:track:x4y5z6a7b8c9d0e1f2g3h4",
    popularity: 91,
    open_url: "https://open.spotify.com/track:x4y5z6a7b8c9d0e1f2g3h4",
    audio_features: {
      tempo: 110,
      energy: 0.8,
      valence: 0.9,
      acousticness: 0.1,
      danceability: 0.7,
      instrumentalness: 0.0
    }
  },
  {
    id: "y5z6a7b8c9d0e1f2g3h4i5",
    name: "Layla",
    artists: ["Eric Clapton"],
    artist_ids: ["ericclapton123"],
    uri: "spotify:track:y5z6a7b8c9d0e1f2g3h4i5",
    popularity: 89,
    open_url: "https://open.spotify.com/track:y5z6a7b8c9d0e1f2g3h4i5",
    audio_features: {
      tempo: 95,
      energy: 0.7,
      valence: 0.5,
      acousticness: 0.2,
      danceability: 0.6,
      instrumentalness: 0.0
    }
  },
  {
    id: "z6a7b8c9d0e1f2g3h4i5j6",
    name: "Sweet Home Alabama",
    artists: ["Lynyrd Skynyrd"],
    artist_ids: ["lynyrdskynyrd123"],
    uri: "spotify:track:z6a7b8c9d0e1f2g3h4i5j6",
    popularity: 88,
    open_url: "https://open.spotify.com/track:z6a7b8c9d0e1f2g3h4i5j6",
    audio_features: {
      tempo: 100,
      energy: 0.7,
      valence: 0.8,
      acousticness: 0.1,
      danceability: 0.7,
      instrumentalness: 0.0
    }
  },
  {
    id: "a7b8c9d0e1f2g3h4i5j6k7",
    name: "Free Bird",
    artists: ["Lynyrd Skynyrd"],
    artist_ids: ["lynyrdskynyrd123"],
    uri: "spotify:track:a7b8c9d0e1f2g3h4i5j6k7",
    popularity: 87,
    open_url: "https://open.spotify.com/track:a7b8c9d0e1f2g3h4i5j6k7",
    audio_features: {
      tempo: 85,
      energy: 0.6,
      valence: 0.7,
      acousticness: 0.2,
      danceability: 0.5,
      instrumentalness: 0.0
    }
  },
  {
    id: "b8c9d0e1f2g3h4i5j6k7l8",
    name: "American Pie",
    artists: ["Don McLean"],
    artist_ids: ["donmclean123"],
    uri: "spotify:track:b8c9d0e1f2g3h4i5j6k7l8",
    popularity: 90,
    open_url: "https://open.spotify.com/track:b8c9d0e1f2g3h4i5j6k7l8",
    audio_features: {
      tempo: 75,
      energy: 0.5,
      valence: 0.6,
      acousticness: 0.6,
      danceability: 0.5,
      instrumentalness: 0.0
    }
  },
  {
    id: "c9d0e1f2g3h4i5j6k7l8m9",
    name: "The Sound of Silence",
    artists: ["Simon & Garfunkel"],
    artist_ids: ["simongarfunkel123"],
    uri: "spotify:track:c9d0e1f2g3h4i5j6k7l8m9",
    popularity: 92,
    open_url: "https://open.spotify.com/track:c9d0e1f2g3h4i5j6k7l8m9",
    audio_features: {
      tempo: 70,
      energy: 0.3,
      valence: 0.3,
      acousticness: 0.9,
      danceability: 0.3,
      instrumentalness: 0.0
    }
  },
  {
    id: "d0e1f2g3h4i5j6k7l8m9n0",
    name: "Bridge Over Troubled Water",
    artists: ["Simon & Garfunkel"],
    artist_ids: ["simongarfunkel123"],
    uri: "spotify:track:d0e1f2g3h4i5j6k7l8m9n0",
    popularity: 91,
    open_url: "https://open.spotify.com/track:d0e1f2g3h4i5j6k7l8m9n0",
    audio_features: {
      tempo: 85,
      energy: 0.4,
      valence: 0.7,
      acousticness: 0.8,
      danceability: 0.4,
      instrumentalness: 0.0
    }
  }
];

// Mock artists data
const MOCK_ARTISTS = [
  { id: "artist1", name: "Lofi Artist", genres: ["lofi", "ambient"] },
  { id: "QAj0ltUdl4kteK7zOYjZAJ", name: "Ambient Producer", genres: ["ambient", "chill"] },
  { id: "J6NFqJftZ1aEtGaxaHsR35", name: "Workout Artist", genres: ["electronic", "dance"] },
  { id: "5NGdTolEWczJYPgf036X7h", name: "Fitness DJ", genres: ["electronic", "pop"] },
  { id: "SZ4MLWUQdYcGdkMWTKtaVD", name: "Latin Artist", genres: ["reggaeton", "latin"] },
  { id: "HNirji3B7ZAMvOUiQ2i573", name: "Pop Artist", genres: ["pop", "spanish"] },
  { id: "F8JuStNWWC1PvzYaGBsbvz", name: "Synth Artist", genres: ["synthwave", "electronic"] },
  { id: "T2LOrObY8ZzZ0whz7BTJu0", name: "Festival Artist", genres: ["electronic", "festival"] }
];

// Mock playlists data
const MOCK_PLAYLISTS = [
  {
    id: "playlist1",
    name: "Primavera Sound 2024 Official",
    tracks: { total: 50 }
  },
  {
    id: "playlist2", 
    name: "Primavera Sound 2024 Lineup",
    tracks: { total: 45 }
  }
];

/**
 * Mock Spotify API functions
 */
export const mockSpotify = {
  async searchTracks(query, limit = 50) {
    // Filter tracks based on query
    let filteredTracks = MOCK_TRACKS;
    
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes("estudiar") || queryLower.includes("study") || queryLower.includes("instrumental")) {
      filteredTracks = MOCK_TRACKS.filter(t => t.audio_features.instrumentalness > 0.7);
    } else if (queryLower.includes("correr") || queryLower.includes("run") || queryLower.includes("165")) {
      filteredTracks = MOCK_TRACKS.filter(t => t.audio_features.tempo > 150);
    } else if (queryLower.includes("reggaeton") || queryLower.includes("latin")) {
      filteredTracks = MOCK_TRACKS.filter(t => t.artists.some(a => a.includes("Latin")));
    } else if (queryLower.includes("español") || queryLower.includes("spanish") || queryLower.includes("pop")) {
      filteredTracks = MOCK_TRACKS.filter(t => t.artists.some(a => a.includes("Pop")));
    } else if (queryLower.includes("synthwave") || queryLower.includes("synth")) {
      filteredTracks = MOCK_TRACKS.filter(t => t.artists.some(a => a.includes("Synth")));
    } else if (queryLower.includes("festival") || queryLower.includes("primavera")) {
      filteredTracks = MOCK_TRACKS.filter(t => t.artists.some(a => a.includes("Festival")));
    }
    
    // If we need more tracks than available, generate additional ones
    if (filteredTracks.length < limit) {
      const additionalNeeded = limit - filteredTracks.length;
      const additionalTracks = this.generateAdditionalTracks(query, additionalNeeded);
      filteredTracks = [...filteredTracks, ...additionalTracks];
    }
    
    return filteredTracks.slice(0, limit);
  },

  generateAdditionalTracks(query, count) {
    const additionalTracks = [];
    const queryLower = query.toLowerCase();
    
    // Generate tracks based on query context
    const baseTempo = queryLower.includes("correr") ? 160 : queryLower.includes("estudiar") ? 80 : 95;
    const baseEnergy = queryLower.includes("correr") ? 0.8 : queryLower.includes("estudiar") ? 0.3 : 0.6;
    const baseValence = queryLower.includes("correr") ? 0.8 : queryLower.includes("estudiar") ? 0.4 : 0.7;
    
    for (let i = 0; i < count; i++) {
      // Generate unique ID with timestamp and random component
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const trackId = `gen_${timestamp}_${random}_${i}`;
      const variation = Math.random() * 0.3 - 0.15; // ±15% variation
      
      additionalTracks.push({
        id: trackId,
        name: `Generated Track ${timestamp}_${i}`,
        artists: [`Generated Artist ${timestamp}_${i}`],
        artist_ids: [`gen_artist_${timestamp}_${i}`],
        uri: `spotify:track:${trackId}`,
        popularity: Math.floor(70 + Math.random() * 30),
        open_url: `https://open.spotify.com/track/${trackId}`,
        audio_features: {
          tempo: Math.max(60, Math.min(200, baseTempo + (Math.random() * 40 - 20))),
          energy: Math.max(0, Math.min(1, baseEnergy + variation)),
          valence: Math.max(0, Math.min(1, baseValence + variation)),
          acousticness: Math.max(0, Math.min(1, 0.3 + Math.random() * 0.4)),
          danceability: Math.max(0, Math.min(1, 0.5 + Math.random() * 0.3)),
          instrumentalness: queryLower.includes("instrumental") ? Math.random() * 0.8 + 0.2 : Math.random() * 0.3
        }
      });
    }
    
    return additionalTracks;
  },

  async searchArtists(query, limit = 20) {
    return MOCK_ARTISTS.slice(0, limit);
  },

  async searchPlaylists(query, limit = 20) {
    if (query.toLowerCase().includes("primavera")) {
      return MOCK_PLAYLISTS;
    }
    return [];
  },

  async getRecommendations(seeds, targetFeatures, limit = 100) {
    // Generate recommendations based on target features and seeds
    let recommendations = [...MOCK_TRACKS];
    
    // Filter by genre if specified
    if (seeds.generos && seeds.generos.length > 0) {
      const genre = seeds.generos[0].toLowerCase();
      if (genre.includes("reggaeton") || genre.includes("latin")) {
        recommendations = recommendations.filter(t => t.artists.some(a => a.includes("Latin")));
      } else if (genre.includes("pop")) {
        recommendations = recommendations.filter(t => t.artists.some(a => a.includes("Pop")));
      } else if (genre.includes("electronic") || genre.includes("dance")) {
        recommendations = recommendations.filter(t => t.artists.some(a => a.includes("DJ") || a.includes("Artist")));
      }
    }
    
    // Apply target features with more lenient filtering
    if (targetFeatures.tempo_bpm || targetFeatures.tempo) {
      const targetTempo = targetFeatures.tempo_bpm?.target || targetFeatures.tempo;
      const minTempo = targetFeatures.tempo_bpm?.min || targetTempo - 50;
      const maxTempo = targetFeatures.tempo_bpm?.max || targetTempo + 50;
      recommendations = recommendations.filter(t => 
        t.audio_features.tempo >= minTempo && t.audio_features.tempo <= maxTempo
      );
    }
    
    if (targetFeatures.energy) {
      const targetEnergy = targetFeatures.energy.target || targetFeatures.energy;
      const minEnergy = targetFeatures.energy.min || Math.max(0, targetEnergy - 0.5);
      const maxEnergy = targetFeatures.energy.max || Math.min(1, targetEnergy + 0.5);
      recommendations = recommendations.filter(t => 
        t.audio_features.energy >= minEnergy && t.audio_features.energy <= maxEnergy
      );
    }
    
    if (targetFeatures.valence) {
      const targetValence = targetFeatures.valence.target || targetFeatures.valence;
      const minValence = targetFeatures.valence.min || Math.max(0, targetValence - 0.5);
      const maxValence = targetFeatures.valence.max || Math.min(1, targetValence + 0.5);
      recommendations = recommendations.filter(t => 
        t.audio_features.valence >= minValence && t.audio_features.valence <= maxValence
      );
    }
    
    if (targetFeatures.acousticness) {
      const targetAcousticness = targetFeatures.acousticness.target || targetFeatures.acousticness;
      const minAcousticness = targetFeatures.acousticness.min || Math.max(0, targetAcousticness - 0.5);
      const maxAcousticness = targetFeatures.acousticness.max || Math.min(1, targetAcousticness + 0.5);
      recommendations = recommendations.filter(t => 
        t.audio_features.acousticness >= minAcousticness && t.audio_features.acousticness <= maxAcousticness
      );
    }
    
    if (targetFeatures.danceability) {
      const targetDanceability = targetFeatures.danceability.target || targetFeatures.danceability;
      const minDanceability = targetFeatures.danceability.min || Math.max(0, targetDanceability - 0.5);
      const maxDanceability = targetFeatures.danceability.max || Math.min(1, targetDanceability + 0.5);
      recommendations = recommendations.filter(t => 
        t.audio_features.danceability >= minDanceability && t.audio_features.danceability <= maxDanceability
      );
    }
    
    // If no tracks match, return all tracks
    if (recommendations.length === 0) {
      recommendations = [...MOCK_TRACKS];
    }
    
    // If we need more tracks than available, generate additional ones
    if (recommendations.length < limit) {
      const additionalNeeded = limit - recommendations.length;
      const additionalTracks = this.generateAdditionalTracks("recommendation", additionalNeeded);
      recommendations = [...recommendations, ...additionalTracks];
    }
    
    return recommendations.slice(0, limit);
  },

  async getAudioFeatures(trackIds) {
    return trackIds.map(id => {
      const track = MOCK_TRACKS.find(t => t.id === id);
      return track ? { id, ...track.audio_features } : null;
    }).filter(Boolean);
  },

  async getPlaylistTracks(playlistId, maxTracks = 250) {
    // Return mock tracks for playlist
    return MOCK_TRACKS.slice(0, Math.min(maxTracks, 10));
  },

  async getArtistTopTracks(artistId) {
    // Return mock top tracks for artist
    return MOCK_TRACKS.slice(0, 5);
  }
};

/**
 * Check if we should use mock data
 */
export function shouldUseMock(token = null) {
  const isDev = process.env.NODE_ENV === "development";
  const tokenString = typeof token === "string" ? token : null;
  const tokenObj = token && typeof token === "object" ? token : null;
  const accessToken = tokenString || tokenObj?.accessToken || null;
  const hasValidToken = !!(accessToken && accessToken !== "mock-token-for-debug");
  
  // Use mock only when no valid Spotify session
  const shouldUse = !hasValidToken;
  
  console.log("[MOCK] shouldUseMock:", { isDev, hasValidToken, shouldUse, tokenPresent: !!accessToken });
  
  return shouldUse;
}
