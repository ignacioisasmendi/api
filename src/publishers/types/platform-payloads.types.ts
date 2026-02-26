// Instagram Payloads
export interface InstagramFeedPayload {
  image_url: string;
  caption: string;
}

export interface InstagramStoryPayload {
  image_url: string;
  link?: string;
}

export interface InstagramReelPayload {
  video_url: string;
  caption: string;
  cover_url?: string;
}

// Facebook Payloads
export interface FacebookFeedPayload {
  message: string;
  link?: string;
  image_url?: string;
}

export interface FacebookStoryPayload {
  image_url: string;
}

export interface FacebookVideoPayload {
  video_url: string;
  description: string;
}

// TikTok Payloads
export interface TikTokVideoPayload {
  video_url: string;
  description: string;
  privacy_level: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
}

// X (Twitter) Payloads
export interface XFeedPayload {
  text: string;
  media_urls?: string[];
}

// Union type for all payloads
export type PlatformPayload =
  | InstagramFeedPayload
  | InstagramStoryPayload
  | InstagramReelPayload
  | FacebookFeedPayload
  | FacebookStoryPayload
  | FacebookVideoPayload
  | TikTokVideoPayload
  | XFeedPayload;
