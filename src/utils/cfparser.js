/*
* INFO FORMAT: [RATING, PROBLEM NAME, PROBLEM LINK, SUBMISSION LINK, SOLUTION]
*/

let solIndex = 4;

let myInfo = new Map();

// Generate Problem Content

let start = "<p><strong>";

let pDelim = '~'; 
let sDelim = ':';

function parserSet(id, content) {
    myInfo.set(id, content);
}

function parserGetProblemContent(id) {
    if (!myInfo.has(id)) return "<h1>Invalid Problem ID</h1><br><hr>"
    info = myInfo.get(id);
    var pear = start;
    if (info.length <= solIndex || info[solIndex] === "") pear = "<p>Explanation Unavailable</p>"
    else {
    trash = info[solIndex].split(pDelim); var i;
    for (i = 0; i < trash.length; i++) {
        line = trash[i].split(sDelim);
        pear += line[0] + (line.length < 2 ? "" : sDelim) + "</strong>"; var j;
        for (j = 1; j < line.length; j++){
        pear += line[j];
        if (j < line.length - 1) pear += sDelim;
        }
        pear += "</p>";
        if (i < trash.length - 1) pear += start;
    }
    }
    var content = `
    <h1><a href="` + info[2] + `" class="table-link">${info[1]}</a></h1>
    <br>
    <div class="problem-solution-body">
        ${pear}
        <a href="${info[3]}" class="table-link">Final Submission</a>
    </div>
    <br>
    <hr>
    `;
    return content;
}
