import Image from 'next/image';
import Button from '../button/button';
import ConditionalRenderer from '../conditional-renderer';
import styles from './card.module.sass';
import GetCategoryColor from '@/helpers/get-category-color';

const Card = (props) => (
    <div className={`${styles.card_wrap} ${props.className || ''}`}>
        <div className={styles.card}>
            <div className={styles.card_imageWrap}>
                <div className={styles.card_image}>
                    <Image src="/RS2.jpg" alt="asd" layout="fill" />
                </div>
            </div>
            <div className={styles.card_content}>
                <ConditionalRenderer condition={props.label}>   
                    <div className={`${styles.card_label} h6 mb-10 c-${GetCategoryColor(props.label)}`}>{props.label}</div>
                </ConditionalRenderer>
                <ConditionalRenderer condition={props.title}>
                    <div className={`${styles.card_title} h3 mb-20`}>{props.title}</div>
                </ConditionalRenderer>
                <ConditionalRenderer condition={props.summary}>
                     <p className={`${styles.card_summary} font-semibold`}>{props.summary}</p>
                </ConditionalRenderer>
                <ConditionalRenderer condition={props.href}>
                  <Button href={props.href}>{props.btnLabel || 'Czytaj całość'}</Button>
                </ConditionalRenderer>
            </div>
        </div>
    </div>
);

export default Card;
