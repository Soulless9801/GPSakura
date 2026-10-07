import { lazy, Suspense } from "react";

import Join from "/src/shengji/components/Join/Join";

import "./ShengJiApp.css";

const Test = lazy(() => import("/src/shengji/components/Test/Test"));

export default function ShengJiApp() {

    return (
        <div className="sjWrapper">
            <Join />
            <Suspense fallback={null}><hr /><Test /></Suspense>
        </div>
    );
}
