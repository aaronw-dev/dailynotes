import random
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import json
import os
from datetime import datetime, timedelta, timezone
from firebase_admin import credentials, firestore
from flask import Flask, jsonify, redirect, request, render_template
import firebase_admin
from colorama import init, Fore, Back
import base64
import requests

init(autoreset=True)

os.environ["GRPC_VERBOSITY"] = "NONE"
os.environ["GRPC_TRACE"] = ""

app = Flask(__name__,
            static_url_path='/static',
            static_folder='static',
            template_folder='templates')

if __name__ == "__main__":
    with open(".env.local", "r") as file:
        lines = file.readlines()
        cert_json = lines[5][lines[5].index("=")+2:-2]
        catboxhash = lines[4][lines[4].index("=")+2:-2]
        password = lines[3][lines[3].index("=")+2:-2]
        aeskey = lines[1][lines[1].index("=")+2:-2]
else:
    cert_json = os.environ.get("firebase")
    catboxhash = os.environ.get("cb_hsh")
    password = os.environ.get("auth_pw")
    aeskey = os.environ.get("AES_KEY")

aeskey = base64.b64decode(aeskey)

if not cert_json:
    raise RuntimeError("FIREBASE_CERT_JSON environment variable not set.")

cert_dict = json.loads(cert_json)
cred = credentials.Certificate(cert_dict)
firebase_admin.initialize_app(cred)
db = firestore.client()


def escapeCommentText(text: str):
    return text.replace("\"", "&quot;")


def getPostsFromDB(amt=10, start=0, recent=False):
    messagelist = [
        {**document.get().to_dict(), "id": document.id}
        for document in db.collection("messages").list_documents(amt)
    ]
    dblength = len(messagelist)
    messagelist.sort(key=lambda m: m["posted"], reverse=True)
    if (recent):
        messagelist = messagelist[:amt]
        remaining = dblength - amt
    else:
        messagelist = messagelist[start:start+amt]
        remaining = dblength - (start + amt)

    remaining = max(0, remaining)

    for message in messagelist:
        messagetext = message["text"]
        pst_time = message["posted"].astimezone(
            timezone(timedelta(hours=-8)))
        message["date"] = datetime.strftime(pst_time, "%B %d, %Y")
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

        mediahtml = ""
        for item in message.get("media", []):
            itemkey = item["file_id"]
            mediainfo = db.collection("files").document(
                itemkey).get().to_dict()
            fileextension = mediainfo["file_ext"]
            filename = mediainfo["filename"]
            downloadlink = f"/encryptedmedia/{itemkey}"
            if (fileextension.lower() in ["png", "jpg", "gif", "webp", "jpeg"]):
                mediahtml += f'''<div class="media-tile" onclick="openMediaViewer('{itemkey}')" link="{downloadlink}"><img loading="lazy" src="{downloadlink}"></div>'''
            else:
                mediahtml += f'''<div class="media-tile" onclick="openMediaViewer('{itemkey}')" link="{downloadlink}"><span>{filename}</span></div>'''
        message["galleryhtml"] = mediahtml
        message["text"] = messagetext
    return messagelist, remaining


def randomstring(n: int) -> str:
    alphabet = "abcdefghijklmnnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
    return "".join(alphabet[random.randint(0, len(alphabet)-1)] for i in range(n))


def encrypt(data: bytes) -> bytes:
    iv = os.urandom(12)
    cipher = Cipher(algorithms.AES(aeskey), modes.GCM(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(data) + encryptor.finalize()

    return iv + encryptor.tag + ciphertext


def decrypt(encrypted_data: bytes) -> bytes:
    iv = encrypted_data[:12]
    tag = encrypted_data[12:28]
    ciphertext = encrypted_data[28:]

    cipher = Cipher(algorithms.AES(aeskey), modes.GCM(iv, tag))
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()


@app.route("/")
def index():
    if (password != request.cookies.get("auth_pw")):
        return redirect("/login")
    amt = request.args.get("first", 10, type=int)
    messagelist, remaining = getPostsFromDB(amt=amt, recent=True)
    print(f"{Fore.LIGHTGREEN_EX}Serving {len(messagelist)} posts.")
    return render_template("index.html", MESSAGES=messagelist, LOADED=len(messagelist), REMAINING=remaining, SHOWBUTTON=(remaining > 0))


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/api/v1/login", methods=["POST"])
def loginendpoint():
    pw = request.form.get("password")
    if pw == password:
        resp = redirect("/")
        resp.set_cookie("auth_pw", pw, max_age=604800)  # a week
        return resp
    return render_template("login.html", error="Incorrect password.")


@app.route("/encryptedmedia/<key>")
def getMedia(key):
    if (password != request.cookies.get("auth_pw")):
        return redirect("/login")
    mediainfo = db.collection("files").document(key).get().to_dict()
    mimetype = mediainfo.get("mimetype", "application/octet-stream")
    filelink = mediainfo["catbox_link"]
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(filelink, headers=headers)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching file: {e}")
        return {"message": "File not found or connection error"}, 404
    decrypted = decrypt(response.content)
    return decrypted, 200, {'Content-Type': mimetype}


@app.route("/api/v1/filedata/<key>")
def getfiledata(key):
    if (password != request.cookies.get("auth_pw")):
        return redirect("/login")
    mediainfo = db.collection("files").document(key).get().to_dict()
    return mediainfo


@app.route("/api/v1/posts", methods=["GET"])
def getPosts():
    if (password != request.cookies.get("auth_pw")):
        return redirect("/login")
    offset = request.args.get("start", 0, type=int)
    amt = request.args.get("amount", 15, type=int)
    jsonlist, remaining = getPostsFromDB(amt=amt, start=offset)
    print(f"{Fore.GREEN}Serving the next {len(jsonlist)} JSON posts starting at index {offset}")
    jsonlist.append({"remaining": remaining, "status": "All good :)"})
    return jsonify(jsonlist)


@app.route("/api/v1/upload", methods=["POST"])
def upload():
    if (password != request.cookies.get("auth_pw")):
        return redirect("/login")
    if 'media' not in request.files:
        return {"message": "You didn't attach a file to your request."}, 400
    else:
        if request.files['media'].filename == '':
            return {"message": "You didn't attach a file to your request."}, 400
    file = request.files['media']
    filedata = file.stream.read()
    encrypted = encrypt(filedata)
    catbox_response = requests.post(
        'https://catbox.moe/user/api.php',
        data={
            'reqtype': 'fileupload',
            'userhash': catboxhash
        },
        files={'fileToUpload': ("_.bin", encrypted)}
    )
    cblink = catbox_response.text
    file_ext = file.filename.split(".")[-1]
    params = {
        "file_ext": file_ext,
        "filename": file.filename,
        "catbox_link": cblink,
        "mimetype": file.mimetype
    }
    file_id = randomstring(20)
    db.collection("files").add(params, document_id=file_id)
    return {"message": f"File uploaded to Catbox: {cblink}", "file_id": file_id}, 200


@app.route("/write")
def write():
    if (password != request.cookies.get("auth_pw")):
        return redirect("/login")
    return render_template("writing.html")


@app.route("/api/v1/write", methods=["POST"])
def api_write():
    if (password != request.cookies.get("auth_pw")):
        return redirect("/login")
    params = request.json
    params["comments"] = []
    params["posted"] = datetime.fromisoformat(
        params["posted"].replace('Z', '+00:00'))
    db.collection("messages").add(params)
    return {"status": "success"}, 200


@app.route("/api/v1/comment", methods=["POST"])
def comment():
    if (password != request.cookies.get("auth_pw")):
        return redirect("/login")
    params = request.json
    page_id = params.get("pageID")
    comment_data = {k: v for k, v in params.items() if k != "pageID"}
    db.collection("messages").document(page_id).update({
        "comments": firestore.ArrayUnion([comment_data])
    })
    return {"status": "success"}, 200


if __name__ == "__main__":
    app.run(debug=True)
