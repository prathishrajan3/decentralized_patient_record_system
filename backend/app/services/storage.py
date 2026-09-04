import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

class StorageService:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Supabase credentials not fully configured.")
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.bucket_name = "medical-records"

    def upload_file(self, file_path: str, file_bytes: bytes) -> str:
        """
        Uploads encrypted file bytes to Supabase Storage.
        """
        response = self.client.storage.from_(self.bucket_name).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": "application/octet-stream"}
        )
        return file_path

    def download_file(self, file_path: str) -> bytes:
        """
        Downloads encrypted file bytes from Supabase Storage.
        """
        return self.client.storage.from_(self.bucket_name).download(file_path)

storage_service = StorageService()
