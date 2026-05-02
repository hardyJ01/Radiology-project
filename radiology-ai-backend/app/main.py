from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router

# Import your Inference Engine
from app.ai.inference import RadiologyInferenceEngine

# Global dictionary to keep the 1.5GB AI model "Hot" in memory
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    This runs exactly ONCE when the server boots up.
    We load the heavy AI weights here so API calls are instantaneous.
    """
    print("\n[SERVER BOOT] Waking up the Radiology AI...")
    try:
        # Initialize the engine (Loads Base Model + LoRA)
        ml_models["engine"] = RadiologyInferenceEngine()
        print("[SERVER BOOT] AI is hot and ready for inference! 🚀\n")
    except Exception as e:
        print(f"[SERVER BOOT ERROR] Failed to load AI: {e}")
    
    yield # Server runs and listens for React requests here
    
    # This runs when you shut the server down
    print("\n[SERVER SHUTDOWN] Clearing AI from memory...")
    ml_models.clear()

# Initialize FastAPI
app = FastAPI(
    title="RadiologyAI Backend", 
    description="API for multimodal chest X-ray report generation.",
    lifespan=lifespan
)

# --- CRITICAL: CORS Configuration ---
# This allows your React app (usually running on port 3000 or 5173) to communicate with this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change to ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach the routes we made in step 2
app.include_router(api_router, prefix="/api")

@app.get("/")
def health_check():
    return {"status": "Online", "model_loaded": "engine" in ml_models}