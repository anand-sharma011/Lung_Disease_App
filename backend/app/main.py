from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import uvicorn
from PIL import Image
import io
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.model_loader import get_model

# Initialize FastAPI app
app = FastAPI(
    title="Lung Disease Detection API",
    description="AI-powered API for detecting lung diseases from chest X-ray images",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get project root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    probabilities: dict
    message: Optional[str] = None

@app.get("/health")
async def health_check():
    try:
        model = get_model()
        return {
            "status": "healthy",
            "model_loaded": model is not None
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )

@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Expected image, got {file.content_type}"
        )
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        if image.size[0] < 50 or image.size[1] < 50:
            raise HTTPException(
                status_code=400,
                detail="Image too small. Please upload a larger image."
            )
        
        model = get_model()
        result = model.predict(image)
        
        return PredictionResponse(
            prediction=result["prediction"],
            confidence=result["confidence"],
            probabilities=result["probabilities"],
            message="Prediction completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction error: {str(e)}"
        )

# Mount static files (to serve frontend)
# This is placed at the end so it doesn't override other routes
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    # Get configuration from environment (Hugging Face often uses PORT)
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("API_PORT", 8000)))
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    
    print(f"\n🚀 Lung Disease Detection API starting...")
    print(f"📍 Access the app at: http://localhost:{port}\n")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload
    )