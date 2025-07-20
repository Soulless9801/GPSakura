import { useEffect, useState } from 'react';
import $ from 'jquery';

import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';

DataTable.use(DT);

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
                  <DataTable data={rows} options={options} className="table table-hover display-nowrap row-border table-custom">
                        <thead>
                              <tr>
                                    {columns.map(col => <th key={col}>{col}</th>)}
                              </tr>
                        </thead>
                  </DataTable>
            </div>
    );
}
