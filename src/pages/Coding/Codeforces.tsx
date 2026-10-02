import PageTitle from '/src/components/tools/PageTitle/PageTitle';
import CodeforcesTable from '/src/components/tables/CodeforcesTable/CodeforcesTable';

export default function Codeforces() {
    return (
        <>
            <PageTitle title="Codeforces" description="Thoughts on problems"/>
            <CodeforcesTable />
        </>
    );
}
