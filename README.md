# Nagpur AI Traffic Management System

A modern, responsive, predictive smart-city traffic management platform built for **Nagpur Smart City Traffic Operations**.

## 🚦 System Architecture

The platform consists of a **React 18 + Vite + Tailwind CSS + Leaflet** frontend and a **Python FastAPI + YOLOv8 + Scikit-Learn** computer vision & ML predictive backend.

```
+-----------------------------------------------------------------------------------------+
|                              React 18 + TypeScript Frontend                             |
|  - GIS Map (Leaflet)          - AI Prediction Dashboard      - CCTV Video AI (YOLO)     |
|  - Simulation Control Room    - Analytics & Impact           - Signal Optimization      |
+-------------------------------------------+---------------------------------------------+
                                            | REST API (CORS enabled)
                                            v
+-----------------------------------------------------------------------------------------+
|                                Python FastAPI Backend                                   |
|  - GET  /api/v1/health                    - GET  /api/v1/junctions                      |
|  - POST /api/v1/predict                   - POST /api/v1/predict/batch                  |
|  - POST /api/v1/video/detect              - GET  /api/v1/video/sample                   |
+-------------------------------------------+---------------------------------------------+
                                            |
                    +-----------------------+-----------------------+
                    |                                               |
                    v                                               v
+---------------------------------------+   +---------------------------------------------+
|    Trained ML Regressors (scikit)     |   |    YOLOv8 Computer Vision & Tracking Engine |
|  - 5m, 10m, 15m, 30m Horizon Models   |   |  - Classes: Cars, Bikes, Buses, Trucks      |
|  - 60,480 synthetic training records  |   |  - Calibrated Pixel-to-Meter Speed (km/h)   |
|  - Congestion Probability & Volume    |   |  - Centroid Trajectory Tracking & Overlays  |
+---------------------------------------+   +---------------------------------------------+
```

---

## 📹 YOLOv8 Video Detection & Speed Tracking

### Detected Vehicle Classes:
- 🚗 **Cars** (COCO class 2)
- 🏍️ **Bikes / Motorcycles** (COCO class 3)
- 🚌 **Buses** (COCO class 5)
- 🚚 **Trucks** (COCO class 7)

### Calibrated Speed Tracking Formulation:
$$\text{Pixel Displacement} = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$
$$\text{Real Distance (m)} = \frac{\text{Pixel Displacement}}{\text{pixels\_per\_meter}}$$
$$\text{Speed (km/h)} = \left(\frac{\text{Real Distance}}{\Delta t}\right) \times 3.6$$

---

## 🚀 Running the Full Stack

### 1. Python FastAPI + YOLO Backend (Port 8000)

```bash
# Start FastAPI backend with Uvicorn
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

- **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 2. React Frontend (Port 3000)

```bash
# Start Vite development server
npm run dev
```

- **Frontend App**: [http://localhost:3000/](http://localhost:3000/)
