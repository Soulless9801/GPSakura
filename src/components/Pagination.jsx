import './Pagination.css';

export default function Pagination({ page, setPage, postsLength, pageSize }) {
    const pageCount = Math.ceil(postsLength / pageSize);
    const maxButtons = 3;

    const getPageNumbers = () => {
        if (pageCount <= maxButtons + 2) {
            return Array.from({ length: pageCount }, (_, i) => i);
        }
        const pages = [];
        const left = Math.max(1, page - 1);
        const right = Math.min(pageCount - 2, page + 1);

        pages.push(0);

        if (left > 1) pages.push("ellipsis");

        for (let i = left; i <= right; i++) {
            pages.push(i);
        }

        if (right < pageCount - 2) pages.push("ellipsis");

        pages.push(pageCount - 1);

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="pagination">
            <button
                onClick={() => setPage(0)}
                disabled={page <= 0}
                className={`paginationButton${page <= 0 ? " disabled" : ""}`}
            >
                &#8606;
            </button>
            <button
                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                disabled={page <= 0}
                className={`paginationButton${page <= 0 ? " disabled" : ""}`}
            >
                &#8592;
            </button>
            {pageNumbers.map((num, idx) => (
                <button
                    key={idx}
                    onClick={() => setPage(num)}
                    className={`paginationButton${page === num ? " active" : ""} ${num === "ellipsis" ? " disabled" : ""}`}
                >
                    {num === "ellipsis" ? "…" : num + 1}
                </button>
            ))}
            <button
                onClick={() => setPage(prev => Math.min(pageCount - 1, prev + 1))}
                disabled={page >= pageCount - 1}
                className={`paginationButton${page >= pageCount - 1 ? " disabled" : ""}`}
            >
                &#8594;
            </button>
            <button
                onClick={() => setPage(pageCount - 1)}
                disabled={page >= pageCount - 1}
                className={`paginationButton${page >= pageCount - 1 ? " disabled" : ""}`}
            >
                &#8608;
            </button>
        </div>
    );
}