import json
import os
from datetime import datetime
from firebase_admin import credentials, firestore
from flask import Flask, request, render_template
import firebase_admin
from colorama import init, Fore, Back

init(autoreset=True)

os.environ["GRPC_VERBOSITY"] = "NONE"
os.environ["GRPC_TRACE"] = ""

app = Flask(__name__,
            static_url_path='/static',
            static_folder='static',
            template_folder='templates')

if __name__ == "__main__":
    with open(".env.local", "r") as file:
        cert_json = file.readlines()[2][10:-2]
else:
    cert_json = os.environ.get("firebase")
if not cert_json:
    raise RuntimeError("FIREBASE_CERT_JSON environment variable not set.")

os.environ["GRPC_VERBOSITY"] = "NONE"
os.environ["GRPC_TRACE"] = ""

cert_dict = json.loads(cert_json)
cred = credentials.Certificate(cert_dict)
firebase_admin.initialize_app(cred)
db = firestore.client()


def escapeCommentText(text: str):
    return text.replace("\"", "&quot;")


@app.route("/")
def index():
    amt = request.args.get("first", 15, type=int)
    messagelist = [
        {**document.get().to_dict(), "id": document.id}
        for document in db.collection("messages").list_documents(amt)
    ][:amt]
    messagelist.sort(key=lambda m: m["posted"], reverse=True)
    for message in messagelist:
        messagetext = message["text"]
        message["date"] = datetime.strftime(message["posted"], "%B %d, %Y")
        # Sort comments by start index descending so later spans don't affect earlier indices
        comments = sorted(message.get("comments", []),
                          key=lambda c: c["comment_start"], reverse=True)
        for comment in comments:
            messagetext = (
                messagetext[:comment["comment_start"]] +
                f'<span class="comment-highlight" text="{escapeCommentText(comment.get("text",""))}">' +
                messagetext[comment["comment_start"]:comment["comment_end"]] +
                "</span>" +
                messagetext[comment["comment_end"]:]
            )
        message["text"] = messagetext
    print(f"{Fore.LIGHTGREEN_EX}Serving {len(messagelist)} posts.")
    return render_template("index.html", MESSAGES=messagelist)


@app.route("/write")
def write():
    return render_template("writing.html")


@app.route("/api/v1/write", methods=["POST"])
def api_write():
    params = request.json
    params["comments"] = []
    params["posted"] = datetime.fromisoformat(
        params["posted"].replace('Z', '+00:00'))
    db.collection("messages").add(params)
    return {"status": "success"}, 200


@app.route("/api/v1/comment", methods=["POST"])
def comment():
    params = request.json
    page_id = params.get("pageID")
    comment_data = {k: v for k, v in params.items() if k != "pageID"}
    db.collection("messages").document(page_id).update({
        "comments": firestore.ArrayUnion([comment_data])
    })
    return {"status": "success"}, 200


if __name__ == "__main__":
    app.run(debug=True)
