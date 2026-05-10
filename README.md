---
title: Lung Disease Detection
emoji: 🫁
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Lung Disease Detection System

AI-powered system for detecting lung diseases from chest X-ray images using Deep Learning.

## 🚀 Features

- Upload chest X-ray images for analysis
- Real-time disease detection with confidence scores
- Support for multiple diseases (Normal, Pneumonia, COVID-19, Tuberculosis)
- Interactive web interface
- RESTful API for integration

## 📋 Prerequisites

- Python 3.11+
- pip
- (Optional) Docker

## 🛠️ Installation

### Backend Setup

```bash
# Clone repository
git clone <your-repo-url>
cd lung-disease-detection

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Place your trained model in backend/models/
# Model should be named: your_trained_model.pth

# Run the API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000