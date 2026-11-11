import { reader } from '@/app/reader';
import { notFound } from 'next/navigation';
import Markdoc from '@markdoc/markdoc';
import React from 'react';
import SiteHeader from '@/app/components/SiteHeader';
import Footer from '@/app/components/Footer';
import ScrollToTop from '@/app/components/ScrollToTop';

export async function generateStaticParams() {
    const miejsca = await reader.collections.miejsca.all();
    return miejsca.map((miejsce) => ({
        slug: miejsce.slug,
    }));
}

export default async function MiejscePage({ params }: { params: { slug: string } }) {
    const miejsce = await reader.collections.miejsca.read(params.slug);

    if (!miejsce) {
        notFound();
    }

    const { node } = await miejsce.content();
    const content = Markdoc.transform(node);
    const renderedContent = Markdoc.renderers.react(content, React);

    return (
        <>
            <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="font-mono">
                <div className="space-y-6 w-full">
                    <SiteHeader />

                    <article className="w-full">
                        <header className="mb-8">
                            <h2 className="text-4xl sm:text-5xl font-bold mb-4 lowercase tracking-tight">
                                {miejsce.title}
                            </h2>
                            {miejsce.lokalizacja && (
                                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                                    📍 {miejsce.lokalizacja}
                                </p>
                            )}
                            {miejsce.date && (
                                <time className="text-gray-500 dark:text-gray-500">
                                    {new Date(miejsce.date).toLocaleDateString('pl-PL')}
                                </time>
                            )}
                        </header>

                        <div className="prose dark:prose-invert prose-slate max-w-none">
                            {renderedContent}
                        </div>
                    </article>

                    <Footer />
                </div>
            </div>

            <ScrollToTop />
        </>
    );
}
