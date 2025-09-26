window.addEventListener("load", e => {
    var dateElement = document.querySelector('.date');
    if (dateElement) {
        let now = new Date();
        let options = { month: 'long', day: 'numeric', year: 'numeric' };
        let formatted = now.toLocaleDateString('en-US', options);
        dateElement.innerText = formatted;
    }
    let colorRadios = document.querySelector(".color-select")
    let index = 0

    for (const [key, value] of Object.entries(colors)) {
        let radioElement = document.createElement("label")
        radioElement.className = "container"
        radioElement.id = key
        radioElement.innerHTML = `<input type="radio" name="pagecolor" ${index == 0 ? 'checked="checked"' : ""} value="${key}"><span class="checkmark"></span>`
        radioElement.style.setProperty('--sheet-color', value.sheetColor);
        radioElement.style.setProperty('--line-color', value.lineColor);

        radioElement.addEventListener("click", e => {
            changePageColor(key)
        })
        colorRadios.appendChild(radioElement)
        index++
    }
    colorRadios.children[0].click()

})


function changePageColor(color) {
    if (Object.keys(colors).includes(color)) {
        let colorEntry = colors[color]
        document.documentElement.style.setProperty('--sheet-color', colorEntry.sheetColor);
        document.documentElement.style.setProperty('--line-color', colorEntry.lineColor);
        document.documentElement.style.setProperty('--highlight-color', colorEntry.highlightColor);
        document.querySelector(".page").className = "page " + color
    }
}

function postMessage() {
    let textarea = document.querySelector('.page > textarea');
    let content = textarea.value.trim();
    if (content) {
        let isoString = new Date().toISOString();
        let message = {
            "text": content,
            "posted": isoString,
            "notecolor": document.querySelector("input[name=pagecolor]:checked").value
        };
        fetch('/api/v1/write', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        })
            .then(response => {
                if (response.ok) {
                    location.href = '/';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error post message.');
            });
    }
}