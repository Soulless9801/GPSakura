import { useEffect, useState } from 'react';
import $ from 'jquery';
import 'datatables.net';

import CustomDataTable from '/src/components/tables/DataTable';

const sorters = $.fn.dataTable.ext.oSort as Record<string, (a: string, b: string) => number>;

sorters['rating-asc'] = (a: string, b: string): number => {
    if (a === 'unrated') {a = '0';}
    if (b === 'unrated') {b = '0';}
    return parseFloat(a) - parseFloat(b);
};
sorters['rating-desc'] = (a: string, b: string): number => {
    if (a === 'unrated') {a = '0';}
    if (b === 'unrated') {b = '0';}
    return parseFloat(b) - parseFloat(a);
};

export default function CodeforcesTable() {

    const title = 'Codeforces Problem List';

    const [rows, setRows] = useState<string[][]>([]);

    const columns = ['Rating', 'Problem Name', 'Submission'];

    useEffect(() => {
        void fetch('/.netlify/functions/codeforces-sheet-data')
        .then(res=> res.text())
        .then(text => {
            const data = text.split(/\r?\n/).slice(1).filter(Boolean).map((line: string): string[] => {
                const [rating, name, cfLink, subLink] = line.split(';');
                return [
                    rating,
                    `<a href="${cfLink}" class="table-link">${name}</a>`,
                    `<a href="${subLink}" class="table-link">Codeforces</a>`,
                ];
            });
            setRows(data);
        }).catch(() => undefined);
    }, []);

    const options = {
        columnDefs: [
            {targets: 0, type: 'rating', orderDataType: 'rating'},
            {targets: 2, orderable: false, searchable: false},
        ],
        columns: [{ width: '10%' }, {width: '80%'}, {width: '10%'}],
    };

    const html = "";

    const id = "codeforces-table";

    return (
        <CustomDataTable title={title} rows={rows} columns={columns} options={options} html={html} id={id}/>
    );
}  

