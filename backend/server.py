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
import csv
import io
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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

# Email (Gmail SMTP)
GMAIL_EMAIL = os.environ.get('GMAIL_EMAIL', '')
GMAIL_PASSWORD = os.environ.get('GMAIL_PASSWORD', '')
REGISTRATION_TOKEN = "1012"
MASTER_USERNAME = "joegarcia12"
MASTER_PASSWORD = "Annyvitoria12#"

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
    registration_token: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
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

# Student Models
class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    class_id: str
    matricula: Optional[str] = None
    email_responsavel: Optional[str] = None

class StudentCreate(BaseModel):
    name: str
    class_id: str
    matricula: Optional[str] = None
    email_responsavel: Optional[str] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    class_id: Optional[str] = None
    matricula: Optional[str] = None
    email_responsavel: Optional[str] = None

# Attendance Models
class AttendanceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_id: str
    date: str
    present_student_ids: List[str]
    count: int
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: str

class AttendanceCreate(BaseModel):
    class_id: str
    present_student_ids: List[str]

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
        # Get current registration token from DB
        config = await db.app_config.find_one({"key": "registration_token"}, {"_id": 0})
        current_token = config["value"] if config else REGISTRATION_TOKEN
        
        if user_data.registration_token != current_token:
            raise HTTPException(status_code=403, detail="Token de cadastro inválido")
        
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
    if current_user.role not in ("admin", "master"):
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
    if current_user.role not in ("admin", "master"):
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
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can view menus")
    
    menu = await db.weekly_menus.find_one({"week_start": week_start}, {"_id": 0})
    
    if not menu:
        return None
    
    if isinstance(menu.get('updated_at'), str):
        menu['updated_at'] = datetime.fromisoformat(menu['updated_at'])
    
    return menu

@api_router.get("/menu/all")
async def get_all_menus(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can view all menus")
    
    menus = await db.weekly_menus.find({}, {"_id": 0}).sort("week_start", -1).to_list(100)
    return menus

@api_router.post("/admin/reset-database")
async def reset_database(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can reset database")
    
    result = await db.daily_counts.delete_many({})
    return {"message": f"Database reset successfully. {result.deleted_count} meal counts have been cleared."}

@api_router.post("/admin/reset-user-accounts")
async def reset_user_accounts(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can reset user accounts")
    
    result = await db.users.delete_many({"role": {"$nin": ["admin", "master"]}})
    return {"message": f"User accounts reset successfully. {result.deleted_count} user accounts have been deleted."}

class CreateLeaderRequest(BaseModel):
    username: str
    password: str
    class_id: Optional[str] = None

@api_router.post("/admin/create-leader")
async def admin_create_leader(data: CreateLeaderRequest, current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can create leaders")
    
    existing = await db.users.find_one({"username": data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    if data.class_id:
        class_exists = await db.classes.find_one({"id": data.class_id})
        if not class_exists:
            raise HTTPException(status_code=400, detail="Invalid class ID")
    
    new_user = User(
        username=data.username,
        password_hash=get_password_hash(data.password),
        role="leader",
        class_id=data.class_id
    )
    await db.users.insert_one(new_user.model_dump())
    return {"message": "Leader created successfully", "id": new_user.id}

@api_router.get("/admin/users")
async def get_all_users(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can view users")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    user_to_delete = await db.users.find_one({"id": user_id})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_to_delete["role"] == "master":
        raise HTTPException(status_code=403, detail="Cannot delete master user")
    
    if user_to_delete["role"] == "admin" and current_user.role != "master":
        raise HTTPException(status_code=403, detail="Only master can delete admin users")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can edit users")
    
    user_to_edit = await db.users.find_one({"id": user_id})
    if not user_to_edit:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_fields = {}
    
    if data.username:
        existing = await db.users.find_one({"username": data.username, "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        update_fields["username"] = data.username
    
    if data.password:
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        update_fields["password_hash"] = get_password_hash(data.password)
    
    if data.class_id is not None:
        if data.class_id:
            class_exists = await db.classes.find_one({"id": data.class_id})
            if not class_exists:
                raise HTTPException(status_code=400, detail="Invalid class ID")
        update_fields["class_id"] = data.class_id
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await db.users.update_one({"id": user_id}, {"$set": update_fields})
    return {"message": "User updated successfully"}

# Master-only Routes
@api_router.get("/master/token")
async def get_registration_token(current_user: User = Depends(get_current_user)):
    if current_user.role != "master":
        raise HTTPException(status_code=403, detail="Only master can view token")
    config = await db.app_config.find_one({"key": "registration_token"}, {"_id": 0})
    return {"token": config["value"] if config else REGISTRATION_TOKEN}

@api_router.put("/master/token")
async def update_registration_token(data: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "master":
        raise HTTPException(status_code=403, detail="Only master can change token")
    new_token = data.get("token", "").strip()
    if not new_token:
        raise HTTPException(status_code=400, detail="Token cannot be empty")
    await db.app_config.update_one(
        {"key": "registration_token"},
        {"$set": {"value": new_token}},
        upsert=True
    )
    return {"message": "Token updated successfully", "token": new_token}

# Gallery Routes
@api_router.post("/gallery/upload")
async def upload_gallery_photo(
    file: UploadFile = File(...),
    caption: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "master"):
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
    if current_user.role not in ("admin", "master"):
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
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can delete photos")
    
    result = await db.gallery_photos.delete_one({"id": photo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return {"message": "Photo deleted successfully"}

# Queue Schedule Routes
@api_router.post("/queue/schedule")
async def create_or_update_queue_schedule(schedule_data: QueueScheduleCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can manage queue schedules")
    
    existing = await db.queue_schedules.find_one({"week_start": schedule_data.week_start})
    
    if existing:
        await db.queue_schedules.update_one(
            {"week_start": schedule_data.week_start},
            {"$set": {
                "schedule": schedule_data.schedule,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Queue schedule updated successfully"}
    else:
        new_schedule = QueueSchedule(**schedule_data.model_dump())
        doc = new_schedule.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.queue_schedules.insert_one(doc)
        return {"message": "Queue schedule created successfully"}

@api_router.get("/queue/current")
async def get_current_queue_schedule():
    # Public endpoint - get current week schedule
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    week_start = monday.isoformat()
    
    schedule = await db.queue_schedules.find_one({"week_start": week_start}, {"_id": 0})
    
    if not schedule:
        return None
    
    if isinstance(schedule.get('updated_at'), str):
        schedule['updated_at'] = datetime.fromisoformat(schedule['updated_at'])
    
    return schedule

@api_router.get("/queue/by-week/{week_start}")
async def get_queue_by_week(week_start: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can view queue schedules")
    
    schedule = await db.queue_schedules.find_one({"week_start": week_start}, {"_id": 0})
    
    if not schedule:
        return None
    
    if isinstance(schedule.get('updated_at'), str):
        schedule['updated_at'] = datetime.fromisoformat(schedule['updated_at'])
    
    return schedule

# Student CRUD Routes
@api_router.post("/students")
async def create_student(student_data: StudentCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can manage students")
    
    class_exists = await db.classes.find_one({"id": student_data.class_id})
    if not class_exists:
        raise HTTPException(status_code=400, detail="Invalid class ID")
    
    new_student = Student(**student_data.model_dump())
    await db.students.insert_one(new_student.model_dump())
    return {"message": "Student created successfully", "id": new_student.id}

@api_router.get("/students")
async def get_students(class_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if class_id:
        query["class_id"] = class_id
    students = await db.students.find(query, {"_id": 0}).sort("name", 1).to_list(5000)
    return students

@api_router.put("/students/{student_id}")
async def update_student(student_id: str, student_data: StudentUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can manage students")
    
    update_fields = {k: v for k, v in student_data.model_dump().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    if "class_id" in update_fields:
        class_exists = await db.classes.find_one({"id": update_fields["class_id"]})
        if not class_exists:
            raise HTTPException(status_code=400, detail="Invalid class ID")
    
    result = await db.students.update_one({"id": student_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student updated successfully"}

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can manage students")
    
    result = await db.students.delete_one({"id": student_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deleted successfully"}

@api_router.post("/students/bulk")
async def create_students_bulk(students: List[StudentCreate], current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can manage students")
    
    created = 0
    for s in students:
        class_exists = await db.classes.find_one({"id": s.class_id})
        if class_exists:
            new_student = Student(**s.model_dump())
            await db.students.insert_one(new_student.model_dump())
            created += 1
    return {"message": f"{created} students created successfully"}

@api_router.post("/students/import-csv")
async def import_students_csv(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can import students")
    
    content = await file.read()
    # Try utf-8-sig first (handles BOM), then latin-1
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    
    reader = csv.reader(io.StringIO(text), delimiter=';')
    
    # Get all classes for matching - support multiple formats
    all_classes = await db.classes.find({}, {"_id": 0}).to_list(1000)
    class_map = {}
    for c in all_classes:
        full_name = c["name"].strip().lower()
        class_map[full_name] = c["id"]
        # Extract number part (e.g. "Turma 100" -> "100")
        parts = full_name.split()
        if len(parts) > 1:
            class_map[parts[-1]] = c["id"]
    
    created = 0
    skipped = 0
    errors = []
    header_skipped = False
    
    for row_num, row in enumerate(reader, 1):
        if len(row) < 2:
            continue
        
        # Clean fields
        fields = [f.strip() for f in row]
        
        # Skip header row
        if not header_skipped:
            first = fields[0].lower()
            if first in ("turma", "classe", "class", "sala"):
                header_skipped = True
                continue
            header_skipped = True
        
        turma_name = fields[0]
        nome = fields[1]
        matricula = fields[2] if len(fields) > 2 and fields[2] else None
        email_responsavel = fields[3] if len(fields) > 3 and fields[3] else None
        
        if not turma_name or not nome:
            skipped += 1
            continue
        
        # Match class by name (case-insensitive)
        class_id = class_map.get(turma_name.strip().lower())
        if not class_id:
            errors.append(f"Linha {row_num}: Turma '{turma_name}' não encontrada")
            skipped += 1
            continue
        
        new_student = Student(name=nome, class_id=class_id, matricula=matricula, email_responsavel=email_responsavel)
        await db.students.insert_one(new_student.model_dump())
        created += 1
    
    return {
        "message": f"{created} aluno(s) importado(s) com sucesso",
        "created": created,
        "skipped": skipped,
        "errors": errors
    }

# Attendance Routes
@api_router.post("/attendance")
async def submit_attendance(data: AttendanceCreate, current_user: User = Depends(get_current_user)):
    if current_user.role == "leader" and data.class_id != current_user.class_id:
        raise HTTPException(status_code=403, detail="You can only update your own class")
    
    today = date.today().isoformat()
    count = len(data.present_student_ids)
    
    existing = await db.attendance.find_one({"class_id": data.class_id, "date": today})
    
    if existing:
        await db.attendance.update_one(
            {"class_id": data.class_id, "date": today},
            {"$set": {
                "present_student_ids": data.present_student_ids,
                "count": count,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": current_user.username
            }}
        )
    else:
        record = AttendanceRecord(
            class_id=data.class_id,
            date=today,
            present_student_ids=data.present_student_ids,
            count=count,
            updated_by=current_user.username
        )
        doc = record.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.attendance.insert_one(doc)
    
    # Also update daily_counts for backward compat with admin dashboard
    existing_count = await db.daily_counts.find_one({"class_id": data.class_id, "date": today})
    if existing_count:
        await db.daily_counts.update_one(
            {"class_id": data.class_id, "date": today},
            {"$set": {
                "count": count,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": current_user.username
            }}
        )
    else:
        new_count = DailyCount(
            class_id=data.class_id,
            date=today,
            count=count,
            updated_by=current_user.username
        )
        doc = new_count.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.daily_counts.insert_one(doc)
    
    # Send emails to parents of present students via Gmail SMTP
    emails_sent = 0
    email_errors = []
    if data.present_student_ids and GMAIL_EMAIL and GMAIL_PASSWORD:
        class_info = await db.classes.find_one({"id": data.class_id}, {"_id": 0})
        class_name = class_info["name"] if class_info else "Turma"
        today_formatted = datetime.now().strftime("%d/%m/%Y")
        
        present_students = await db.students.find(
            {"id": {"$in": data.present_student_ids}, "email_responsavel": {"$ne": None}},
            {"_id": 0}
        ).to_list(5000)
        
        students_to_email = [(s["name"], s.get("email_responsavel", "").strip()) for s in present_students if s.get("email_responsavel", "").strip()]
        
        if students_to_email:
            def send_gmail_batch():
                sent = 0
                errs = []
                try:
                    server = smtplib.SMTP("smtp.gmail.com", 587)
                    server.starttls()
                    server.login(GMAIL_EMAIL, GMAIL_PASSWORD)
                    
                    for student_name, recipient_email in students_to_email:
                        try:
                            msg = MIMEMultipart("alternative")
                            msg["From"] = GMAIL_EMAIL
                            msg["To"] = recipient_email
                            msg["Subject"] = f"Presença confirmada - {student_name} - {today_formatted}"
                            
                            html_body = f"""
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <div style="background: linear-gradient(135deg, #4DD0E1, #00BCD4); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                                    <h1 style="color: white; margin: 0; font-size: 22px;">IEMA Pleno Matões</h1>
                                    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Controle de Presença</p>
                                </div>
                                <div style="background: #ffffff; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
                                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                                        Prezado(a) responsável,
                                    </p>
                                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                                        Informamos que o(a) aluno(a) <strong>{student_name}</strong> 
                                        da <strong>{class_name}</strong> está presente na escola hoje, 
                                        <strong>{today_formatted}</strong>.
                                    </p>
                                    <div style="background: #E8F5E9; border-left: 4px solid #4CAF50; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
                                        <p style="color: #2E7D32; margin: 0; font-weight: bold;">Presença Confirmada</p>
                                    </div>
                                    <p style="color: #666; font-size: 14px; margin-top: 20px;">
                                        Atenciosamente,<br>
                                        <strong>Gestão Escolar - IEMA Pleno Matões</strong>
                                    </p>
                                </div>
                            </div>
                            """
                            msg.attach(MIMEText(html_body, "html"))
                            server.sendmail(GMAIL_EMAIL, recipient_email, msg.as_string())
                            sent += 1
                        except Exception as e:
                            errs.append(f"{recipient_email}: {str(e)}")
                    
                    server.quit()
                except Exception as e:
                    errs.append(f"SMTP connection error: {str(e)}")
                return sent, errs
            
            emails_sent, email_errors = await asyncio.to_thread(send_gmail_batch)
            for err in email_errors:
                logger.error(f"Email error: {err}")
    
    return {"message": "Attendance submitted successfully", "count": count, "emails_sent": emails_sent}

@api_router.get("/attendance/today")
async def get_today_attendance(class_id: str, current_user: User = Depends(get_current_user)):
    today = date.today().isoformat()
    record = await db.attendance.find_one({"class_id": class_id, "date": today}, {"_id": 0})
    if not record:
        return {"present_student_ids": [], "count": 0}
    return {
        "present_student_ids": record.get("present_student_ids", []),
        "count": record.get("count", 0),
        "updated_at": record.get("updated_at"),
        "updated_by": record.get("updated_by")
    }

@api_router.get("/attendance/report")
async def get_attendance_report(
    period: str = "monthly",
    class_id: Optional[str] = None,
    student_id: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ("admin", "master"):
        raise HTTPException(status_code=403, detail="Only admins can view reports")
    
    today = date.today()
    
    if start and end:
        start_date = start
        end_date = end
    elif period == "monthly":
        start_date = today.replace(day=1).isoformat()
        end_date = today.isoformat()
    elif period == "semester":
        # First semester: Jan-Jun, Second: Jul-Dec
        if today.month <= 6:
            start_date = today.replace(month=1, day=1).isoformat()
        else:
            start_date = today.replace(month=7, day=1).isoformat()
        end_date = today.isoformat()
    else:
        start_date = today.replace(month=1, day=1).isoformat()
        end_date = today.isoformat()
    
    # Get students
    student_query = {}
    if class_id:
        student_query["class_id"] = class_id
    if student_id:
        student_query["id"] = student_id
    
    students = await db.students.find(student_query, {"_id": 0}).sort("name", 1).to_list(5000)
    
    if not students:
        return {"students": [], "period": period, "start_date": start_date, "end_date": end_date}
    
    # Get all classes for names
    all_classes = await db.classes.find({}, {"_id": 0}).to_list(1000)
    class_names = {c["id"]: c["name"] for c in all_classes}
    
    # Group students by class to count school days per class
    class_ids = list(set(s["class_id"] for s in students))
    
    # Get attendance records in the period per class
    attendance_records = await db.attendance.find(
        {"date": {"$gte": start_date, "$lte": end_date}, "class_id": {"$in": class_ids}},
        {"_id": 0}
    ).to_list(50000)
    
    # Count school days per class (days where attendance was taken)
    school_days_per_class = {}
    # Map: (class_id, date) -> set of present student ids
    attendance_map = {}
    for rec in attendance_records:
        cid = rec["class_id"]
        d = rec["date"]
        if cid not in school_days_per_class:
            school_days_per_class[cid] = set()
        school_days_per_class[cid].add(d)
        attendance_map[(cid, d)] = set(rec.get("present_student_ids", []))
    
    result = []
    for student in students:
        sid = student["id"]
        cid = student["class_id"]
        total_days = len(school_days_per_class.get(cid, set()))
        
        if total_days == 0:
            present_days = 0
            presence_pct = 0.0
            absence_pct = 0.0
        else:
            present_days = 0
            for d in school_days_per_class.get(cid, set()):
                if sid in attendance_map.get((cid, d), set()):
                    present_days += 1
            presence_pct = round((present_days / total_days) * 100, 1)
            absence_pct = round(100 - presence_pct, 1)
        
        result.append({
            "student_id": sid,
            "name": student["name"],
            "matricula": student.get("matricula"),
            "class_id": cid,
            "class_name": class_names.get(cid, ""),
            "total_days": total_days,
            "present_days": present_days,
            "absent_days": total_days - present_days,
            "presence_pct": presence_pct,
            "absence_pct": absence_pct,
            "alert": absence_pct >= 26
        })
    
    # Sort by absence percentage descending (most critical first)
    result.sort(key=lambda x: x["absence_pct"], reverse=True)
    
    return {
        "students": result,
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
        "total_students": len(result),
        "alert_count": sum(1 for r in result if r["alert"])
    }

app.include_router(api_router)

# Seed master user on startup
@app.on_event("startup")
async def seed_master_user():
    existing = await db.users.find_one({"username": MASTER_USERNAME})
    if not existing:
        master = User(
            username=MASTER_USERNAME,
            password_hash=get_password_hash(MASTER_PASSWORD),
            role="master"
        )
        await db.users.insert_one(master.model_dump())
        logger.info("Master user created")
    else:
        # Ensure role is master and password is up to date
        await db.users.update_one(
            {"username": MASTER_USERNAME},
            {"$set": {"role": "master", "password_hash": get_password_hash(MASTER_PASSWORD)}}
        )
    # Seed default registration token if not exists
    config = await db.app_config.find_one({"key": "registration_token"})
    if not config:
        await db.app_config.insert_one({"key": "registration_token", "value": REGISTRATION_TOKEN})

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
