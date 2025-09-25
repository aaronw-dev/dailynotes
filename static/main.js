function init() {
    commentbox = document.querySelector(".commentbox")
    selcontext = document.querySelector(".selcontext")
    commentprompt = document.querySelector(".commentprompt")
    commentInput = commentprompt.querySelector("input")
    copyBox = document.querySelector(".copied")

    window.addEventListener("mouseup", onTextSelected)
    window.addEventListener("touchend", onTextSelected)
    document.addEventListener("selectionchange", onSelectionChange)

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

    element.addEventListener("touchstart", e => {
        e.preventDefault();
        showCommentBox(element);

        clearTimeout(mobileCommentTimeout);
        mobileCommentTimeout = setTimeout(() => {
            hideCommentBox();
        }, 3000);
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
    if (e && e.target && !Array.from(document.querySelectorAll(".page>p")).includes(e.target)) {
        if (
            !commentprompt.contains(e.target) &&
            !selcontext.contains(e.target)) {
            cancelComment();
        }
        return
    }

    handleTextSelection();
}

function onSelectionChange() {
    clearTimeout(selectionChangeTimeout);
    selectionChangeTimeout = setTimeout(() => {
        handleTextSelection();
    }, 100);
}

function handleTextSelection() {
    let selection = window.getSelection()

    if (selection.rangeCount === 0) return;

    let range = selection.getRangeAt(0);
    if (range.collapsed) {
        commentprompt.style.display = "none"
        selcontext.style.display = "none"
        return;
    }

    let startContainer = range.startContainer;
    let endContainer = range.endContainer;

    let startParagraph = startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentNode : startContainer;
    let endParagraph = endContainer.nodeType === Node.TEXT_NODE ? endContainer.parentNode : endContainer;

    while (startParagraph && startParagraph.tagName !== 'P') {
        startParagraph = startParagraph.parentNode;
    }
    while (endParagraph && endParagraph.tagName !== 'P') {
        endParagraph = endParagraph.parentNode;
    }

    if (!startParagraph || !endParagraph) return;

    currentSelection = selection;
    selcontext.style.display = ""

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

    selectedText = range.toString();

    var rect = range.getBoundingClientRect();
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

    setTimeout(() => {
        commentInput.focus();
        if (isMobileDevice()) {
            setTimeout(() => {
                commentprompt.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, 100);
}

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0);
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
var selectionChangeTimeout;
var mobileCommentTimeout;
window.addEventListener("load", init)