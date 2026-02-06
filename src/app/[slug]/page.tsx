import { notFound } from 'next/navigation';
import { getPostBySlug, generateStaticParams as getStaticParams } from '@/lib/posts';
import GetCategoryColor from '@/helpers/get-category-color';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import styles from './style.module.sass';

export { getStaticParams as generateStaticParams };

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  
  if (!post) {
    return {
      title: 'Post nie znaleziony',
    };
  }
  
  return {
    title: `${post.metadata.title} | odniepamieci.pl`,
    description: post.metadata.description,
    openGraph: {
      title: post.metadata.title,
      description: post.metadata.description,
      type: 'article',
      publishedTime: post.metadata.date,
      authors: post.metadata.author ? [post.metadata.author] : undefined,
      tags: post.metadata.tags,
    },
  };
}

interface BlogPostProps {
  params: { slug: string };
}

const BlogPost = async ({ params }: BlogPostProps) => {
  const post = await getPostBySlug(params.slug);
  
  if (!post) {
    notFound();
  }
  
  const { metadata, content } = post;
  const formattedDate = new Date(metadata.date).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  return (
    <div className="container pb-80">
      <div className="row mb-50">
        <div className="col col-9">
          <div className={`h6 c-${GetCategoryColor(metadata.category)}`}>
            {metadata.category}
          </div>
          <h1>{metadata.title}</h1>
          <p className="text-muted">
            {formattedDate}
            {metadata.readingTime && ` • ${metadata.readingTime} min czytania`}
            {metadata.author && ` • ${metadata.author}`}
          </p>
        </div>
      </div>
      
      {metadata.image && (
        <img 
          className={`${styles.featuredImage} mb-50`}
          src={metadata.image} 
          alt={metadata.title}
          width="1280" 
          height="387"
        />
      )}
      
      <div className="row mb-50">
        <div className="col col-9">
          <article className={styles.article}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({node, ...props}) => <h2 {...props} />,
                h2: ({node, ...props}) => <h3 {...props} />,
                h3: ({node, ...props}) => <h4 {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
          
          {metadata.tags && metadata.tags.length > 0 && (
            <div className="mt-50">
              <h4>Tagi:</h4>
              <div className="flex gap-10 mt-10">
                {metadata.tags.map(tag => (
                  <span key={tag} className="tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogPost;
