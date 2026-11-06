// src/utils/video.ts
//
// MarcaGol TV: links de video de partidos y clips. Por ahora viven en
// YouTube (en vivo o grabados); se abren en la app de YouTube.
import { Linking } from "react-native";

// Saca el id de youtube.com/watch?v=ID, youtu.be/ID, /live/ID, /shorts/ID, /embed/ID
export function idYoutube(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = url.trim();
  const m =
    s.match(/youtu\.be\/([A-Za-z0-9_-]{6,20})/) ??
    s.match(/[?&]v=([A-Za-z0-9_-]{6,20})/) ??
    s.match(/youtube(?:-nocookie)?\.com\/(?:live|shorts|embed)\/([A-Za-z0-9_-]{6,20})/);
  return m ? m[1] : null;
}

export function miniaturaYoutube(url: string | null | undefined): string | null {
  const id = idYoutube(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function abrirVideo(url: string) {
  Linking.openURL(url).catch(() => {});
}
