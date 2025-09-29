import secrets
import base64


def genkey():
    key = secrets.token_bytes(32)
    key_b64 = base64.b64encode(key).decode()
    return key_b64


print("Generating 10 random AES keys: ")
for i in range(10):
    key_b64 = genkey()
    print(key_b64)
