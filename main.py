from flask import Flask, request, render_template
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone
import os
import random
import json

app = Flask(__name__)
'''cert_json = os.environ.get("fbcert")
if not cert_json:
    raise RuntimeError("FIREBASE_CERT_JSON environment variable not set.")
cert_dict = json.loads(cert_json)
cred = credentials.Certificate(cert_dict)
firebase_admin.initialize_app(cred)
db = firestore.client()'''


@app.route("/")
def index():
    amt = request.args.get("first", 15, type=int)
    with open("private/messages.json", "r") as file:
        filejson = json.load(file)
    messagelist = list(reversed(filejson.get("messages")))[:amt]
    return render_template("index.html", MESSAGES=messagelist)


if __name__ == "__main__":
    app.run(debug=True)
