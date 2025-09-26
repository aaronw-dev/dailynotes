const colors = {
    default: {
        sheetColor: "#fff8b3",
        lineColor: "#e6d96e",
        highlightColor: "#ffe6003d"
    },
    blue: {
        sheetColor: "#b3daff",
        lineColor: "#87b7f7",
        highlightColor: "#0051ff3d"
    },
    pink: {
        sheetColor: "#ffe4ec",
        lineColor: "#ffb6c1",
        highlightColor: "#ff69b43d"
    }
}

window.addEventListener("load", () => {
    const styleEl = document.createElement("style");
    document.head.appendChild(styleEl);
    const styleSheet = styleEl.sheet;
    for (const [key, value] of Object.entries(colors)) {
        styleSheet.insertRule(`.page.${key} {--sheet-color: ${value.sheetColor}\; --line-color: ${value.lineColor}\; --highlight-color: ${value.highlightColor}}`)
    }
})