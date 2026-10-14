import type { ReactNode } from 'react';
import DemoFrame from '../tools/DemoFrame/DemoFrame';

interface ExperimentDemoProps {
    display: ReactNode;
    controls: ReactNode;
}

export default function ExperimentDemo({ display, controls }: ExperimentDemoProps) {
    return (
        <section className="demo-layout">
            <DemoFrame>{display}</DemoFrame>
            <section className="ui-panel ui-stack demo-controls">{controls}</section>
        </section>
    );
}
