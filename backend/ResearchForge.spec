# -*- mode: python ; coding: utf-8 -*-
import os
from pathlib import Path

frontend_dist = str(Path("../frontend/out").resolve())

a = Analysis(
    ["main.py"],
    pathex=["."],
    binaries=[],
    datas=[
        (frontend_dist, "dist"),
    ],
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "passlib.handlers.bcrypt",
        "jose",
        "aiofiles",
        "fastapi.staticfiles",
        "fastapi.responses",
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="ResearchForge",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,        # 不显示黑色命令行窗口
    icon=None,
)
