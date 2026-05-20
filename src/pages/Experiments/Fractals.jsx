import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx';
import FractalDemo from '/src/components/experiments/Fractal/FractalDemo.jsx';

export default function Fractals() {
    return (
        <>
            <PageTitle title="Fractals" description="Recursive visualizations"/>
            <FractalDemo />
        </>
    );
}
