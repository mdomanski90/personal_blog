import Link from "next/link";
import styles from './button.module.sass';
import { ReactNode } from "react";
import { UrlObject } from "url";

interface ButtonProps {
    href?: string | UrlObject;
    children: ReactNode;
    className?: string;
    [key: string]: any; // to capture any other props
}

const Button: React.FC<ButtonProps> = ({ href, children, className, ...props }) => {
    const combinedClassName = `${styles.button} ${className || ''}`.trim();

    if (href) {
        return (
            <Link href={href} className={combinedClassName} {...props}>
                {children}
            </Link>
        );
    }
    return (
        <button className={combinedClassName} {...props}>
            {children}
        </button>
    );
};

export default Button;
