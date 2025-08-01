import './Pagination.css';

export default function Pagination({ page, setPage, postsLength, pageSize }) {
    const pageCount = Math.ceil(postsLength / pageSize);
    const maxButtons = 5;

    console.log(`Page: ${page}, Page Count: ${pageCount}, Posts Length: ${postsLength}, Page Size: ${pageSize}`);

    const getPageNumbers = () => {
        if (pageCount <= maxButtons + 2) {
            return Array.from({ length: pageCount }, (_, i) => i);
        }
        const pages = [];
        const left = Math.max(1, page - 1);
        const right = Math.min(pageCount - 2, page + 1);

        pages.push(0);

        if (left > 1) pages.push("left-ellipsis");

        for (let i = left; i <= right; i++) {
            pages.push(i);
        }

        if (right < pageCount - 2) pages.push("right-ellipsis");

        pages.push(pageCount - 1);

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="pagination">
            <button
                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                disabled={page <= 0}
                className={`paginationButton${page <= 0 ? " disabled" : ""}`}
            >
                &#8592;
            </button>
            {pageNumbers.map((num, idx) =>
                typeof num === "string" ? (
                    <span key={num + idx} className="paginationEllipsis">…</span>
                ) : (
                    <button
                        key={num}
                        onClick={() => setPage(num)}
                        className={`paginationButton${page === num ? " active" : ""}`}
                    >
                        {num + 1}
                    </button>
                )
            )}
            <button
                onClick={() => setPage(prev => Math.min(pageCount - 1, prev + 1))}
                disabled={page >= pageCount - 1}
                className={`paginationButton${page >= pageCount - 1 ? " disabled" : ""}`}
            >
                &#8594;
            </button>
        </div>
    );
}