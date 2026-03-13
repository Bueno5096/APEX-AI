from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'coach_db')]

# LLM Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Create the main app
app = FastAPI(title="Coach AI Fitness API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ Models ============

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class ChatContext(BaseModel):
    recoveryScore: Optional[int] = None
    sleepDuration: Optional[float] = None
    hrv: Optional[int] = None
    coachStyle: Optional[str] = "neutral"
    userProfile: Optional[Dict[str, Any]] = None
    activeWorkout: Optional[str] = None
    currentExercise: Optional[str] = None
    workoutExercises: Optional[List[Dict[str, Any]]] = None
    secondaryGoal: Optional[Dict[str, Any]] = None
    generatedPlan: Optional[Dict[str, Any]] = None

class ConversationMessage(BaseModel):
    role: str  # 'user' or 'coach'
    content: str

class ChatRequest(BaseModel):
    message: str
    context: Optional[ChatContext] = None
    session_id: Optional[str] = None
    conversation_history: Optional[List[ConversationMessage]] = None

class WorkoutAction(BaseModel):
    type: str  # swap_exercise, modify_exercise, adjust_rest, skip_exercise
    exercise_id: Optional[str] = None
    exercise_name: Optional[str] = None
    new_exercise_name: Optional[str] = None
    new_sets: Optional[int] = None
    new_reps: Optional[str] = None
    new_weight: Optional[float] = None
    new_rest_seconds: Optional[int] = None
    target_muscles: Optional[List[str]] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    actions: Optional[List[Dict[str, Any]]] = None

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # 'user' or 'coach'
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    height: int  # cm
    weight: float  # kg
    age: int
    body_fat: Optional[float] = None
    training_experience: str  # beginner, intermediate, advanced
    fitness_goals: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WorkoutLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    workout_name: str
    exercises: List[Dict[str, Any]]
    duration_minutes: int
    intensity: str
    notes: Optional[str] = None
    completed_at: datetime = Field(default_factory=datetime.utcnow)

class RecoveryLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    score: int
    sleep_duration: float
    sleep_score: int
    hrv: int
    resting_heart_rate: int
    steps: int
    logged_at: datetime = Field(default_factory=datetime.utcnow)

# ============ Helper Functions ============

def get_coach_system_prompt(style: str, context: Optional[ChatContext] = None) -> str:
    """Generate system prompt based on coach style and user context"""
    
    base_prompt = """You are COACH, an advanced AI fitness coaching system. You are a scientifically grounded, personalized fitness coach who provides evidence-based training recommendations.

CRITICAL RULE - BE CONCISE:
- Keep responses SHORT: 2-4 sentences max for simple questions, 4-6 for complex ones.
- Use bullet points instead of paragraphs when listing things.
- No filler words, no lengthy explanations unless the user explicitly asks for more detail.
- Get straight to the actionable advice.

Your core principles:
- Provide concise, actionable recommendations rooted in exercise science
- Adapt workout intensity based on recovery state
- Avoid training heavily fatigued muscle groups
- Prioritize safety when detecting soreness, pain, injury, poor sleep, or fatigue
- Never give dangerous or unqualified medical advice

Your capabilities:
- Recommend and modify workouts based on user context
- Analyze recovery and provide insights
- Suggest exercise substitutions
- Give progress insights
- Answer nutrition and fitness questions practically

IMPORTANT - WORKOUT MODIFICATIONS:
When the user asks you to change, swap, modify, add, or remove exercises, sets, reps, weight, or rest time, you MUST include a JSON action block at the end of your response. The format is:

[ACTIONS]
[{"type": "modify_exercise", "exercise_name": "Bench Press", "new_sets": 3, "new_reps": "10-12", "new_weight": 70}]
[/ACTIONS]

Available action types:
- "set_workout": Set/create an entire workout plan. Include "workout_type" (one of: "push", "pull", "legs", "upper", "lower", "full", "light", "rest") and optionally "title" (custom title string). Use this when the user asks to create, generate, or switch to a new workout.
- "swap_exercise": Replace an exercise. Include "exercise_name" (current) and "new_exercise_name", "new_sets", "new_reps", "new_weight", "target_muscles" (array)
- "modify_exercise": Change sets/reps/weight. Include "exercise_name" and any of "new_sets", "new_reps", "new_weight"
- "adjust_rest": Change rest time. Include "new_rest_seconds"
- "skip_exercise": Skip current exercise. Include "exercise_name"

CRITICAL: When the user asks you to create, build, generate, or set up a workout, you MUST include a "set_workout" action. This is how workouts get applied. Always provide your coaching explanation FIRST, then the action block. Only include actions when the user explicitly asks for changes or a new workout. For general questions or advice, do NOT include actions.

If the user says "explain more" or asks for a deeper explanation, THEN provide a thorough, detailed response about the previous topic."""

    style_prompts = {
        "neutral": "\n\nCommunication style: Professional and balanced. Provide clear, informative responses.",
        "direct": "\n\nCommunication style: Short and performance-focused. Be concise, use bullet points when helpful, get straight to the point.",
        "supportive": "\n\nCommunication style: Encouraging and motivating. Acknowledge effort, celebrate progress, provide positive reinforcement."
    }
    
    context_info = ""
    if context:
        context_info = "\n\nCurrent user context:"
        if context.recoveryScore is not None:
            context_info += f"\n- Recovery Score: {context.recoveryScore}%"
            if context.recoveryScore >= 75:
                context_info += " (Well recovered, ready for intense training)"
            elif context.recoveryScore >= 50:
                context_info += " (Moderate recovery, standard training ok)"
            else:
                context_info += " (Low recovery, recommend light activity or rest)"
        
        if context.sleepDuration is not None:
            context_info += f"\n- Sleep: {context.sleepDuration} hours"
        
        if context.hrv is not None:
            context_info += f"\n- HRV: {context.hrv}ms"
        
        if context.activeWorkout:
            context_info += f"\n- Active Workout: {context.activeWorkout}"
        
        if context.currentExercise:
            context_info += f"\n- Current Exercise: {context.currentExercise}"
        
        if context.workoutExercises:
            context_info += "\n- Workout Program:"
            for ex in context.workoutExercises:
                context_info += f"\n  • {ex.get('name', 'Unknown')}: {ex.get('sets', '?')} sets × {ex.get('reps', '?')} @ {ex.get('weight', '?')}kg"
        
        if context.userProfile:
            profile = context.userProfile
            if profile.get('name'):
                context_info += f"\n- User: {profile.get('name')}"
            if profile.get('trainingExperience'):
                context_info += f"\n- Experience: {profile.get('trainingExperience')}"
            if profile.get('fitnessGoals'):
                context_info += f"\n- Goals: {', '.join(profile.get('fitnessGoals', []))}"
        
        # Secondary goal awareness - Goal Layering
        if context.secondaryGoal and context.secondaryGoal.get('isActive'):
            sg = context.secondaryGoal
            goal_type = sg.get('type', '')
            target = sg.get('targetValue', 0)
            starting = sg.get('startingValue', 0)
            current = sg.get('currentValue', 0)
            weeks = sg.get('timeframeWeeks', 0)
            start_date = sg.get('startDate', '')
            
            context_info += f"\n\n--- ACTIVE GOAL LAYERING ---"
            context_info += f"\n- Secondary Goal: {goal_type.replace('_', ' ').title()}"
            context_info += f"\n- Target: {target}, Starting: {starting}, Current: {current}"
            context_info += f"\n- Timeframe: {weeks} weeks from {start_date}"
            context_info += f"\n- You MUST consider both the primary and secondary goals in all training advice."
            context_info += f"\n- Keep all advice purely physical training. NO nutrition, diet, or calorie advice."
            context_info += f"\n--- END GOAL LAYERING ---"
    
    return base_prompt + style_prompts.get(style, style_prompts["neutral"]) + context_info

# ============ Routes ============

@api_router.get("/")
async def root():
    return {"message": "Coach AI Fitness API", "status": "online"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Status endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    await db.status_checks.insert_one(status_obj.model_dump())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**sc) for sc in status_checks]

# Coach Chat endpoint
@api_router.post("/coach/chat", response_model=ChatResponse)
async def coach_chat(request: ChatRequest):
    """Main AI Coach chat endpoint"""
    try:
        # Get or create session ID
        session_id = request.session_id or str(uuid.uuid4())
        
        # Get coach style from context
        coach_style = request.context.coachStyle if request.context else "neutral"
        
        # Generate system prompt
        system_prompt = get_coach_system_prompt(coach_style, request.context)
        
        # Get API key
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        # Build conversation history from frontend (preferred) or fallback to DB
        history_context = ""
        if request.conversation_history and len(request.conversation_history) > 0:
            # Use conversation history sent directly from the frontend
            history_context = "\n\n--- CONVERSATION HISTORY (remember this context) ---"
            for msg in request.conversation_history[-20:]:  # Last 20 messages
                role = "User" if msg.role == 'user' else "Coach"
                history_context += f"\n{role}: {msg.content}"
            history_context += "\n--- END OF HISTORY ---"
            logger.info(f"Using frontend conversation history: {len(request.conversation_history)} messages")
        else:
            # Fallback: Load previous messages from database
            previous_messages = await db.chat_messages.find(
                {"session_id": session_id}
            ).sort("timestamp", -1).limit(20).to_list(20)
            
            if previous_messages:
                history_context = "\n\n--- CONVERSATION HISTORY (remember this context) ---"
                for msg in reversed(previous_messages):
                    role = "User" if msg['role'] == 'user' else "Coach"
                    history_context += f"\n{role}: {msg['content']}"
                history_context += "\n--- END OF HISTORY ---"
                logger.info(f"Using DB conversation history: {len(previous_messages)} messages")
        
        # Initialize chat with full system prompt including history
        full_system_prompt = system_prompt + history_context
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=full_system_prompt
        )
        
        chat.with_model("anthropic", "claude-sonnet-4-6")
        
        # Create user message
        user_message = UserMessage(text=request.message)
        
        # Send message and get response
        response = await chat.send_message(user_message)
        
        # Parse actions from response if present
        actions = None
        clean_response = response
        if '[ACTIONS]' in response and '[/ACTIONS]' in response:
            try:
                import json as json_module
                action_start = response.index('[ACTIONS]') + len('[ACTIONS]')
                action_end = response.index('[/ACTIONS]')
                action_json = response[action_start:action_end].strip()
                actions = json_module.loads(action_json)
                clean_response = response[:response.index('[ACTIONS]')].strip()
                logger.info(f"Parsed {len(actions)} workout actions")
            except Exception as parse_error:
                logger.warning(f"Failed to parse actions: {parse_error}")
                clean_response = response.replace('[ACTIONS]', '').replace('[/ACTIONS]', '').strip()
        
        # Store user message in database
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.message
        )
        await db.chat_messages.insert_one(user_msg.model_dump())
        
        # Store coach response in database
        coach_msg = ChatMessage(
            session_id=session_id,
            role="coach",
            content=clean_response
        )
        await db.chat_messages.insert_one(coach_msg.model_dump())
        
        logger.info(f"Coach chat completed for session {session_id}")
        
        return ChatResponse(response=clean_response, session_id=session_id, actions=actions)
        
    except Exception as e:
        logger.error(f"Coach chat error: {str(e)}")
        # Return a fallback response
        fallback_responses = {
            "neutral": "I'm experiencing a temporary connection issue. Please try again in a moment.",
            "direct": "Connection issue. Retry shortly.",
            "supportive": "I'm having a brief technical hiccup, but don't worry - try again in just a moment!"
        }
        coach_style = request.context.coachStyle if request.context else "neutral"
        return ChatResponse(
            response=fallback_responses.get(coach_style, fallback_responses["neutral"]),
            session_id=request.session_id or str(uuid.uuid4())
        )

# Chat history endpoint
@api_router.get("/coach/history/{session_id}")
async def get_chat_history(session_id: str, limit: int = 50):
    """Get chat history for a session"""
    messages = await db.chat_messages.find(
        {"session_id": session_id}
    ).sort("timestamp", 1).limit(limit).to_list(limit)
    
    return {"session_id": session_id, "messages": messages}

# User Profile endpoints
@api_router.post("/profile", response_model=UserProfile)
async def create_profile(profile: UserProfile):
    await db.profiles.insert_one(profile.model_dump())
    return profile

@api_router.get("/profile/{user_id}", response_model=UserProfile)
async def get_profile(user_id: str):
    profile = await db.profiles.find_one({"id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return UserProfile(**profile)

@api_router.put("/profile/{user_id}", response_model=UserProfile)
async def update_profile(user_id: str, profile_update: Dict[str, Any]):
    profile_update["updated_at"] = datetime.utcnow()
    result = await db.profiles.update_one(
        {"id": user_id},
        {"$set": profile_update}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    profile = await db.profiles.find_one({"id": user_id})
    return UserProfile(**profile)

# Workout logging endpoints
@api_router.post("/workout/log", response_model=WorkoutLog)
async def log_workout(workout: WorkoutLog):
    await db.workout_logs.insert_one(workout.model_dump())
    return workout

@api_router.get("/workout/history/{user_id}")
async def get_workout_history(user_id: str, limit: int = 30):
    workouts = await db.workout_logs.find(
        {"user_id": user_id}
    ).sort("completed_at", -1).limit(limit).to_list(limit)
    return {"user_id": user_id, "workouts": workouts}

# Recovery logging endpoints
@api_router.post("/recovery/log", response_model=RecoveryLog)
async def log_recovery(recovery: RecoveryLog):
    await db.recovery_logs.insert_one(recovery.model_dump())
    return recovery

@api_router.get("/recovery/history/{user_id}")
async def get_recovery_history(user_id: str, limit: int = 30):
    logs = await db.recovery_logs.find(
        {"user_id": user_id}
    ).sort("logged_at", -1).limit(limit).to_list(limit)
    return {"user_id": user_id, "recovery_logs": logs}

# Analytics endpoints
@api_router.get("/analytics/{user_id}")
async def get_analytics(user_id: str, days: int = 30):
    """Get user analytics for the specified period"""
    from_date = datetime.utcnow() - timedelta(days=days)
    
    # Get workout stats
    workout_count = await db.workout_logs.count_documents({
        "user_id": user_id,
        "completed_at": {"$gte": from_date}
    })
    
    # Get recovery average
    recovery_logs = await db.recovery_logs.find({
        "user_id": user_id,
        "logged_at": {"$gte": from_date}
    }).to_list(1000)
    
    avg_recovery = 0
    if recovery_logs:
        avg_recovery = sum(log['score'] for log in recovery_logs) / len(recovery_logs)
    
    return {
        "user_id": user_id,
        "period_days": days,
        "workout_count": workout_count,
        "avg_recovery_score": round(avg_recovery, 1),
        "recovery_entries": len(recovery_logs)
    }

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Import for analytics
from datetime import timedelta
