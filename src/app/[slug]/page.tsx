import Image from 'next/image';
import GetCategoryColor from '@/helpers/get-category-color';
import styles from './style.module.sass';

const BlogDetails = () => (
    <div className="container pb-80">
        <div className="row mb-50">
            <div className="col col-9">
                <div className={`h6 c-${GetCategoryColor('Kategoria 2')}`}>{'Kategoria 2'}</div>
                <h2> Co asdk ow sda!? </h2>
            </div>
        </div>
        <img className={`${styles.featuredImage} mb-50`} src="/RS2.jpg" alt="adsad" width="1280" height="387"/>
        <div className="row mb-50">
            <div className="col col-9">
                <p>Vivamus ut porttitor ante. Morbi non est scelerisque, porta nisi vitae, venenatis nibh. Duis et molestie tellus. Fusce faucibus imperdiet nisi, sed fringilla magna cursus ut. Aenean dapibus blandit rhoncus. Vestibulum eget libero quis tortor porta semper. Proin ut risus ac tortor pellentesque pulvinar eget non tortor. Quisque pulvinar non felis eget auctor. Proin sed massa nec turpis aliquet bibendum. Nam quis ex nec lectus faucibus semper. Aenean fringilla lobortis cursus. Ut et justo et risus sodales accumsan a ut diam.</p>
                <p>Vivamus ut porttitor ante. Morbi non est scelerisque, porta nisi vitae, venenatis nibh. Duis et molestie tellus. Fusce faucibus imperdiet nisi, sed fringilla magna cursus ut. Aenean dapibus blandit rhoncus. Vestibulum eget libero quis tortor porta semper. Proin ut risus ac tortor pellentesque pulvinar eget non tortor. Quisque pulvinar non felis eget auctor. Proin sed massa nec turpis aliquet bibendum. Nam quis ex nec lectus faucibus semper. Aenean fringilla lobortis cursus. Ut et justo et risus sodales accumsan a ut diam.</p>
            </div>
        </div>
    </div>
);

export default BlogDetails;
