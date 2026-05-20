import './PageLoader.css';

export default function PageLoader() {
    return (
        <div className="page_loader" role="status" aria-live="polite">
            Loading…
        </div>
    );
}
