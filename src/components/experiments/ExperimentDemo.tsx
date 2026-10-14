import type { ReactNode } from 'react';
import './ExperimentDemo.css';

interface ExperimentDemoProps {
    display: ReactNode;
    controls: ReactNode;
}

export default function ExperimentDemo({ display, controls }: ExperimentDemoProps) {
    return (
        <section className="demo-layout experiment-layout">
            <figure className="ui-frame experiment-display">
                <div className="experiment-display-content">{display}</div>
            </figure>
            <section className="ui-panel ui-stack demo-controls">{controls}</section>
        </section>
    );
}
