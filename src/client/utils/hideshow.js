/** @param {...string} labels */
const hideShowElementByIds = (...labels) => {
    labels.forEach(label => {
        const labelDiv = document.getElementById(label);
        if (labelDiv) {
            if (labelDiv.style.display === "none") {
                labelDiv.style.display = '';
                labelDiv.style.display = "block";
            } else {
                labelDiv.style.display = "none";
            }
        }
    });
};

/** @param {...HTMLCanvasElement | ...null} elms */
const hideShowElements = (...elms) => {
    elms.forEach(elm => {
        if (elm) {
            if (elm.style.display === "none") {
                elm.style.display = '';
                elm.style.display = "block";
            } else {
                elm.style.display = "none";
            }
        }
    });
};

export { hideShowElementByIds, hideShowElements };
