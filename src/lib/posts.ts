import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { Post, PostWithContent } from '@/types/post';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export async function getAllPosts(): Promise<Post[]> {
  try {
    const fileNames = await fs.readdir(postsDirectory);
    
    const allPostsData = await Promise.all(
      fileNames
        .filter(fileName => fileName.endsWith('.md'))
        .map(async (fileName) => {
          const slug = fileName.replace(/\.md$/, '');
          const fullPath = path.join(postsDirectory, fileName);
          const fileContents = await fs.readFile(fullPath, 'utf8');
          const { data, content } = matter(fileContents);
          
          // Calculate reading time (approximately 200 words per minute)
          const wordCount = content.split(/\s+/g).length;
          const readingTime = Math.ceil(wordCount / 200);
          
          return {
            slug,
            ...data,
            readingTime,
          } as Post;
        })
    );
    
    // Filter only published posts and sort by date
    return allPostsData
      .filter(post => post.published !== false)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error reading posts:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<PostWithContent | null> {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    const fileContents = await fs.readFile(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    
    // Calculate reading time
    const wordCount = content.split(/\s+/g).length;
    const readingTime = Math.ceil(wordCount / 200);
    
    return {
      metadata: {
        slug,
        ...data,
        readingTime,
      } as Post,
      content,
    };
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error);
    return null;
  }
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter(post => post.category === category);
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
}
