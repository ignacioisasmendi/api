// Raw Pexels API response types

export interface PexelsPhotoSrc {
  original: string;
  large2x: string;
  large: string;
  medium: string;
  small: string;
  portrait: string;
  landscape: string;
  tiny: string;
}

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: PexelsPhotoSrc;
  liked: boolean;
  alt: string;
}

export interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  fps: number;
  link: string;
}

export interface PexelsVideoUser {
  id: number;
  name: string;
  url: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: PexelsVideoUser;
  video_files: PexelsVideoFile[];
}

export interface PexelsPhotoSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

export interface PexelsVideoSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  videos: PexelsVideo[];
  next_page?: string;
}

// Normalized output types

export interface StockPhoto {
  id: string;
  url: string;
  photographer: string;
  photographerUrl: string;
  imageUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  attribution: string;
}

export interface StockVideoFile {
  url: string;
  quality: string;
  width: number;
  height: number;
}

export interface StockVideo {
  id: string;
  url: string;
  duration: number;
  preview: string;
  photographer: string;
  photographerUrl: string;
  videoFiles: StockVideoFile[];
  attribution: string;
}

export type StockMediaType = 'photo' | 'video';

export interface StockSearchResult {
  results: (StockPhoto | StockVideo)[];
  total_results: number;
  page: number;
  per_page: number;
}
