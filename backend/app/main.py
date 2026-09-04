from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Decentralized Patient Record System API",
    description="API for managing patient records, consent, and blockchain verification",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Decentralized Patient Record System API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
