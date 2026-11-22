from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import admin, auth, catalog, health, materials

app = FastAPI(title=settings.app_name)

# Allow the local frontend dev server (Vite) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(materials.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"name": settings.app_name, "docs": "/docs"}
