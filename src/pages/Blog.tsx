import PageTitle from '/src/components/tools/PageTitle/PageTitle';
import BlogApp from '/src/components/blog/BlogApp/BlogApp';

export default function Blog() {
    return (
        <>
            <PageTitle title="Blog" description="I heart ranting"/>
            <BlogApp />
        </>
    );
}
