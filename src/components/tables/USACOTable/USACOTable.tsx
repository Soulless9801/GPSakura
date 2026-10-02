import { useEffect, useState, useRef } from 'react';
import $ from 'jquery';
import 'datatables.net';

import { formatDate } from '/src/utils/time';
import { deserialize } from '/src/utils/serial';

import CustomDataTable from '/src/components/tables/DataTable';

import TextParser from '/src/components/tools/TextParser/TextParser';
import CodeBlock from '/src/components/tools/CodeBlock/CodeBlock';

const divisionOrder = {
    'platinum': 4,
    'gold': 3,
    'silver': 2,
    'bronze': 1,
};

type Division = keyof typeof divisionOrder;
const divisionRank = (value: string): number => {
    if (!(value.toLowerCase() in divisionOrder)) {return 0;}
    return divisionOrder[value.toLowerCase() as Division];
};

const sorters = $.fn.dataTable.ext.oSort as Record<string, (a: string, b: string) => number>;

sorters['division-asc'] = (a: string, b: string): number => divisionRank(a) - divisionRank(b);

sorters['division-desc'] = (a: string, b: string): number => divisionRank(b) - divisionRank(a);

export default function USACOTable() {

    const title = "USACO Porblem List";

    const bodyRef = useRef<HTMLDivElement>(null);

    interface ProblemData {
        title: string;
        created: string;
        body?: string;
        submission: string;
        language: string;
        updated: string;
    }

    const [data, setData] = useState<ProblemData | null>(null);

    const [rows, setRows] = useState<string[][]>([]);

    const columns = ['Division', 'Problem Name', 'Submission'];

    useEffect(() => {
        //fetch('/.netlify/functions/usaco-problems-data')
        void fetch('/.netlify/functions/firebase-collection-query', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                col: "usaco",
                loc: "firebaseUSACOProblems",
            }),
        })
            .then(res => res.text())
            .then(json => {

                const rows: string[][] = [];
                const data = deserialize<Array<{ division: string; link: string; title: string; id: string }>>(json);

                for (let i = 0; i < data.length; i++) {

                    const div = data[i].division;

                    rows.push([
                        div.charAt(0).toUpperCase() + div.slice(1),
                        `<a href="${data[i].link}">${data[i].title}</a>`,
                        `<button class="view-btn" data-id="${data[i].id}">View</button>`,
                    ]);
                }

                setRows(rows);

            }).catch(() => undefined);
    }, []);

    useEffect(() => {
        const handler = async (e: MouseEvent): Promise<void> => {
            if (!(e.target instanceof Element)) {return;}
            const btn = e.target.closest(".view-btn");
            if (!(btn instanceof HTMLElement)) {return;}

            const id = btn.dataset.id;
            if (!id) {return;}

            // const res = await fetch(`/.netlify/functions/cp-problem-data?id=${id}`)

            const res = await fetch('/.netlify/functions/firebase-collection-query', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    col: "problems",
                    loc: "firebaseProblemData",
                    id,
                }),
            });

            const json = await res.text();
            const data = deserialize<ProblemData>(json);

            // console.log(data);

            setData(data);
        };

        const onDocumentClick = (event: MouseEvent): void => {
            void handler(event).catch(() => undefined);
        };
        document.addEventListener("click", onDocumentClick);
        return () => { document.removeEventListener("click", onDocumentClick); };
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
                        <div><TextParser ref={bodyRef} text={data.body ? data.body : "Explanation Pending"} /></div>
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

