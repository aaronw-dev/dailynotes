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
        radioElement.title = key[0].toUpperCase() + key.slice(1)
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
    setupDragAndDrop()
    preventGlobalDropDefaults()
    changePageColor("default")
})

function preventGlobalDropDefaults() {
    window.addEventListener('dragover', e => {
        document.querySelector(".dragdrop").style.display = "none"
        e.preventDefault()
    }, false)

    window.addEventListener('drop', e => {
        document.querySelector(".dragdrop").style.display = "none"
        e.preventDefault()
    }, false)
}

let dragCounter = 0;
let attachedFiles = []; // Array to store file objects

function setupDragAndDrop() {
    var page = document.querySelector(".page")
    var dragZone = page.querySelector(".dragdrop")

        ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            page.addEventListener(eventName, preventDefaults, false)
            document.body.addEventListener(eventName, preventDefaults, false)
        })

        ;['dragenter', 'dragover'].forEach(eventName => {
            page.addEventListener(eventName, handleDragEnter, false)
        })

        ;['dragleave', 'drop'].forEach(eventName => {
            page.addEventListener(eventName, handleDragLeave, false)
        })

    page.addEventListener('drop', handleDrop, false)
}

function preventDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
}

function handleDragEnter(e) {
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        dragCounter++
        document.querySelector(".dragdrop").style.display = "flex"
    }
}

function handleDragLeave(e) {
    if (e.dataTransfer && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        dragCounter--
        if (dragCounter === 0) {
            document.querySelector(".dragdrop").style.display = "none"
        }
    }
}

function handleDrop(e) {
    dragCounter = 0
    document.querySelector(".dragdrop").style.display = "none"

    let dt = e.dataTransfer
    let files = dt.files

    if (files.length > 0) {
        handleFiles(files)
    }
}

function handleFiles(files) {
    console.log("Files dropped:", files)
    Array.from(files).forEach(file => {
        console.log(`File: ${file.name}, Size: ${file.size}, Type: ${file.type}`)
        addMediaTile(file)
    })
}

function addMediaTile(file) {
    const mediaGallery = document.querySelector('.media-gallery')
    const mediaTile = document.createElement('div')
    mediaTile.className = 'media-tile'

    // Add file to our data array and store index
    const fileIndex = attachedFiles.length;
    attachedFiles.push(file);
    mediaTile.dataset.fileIndex = fileIndex;

    // Add remove button
    const removeBtn = document.createElement('button')
    removeBtn.className = 'remove-media'
    removeBtn.innerHTML = '×'
    removeBtn.onclick = () => removeMediaTile(mediaTile, fileIndex)

    addTilePreview(mediaTile, file, removeBtn)
    mediaTile.appendChild(removeBtn)
    mediaGallery.appendChild(mediaTile)
}

function addTilePreview(element, fileContext, removeButton) {
    if (fileContext.type.startsWith('image/')) {
        const img = document.createElement('img')
        img.src = URL.createObjectURL(fileContext)
        img.alt = fileContext.name
        element.appendChild(img)
    } else {
        const span = document.createElement('span')
        span.innerText = fileContext.name
        element.appendChild(span)
    }
}

function removeMediaTile(tileElement, fileIndex) {
    // Clean up object URL if it's an image
    const img = tileElement.querySelector('img');
    if (img) {
        URL.revokeObjectURL(img.src);
    }

    // Remove from attachedFiles array (set to null to maintain indices)
    attachedFiles[fileIndex] = null;

    // Remove DOM element
    tileElement.remove();
}

function changePageColor(color) {
    if (Object.keys(colors).includes(color)) {
        let colorEntry = colors[color]
        document.documentElement.style.setProperty('--sheet-color', colorEntry.sheetColor);
        document.documentElement.style.setProperty('--line-color', colorEntry.lineColor);
        document.documentElement.style.setProperty('--highlight-color', colorEntry.highlightColor);
        document.querySelector(".page").className = "page " + color
    }
}
async function postMessage() {
    let textarea = document.querySelector('.page > textarea');
    let content = textarea.value.trim();
    if (content) {
        let uploadedMedia = [];

        // Upload all attached files
        for (let i = 0; i < attachedFiles.length; i++) {
            const file = attachedFiles[i];
            if (file) { // Skip null entries (removed files)
                try {
                    const uploadResult = await uploadFile(file);
                    uploadedMedia.push(uploadResult);
                } catch (error) {
                    console.error('Error uploading file:', error);
                    alert(`Error uploading ${file.name}`);
                    return; // Stop if any upload fails
                }
            }
        }

        let isoString = new Date().toISOString();
        let message = {
            "text": content,
            "posted": isoString,
            "notecolor": document.querySelector("input[name=pagecolor]:checked").value,
            "media": uploadedMedia // Add uploaded media to message
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
                    // Clear attachments after successful post
                    attachedFiles = [];
                    location.href = '/';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error posting message.');
            });
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('media', file);

    const response = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    return await response.json(); // Should return {url: "...", filename: "..."}
}