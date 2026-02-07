export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags?: string[];
  author?: string;
  image?: string;
  readingTime?: number;
  published: boolean;
}

export interface PostWithContent {
  metadata: Post;
  content: string;
}
