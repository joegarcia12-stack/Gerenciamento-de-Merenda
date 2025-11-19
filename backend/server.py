from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date, timedelta
from passlib.context import CryptContext
import jwt
from jwt import PyJWTError
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("/app/frontend/public/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: str
    class_id: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    class_id: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    role: str
    username: str
    class_id: Optional[str] = None

class Class(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    leader_user_id: Optional[str] = None

class ClassCreate(BaseModel):
    name: str

class DailyCount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_id: str
    date: str
    count: int
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: str

class DailyCountCreate(BaseModel):
    class_id: str
    count: int

class DailyCountResponse(BaseModel):
    id: str
    class_id: str
    class_name: str
    date: str
    count: int
    updated_at: datetime

class DashboardSummary(BaseModel):
    date: str
    total_meals: int
    total_classes: int
    class_details: List[DailyCountResponse]

class WeeklyMenu(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    week_start: str
    monday: dict
    tuesday: dict
    wednesday: dict
    thursday: dict
    friday: dict
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeeklyMenuCreate(BaseModel):
    week_start: str
    monday: dict
    tuesday: dict
    wednesday: dict
    thursday: dict
    friday: dict

class GalleryPhoto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    caption: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GalleryPhotoCreate(BaseModel):
    url: str
    caption: Optional[str] = None

class QueueSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    week_start: str  # YYYY-MM-DD (Monday)
    schedule: dict  # {"monday": {"queue1": {"breakfast": [], "lunch": [], "snack": []}, "queue2": {...}}, ...}
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QueueScheduleCreate(BaseModel):
    week_start: str
    schedule: dict

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@api_router.get("/")
async def root():
    return {"message": "App de Contagem de Alunos API"}

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    try:
        existing = await db.users.find_one({"username": user_data.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        if user_data.role == "leader" and user_data.class_id:
            class_exists = await db.classes.find_one({"id": user_data.class_id})
            if not class_exists:
                raise HTTPException(status_code=400, detail="Invalid class ID")
        
        user = User(
            username=user_data.username,
            password_hash=get_password_hash(user_data.password),
            role=user_data.role,
            class_id=user_data.class_id if user_data.role == "leader" else None
        )
        
        await db.users.insert_one(user.model_dump())
        return {"message": "User created successfully", "id": user.id}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Error creating user")

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    try:
        user = await db.users.find_one({"username": login_data.username}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = create_access_token({"sub": user["id"], "role": user["role"]})
        return LoginResponse(
            token=token,
            role=user["role"],
            username=user["username"],
            class_id=user.get("class_id")
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Login error")

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "class_id": current_user.class_id
    }

@api_router.get("/classes", response_model=List[Class])
async def get_classes():
    classes = await db.classes.find({}, {"_id": 0}).to_list(1000)
    return classes

@api_router.post("/counts")
async def create_or_update_count(count_data: DailyCountCreate, current_user: User = Depends(get_current_user)):
    if current_user.role == "leader" and count_data.class_id != current_user.class_id:
        raise HTTPException(status_code=403, detail="You can only update your own class")
    
    today = date.today().isoformat()
    existing = await db.daily_counts.find_one({"class_id": count_data.class_id, "date": today})
    
    if existing:
        await db.daily_counts.update_one(
            {"class_id": count_data.class_id, "date": today},
            {"$set": {
                "count": count_data.count,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": current_user.username
            }}
        )
        return {"message": "Count updated successfully"}
    else:
        new_count = DailyCount(
            class_id=count_data.class_id,
            date=today,
            count=count_data.count,
            updated_by=current_user.username
        )
        doc = new_count.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.daily_counts.insert_one(doc)
        return {"message": "Count created successfully"}

@api_router.get("/counts/today", response_model=List[DailyCountResponse])
async def get_today_counts(current_user: User = Depends(get_current_user)):
    today = date.today().isoformat()
    counts = await db.daily_counts.find({"date": today}, {"_id": 0}).to_list(1000)
    
    result = []
    for count in counts:
        class_info = await db.classes.find_one({"id": count["class_id"]}, {"_id": 0})
        if class_info:
            if isinstance(count['updated_at'], str):
                count['updated_at'] = datetime.fromisoformat(count['updated_at'])
            result.append(DailyCountResponse(
                id=count["id"],
                class_id=count["class_id"],
                class_name=class_info["name"],
                date=count["date"],
                count=count["count"],
                updated_at=count["updated_at"]
            ))
    return result

@api_router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(target_date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access dashboard")
    
    if not target_date:
        target_date = date.today().isoformat()
    
    counts = await db.daily_counts.find({"date": target_date}, {"_id": 0}).to_list(1000)
    total_meals = sum(c["count"] for c in counts)
    total_classes = len(counts)
    class_details = []
    
    for count in counts:
        class_info = await db.classes.find_one({"id": count["class_id"]}, {"_id": 0})
        if class_info:
            if isinstance(count['updated_at'], str):
                count['updated_at'] = datetime.fromisoformat(count['updated_at'])
            class_details.append(DailyCountResponse(
                id=count["id"],
                class_id=count["class_id"],
                class_name=class_info["name"],
                date=count["date"],
                count=count["count"],
                updated_at=count["updated_at"]
            ))
    
    return DashboardSummary(
        date=target_date,
        total_meals=total_meals,
        total_classes=total_classes,
        class_details=class_details
    )

# Weekly Menu Routes
@api_router.post("/menu/weekly")
async def create_or_update_weekly_menu(menu_data: WeeklyMenuCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage menu")
    
    existing = await db.weekly_menus.find_one({"week_start": menu_data.week_start})
    
    if existing:
        await db.weekly_menus.update_one(
            {"week_start": menu_data.week_start},
            {"$set": {
                **menu_data.model_dump(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Menu updated successfully"}
    else:
        new_menu = WeeklyMenu(**menu_data.model_dump())
        doc = new_menu.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.weekly_menus.insert_one(doc)
        return {"message": "Menu created successfully"}

@api_router.get("/menu/current")
async def get_current_week_menu():
    # Get current week menu (public endpoint)
    today = date.today()
    # Get Monday of current week
    monday = today - timedelta(days=today.weekday())
    week_start = monday.isoformat()
    
    menu = await db.weekly_menus.find_one({"week_start": week_start}, {"_id": 0})
    
    if not menu:
        return None
    
    if isinstance(menu.get('updated_at'), str):
        menu['updated_at'] = datetime.fromisoformat(menu['updated_at'])
    
    return menu

@api_router.get("/menu/by-week/{week_start}")
async def get_menu_by_week(week_start: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view menus")
    
    menu = await db.weekly_menus.find_one({"week_start": week_start}, {"_id": 0})
    
    if not menu:
        return None
    
    if isinstance(menu.get('updated_at'), str):
        menu['updated_at'] = datetime.fromisoformat(menu['updated_at'])
    
    return menu

@api_router.get("/menu/all")
async def get_all_menus(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all menus")
    
    menus = await db.weekly_menus.find({}, {"_id": 0}).sort("week_start", -1).to_list(100)
    return menus

@api_router.post("/admin/reset-database")
async def reset_database(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reset database")
    
    result = await db.daily_counts.delete_many({})
    return {"message": f"Database reset successfully. {result.deleted_count} meal counts have been cleared."}

@api_router.post("/admin/reset-user-accounts")
async def reset_user_accounts(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reset user accounts")
    
    result = await db.users.delete_many({"role": {"$ne": "admin"}})
    return {"message": f"User accounts reset successfully. {result.deleted_count} user accounts have been deleted."}

@api_router.get("/admin/users")
async def get_all_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view users")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    user_to_delete = await db.users.find_one({"id": user_id})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_to_delete["role"] == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete admin users")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# Gallery Routes
@api_router.post("/gallery/upload")
async def upload_gallery_photo(
    file: UploadFile = File(...),
    caption: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can upload photos")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images allowed.")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Create photo entry
    photo_url = f"/uploads/{unique_filename}"
    new_photo = GalleryPhoto(url=photo_url, caption=caption)
    doc = new_photo.model_dump()
    doc['uploaded_at'] = doc['uploaded_at'].isoformat()
    await db.gallery_photos.insert_one(doc)
    
    return {"message": "Photo uploaded successfully", "id": new_photo.id, "url": photo_url}

@api_router.post("/gallery/photos")
async def add_gallery_photo(photo_data: GalleryPhotoCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add photos")
    
    new_photo = GalleryPhoto(**photo_data.model_dump())
    doc = new_photo.model_dump()
    doc['uploaded_at'] = doc['uploaded_at'].isoformat()
    await db.gallery_photos.insert_one(doc)
    return {"message": "Photo added successfully", "id": new_photo.id}

@api_router.get("/gallery/photos")
async def get_gallery_photos():
    # Public endpoint
    photos = await db.gallery_photos.find({}, {"_id": 0}).sort("uploaded_at", -1).to_list(100)
    for photo in photos:
        if isinstance(photo.get('uploaded_at'), str):
            photo['uploaded_at'] = datetime.fromisoformat(photo['uploaded_at'])
    return photos

@api_router.delete("/gallery/photos/{photo_id}")
async def delete_gallery_photo(photo_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete photos")
    
    result = await db.gallery_photos.delete_one({"id": photo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return {"message": "Photo deleted successfully"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
