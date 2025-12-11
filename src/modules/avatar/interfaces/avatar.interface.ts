export interface Avatar {
  id: string;
  style: string;
  seed: string;
  url: string;
  backgroundColor: string;
}

export interface AvatarCatalog {
  version: string;
  generatedAt: string;
  totalAvatars: number;
  styles: Array<{
    id: string;
    name: string;
    description: string;
    recommended: string;
    count: number;
  }>;
  avatars: Avatar[];
}