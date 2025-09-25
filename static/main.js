function init() {
    commentbox = document.querySelector(".commentbox")
    selcontext = document.querySelector(".selcontext")
    commentprompt = document.querySelector(".commentprompt")
    commentInput = commentprompt.querySelector("input")
    copyBox = document.querySelector(".copied")

    window.addEventListener("mouseup", onTextSelected)

    commentInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            cancelComment();
        } else if (e.key === "Enter") {
            postComment();
        }
    });

    document.querySelectorAll(".comment-highlight").forEach(comment => {
        addCommentHoverCallback(comment)
    })
}
function addCommentHoverCallback(element) {
    element.addEventListener("mouseover", e => {
        showCommentBox(element);
    })
    element.addEventListener("mouseleave", e => {
        hideCommentBox();
    })
}

function showCommentBox(element) {
    commentbox.style.display = ""
    var rect = element.getBoundingClientRect();
    movePopover(commentbox, rect)
    commentbox.innerText = element.getAttribute("text")
}

function hideCommentBox() {
    commentbox.style.display = "none"
}
function movePopover(element, bounding) {
    element.style.top = window.scrollY + bounding.top - 10 + "px"
    element.style.left = bounding.x + (bounding.width / 2) + "px"
}
function onTextSelected(e) {
    if (!Array.from(document.querySelectorAll(".page>p")).includes(e.target)) {
        if (
            !commentprompt.contains(e.target) &&
            !selcontext.contains(e.target)) {
            cancelComment();
        }
        return
    }
    let selection = window.getSelection()
    currentSelection = selection

    console.log(selection)

    if (selection.isCollapsed) {
        commentprompt.style.display = "none"
        selcontext.style.display = "none"
        return;
    }
    e.preventDefault();
    
    selcontext.style.display = ""

    var getRange = selection.getRangeAt(0);

    let paragraphElement = selection.anchorNode;
    while (paragraphElement && paragraphElement.tagName !== 'P') {
        paragraphElement = paragraphElement.parentNode;
    }

    if (!paragraphElement) return;

    selectionStart = getAbsoluteOffset(paragraphElement, selection.anchorNode, selection.anchorOffset);
    selectionEnd = getAbsoluteOffset(paragraphElement, selection.focusNode, selection.focusOffset);

    if (selectionStart > selectionEnd) {
        [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
    }

    selectedText = getRange.toString();

    var rect = getRange.getBoundingClientRect();
    movePopover(selcontext, rect)
}

function getAbsoluteOffset(container, node, offset) {
    let absoluteOffset = 0;
    let walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let currentNode;
    while (currentNode = walker.nextNode()) {
        if (currentNode === node) {
            return absoluteOffset + offset;
        }
        absoluteOffset += currentNode.textContent.length;
    }

    return absoluteOffset;
}
function addComment() {
    selcontext.style.display = "none"
    commentprompt.style.display = ""

    commentInput.value = ""

    let range = currentSelection.getRangeAt(0);

    var rect = range.getBoundingClientRect();

    let span = document.createElement('span');
    span.className = 'comment-highlight';

    let contents = range.extractContents();
    span.appendChild(contents);
    range.insertNode(span);

    currentTempSpan = span;

    movePopover(commentprompt, rect)

    commentInput.focus()
}
function postComment() {
    let data = {
        "comment_start": selectionStart,
        "comment_end": selectionEnd,
        "text": commentInput.value,
        pageID: currentTempSpan.parentNode.parentNode.getAttribute("pageid")
    };

    fetch("/api/v1/comment", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            currentTempSpan.setAttribute("text", commentInput.value)
            addCommentHoverCallback(currentTempSpan)
            commentprompt.style.display = "none";
            currentTempSpan = null;
        })
        .catch(error => {
            console.error("Error posting comment:", error);
        });
}

function copySelection() {
    navigator.clipboard.writeText(selectedText)
    var range = currentSelection.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    movePopover(copyBox, rect)
    copyBox.style.display = "";
    copyBox.animate(
        [
            { transform: "translate(-50%, -200%)", opacity: 1 },
            { transform: "translate(-50%, -300%)", opacity: 0 }
        ],
        {
            duration: 1000,
            easing: "ease"
        }
    );
    setTimeout(() => {
        copyBox.style.display = "none";
    }, 1000);
}

function cancelComment() {
    commentprompt.style.display = "none";
    selcontext.style.display = "none"

    if (currentTempSpan) {
        unwrapSpan(currentTempSpan);
        currentTempSpan = null;
    }
}

function unwrapSpan(span) {
    if (!span || !span.parentNode) return;

    let parent = span.parentNode;
    while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
}

var selcontext, commentprompt, commentbox, commentInput, currentSelection, currentTempSpan, selectedText, copyBox
var selectionStart = 0;
var selectionEnd = 0;
window.addEventListener("load", init)