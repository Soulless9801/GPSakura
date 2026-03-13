import Test from "/src/shengji/components/Test/Test";
import Join from "/src/shengji/components/Join/Join";

import "./ShengJiApp.css";

export default function ShengJiApp() {

    return (
        <div className="sjWrapper">
            <Test />
            <hr />
            <Join />
        </div>
    );
}
