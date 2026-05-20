import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import BlogApp from '/src/components/blog/BlogApp/BlogApp.jsx';

export default function Blog() {
    return (
        <>
            <PageTitle title="Blog" description="I heart ranting"/>
            <BlogApp />
        </>
    );
}
