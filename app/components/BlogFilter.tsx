'use client';
import { useEffect, useRef, useState } from 'react';
import Shuffle from 'shufflejs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface BlogFilterProps {
    allTags: string[];
}

export default function BlogFilter({ allTags }: BlogFilterProps) {
    const shuffleRef = useRef<Shuffle | null>(null);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);

    useEffect(() => {
        const element = document.getElementById('blog-grid');
        if (element) {
            shuffleRef.current = new Shuffle(element, {
                itemSelector: '.blog-post-item',
                speed: 400,
                easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
            });

            const handleManualUpdate = () => {
                if (shuffleRef.current) {
                    shuffleRef.current.update();
                    shuffleRef.current.layout();
                }
            };

            window.addEventListener('blog:font-changed', handleManualUpdate);
            window.addEventListener('resize', handleManualUpdate);

            const observer = new ResizeObserver(() => handleManualUpdate());
            observer.observe(element);

            return () => {
                window.removeEventListener('blog:font-changed', handleManualUpdate);
                window.removeEventListener('resize', handleManualUpdate);
                observer.disconnect();
                shuffleRef.current?.destroy();
            };
        }
    }, []);

    useEffect(() => {
        if (!shuffleRef.current) return;

        if (activeFilters.length === 0) {
            shuffleRef.current.filter(Shuffle.ALL_ITEMS);
        } else {
            shuffleRef.current.filter((element: Element) => {
                // Pobierz grupy/tagi elementu - Shuffle używa atrybutu data-groups
                const groups = JSON.parse(
                    (element as HTMLElement).getAttribute('data-groups') || '[]'
                ).map((g: string) => g.toLowerCase());

                // AND logic: element musi mieć WSZYSTKIE zaznaczone tagi
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
                {/* Przycisk "wszystkie" - osobny, resetuje filtrowanie */}
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