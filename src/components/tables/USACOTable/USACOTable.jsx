import { useEffect, useState, useRef } from 'react';
import $ from 'jquery';

import { formatDate } from '/src/utils/time.js';

import CustomDataTable from '/src/components/tables/DataTable.jsx';

import TextParser from '/src/components/tools/TextParser/TextParser.jsx';
import CodeBlock from '/src/components/tools/CodeBlock/CodeBlock.jsx';

const divisionOrder = {
    'platinum': 4,
    'gold': 3,
    'silver': 2,
    'bronze': 1,
};

$.fn.dataTable.ext.oSort['division-asc'] = (a, b) => {
    a = divisionOrder[a.toLowerCase()] || 0;
    b = divisionOrder[b.toLowerCase()] || 0;
    return a - b;
};

$.fn.dataTable.ext.oSort['division-desc'] = (a, b) => {
    a = divisionOrder[a.toLowerCase()] || 0;
    b = divisionOrder[b.toLowerCase()] || 0;
    return b - a;
};

export default function USACOTable() {

    const title = "USACO Porblem List";

    const bodyRef = useRef(null);

    const [data, setData] = useState(null);

    const [rows, setRows] = useState([]);

    const columns = ['Division', 'Problem Name', 'Submission'];

    useEffect(() => {
        fetch('/.netlify/functions/usaco-problems-data')
        .then(res => res.text())
        .then(json => {

            let rows = [];
            const data = JSON.parse(json);

            for (let i = 0; i < data.length; i++) {

                let div = data[i].division;

                rows.push([
                    div.charAt(0).toUpperCase() + div.slice(1),
                    `<a href="${data[i].link}">${data[i].title}</a>`,
                    `<button class="view-btn" data-id="${data[i].id}">View</button>`,
                ]);
            }

            setRows(rows);

        });
    }, []);

    useEffect(() => {
        const handler = async (e) => {
            const btn = e.target.closest(".view-btn");
            if (!btn) return;

            const id = btn.dataset.id;

            const res = await fetch(`/.netlify/functions/cp-problem-data?id=${id}_usaco`)
            const json = await res.json();

            // console.log(json);

            setData(json);
        };

        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, []);

    const options = {
        columnDefs: [
            {targets: 0, type: 'division', orderDataType: 'division'},
            {targets: 2, orderable: false, searchable: false},
        ],
        columns: [{ width: '10%' }, {width: '80%'}, {width: '10%'}],
    };

    const html = (
        <section>
            {data && (
                <section>
                    <div>
                        <h2>{data.title}</h2>
                        <div className="timestamp">Posted {formatDate(data.created)}</div>
                        <div><TextParser ref={bodyRef} text={data.body} /></div>
                        <div><CodeBlock code={data.submission} lang={data.language} /></div>
                        <div className="timestamp">Last Updated {formatDate(data.updated)}</div>
                    </div>
                </section>
            )}
        </section>
    );

    const id = "usaco-table";

    return (
        <CustomDataTable title={title} rows={rows} columns={columns} options={options} html={html} id={id}/>
    );
}  

