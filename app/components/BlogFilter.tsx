'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Shuffle from 'shufflejs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface BlogFilterComponentProps {
    allTags: string[];
}

export default function BlogFilter({ allTags }: BlogFilterComponentProps) {
    const shuffleRef = useRef<Shuffle | null>(null);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);

    const handleManualUpdate = useCallback(() => {
        if (shuffleRef.current) {
            shuffleRef.current.update();
            shuffleRef.current.layout();
        }
    }, []);

    useEffect(() => {
        const element = document.getElementById('blog-grid');
        if (!element) return;

        shuffleRef.current = new Shuffle(element, {
            itemSelector: '.blog-post-item',
            speed: 400,
            easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        });

        // Odśwież layout po załadowaniu każdego obrazu
        const images = element.querySelectorAll('img');
        images.forEach(img => {
            if (img.complete) return;
            img.addEventListener('load', () => {
                shuffleRef.current?.layout();
            }, { once: true });
        });

        // Komentarze — agresywne odświeżanie layoutu
        // Remark42 ładuje się asynchronicznie i wielokrotnie zmienia
        // wysokość elementów. Musimy reagować szybko, żeby treść
        // poniżej nie była zakrywana.
        const handleCommentsOpened = () => {
            // Natychmiastowe odświeżenie
            handleManualUpdate();

            // Seria odświeżeń z rosnącymi opóźnieniami
            const delays = [50, 100, 200, 400, 800, 1500, 3000];
            delays.forEach(delay => {
                setTimeout(() => handleManualUpdate(), delay);
            });
        };

        window.addEventListener('blog:font-changed', handleManualUpdate);
        window.addEventListener('blog:comments-opened', handleCommentsOpened);
        window.addEventListener('resize', handleManualUpdate);

        // ResizeObserver na KAŻDYM poście — łapie zmianę wysokości
        // spowodowaną otwarciem komentarzy wewnątrz artykułu
        const postItems = element.querySelectorAll('.blog-post-item');
        const resizeObserver = new ResizeObserver(() => {
            handleManualUpdate();
        });

        postItems.forEach(item => {
            resizeObserver.observe(item);
        });

        // Główny observer na grid
        const gridObserver = new ResizeObserver(() => handleManualUpdate());
        gridObserver.observe(element);

        // MutationObserver — łapie nowe elementy dodane przez Remark42
        const mutationObserver = new MutationObserver(() => {
            handleManualUpdate();
            // Dodatkowe odświeżenie z opóźnieniem
            setTimeout(() => handleManualUpdate(), 300);
        });
        mutationObserver.observe(element, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class'],
        });

        return () => {
            window.removeEventListener('blog:font-changed', handleManualUpdate);
            window.removeEventListener('blog:comments-opened', handleCommentsOpened);
            window.removeEventListener('resize', handleManualUpdate);
            resizeObserver.disconnect();
            gridObserver.disconnect();
            mutationObserver.disconnect();
            shuffleRef.current?.destroy();
        };
    }, [handleManualUpdate]);

    useEffect(() => {
        if (!shuffleRef.current) return;

        if (activeFilters.length === 0) {
            shuffleRef.current.filter(Shuffle.ALL_ITEMS);
        } else {
            shuffleRef.current.filter((element: Element) => {
                const groups = JSON.parse(
                    (element as HTMLElement).getAttribute('data-groups') || '[]'
                ).map((g: string) => g.toLowerCase());

                return activeFilters.every((filter) => groups.includes(filter));
            });
        }
    }, [activeFilters]);

    const handleFilter = (values: string[]) => {
        setActiveFilters(values);
    };

    const handleReset = () => {
        setActiveFilters([]);
    };

    const baseStyle = {
        fontSize: '16px',
        fontWeight: '400',
        height: '28px',
        paddingLeft: '10px',
        paddingRight: '10px',
        borderRadius: '0',
        textTransform: 'lowercase' as const,
    };

    const firstStyle = {
        ...baseStyle,
        borderTopLeftRadius: '7px',
        borderBottomLeftRadius: '7px',
    };
    const lastStyle = {
        ...baseStyle,
        borderTopRightRadius: '7px',
        borderBottomRightRadius: '7px',
    };

    return (
        <div className="flex flex-wrap items-center justify-end gap-3 overflow-x-auto pb-4">
            <div className="flex gap-0">
                <button
                    onClick={handleReset}
                    style={firstStyle}
                    className={`font-mono border px-2.5 inline-flex items-center justify-center text-sm transition-colors
                        ${activeFilters.length === 0
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-transparent hover:bg-muted'
                    }`}
                >
                    wszystkie
                </button>

                <ToggleGroup
                    type="multiple"
                    value={activeFilters}
                    onValueChange={handleFilter}
                    variant="outline"
                    className="gap-0"
                >
                    {allTags.map((tag, index) => (
                        <ToggleGroupItem
                            key={tag}
                            value={tag.toLowerCase()}
                            style={index === allTags.length - 1 ? lastStyle : baseStyle}
                            className="font-mono border-l-0"
                        >
                            #{tag.toLowerCase()}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>
        </div>
    );
}