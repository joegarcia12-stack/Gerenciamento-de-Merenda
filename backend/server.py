from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date
from passlib.context import CryptContext
import jwt
from jwt import PyJWTError

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

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: str  # "leader" or "admin"
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
    grade: str
    shift: str  # "manhã" or "tarde"
    leader_user_id: Optional[str] = None

class ClassCreate(BaseModel):
    name: str
    grade: str
    shift: str

class DailyCount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_id: str
    date: str  # YYYY-MM-DD
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
    grade: str
    shift: str
    date: str
    count: int
    updated_at: datetime

class DashboardSummary(BaseModel):
    date: str
    total_meals: int
    total_classes: int
    counts_by_shift: dict
    class_details: List[DailyCountResponse]

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
    # Check if user exists
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        class_id=user_data.class_id
    )
    
    await db.users.insert_one(user.model_dump())
    return {"message": "User created successfully", "id": user.id}

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"username": login_data.username}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return LoginResponse(
        token=token,
        role=user["role"],
        username=user["username"],
        class_id=user.get("class_id")
    )

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "class_id": current_user.class_id
    }

@api_router.post("/classes")
async def create_class(class_data: ClassCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create classes")
    
    new_class = Class(**class_data.model_dump())
    await db.classes.insert_one(new_class.model_dump())
    return new_class

@api_router.get("/classes", response_model=List[Class])
async def get_classes(current_user: User = Depends(get_current_user)):
    classes = await db.classes.find({}, {"_id": 0}).to_list(1000)
    return classes

@api_router.post("/counts")
async def create_or_update_count(count_data: DailyCountCreate, current_user: User = Depends(get_current_user)):
    # Leaders can only update their own class
    if current_user.role == "leader" and count_data.class_id != current_user.class_id:
        raise HTTPException(status_code=403, detail="You can only update your own class")
    
    today = date.today().isoformat()
    
    # Check if count already exists for today
    existing = await db.daily_counts.find_one({
        "class_id": count_data.class_id,
        "date": today
    })
    
    if existing:
        # Update existing count
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
        # Create new count
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
    
    # Get all counts for today
    counts = await db.daily_counts.find({"date": today}, {"_id": 0}).to_list(1000)
    
    # Enrich with class information
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
                grade=class_info["grade"],
                shift=class_info["shift"],
                date=count["date"],
                count=count["count"],
                updated_at=count["updated_at"]
            ))
    
    return result

@api_router.get("/counts/history")
async def get_counts_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}
    
    counts = await db.daily_counts.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Enrich with class information
    result = []
    for count in counts:
        class_info = await db.classes.find_one({"id": count["class_id"]}, {"_id": 0})
        if class_info:
            if isinstance(count['updated_at'], str):
                count['updated_at'] = datetime.fromisoformat(count['updated_at'])
            result.append({
                "id": count["id"],
                "class_id": count["class_id"],
                "class_name": class_info["name"],
                "grade": class_info["grade"],
                "shift": class_info["shift"],
                "date": count["date"],
                "count": count["count"],
                "updated_at": count["updated_at"].isoformat()
            })
    
    return result

@api_router.get("/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(target_date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access dashboard")
    
    if not target_date:
        target_date = date.today().isoformat()
    
    # Get all counts for the date
    counts = await db.daily_counts.find({"date": target_date}, {"_id": 0}).to_list(1000)
    
    total_meals = sum(c["count"] for c in counts)
    total_classes = len(counts)
    
    counts_by_shift = {"manhã": 0, "tarde": 0}
    class_details = []
    
    for count in counts:
        class_info = await db.classes.find_one({"id": count["class_id"]}, {"_id": 0})
        if class_info:
            counts_by_shift[class_info["shift"]] += count["count"]
            if isinstance(count['updated_at'], str):
                count['updated_at'] = datetime.fromisoformat(count['updated_at'])
            class_details.append(DailyCountResponse(
                id=count["id"],
                class_id=count["class_id"],
                class_name=class_info["name"],
                grade=class_info["grade"],
                shift=class_info["shift"],
                date=count["date"],
                count=count["count"],
                updated_at=count["updated_at"]
            ))
    
    return DashboardSummary(
        date=target_date,
        total_meals=total_meals,
        total_classes=total_classes,
        counts_by_shift=counts_by_shift,
        class_details=class_details
    )

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