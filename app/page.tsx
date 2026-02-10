import * as React from "react"
import { Link } from 'next-view-transitions'
import ThemeToggle from "./components/ThemeToggle"
import BlogFilter from "./components/BlogFilter"
import NavLinks from "./components/NavLinks"
import { createReader } from '@keystatic/core/reader'
import Markdoc, { Tag } from '@markdoc/markdoc'
import config from '../keystatic.config'
import ImageZoom from "./components/ImageZoom"
import Footer from "./components/Footer"

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const reader = createReader(process.cwd(), config);

const markdocConfig = {
    nodes: {
        image: {
            render: 'img',
            attributes: {
                src: { type: String },
                alt: { type: String },
                title: { type: String },
                class: { type: String, default: 'rounded-none w-full my-8 shadow-sm' }
            }
        },
        table: {
            render: 'table',
            attributes: {},
            transform(node: any, config: any) {
                return new Tag('div', { class: 'overflow-x-auto' }, [
                    new Tag('table', {}, node.transformChildren(config))
                ]);
            }
        },
        thead: { render: 'thead', attributes: {} },
        tbody: { render: 'tbody', attributes: {} },
        tr: { render: 'tr', attributes: {} },
        th: { render: 'th', attributes: {} },
        td: { render: 'td', attributes: {} },
    },
};

export default async function Home() {
    let postsWithContent: any[] = [];
    let allTags: string[] = [];

    try {
        const allPosts = await reader.collections.posts.all();
        postsWithContent = await Promise.all(
            allPosts.map(async (post) => {
                try {
                    const rawData = await post.entry.content();
                    const transformed = Markdoc.transform(rawData.node, markdocConfig);
                    const html = Markdoc.renderers.html(transformed);
                    return {
                        slug: post.slug,
                        title: post.entry.title,
                        date: post.entry.date,
                        tags: post.entry.tags || [],
                        html: html,
                    };
                } catch (err) {
                    return { slug: post.slug, title: post.entry.title, date: post.entry.date, tags: [], html: '' };
                }
            })
        );
        postsWithContent.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        const tagsSet = new Set<string>();
        postsWithContent.forEach(post => post.tags?.forEach((tag: string) => tagsSet.add(tag)));
        allTags = Array.from(tagsSet).sort();
    } catch (e) {
        console.error("Błąd ładowania danych:", e);
    }

    const metaButtonStyle = {
        fontSize: 'calc(14px * var(--font-scale, 1))',
        fontWeight: '400',
        height: 'calc(25px * var(--font-scale, 1))',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        textTransform: 'lowercase' as const,
    };

    return (
        <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="font-mono">
            <div className="space-y-6 w-full">
                <header>
                    <div className="flex flex-wrap items-center justify-between mb-2" style={{ gap: '0.5rem 1rem' }}>
                        <h1 className="text-3xl sm:text-6xl font-bold tracking-tighter whitespace-nowrap">
                            odniepamieci.pl
                        </h1>
                        <ThemeToggle />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginTop: '1rem' }}>
                        <NavLinks />
                        {allTags.length > 0 && <BlogFilter allTags={allTags} />}
                    </div>
                    <div className="text-gray-400 dark:text-gray-600 mt-6 whitespace-nowrap overflow-hidden opacity-50">
                        ------------------------------------------------------------------------------------------------------
                    </div>
                </header>

                <div id="blog-grid">
                    {postsWithContent.length > 0 ? (
                        postsWithContent.map((post, index) => (
                            <article
                                key={post.slug}
                                className="blog-post-item group w-full"
                                data-groups={JSON.stringify(post.tags?.map((t: string) => t.toLowerCase()) || [])}
                                style={{
                                    paddingBottom: 'calc(4rem * var(--font-scale, 1))',
                                    marginBottom: index < postsWithContent.length - 1 ? 0 : '4rem'
                                }}
                            >
                                <div className="flex flex-col"
                                     style={{
                                         gap: 'calc(0.25rem * var(--font-scale, 1))',
                                         marginTop: 'calc(1.25rem * var(--font-scale, 1))'
                                     }}>
                                    <div className="flex items-center border border-[#d1d5db] dark:border-[#4b5563] self-start">
                                        <div
                                            style={metaButtonStyle}
                                            className="bg-muted text-current whitespace-nowrap"
                                        >
                                            {post.date ? new Date(post.date).toLocaleDateString('pl-PL') : 'brak daty'}
                                        </div>

                                        {post.tags?.map((tag: string) => (
                                            <div
                                                key={tag}
                                                style={metaButtonStyle}
                                                className="text-current border-l border-[#d1d5db] dark:border-[#4b5563] whitespace-nowrap"
                                            >
                                                #{tag.toLowerCase()}
                                            </div>
                                        ))}
                                    </div>

                                    <h2
                                        className="font-bold lowercase tracking-tight break-words leading-tight"
                                        style={{ fontSize: 'calc(1.5rem * var(--font-scale, 1))' }}
                                    >
                                        {post.title}
                                    </h2>

                                    <div className="post-content prose dark:prose-invert prose-slate max-w-none leading-relaxed"
                                         style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                                        {post.html ? (
                                            <div dangerouslySetInnerHTML={{ __html: post.html }} />
                                        ) : (
                                            <p className="text-gray-500 italic lowercase">treść nie została jeszcze dodana.</p>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className="text-gray-400 dark:text-gray-600 whitespace-nowrap overflow-hidden opacity-50"
                                    style={{ marginTop: 'calc(1rem * var(--font-scale, 1))' }}
                                >
                                    ------------------------------------------------------------------------------------------------------
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="py-10 text-center text-gray-500 italic lowercase">
                            brak dostępnych wpisów.
                        </div>
                    )}
                </div>

                <ImageZoom />

                <Footer />
            </div>
        </div>
    )
}
