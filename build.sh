#!/bin/bash
set -e

echo "==== 1. 构建前端 ===="
cd frontend
npm install
npm run build
cd ..

echo "==== 2. 安装后端依赖 ===="
cd backend
pip install -r requirements.txt
pip install pyinstaller

echo "==== 3. 打包 exe ===="
pyinstaller ResearchForge.spec --clean

echo "==== 完成 ===="
echo "输出文件：backend/dist/ResearchForge"
