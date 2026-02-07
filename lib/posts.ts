import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { Post, PostWithContent } from '@/types/post';

const postsDirectory = path.join(process.cwd(), 'content/posts');

/**
 * Sanitize and validate slug to prevent path traversal attacks
 */
function sanitizeSlug(slug: string): string | null {
  // Only allow alphanumeric, hyphens, and underscores
  const sanitized = slug.replace(/[^a-zA-Z0-9-_]/g, '');
  
  // Check if sanitization changed the slug (possible attack)
  if (sanitized !== slug || !sanitized) {
    console.error(`Invalid or potentially malicious slug: ${slug}`);
    return null;
  }
  
  // Additional check: slug shouldn't be too long
  if (sanitized.length > 200) {
    console.error(`Slug too long: ${slug}`);
    return null;
  }
  
  return sanitized;
}

/**
 * Validate that the resolved path is within the posts directory
 */
async function validatePath(fullPath: string): Promise<boolean> {
  try {
    const realPath = await fs.realpath(fullPath);
    const realPostsDir = await fs.realpath(postsDirectory);
    
    // Check if the real path starts with posts directory
    if (!realPath.startsWith(realPostsDir)) {
      console.error(`Path traversal attempt blocked: ${fullPath}`);
      return false;
    }
    
    return true;
  } catch (error) {
    // File doesn't exist or can't be resolved
    return false;
  }
}

export async function getAllPosts(): Promise<Post[]> {
  try {
    const fileNames = await fs.readdir(postsDirectory);
    
    const allPostsData = await Promise.all(
      fileNames
        .filter(fileName => fileName.endsWith('.md'))
        .map(async (fileName) => {
          const slug = fileName.replace(/\.md$/, '');
          
          // Validate slug
          const sanitizedSlug = sanitizeSlug(slug);
          if (!sanitizedSlug) {
            console.warn(`Skipping invalid filename: ${fileName}`);
            return null;
          }
          
          const fullPath = path.join(postsDirectory, fileName);
          
          // Validate path
          if (!(await validatePath(fullPath))) {
            console.warn(`Skipping invalid path: ${fullPath}`);
            return null;
          }
          
          const fileContents = await fs.readFile(fullPath, 'utf8');
          const { data, content } = matter(fileContents);
          
          // Calculate reading time (approximately 200 words per minute)
          const wordCount = content.split(/\s+/g).length;
          const readingTime = Math.ceil(wordCount / 200);
          
          return {
            slug: sanitizedSlug,
            ...data,
            readingTime,
          } as Post;
        })
    );
    
    // Filter null values (invalid files), published posts, and sort by date
    return allPostsData
      .filter((post): post is Post => post !== null && post.published !== false)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error reading posts:', error);
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<PostWithContent | null> {
  try {
    // Sanitize and validate slug
    const sanitizedSlug = sanitizeSlug(slug);
    if (!sanitizedSlug) {
      console.error(`Invalid slug requested: ${slug}`);
      return null;
    }
    
    const fullPath = path.join(postsDirectory, `${sanitizedSlug}.md`);
    
    // Validate path to prevent traversal
    if (!(await validatePath(fullPath))) {
      console.error(`Path validation failed for slug: ${slug}`);
      return null;
    }
    
    const fileContents = await fs.readFile(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    
    // Calculate reading time
    const wordCount = content.split(/\s+/g).length;
    const readingTime = Math.ceil(wordCount / 200);
    
    return {
      metadata: {
        slug: sanitizedSlug,
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
  
  // Sanitize category to prevent injection
  const sanitizedCategory = category.replace(/[^a-zA-Z0-9-_ ]/g, '');
  
  return posts.filter(post => post.category === sanitizedCategory);
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
}
