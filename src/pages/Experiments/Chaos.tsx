import PageTitle from '/src/components/tools/PageTitle/PageTitle';
import ChaosDemo from '/src/components/experiments/Chaos/ChaosDemo';

export default function Chaos() {
    return (
        <>
            <PageTitle title="Chaos" description="Strange attractors"/>
            <ChaosDemo />
        </>
    );
}
