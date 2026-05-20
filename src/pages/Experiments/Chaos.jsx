import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import ChaosDemo from '/src/components/experiments/Chaos/ChaosDemo.jsx';

export default function Chaos() {
    return (
        <>
            <PageTitle title="Chaos" description="Strange attractors"/>
            <ChaosDemo />
        </>
    );
}
