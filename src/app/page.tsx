import { getAllPosts } from '@/lib/posts';
import Card from '@/components/card/card';

export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

const Home = async () => {
  const posts = await getAllPosts();
  
  // Handle empty state
  if (posts.length === 0) {
    return (
      <div className="container pb-80">
        <div className="row">
          <div className="col col-12">
            <h1>Witaj na moim blogu!</h1>
            <p>Wkrótce pojawią się tu pierwsze wpisy.</p>
          </div>
        </div>
      </div>
    );
  }
  
  const featuredPost = posts[0];
  const recentPosts = posts.slice(1, 4);
  
  return (
    <div className="container pb-80">
      {/* Featured post */}
      <Card 
        label={featuredPost.category}
        title={featuredPost.title}
        summary={featuredPost.description}
        href={`/${featuredPost.slug}`}
        className="mb-30"
      />
      
      {/* Recent posts grid */}
      {recentPosts.length > 0 && (
        <div className="row pt-30">
          {recentPosts.map(post => (
            <div key={post.slug} className="col col_4 m-mw-100">
              <Card
                label={post.category}
                title={post.title}
                summary={post.description}
                href={`/${post.slug}`}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* All posts section */}
      {posts.length > 4 && (
        <>
          <div className="row pt-50">
            <div className="col col-12">
              <h2 className="mb-30">Wszystkie wpisy</h2>
            </div>
          </div>
          <div className="row">
            {posts.slice(4).map(post => (
              <div key={post.slug} className="col col_4 m-mw-100 mb-30">
                <Card
                  label={post.category}
                  title={post.title}
                  summary={post.description}
                  href={`/${post.slug}`}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
