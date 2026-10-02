import PageTitle from '/src/components/tools/PageTitle/PageTitle';
import ThreeD from '/src/components/experiments/ThreeD/ThreeD';

export default function ThreeDPage() {
    return (
        <>
            <PageTitle title="3D Playground" description="A space of chance"/>
            <div style={{ width: '90vw', height: '90vh', margin: '5vh auto' }}>
                <ThreeD />
            </div>
        </>
    );
}
