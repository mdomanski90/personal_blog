const categoryColorMap = new Map<string, string>();
categoryColorMap.set('Kategoria 1', 'orange');
categoryColorMap.set('Kategoria 2', 'green');
categoryColorMap.set('Kategoria 3', 'purple');

const getCategoryColor = (category: string): string | undefined => {
    return categoryColorMap.get(category);
};

export default getCategoryColor;
