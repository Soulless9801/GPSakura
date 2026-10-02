import PageTitle from '/src/components/tools/PageTitle/PageTitle';
import FractalDemo from '/src/components/experiments/Fractal/FractalDemo';

export default function Fractals() {
    return (
        <>
            <PageTitle title="Fractals" description="Recursive visualizations"/>
            <FractalDemo />
        </>
    );
}
