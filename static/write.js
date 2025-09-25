window.addEventListener("load", e => {
    var dateElement = document.querySelector('.date');
    if (dateElement) {
        let now = new Date();
        let options = { month: 'long', day: 'numeric', year: 'numeric' };
        let formatted = now.toLocaleDateString('en-US', options);
        dateElement.innerText = formatted;
    }
})

function postMessage() {
    let textarea = document.querySelector('.page > textarea');
    let content = textarea.value.trim();
    if (content) {
        let isoString = new Date().toISOString();
        let message = {
            "text": content,
            "posted":isoString
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