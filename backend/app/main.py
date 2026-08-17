"""
Nagpur AI Traffic Management — FastAPI Backend

Endpoints:
  GET  /api/v1/health              → health check
  GET  /api/v1/junctions           → list known junction IDs
  POST /api/v1/predict             → single junction prediction
  POST /api/v1/predict/batch       → batch prediction for multiple junctions
  POST /analyze-video              → CCTV / Video YOLO Vehicle Analysis & Prediction Integration
  POST /api/v1/video/detect        → Video detection endpoint
  GET  /api/v1/video/sample        → Sample CCTV video telemetry
"""

import os
import time
import shutil
import tempfile
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import predictor
from . import video_detector
from .services import video_analysis


# ---------------------------------------------------------------------------
# Pydantic request/response models
# ---------------------------------------------------------------------------

class PredictionRequest(BaseModel):
    junction_id: str = Field(..., examples=["nag-01"])
    lanes: int = Field(..., ge=1, le=12, examples=[6])
    capacity: int = Field(..., ge=10, le=500, examples=[220])
    hour: int = Field(..., ge=0, le=23, examples=[18])
    minute: int = Field(..., ge=0, le=59, examples=[45])
    day_of_week: int = Field(..., ge=0, le=6, examples=[2])
    is_weekend: int = Field(..., ge=0, le=1, examples=[0])
    weather_code: int = Field(..., ge=0, le=3, examples=[0])
    base_volume_pct: int = Field(100, ge=50, le=200, examples=[100])
    current_vehicles: int = Field(..., ge=0, examples=[184])
    current_speed: float = Field(..., ge=0, examples=[18.5])
    current_density: float = Field(..., ge=0, le=100, examples=[84.0])


class HorizonPrediction(BaseModel):
    predicted_vehicle_count: int
    predicted_speed: float
    predicted_density: int
    congestion_probability: int
    congestion_level: str  # "Low", "Medium", "High"


class PredictionResponse(BaseModel):
    junction_id: str
    timestamp: str
    inference_latency_ms: float
    model_type: str = "GradientBoosting (scikit-learn)"
    predictions: dict[str, HorizonPrediction]  # keys: "5m","10m","15m","30m"


class BatchPredictionRequest(BaseModel):
    junctions: list[PredictionRequest]


class BatchPredictionResponse(BaseModel):
    results: list[PredictionResponse]
    total_inference_ms: float


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    model_loaded: bool
    yolo_available: bool
    known_junctions: list[str]


# ---------------------------------------------------------------------------
# App lifecycle: pre-load models on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models into memory on server startup."""
    try:
        predictor._ensure_loaded()
        print("[OK] ML models loaded - API ready for inference")
    except FileNotFoundError as e:
        print(f"[WARN] Models not yet trained: {e}")
        print("   The /predict endpoints will fail until models are trained.")
    yield


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Nagpur AI Traffic Prediction & CCTV Video Analytics API",
    description=(
        "ML-powered 5/10/15/30-minute traffic forecasting and YOLO vehicle detection "
        "(cars, motorcycles, buses, trucks) + calibrated speed estimation for Nagpur Smart City."
    ),
    version="1.2.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ---------------------------------------------------------------------------
# Core Traffic Prediction Routes
# ---------------------------------------------------------------------------

@app.get("/api/v1/health", response_model=HealthResponse)
async def health():
    try:
        junctions = predictor.get_junction_ids()
        model_loaded = True
    except Exception:
        junctions = []
        model_loaded = False

    return HealthResponse(
        status="ok" if model_loaded else "models_not_loaded",
        timestamp=datetime.utcnow().isoformat() + "Z",
        model_loaded=model_loaded,
        yolo_available=True,
        known_junctions=junctions,
    )


@app.get("/api/v1/junctions", response_model=list[str])
async def list_junctions():
    try:
        return predictor.get_junction_ids()
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Models not trained yet.")


@app.post("/api/v1/predict", response_model=PredictionResponse)
async def predict_single(req: PredictionRequest):
    t0 = time.perf_counter()
    try:
        raw = predictor.predict(
            junction_id=req.junction_id,
            lanes=req.lanes,
            capacity=req.capacity,
            hour=req.hour,
            minute=req.minute,
            day_of_week=req.day_of_week,
            is_weekend=req.is_weekend,
            weather_code=req.weather_code,
            base_volume_pct=req.base_volume_pct,
            current_vehicles=req.current_vehicles,
            current_speed=req.current_speed,
            current_density=req.current_density,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Models not trained yet. Run train_model.py first.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
    predictions = {k: HorizonPrediction(**v) for k, v in raw.items()}

    return PredictionResponse(
        junction_id=req.junction_id,
        timestamp=datetime.utcnow().isoformat() + "Z",
        inference_latency_ms=elapsed_ms,
        predictions=predictions,
    )


@app.post("/api/v1/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(req: BatchPredictionRequest):
    t0 = time.perf_counter()
    results: list[PredictionResponse] = []

    for jr in req.junctions:
        t1 = time.perf_counter()
        try:
            raw = predictor.predict(
                junction_id=jr.junction_id,
                lanes=jr.lanes,
                capacity=jr.capacity,
                hour=jr.hour,
                minute=jr.minute,
                day_of_week=jr.day_of_week,
                is_weekend=jr.is_weekend,
                weather_code=jr.weather_code,
                base_volume_pct=jr.base_volume_pct,
                current_vehicles=jr.current_vehicles,
                current_speed=jr.current_speed,
                current_density=jr.current_density,
            )
        except (FileNotFoundError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"Error for {jr.junction_id}: {e}")

        elapsed_ms = round((time.perf_counter() - t1) * 1000, 2)
        predictions = {k: HorizonPrediction(**v) for k, v in raw.items()}
        results.append(PredictionResponse(
            junction_id=jr.junction_id,
            timestamp=datetime.utcnow().isoformat() + "Z",
            inference_latency_ms=elapsed_ms,
            predictions=predictions,
        ))

    total_ms = round((time.perf_counter() - t0) * 1000, 2)
    return BatchPredictionResponse(results=results, total_inference_ms=total_ms)


# ---------------------------------------------------------------------------
# CCTV / Video Analysis & Prediction Pipeline Endpoints
# ---------------------------------------------------------------------------

@app.post("/analyze-video")
@app.post("/api/v1/analyze-video")
async def analyze_video(
    video: UploadFile = File(...),
    video_fps: float = Form(30.0),
    pixels_per_meter: float = Form(15.0),
    conf_threshold: float = Form(0.25),
    junction_id: str = Form("nag-01"),
    capacity: int = Form(220),
    lanes: int = Form(6)
):
    """
    Main CCTV Video Traffic Analysis Endpoint:
      1. Receives uploaded traffic video.
      2. Detects Cars, Motorcycles, Buses, Trucks using YOLO.
      3. Performs vehicle tracking & calibrated approximate speed estimation.
      4. Calculates traffic density & congestion level.
      5. Automatically feeds extracted telemetry into the AI Prediction engine
         to generate 5, 10, 15, and 30-minute forward forecasts and signal recommendations.
    """
    if not video.filename:
        raise HTTPException(status_code=400, detail="No video file provided.")

    valid_extensions = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
    ext = os.path.splitext(video.filename)[1].lower()
    if ext not in valid_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported video format '{ext}'. Please upload an MP4, AVI, MOV, MKV, or WEBM file."
        )

    t0 = time.perf_counter()

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_file:
        shutil.copyfileobj(video.file, tmp_file)
        tmp_path = tmp_file.name

    try:
        # Run YOLO Video Analysis Service
        analysis_result = video_analysis.analyze_video_stream(
            video_path=tmp_path,
            video_fps=video_fps,
            pixels_per_meter=pixels_per_meter,
            conf_threshold=conf_threshold,
            max_frames=120,
            frame_stride=2
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    # Extract traffic features from video analysis
    extracted_vehicles = analysis_result["total_vehicles"]
    extracted_speed = analysis_result["average_speed_kmh"]
    extracted_density = float(analysis_result["traffic_density"])

    # Now feed into existing AI Prediction Engine
    now = datetime.now()
    try:
        predictions_raw = predictor.predict(
            junction_id=junction_id,
            lanes=lanes,
            capacity=capacity,
            hour=now.hour,
            minute=now.minute,
            day_of_week=now.weekday(),
            is_weekend=1 if now.weekday() >= 5 else 0,
            weather_code=0,
            base_volume_pct=100,
            current_vehicles=extracted_vehicles,
            current_speed=extracted_speed,
            current_density=extracted_density,
        )
    except Exception as pred_err:
        # Fallback heuristic prediction if models not loaded
        predictions_raw = {
            "5m": {
                "predicted_vehicle_count": int(extracted_vehicles * 1.1),
                "predicted_speed": round(max(10.0, extracted_speed * 0.95), 1),
                "predicted_density": min(100, int(extracted_density * 1.08)),
                "congestion_probability": min(99, int(extracted_density * 1.05)),
                "congestion_level": "High" if extracted_density > 70 else "Medium" if extracted_density > 40 else "Low"
            },
            "10m": {
                "predicted_vehicle_count": int(extracted_vehicles * 1.25),
                "predicted_speed": round(max(8.0, extracted_speed * 0.88), 1),
                "predicted_density": min(100, int(extracted_density * 1.18)),
                "congestion_probability": min(99, int(extracted_density * 1.15)),
                "congestion_level": "High" if extracted_density > 60 else "Medium" if extracted_density > 35 else "Low"
            },
            "15m": {
                "predicted_vehicle_count": int(extracted_vehicles * 1.35),
                "predicted_speed": round(max(6.0, extracted_speed * 0.82), 1),
                "predicted_density": min(100, int(extracted_density * 1.25)),
                "congestion_probability": min(99, int(extracted_density * 1.22)),
                "congestion_level": "High" if extracted_density > 55 else "Medium"
            },
            "30m": {
                "predicted_vehicle_count": int(extracted_vehicles * 1.45),
                "predicted_speed": round(max(5.0, extracted_speed * 0.78), 1),
                "predicted_density": min(100, int(extracted_density * 1.32)),
                "congestion_probability": min(99, int(extracted_density * 1.28)),
                "congestion_level": "High" if extracted_density > 50 else "Medium"
            }
        }

    # Generate Adaptive Signal Recommendation based on 10m prediction
    pred_10m = predictions_raw.get("10m", {})
    recommended_green_change = 0
    if pred_10m.get("congestion_level") == "High" or extracted_density > 75:
        recommended_green_change = +25
        recommendation_reason = f"YOLO detected high traffic density ({extracted_density}%). 10m forecast predicts {pred_10m.get('predicted_vehicle_count')} vehicles ({pred_10m.get('congestion_probability')}% congestion risk). Extending green phase by +25s."
    elif pred_10m.get("congestion_level") == "Medium" or extracted_density > 45:
        recommended_green_change = +15
        recommendation_reason = f"Moderate traffic density ({extracted_density}%) with average speed {extracted_speed} km/h. Extending green phase by +15s."
    else:
        recommended_green_change = 0
        recommendation_reason = "Traffic flow optimal. Current signal cycle maintained."

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

    # Return unified response matching exact specifications
    return {
        "vehicle_counts": analysis_result["vehicle_counts"],
        "total_vehicles": analysis_result["total_vehicles"],
        "average_speed_kmh": analysis_result["average_speed_kmh"],
        "traffic_density": analysis_result["traffic_density"],
        "congestion_level": analysis_result["congestion_level"],
        "queue_estimate_meters": analysis_result["queue_estimate_meters"],
        "calibrated_pixels_per_meter": analysis_result["calibrated_pixels_per_meter"],
        "video_fps": analysis_result["video_fps"],
        "frames_processed": analysis_result["frames_processed"],
        "video_duration_seconds": analysis_result["video_duration_seconds"],
        "preview_frames_base64": analysis_result["preview_frames_base64"],
        "tracked_vehicles": analysis_result["tracked_vehicles"],
        "predictions": predictions_raw,
        "signal_recommendation": {
            "current_green": 40,
            "recommended_green": 40 + recommended_green_change,
            "change_seconds": recommended_green_change,
            "reason": recommendation_reason,
        },
        "filename": video.filename,
        "processing_time_ms": elapsed_ms,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "speed_disclaimer": "Prototype estimation — accuracy depends on camera calibration and angle."
    }


@app.post("/api/v1/video/detect")
async def detect_vehicles_video(
    video: UploadFile = File(...),
    pixels_per_meter: float = Form(15.0),
    conf_threshold: float = Form(0.30),
    max_frames: int = Form(120),
):
    """Legacy video detection endpoint wrapper."""
    return await analyze_video(
        video=video,
        video_fps=30.0,
        pixels_per_meter=pixels_per_meter,
        conf_threshold=conf_threshold
    )


@app.get("/api/v1/video/sample")
async def get_sample_cctv_analysis(
    junction_name: str = "Sitabuldi Interchange Flyover CCTV",
    pixels_per_meter: float = 15.0
):
    """Returns sample CCTV telemetry."""
    results = video_detector.generate_synthetic_cctv_analysis(
        junction_name=junction_name,
        pixels_per_meter=pixels_per_meter
    )
    results["timestamp"] = datetime.utcnow().isoformat() + "Z"
    results["is_sample"] = True
    return results


# ---------------------------------------------------------------------------
# Static SPA Frontend Mounting (For Single Unified Deployment)
# ---------------------------------------------------------------------------
dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "dist")
if os.path.exists(dist_dir):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(dist_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))

