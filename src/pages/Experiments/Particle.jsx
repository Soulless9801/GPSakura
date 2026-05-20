import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import ParticleNetworkDemo from '/src/components/experiments/ParticleNetwork/ParticleNetworkDemo.jsx';

export default function Particle() {
    return (
        <>
            <PageTitle title="Particle Network" description="Interactive particle simulation"/>
            <ParticleNetworkDemo />
        </>
    );
}
