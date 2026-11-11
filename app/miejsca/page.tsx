import * as React from "react"
import { reader } from '@/app/reader';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import ScrollToTop from '../components/ScrollToTop';
import CopyLinkButton from '../components/CopyLinkButton';
import ImageZoom from '../components/ImageZoom';
import Markdoc, { Tag } from '@markdoc/markdoc';

const markdocConfig = {
    nodes: {
        image: {
            render: 'img',
            attributes: {
                src: { type: String },
                alt: { type: String },
                title: { type: String },
                class: { type: String, default: 'rounded-none w-full my-8 shadow-sm cursor-zoom-in' }
            },
            transform(node: any, config: any) {
                const src = node.attributes.src || ''
                const alt = node.attributes.alt || ''
                const title = node.attributes.title || ''

                const thumbSrc = src.replace(
                    /\/images\/miejsca\/(?!thumbs\/)/,
                    '/images/miejsca/thumbs/'
                ).replace(/\.\w+$/, '.webp')

                return new Tag('img', {
                    src: thumbSrc,
                    'data-zoom-src': src,
                    alt,
                    title,
                    loading: 'lazy',
                    decoding: 'async',
                    class: 'rounded-none w-full my-8 shadow-sm cursor-zoom-in',
                })
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

const formatDateWithDay = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
    const dayName = dayNames[date.getDay()];
    const formattedDate = date.toLocaleDateString('pl-PL');
    return `${dayName}, ${formattedDate}`;
};

export default async function MiejscaPage() {
    let miejscaWithContent: any[] = [];

    try {
        const allMiejsca = await reader.collections.miejsca.all();
        miejscaWithContent = await Promise.all(
            allMiejsca.map(async (miejsce) => {
                try {
                    const rawData = await miejsce.entry.content();
                    const transformed = Markdoc.transform(rawData.node, markdocConfig);
                    const html = Markdoc.renderers.html(transformed);
                    return {
                        slug: miejsce.slug,
                        title: miejsce.entry.title,
                        date: miejsce.entry.date,
                        lokalizacja: miejsce.entry.lokalizacja || '',
                        html: html,
                    };
                } catch (err) {
                    return {
                        slug: miejsce.slug,
                        title: miejsce.entry.title,
                        date: miejsce.entry.date,
                        lokalizacja: miejsce.entry.lokalizacja || '',
                        html: ''
                    };
                }
            })
        );
        miejscaWithContent.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    } catch (e) {
        console.error("Błąd ładowania danych:", e);
    }

    const metaButtonStyle = {
        fontSize: 'calc(16px * var(--font-scale, 1))',
        fontWeight: '400',
        height: 'calc(28px * var(--font-scale, 1))',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        textTransform: 'lowercase' as const,
    };

    return (
        <>
            <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="font-mono">
                <div className="space-y-6 w-full">
                    <SiteHeader />

                    <div id="miejsca-grid">
                        {miejscaWithContent.length > 0 ? (
                            miejscaWithContent.map((miejsce, index) => (
                                <article
                                    key={miejsce.slug}
                                    id={miejsce.slug}
                                    className="group w-full scroll-mt-24"
                                    style={{
                                        paddingBottom: 'calc(4rem * var(--font-scale, 1))',
                                        marginBottom: index < miejscaWithContent.length - 1 ? 0 : '4rem'
                                    }}
                                >
                                    <div className="flex flex-col"
                                         style={{
                                             gap: 'calc(0.25rem * var(--font-scale, 1))',
                                             marginTop: 'calc(1.25rem * var(--font-scale, 1))'
                                         }}>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center border border-[#d1d5db] dark:border-[#4b5563]">
                                                <div
                                                    style={metaButtonStyle}
                                                    className="bg-muted text-current whitespace-nowrap"
                                                >
                                                    {miejsce.date ? formatDateWithDay(miejsce.date) : 'brak daty'}
                                                </div>

                                                {miejsce.lokalizacja && (
                                                    <div
                                                        style={metaButtonStyle}
                                                        className="text-current border-l border-[#d1d5db] dark:border-[#4b5563] whitespace-nowrap"
                                                    >
                                                        📍 {miejsce.lokalizacja}
                                                    </div>
                                                )}
                                            </div>

                                            <CopyLinkButton slug={`miejsca/${miejsce.slug}`} />
                                        </div>

                                        <h2
                                            className="font-bold tracking-tight break-words leading-tight"
                                            style={{ fontSize: 'calc(1.5rem * var(--font-scale, 1))' }}
                                        >
                                            {miejsce.title}
                                        </h2>

                                        <div className="post-content prose dark:prose-invert prose-slate max-w-none leading-relaxed"
                                             style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                                            {miejsce.html ? (
                                                <div dangerouslySetInnerHTML={{ __html: miejsce.html }} />
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
                                brak dostępnych miejsc.
                            </div>
                        )}
                    </div>

                    <ImageZoom />
                    <Footer />
                </div>
            </div>

            <ScrollToTop />
        </>
    );
}
