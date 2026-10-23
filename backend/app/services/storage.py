import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

class StorageService:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SECRET_KEY")
        if not url or not key:
            raise ValueError("Supabase credentials not fully configured.")
        self.client: Client = create_client(url, key)
        self.bucket_name = "medical-documents"
        
        # Ensure bucket exists
        try:
            buckets = self.client.storage.list_buckets()
            if not any(b.name == self.bucket_name for b in buckets):
                self.client.storage.create_bucket(self.bucket_name, {"public": False})
                print(f"Created Supabase bucket: {self.bucket_name}")
        except Exception as e:
            print(f"Failed to check/create bucket: {e}")

    def upload_file(self, file_path: str, file_bytes: bytes, content_type: str = "application/octet-stream") -> str:
        """
        Uploads encrypted file bytes to Supabase Storage.
        """
        response = self.client.storage.from_(self.bucket_name).upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        
        # supabase-py can sometimes return a dict with an error or a Response object on failure
        if hasattr(response, "error") and response.error:
            raise Exception(f"Supabase upload failed: {response.error}")
        if isinstance(response, dict) and response.get("error"):
            raise Exception(f"Supabase upload failed: {response.get('error')}")
            
        return file_path

    def download_file(self, file_path: str) -> bytes:
        """
        Downloads encrypted file bytes from Supabase Storage.
        """
        return self.client.storage.from_(self.bucket_name).download(file_path)

storage_service = StorageService()
