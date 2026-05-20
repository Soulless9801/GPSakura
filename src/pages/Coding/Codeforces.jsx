import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import CodeforcesTable from '/src/components/tables/CodeforcesTable/CodeforcesTable.jsx';

export default function Codeforces() {
    return (
        <>
            <PageTitle title="Codeforces" description="Thoughts on problems"/>
            <CodeforcesTable />
        </>
    );
}
