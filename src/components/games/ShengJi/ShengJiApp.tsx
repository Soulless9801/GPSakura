import { lazy, Suspense } from "react";

import Join from "/src/shengji/components/Join/Join";

import "./ShengJiApp.css";

const Test = import.meta.env.DEV ? lazy(() => import("/src/shengji/components/Test/Test")) : null;

export default function ShengJiApp() {

    return (
        <div className="sjWrapper">
            <Join />
            {Test && <Suspense fallback={null}><hr /><Test /></Suspense>}
        </div>
    );
}
