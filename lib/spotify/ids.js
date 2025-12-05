export function toTrackId(x) {
  if (!x) return null;
  // spotify:track:ID
  let m = String(x).match(/spotify:track:([A-Za-z0-9]{22})/);
  if (m) return m[1];
  // https://open.spotify.com/track/ID
  m = String(x).match(/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/);
  if (m) return m[1];
  // ID puro
  if (/^[A-Za-z0-9]{22}$/.test(String(x))) return String(x);
  return null;
}
