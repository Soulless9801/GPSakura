import './BlogPost.css'

export default function BlogPost({title, body, time}) {
  return (
    <div className="container-fluid blogPostContainer">
        <div className="blogPostTitle">{title}</div>
        <div className="blogPostBody">{body}</div>
        <small className="blogPostTime">Created {time.toDate().toLocaleDateString()}</small>
    </div>
  );
}