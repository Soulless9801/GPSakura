import type { ReactNode } from 'react';

export default function DemoFrame({ children }: { children: ReactNode }) {
    return (
        <figure className="ui-frame demo-frame">
            <div className="demo-frame-content">{children}</div>
        </figure>
    );
}
