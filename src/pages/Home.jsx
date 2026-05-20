import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import ParticleNetwork from '/src/components/experiments/ParticleNetwork/ParticleNetwork.jsx';

export default function Home() {
    return (
        <>
            <PageTitle title="Sakura" description="A project manifested"/>
            <ParticleNetwork
                numParticles={30}
                connectionDistance={90}
                width={"40vw"}
                height={"10vh"}
                style={{ maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}
            />
        </>
    );
}
