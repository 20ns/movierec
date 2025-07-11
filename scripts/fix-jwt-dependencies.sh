#!/bin/bash
# Quick fix script for JWT layer dependencies

set -e

echo "🔧 JWT Dependencies Quick Fix"
echo "============================="

JWT_DIR="lambda-layers/jwt/nodejs"

# Create directory structure
echo "📁 Creating JWT layer structure..."
mkdir -p "$JWT_DIR"

# Create package.json
echo "📋 Creating package.json..."
cat > "$JWT_DIR/package.json" << 'EOF'
{
  "name": "jwt-layer",
  "version": "1.0.0",
  "description": "JWT verification layer for Lambda functions",
  "dependencies": {
    "aws-jwt-verify": "^4.0.1"
  }
}
EOF

# Install dependencies
echo "📦 Installing dependencies..."
cd "$JWT_DIR"
npm install
cd - > /dev/null

# Verify installation
if [ -d "$JWT_DIR/node_modules/aws-jwt-verify" ]; then
    echo "✅ JWT dependencies successfully installed!"
    echo "📍 Location: $JWT_DIR/node_modules/aws-jwt-verify"
else
    echo "❌ Installation failed!"
    exit 1
fi

# Test CORS validation
echo "🌐 Testing CORS validation..."
if timeout 30s node scripts/validate-cors.js > /dev/null 2>&1; then
    echo "✅ CORS validation passes!"
else
    echo "⚠️  CORS validation still has issues"
fi

echo "🎉 JWT dependencies fix completed!"