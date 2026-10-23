import os
import base64
from dotenv import load_dotenv
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

load_dotenv()

class CryptoService:
    def __init__(self):
        key_b64 = os.getenv("ENCRYPTION_KEY")
        if not key_b64:
            raise ValueError("ENCRYPTION_KEY environment variable is not set")
        
        # Decode the key
        self.key = base64.b64decode(key_b64)
        if len(self.key) != 32:
            raise ValueError("ENCRYPTION_KEY must be a 32-byte key (AES-256)")
        
        self.aesgcm = AESGCM(self.key)

    def encrypt(self, data: bytes) -> bytes:
        # Generate a random 12-byte nonce
        nonce = os.urandom(12)
        # Encrypt data
        ciphertext = self.aesgcm.encrypt(nonce, data, None)
        # Prepend nonce to ciphertext for decryption later
        return nonce + ciphertext

    def decrypt(self, encrypted_data: bytes) -> bytes:
        if len(encrypted_data) < 12:
            raise ValueError("Invalid encrypted data format")
        
        nonce = encrypted_data[:12]
        ciphertext = encrypted_data[12:]
        
        return self.aesgcm.decrypt(nonce, ciphertext, None)

crypto_service = CryptoService()
