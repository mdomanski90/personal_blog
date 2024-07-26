import { ReactNode } from 'react';

interface ConditionalRendererProps {
    condition: boolean;
    children: ReactNode;
}

const ConditionalRenderer: React.FC<ConditionalRendererProps> = ({ condition, children }) => {
    if (condition) return <>{children}</>;
    return null;
};

export default ConditionalRenderer;
    