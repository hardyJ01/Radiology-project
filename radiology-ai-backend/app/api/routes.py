from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import shutil
import os

# We will import the global models dictionary from main.py later
import app.main 

router = APIRouter()

@router.post("/generate-report")
async def generate_report(file: UploadFile = File(...)):
    # 1. Security Check: Ensure it's actually an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an image.")

    temp_file_path = f"temp_upload_{file.filename}"
    
    try:
        # 2. Save the uploaded file temporarily so PIL/OpenCV can read it
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 3. Retrieve the "Hot" AI Engine from server memory
        engine = app.main.ml_models.get("engine")
        if not engine:
            raise HTTPException(status_code=503, detail="AI Engine is still booting up.")

        # 4. Trigger the AI! (This returns the JSON dictionary we made earlier)
        result = engine.generate_report(temp_file_path)
        
        # 5. Send success response back to React
        return {
            "status": "success",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # 6. Housekeeping: Delete the temporary X-ray so your server doesn't fill up
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)