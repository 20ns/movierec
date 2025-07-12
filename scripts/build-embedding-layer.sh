#!/bin/bash

# Build script for sentence transformers Lambda layer
set -e

echo "Building sentence transformers Lambda layer..."

# Create temp directory for building
TEMP_DIR=$(mktemp -d)
LAYER_DIR="lambda-layers/sentence-transformers-layer"
PYTHON_DIR="${LAYER_DIR}/python/lib/python3.8/site-packages"

echo "Using temporary directory: ${TEMP_DIR}"
echo "Target directory: ${PYTHON_DIR}"

# Ensure target directory exists
mkdir -p "${PYTHON_DIR}"

# Install dependencies
echo "Installing Python dependencies..."
pip install \
    --platform linux_x86_64 \
    --implementation cp \
    --python-version 3.8 \
    --only-binary=:all: \
    --upgrade \
    --target "${PYTHON_DIR}" \
    -r "${LAYER_DIR}/requirements.txt"

# Download the specific model we need
echo "Downloading sentence transformer model..."
python3 -c "
import sys
sys.path.insert(0, '${PYTHON_DIR}')
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
model.save('${PYTHON_DIR}/model')
print('Model downloaded successfully')
"

# Clean up unnecessary files to reduce size
echo "Cleaning up unnecessary files..."
find "${PYTHON_DIR}" -type f -name "*.pyc" -delete
find "${PYTHON_DIR}" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "${PYTHON_DIR}" -type f -name "*.so" -exec strip {} + 2>/dev/null || true

# Remove test files and documentation
find "${PYTHON_DIR}" -type d -name "test*" -exec rm -rf {} + 2>/dev/null || true
find "${PYTHON_DIR}" -type d -name "*test*" -exec rm -rf {} + 2>/dev/null || true
find "${PYTHON_DIR}" -type f -name "*.md" -delete 2>/dev/null || true
find "${PYTHON_DIR}" -type f -name "*.txt" -delete 2>/dev/null || true

# Check layer size
LAYER_SIZE=$(du -sh "${LAYER_DIR}" | cut -f1)
echo "Layer size: ${LAYER_SIZE}"

if [ -d "${PYTHON_DIR}/sentence_transformers" ]; then
    echo "✅ Sentence transformers installed successfully"
else
    echo "❌ Sentence transformers installation failed"
    exit 1
fi

if [ -d "${PYTHON_DIR}/model" ]; then
    echo "✅ Model downloaded successfully"
else
    echo "❌ Model download failed"
    exit 1
fi

echo "✅ Lambda layer built successfully!"
echo "Next steps:"
echo "1. Deploy the layer: cd ${LAYER_DIR} && serverless deploy"
echo "2. Update serverless.yml to reference the new layer"