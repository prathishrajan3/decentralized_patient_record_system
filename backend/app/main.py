import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base
from .routers import users, records, consent

# Create database tables
Base.metadata.create_all(bind=engine)

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

app.include_router(users.router)
app.include_router(records.router)
app.include_router(consent.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Mount the frontend dist folder if it exists
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{catchall:path}")
    def serve_frontend(catchall: str):
        if catchall and os.path.exists(os.path.join(frontend_dist, catchall)):
            return FileResponse(os.path.join(frontend_dist, catchall))
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "Welcome to the Decentralized Patient Record System API"}
