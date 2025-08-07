import { useEffect, useState, useRef } from 'react';
import $ from 'jquery';

import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';

DataTable.use(DT);

import Select from './Select.jsx';

import './DataTable.css'

$.fn.dataTable.ext.oSort['my-numeric-asc'] = (a, b) => {
  if (a === 'unrated') a = '0';
  if (b === 'unrated') b = '0';
  return parseFloat(a) - parseFloat(b);
};
$.fn.dataTable.ext.oSort['my-numeric-desc'] = (a, b) => {
  if (a === 'unrated') a = '0';
  if (b === 'unrated') b = '0';
  return parseFloat(b) - parseFloat(a);
};

export default function CodeforcesTable() {
    const [rows, setRows] = useState([]);
    const tableRef = useRef(null);

    const columns = ['Rating', 'Problem Name', 'Submission'];

    useEffect(() => {
        fetch('/.netlify/functions/codeforces-sheet-data')
        .then(res=> res.text())
        .then(text => {
            const data = text.split(/\r?\n/).slice(1).filter(Boolean).map(line => {
                const [rating, name, cfLink, subLink] = line.split(';');
                return [
                    rating,
                    `<a href="${cfLink}" class="table-link">${name}</a>`,
                    `<a href="${subLink}" class="table-link">Codeforces</a>`,
                ];
            });
            setRows(data);
        });
    }, []);

    const options = {
        scrollX: true,
        destroy: true,
        bFilter : false,               
        bLengthChange: false,
        columnDefs: [
            {targets: 0, type: 'my-numeric', orderDataType: 'my-numeric'},
            {targets: 2, orderable: false},
        ],
        columns: [{ width: '10%' }, {width: '80%'}, {width: '10%'}],
        lengthMenu: [5, 10, 20, 50, 100]
    };

    return (
        <div className="container-fluid table-wrapper">
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
        </div>
    );
}  

