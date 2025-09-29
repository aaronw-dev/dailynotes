import sys
import base64
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


def decrypt(encrypted_data: bytes, key: bytes) -> bytes:
    """Decrypt file using AES-256-GCM"""
    iv = encrypted_data[:12]
    tag = encrypted_data[12:28]
    ciphertext = encrypted_data[28:]

    cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag))
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()


def main():
    if len(sys.argv) != 4:
        print("Usage: python decrypt_file.py <key_b64> <encrypted_file> <output_file>")
        print(
            "Example: python decrypt_file.py 'your_base64_key' encrypted.bin decrypted.jpg")
        sys.exit(1)

    key_b64 = sys.argv[1]
    encrypted_file_path = sys.argv[2]
    output_file_path = sys.argv[3]

    try:
        key = base64.b64decode(key_b64)

        with open(encrypted_file_path, 'rb') as f:
            encrypted_data = f.read()

        decrypted_data = decrypt(encrypted_data, key)

        with open(output_file_path, 'wb') as f:
            f.write(decrypted_data)

        print(
            f"Successfully decrypted {encrypted_file_path} to {output_file_path}")
        print(f"Original size: {len(encrypted_data)} bytes")
        print(f"Decrypted size: {len(decrypted_data)} bytes")

    except Exception as e:
        print(f"Decryption failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
