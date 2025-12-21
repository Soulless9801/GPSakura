import { convertToPixels } from '/src/utils/resize.js';

import './ExperimentDemo.css';

export default function ExperimentDemo({display, controls}) {

    return (
        <div className='container-fluid experimentDemoWrapper'>
            <div className='row g-3 align-items-center'>
                <div className='col-12 col-md-6 col-xl-8'>
                    <div style={{ width: '100%', height: convertToPixels('60vh'), position: 'relative' }}>
                        {display}
                    </div>
                </div>
                <div className='col-12 col-md-6 col-xl-4 d-flex'>
                    <div className='p-3 experimentControlsWrapper'>
                        <div className='container-fluid experimentControls'>
                            {controls}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};