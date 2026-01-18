import { useRef } from 'react';
import $ from 'jquery';

import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';

DataTable.use(DT);

import Select from '/src/components/tools/Select/Select.jsx';

import '/src/components/tables/DataTable.css'
import { table } from 'motion/react-client';

export default function CustomDataTable({title, rows, columns, options, html, id}) {

    const tableRef = useRef(null);

    options = {
        scrollX: true,
        destroy: true,
        layout: {
            topStart: null,
            topEnd: null,
        },
        lengthMenu: [5, 10, 20, 50, 100],
        language: {
            paginate: {
                last: '&#8608;',
                first: '&#8606;',
                next: '&#8594;',
                previous: '&#8592;', 
            }
        },
        ...options,
    }

    return (
        <section className="container-fluid table-wrapper">
            <br/>
            <h1>{title}</h1>
            <hr/>
            <br/><br/>
            <div className="table-header row row-cols-1 row-cols-md-2 gy-3 gy-md-0">
                <div className="col text-center text-md-start">
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
                            const table = $(`#${id}`).DataTable();
                            table.page.len(Number(e.value)).draw();
                        }}
                        labelL="Showing"
                        labelR="entries per page"
                    />
                </div>
                <div className="col text-center text-md-end">
                    <label>
                        Search:
                        <input 
                            type="search" 
                            placeholder="" 
                            onChange={e => {
                                const table = $(`#${id}`).DataTable();
                                console.log(String(e.target.value));
                                table.search(String(e.target.value)).draw();
                            }}
                            className="table-search"
                        />
                    </label>
                </div>
            </div>
            <DataTable data={rows} ref={tableRef} options={{ ...options }} className="table table-hover display-nowrap row-border table-custom" id={id}>
                <thead>
                    <tr>
                        {columns.map(col => <th key={col}>{col}</th>)}
                    </tr>
                </thead>
            </DataTable>
            {html}
        </section>
    );
}  

