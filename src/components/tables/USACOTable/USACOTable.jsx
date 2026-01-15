import { useEffect, useState, useRef } from 'react';
import $ from 'jquery';

import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';

DataTable.use(DT);

import { formatDate } from '/src/utils/time.js';

import Select from '/src/components/tools/Select/Select.jsx';
import TextParser from '/src/components/tools/TextParser/TextParser.jsx';
import CodeBlock from '/src/components/tools/CodeBlock/CodeBlock.jsx';

import '/src/components/tables/DataTable.css'

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

    const bodyRef = useRef(null);

    const [data, setData] = useState(null);

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

    const [rows, setRows] = useState([]);
    const tableRef = useRef(null);

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

    const options = {
        scrollX: true,
        destroy: true,
        bFilter : false,               
        bLengthChange: false,
        columnDefs: [
            {targets: 0, type: 'division', orderDataType: 'division'},
            {targets: 2, orderable: false},
        ],
        columns: [{ width: '10%' }, {width: '80%'}, {width: '10%'}],
        lengthMenu: [5, 10, 20, 50, 100],
        language: {
            paginate: {
                last: '&#8608;',
                first: '&#8606;',
                next: '&#8594;',
                previous: '&#8592;', 
            }
        }
    };

    return (
        <section className="container-fluid table-wrapper">
            <br/>
            <h1>Problem List</h1>
            <hr/>
            <br/><br/>
            <div className="table-header row row-cols-1 row-cols-md-2 gy-3 gy-md-0">
                <div className="table-length col text-center text-md-start">
                    <label>
                        Showing{' '}
                        <Select
                            options={[
                                { value: '5', label: '5' },
                                { value: '10', label: '10' },
                                { value: '20', label: '20' },
                                { value: '50', label: '50' },
                                { value: '100', label: '100' },
                            ]}
                            defaultIndex = '0' 
                            onChange={e => {
                                const newLength = Number(e.value);
                                const table = $('.table-custom').DataTable();
                                table.page.len(newLength).draw();
                            }}
                        />
                        {' '}entries
                    </label>
                </div>
                <div className="table-search col text-center text-md-end">
                    <label>
                        Search:{' '}
                        <input 
                            type="search" 
                            placeholder="" 
                            onChange={e => {
                                const table = $('.table-custom').DataTable();
                                table.search(e.target.value).draw();
                            }}
                            className="table-input"
                        />
                    </label>
                </div>
            </div>
            <DataTable data={rows} ref={tableRef} options={{ ...options }} className="table table-hover display-nowrap row-border table-custom">
                <thead>
                    <tr>
                        {columns.map(col => <th key={col}>{col}</th>)}
                    </tr>
                </thead>
            </DataTable>
            {data && (
                <section className="problem-data-modal">
                    <div className="problem-data-content">
                        <h2>{data.title}</h2>
                        <hr/>
                        <div>Posted {formatDate(data.created)}</div>
                        <div><TextParser ref={bodyRef} text={data.body} /></div>
                        <div><CodeBlock code={data.submission} lang={data.language} /></div>
                        <div>Last Updated {formatDate(data.updated)}</div>
                    </div>
                </section>
            )}
        </section>
    );
}  

