import * as React from "react"
import Link from "next/link"
import ThemeToggle from "./components/ThemeToggle"
import { createReader } from '@keystatic/core/reader'
import Markdoc from '@markdoc/markdoc'
import config from '../keystatic.config'
import ImageZoom from "./components/ImageZoom"

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
                class: { type: String, default: 'rounded-lg w-full my-8 shadow-sm' }
            }
        },
        table: { render: 'table', attributes: {} },
        thead: { render: 'thead', attributes: {} },
        tbody: { render: 'tbody', attributes: {} },
        tr: { render: 'tr', attributes: {} },
        th: { render: 'th', attributes: {} },
        td: { render: 'td', attributes: {} },
    },
};

export default async function Home() {
    let postsWithContent: any[] = [];

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
                        html: html,
                    };
                } catch (err) {
                    console.error(`[ERROR] Post ${post.slug}:`, err);
                    return {
                        slug: post.slug,
                        title: post.entry.title,
                        date: post.entry.date,
                        html: '',
                    };
                }
            })
        );

        postsWithContent.sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateB - dateA;
        });
    } catch (e) {
        console.error("Błąd ładowania danych:", e);
    }

    return (
        <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '5rem 1.5rem', minHeight: '100vh' }} className="font-mono">
            <div className="space-y-6">

                <header>
                    <div className="flex flex-wrap items-center justify-between mb-2" style={{ gap: '0.5rem 1rem' }}>
                        <h1 className="text-3xl sm:text-6xl font-bold tracking-tighter whitespace-nowrap">
                            odniepamieci.pl
                        </h1>
                        <ThemeToggle />
                    </div>
                    <nav className="flex text-sm" style={{ gap: '1rem', marginTop: '1rem' }}>
                        <Link href="/" className="font-bold bg-muted !text-current !no-underline hover:opacity-80 transition-opacity">
                            Strona główna
                        </Link>
                        <Link href="/kontakt" className="!text-current !no-underline hover:opacity-80 transition-opacity">
                            Kontakt
                        </Link>
                    </nav>
                    <div className="text-gray-400 dark:text-gray-600 mt-6 whitespace-nowrap overflow-hidden">
                        ---------------------------------------------------------------------
                    </div>
                </header>

                <div className="space-y-16">
                    {postsWithContent.length > 0 ? (
                        postsWithContent.map((post) => (
                            <article key={post.slug} className="group">
                                <div className="flex flex-col gap-4">
                                    <span className="text-sm font-semibold rounded bg-muted dark:bg-muted text-blue-800 dark:text-blue-100 px-2 py-1 w-fit">
                                        {post.date ? new Date(post.date).toLocaleDateString('pl-PL') : 'Brak daty'}
                                    </span>

                                    <h2 className="text-3xl font-bold">
                                        {post.title}
                                    </h2>

                                    <div className="post-content prose dark:prose-invert prose-slate max-w-none leading-relaxed"
                                         style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                                        {post.html ? (
                                            <div dangerouslySetInnerHTML={{ __html: post.html }} />
                                        ) : (
                                            <p className="text-gray-500 italic">Treść nie została jeszcze dodana.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="text-gray-400 dark:text-gray-600 mt-6 whitespace-nowrap overflow-hidden">
                                    ---------------------------------------------------------------------
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="py-10 text-center text-gray-500 italic">
                            Brak dostępnych wpisów.
                        </div>
                    )}
                </div>

                <ImageZoom />

                <footer className="pt-10">
                    <code className="rounded bg-muted px-3 py-1 text-base font-semibold">
                        © {new Date().getFullYear()} odniepamieci.pl
                    </code>
                </footer>
            </div>
        </div>
    )
}