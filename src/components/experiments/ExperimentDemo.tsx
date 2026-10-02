import type { ReactNode } from 'react';
import { convertToPixels } from '/src/utils/resize';

import './ExperimentDemo.css';

interface ExperimentDemoProps {
    display: ReactNode;
    controls: ReactNode;
}

export default function ExperimentDemo({ display, controls }: ExperimentDemoProps) {

    return (
        <section className='container-fluid experimentDemoWrapper'>
            <div className='row g-3 align-items-center'>
                <figure className='col-12 col-md-6 col-xl-8'>
                    <div style={{ width: '100%', height: convertToPixels('60vh'), position: 'relative' }}>
                        {display}
                    </div>
                </figure>
                <section className='col-12 col-md-6 col-xl-4 d-flex'>
                    <div className='p-3 experimentControlsWrapper'>
                        <div className='container-fluid experimentControls'>
                            {controls}
                        </div>
                    </div>
                </section>
            </div>
        </section>
    );
};