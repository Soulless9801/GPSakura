import PageTitle from '/src/components/tools/PageTitle/PageTitle';
import ParticleNetworkDemo from '/src/components/experiments/ParticleNetwork/ParticleNetworkDemo';

export default function Particle() {
    return (
        <>
            <PageTitle title="Particle Network" description="Interactive particle simulation"/>
            <ParticleNetworkDemo />
        </>
    );
}
