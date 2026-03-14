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
    # ─── New comprehensive data fields ───
    bodyComposition: Optional[Dict[str, Any]] = None      # BF%, Lean BMI, FFMI, TDEE, etc.
    bodyCompHistory: Optional[List[Dict[str, Any]]] = None # Last 3 entries for trend
    muscleReadiness: Optional[List[Dict[str, Any]]] = None # Per-muscle recovery data
    strengthProgress: Optional[Dict[str, Any]] = None      # Gains, PRs, streak, workouts
    goalLayeringActive: Optional[bool] = False
    unitSystem: Optional[str] = "imperial"                 # "imperial" or "metric"
    fullWorkoutPlan: Optional[List[Dict[str, Any]]] = None # Full exercises in current workout

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
    """Generate the fully personalized system prompt with ALL user data"""

    # ─── Extract profile data ───
    p = context.userProfile if context and context.userProfile else {}
    name = p.get('name', 'Athlete')
    age = p.get('age', 'Unknown')
    gender = p.get('gender', 'Unknown')
    height_cm = p.get('height', 0)
    weight_kg = p.get('weight', 0)
    primary_goal = ', '.join(p.get('fitnessGoals', [])) or 'Not set'
    experience = p.get('trainingExperience', 'Unknown')
    training_days = p.get('trainingDaysPerWeek', 'Unknown')
    workout_style = p.get('workoutLocation', 'Unknown')
    injuries = p.get('injuries') or 'None'

    # ─── Determine unit system for display (must be before bc_block) ───
    unit_sys = context.unitSystem if context and context.unitSystem else 'imperial'
    if unit_sys == 'imperial':
        unit_instruction = "Always refer to measurements in Imperial units: use lbs for weight, feet and inches for height (e.g. 5'10\"), and inches for circumference measurements."
        weight_display = f"{round(weight_kg * 2.20462, 1)} lbs" if weight_kg else "Unknown"
        height_display = f"{int(height_cm / 2.54 / 12)}'{round(height_cm / 2.54 % 12)}\"" if height_cm else "Unknown"
    else:
        unit_instruction = "Always refer to measurements in Metric units: use kg for weight, cm for height and circumference measurements."
        weight_display = f"{weight_kg} kg" if weight_kg else "Unknown"
        height_display = f"{height_cm} cm" if height_cm else "Unknown"

    # ─── Extract body composition data ───
    bc = context.bodyComposition if context and context.bodyComposition else None
    if bc and bc.get('hasCalculated'):
        bf_pct = bc.get('bodyFatPercent', 'Not yet measured')
        bf_cat = bc.get('bodyFatCategory', '')
        lean_bmi = bc.get('leanBMI', 'Not yet measured')
        lean_bmi_cat = bc.get('leanBMICategory', '')
        ffmi_val = bc.get('ffmi', 'Not yet measured')
        ffmi_cat = bc.get('ffmiCategory', '')
        tdee = bc.get('tdee', 'Not yet measured')
        # Display weights in user's unit
        ideal_min_kg = bc.get('idealWeightMinKg', 0)
        ideal_max_kg = bc.get('idealWeightMaxKg', 0)
        lean_kg = bc.get('leanMassKg', 0)
        fat_kg = bc.get('fatMassKg', 0)
        if unit_sys == 'imperial':
            ideal_range = f"{round(ideal_min_kg * 2.20462, 1)} lbs to {round(ideal_max_kg * 2.20462, 1)} lbs"
            lean_display = f"{round(lean_kg * 2.20462, 1)} lbs"
            fat_display = f"{round(fat_kg * 2.20462, 1)} lbs"
        else:
            ideal_range = f"{ideal_min_kg} kg to {ideal_max_kg} kg"
            lean_display = f"{lean_kg} kg"
            fat_display = f"{fat_kg} kg"
        m2f_ratio = bc.get('muscleToFatRatio', 'Not yet measured')
        m2f_cat = bc.get('muscleToFatCategory', '')
        last_measured = bc.get('lastUpdated', 'Unknown')
        bc_trend = bc.get('trend', 'Not enough data')
        bc_block = f"""
THEIR PHYSICAL PROFILE:
- Height: {height_display}
- Weight: {weight_display}
- Body Fat: {bf_pct}% ({bf_cat})
- Lean BMI: {lean_bmi} ({lean_bmi_cat})
- FFMI: {ffmi_val} ({ffmi_cat})
- Lean Mass: {lean_display}
- Fat Mass: {fat_display}
- Muscle to Fat Ratio: {m2f_ratio} ({m2f_cat})
- TDEE: {tdee} calories/day
- Ideal Weight Range: {ideal_range}
- Body composition trend: {bc_trend} over last 3 measurements
- Last measured: {last_measured}"""
    else:
        bc_block = f"""
THEIR PHYSICAL PROFILE:
- Height: {height_display}
- Weight: {weight_display}
- Body Fat: Not yet measured (user has not completed body composition analysis)
- Lean BMI: Not yet measured
- FFMI: Not yet measured
- TDEE: Not yet measured
- Ideal Weight Range: Not yet measured"""

    # ─── Extract goal data ───
    sg = context.secondaryGoal if context and context.secondaryGoal else None
    if sg and sg.get('isActive'):
        sg_type = sg.get('type', '').replace('_', ' ').title()
        sg_target = sg.get('targetValue', '?')
        sg_starting = sg.get('startingValue', '?')
        sg_current = sg.get('currentValue', '?')
        sg_weeks = sg.get('timeframeWeeks', '?')
        sg_start_date = sg.get('startDate', 'Unknown')
        goals_block = f"""
THEIR GOALS:
- Primary Goal: {primary_goal}
- Secondary Goal: {sg_type}
- Target: {sg_target}, Starting: {sg_starting}, Current: {sg_current}
- Timeframe: {sg_weeks} weeks from {sg_start_date}
- Current Progress: {sg_current} vs target {sg_target}
- Goal layering plan is currently ACTIVE"""
    else:
        goals_block = f"""
THEIR GOALS:
- Primary Goal: {primary_goal}
- Secondary Goal: None
- Goal layering plan: Not active"""

    # ─── Extract training profile ───
    sp = context.strengthProgress if context and context.strengthProgress else None
    streak = sp.get('streak', 0) if sp else 0
    workouts_month = sp.get('workoutsThisMonth', 0) if sp else 0
    training_block = f"""
THEIR TRAINING PROFILE:
- Experience Level: {experience}
- Training Days Per Week: {training_days}
- Workout Style: {workout_style}
- Injuries or Limitations: {injuries}
- Current Streak: {streak} days
- Workouts This Month: {workouts_month}"""

    # ─── Extract muscle readiness ───
    muscles = context.muscleReadiness if context and context.muscleReadiness else None
    if muscles and len(muscles) > 0:
        recovered = [f"{m.get('name')} ({m.get('readiness')}%)" for m in muscles if m.get('readiness', 0) >= 80]
        moderate = [f"{m.get('name')} ({m.get('readiness')}%)" for m in muscles if 40 <= m.get('readiness', 0) < 80]
        fatigued = [f"{m.get('name')} ({m.get('readiness')}%)" for m in muscles if m.get('readiness', 0) < 40]
        muscle_block = f"""
MUSCLE READINESS RIGHT NOW:
- Fully Recovered (above 80%): {', '.join(recovered) if recovered else 'None'}
- Moderate (40-80%): {', '.join(moderate) if moderate else 'None'}
- Fatigued (below 40%): {', '.join(fatigued) if fatigued else 'None'}"""
    else:
        muscle_block = """
MUSCLE READINESS RIGHT NOW:
- No muscle readiness data available yet"""

    # ─── Extract strength progress ───
    if sp:
        most_improved = sp.get('mostImproved', [])
        least_improved = sp.get('leastImproved', [])
        prs = sp.get('personalRecords', [])
        most_str = ', '.join([f"{m.get('muscle')} +{m.get('gain')}%" for m in most_improved[:3]]) if most_improved else 'No data yet'
        least_str = ', '.join([f"{m.get('muscle')} +{m.get('gain')}%" for m in least_improved[:3]]) if least_improved else 'No data yet'
        pr_str = ', '.join([f"{pr.get('exercise')}: {pr.get('value')}" for pr in prs[:3]]) if prs else 'No records yet'
        progress_block = f"""
STRENGTH PROGRESS THIS MONTH:
- Most Improved: {most_str}
- Least Improved: {least_str}
- Personal Records: {pr_str}"""
    else:
        progress_block = """
STRENGTH PROGRESS THIS MONTH:
- No workout history yet"""

    # ─── Active workout context (FULL plan, not just title) ───
    workout_block = ""
    if context and context.fullWorkoutPlan and len(context.fullWorkoutPlan) > 0:
        workout_block += "\n\nCURRENT ACTIVE WORKOUT PLAN:"
        if context.activeWorkout:
            workout_block += f"\nWorkout: {context.activeWorkout}"
        for ex in context.fullWorkoutPlan:
            w_str = ex.get('weight', '?')
            if unit_sys == 'imperial' and isinstance(w_str, (int, float)) and w_str > 0:
                w_str = f"{round(w_str * 2.20462)} lbs"
            elif isinstance(w_str, (int, float)) and w_str > 0:
                w_str = f"{w_str}kg"
            else:
                w_str = "bodyweight"
            muscles = ', '.join(ex.get('targetMuscles', [])) if ex.get('targetMuscles') else ''
            muscle_tag = f" [{muscles}]" if muscles else ""
            workout_block += f"\n  - {ex.get('name', 'Unknown')}: {ex.get('sets', '?')} sets x {ex.get('reps', '?')} @ {w_str}{muscle_tag}"
    elif context and context.activeWorkout:
        workout_block += f"\n\nCURRENT ACTIVE WORKOUT PLAN:\n- Workout: {context.activeWorkout}"
        if context.workoutExercises:
            for ex in context.workoutExercises:
                workout_block += f"\n  - {ex.get('name', 'Unknown')}: {ex.get('sets', '?')} sets x {ex.get('reps', '?')} @ {ex.get('weight', '?')}kg"
    else:
        workout_block += "\n\nCURRENT ACTIVE WORKOUT PLAN:\n- No active plan yet — generate one when the user asks"

    # ─── Recovery context ───
    recovery_block = ""
    if context:
        if context.recoveryScore is not None:
            recovery_block += f"\n\nRECOVERY STATUS:\n- Overall Recovery Score: {context.recoveryScore}%"
            if context.recoveryScore >= 75:
                recovery_block += " (Well recovered, ready for intense training)"
            elif context.recoveryScore >= 50:
                recovery_block += " (Moderate recovery, standard training ok)"
            else:
                recovery_block += " (Low recovery, recommend light activity or rest)"
            if context.sleepDuration is not None:
                recovery_block += f"\n- Sleep: {context.sleepDuration} hours"
            if context.hrv is not None:
                recovery_block += f"\n- HRV: {context.hrv}ms"

    # ─── Assemble the full system prompt ───
    system_prompt = f"""You are APEX, a world-class personal AI fitness coach. You are speaking with {name}, a {age} year old {gender}.
{bc_block}
{goals_block}
{training_block}
{muscle_block}
{progress_block}{workout_block}{recovery_block}

MEASUREMENT UNITS:
- {unit_instruction}

RESPONSE RULES — FOLLOW THESE EXACTLY:
- When the user asks you to make ANY change to their workout: MAKE THE CHANGE FIRST using [ACTIONS], THEN confirm it in 1-2 sentences maximum. Do not explain what you are about to do — just do it.
- Keep all responses under 4 sentences unless the user asks for a detailed explanation.
- Never write a paragraph when a sentence will do.
- Never say "I would suggest..." or "You could try..." — just make the change and confirm it.
- Never ask for confirmation before making a change unless the change is permanent and irreversible.
- If the user says "change X" — change X immediately with an action block.
- If the user says "add X" — add X immediately.
- If the user says "remove X" — remove X immediately.
- If the user says "make my workout harder" — update the plan immediately with increased sets, reps, or weight.
- If the user says "I am too sore" — immediately reduce intensity and suggest rest.
- After making a change, confirm it in one sentence: "Done — swapped Romanian deadlifts for leg curls on your leg day."
- Only give long explanations if the user explicitly asks "why" or "explain" or "tell me more".
- Always reference the user's specific numbers — never give generic advice.
- All recommendations must be purely physical training based — absolutely no nutrition, diet, calorie, or macro advice.
- Always check muscle readiness before recommending training a specific muscle group.
- Always acknowledge injuries and limitations in every workout recommendation.
- Address the user by their first name {name} naturally in conversation.

WORKOUT MEMORY RULES:
- The user's current active workout plan is shown above under CURRENT ACTIVE WORKOUT PLAN.
- Never recommend a workout without saving it using a set_workout or modify_exercise action.
- Always refer to the saved plan when the user asks about their workout — never make something up.
- Never generate a new plan from scratch if one already exists — modify the existing plan instead.
- If the user asks "what is my workout today" always refer to the saved plan above.

WORKOUT ACTION SYSTEM — THIS IS CRITICAL:
When the user asks you to change, swap, modify, add, or remove anything about their workout, you MUST include a JSON action block at the END of your response. Format:

[ACTIONS]
[{{"type": "modify_exercise", "exercise_name": "Bench Press", "new_sets": 3, "new_reps": "10-12", "new_weight": 70}}]
[/ACTIONS]

Available action types:
- "set_workout": Create/replace entire workout. Include "workout_type" (push/pull/legs/upper/lower/full/light/rest) and optionally "title".
- "swap_exercise": Replace exercise. Include "exercise_name" (the EXACT name from the current plan to REMOVE), "new_exercise_name", "new_sets", "new_reps", "new_weight", "target_muscles" (array).
- "modify_exercise": Change sets/reps/weight. Include "exercise_name" and any of "new_sets", "new_reps", "new_weight".
- "adjust_rest": Change rest time. Include "new_rest_seconds".
- "skip_exercise": Skip exercise. Include "exercise_name".

WEIGHT ADJUSTMENT RULES — CRITICAL:
- When the user asks to increase or decrease weight, ALWAYS look at the CURRENT weight listed above in CURRENT ACTIVE WORKOUT PLAN.
- For compound movements (bench press, squat, deadlift, overhead press, rows): default increment is 5lbs (2.5kg).
- For isolation movements (curls, lateral raises, extensions, flyes): default increment is 2.5lbs (1.25kg).
- If the user specifies an amount, use that exact amount.
- NEVER set a weight more than 20% above or below the current value unless the user gives an exact target.
- Always confirm: "Done — increased [exercise] from [old] to [new]."
- All new_weight values in actions MUST be in kilograms (kg). Convert from lbs if needed: divide lbs by 2.20462.

EXERCISE SWAP RULES — CRITICAL:
- The "exercise_name" field MUST exactly match an exercise name from the CURRENT ACTIVE WORKOUT PLAN above.
- After a swap, the old exercise is COMPLETELY REMOVED and replaced by the new one at the same position.
- Always confirm: "Done — replaced [old exercise] with [new exercise]."
- Never add a new exercise without removing the old one in a swap.

CRITICAL: You MUST include an [ACTIONS] block for ANY workout modification request. The app reads this block to actually apply changes. Without it, nothing happens. Write your short confirmation message FIRST, then the action block at the very end."""

    # ─── Append style modifier ───
    style_prompts = {
        "neutral": "\n\nCommunication style: Professional and balanced. Provide clear, informative responses.",
        "direct": "\n\nCommunication style: Short and performance-focused. Be concise, use bullet points when helpful, get straight to the point.",
        "supportive": "\n\nCommunication style: Encouraging and motivating. Acknowledge effort, celebrate progress, provide positive reinforcement."
    }
    system_prompt += style_prompts.get(style, style_prompts["neutral"])

    return system_prompt

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
        
        # Build conversation history for LlmChat's initial_messages
        initial_messages = []
        
        if request.conversation_history and len(request.conversation_history) > 0:
            for msg in request.conversation_history[-20:]:
                role = "user" if msg.role == "user" else "assistant"
                initial_messages.append({"role": role, "content": msg.content})
            logger.info(f"Using frontend conversation history: {len(request.conversation_history)} messages")
        else:
            # Fallback: Load previous messages from database
            previous_messages = await db.chat_messages.find(
                {"session_id": session_id}
            ).sort("timestamp", -1).limit(20).to_list(20)
            
            if previous_messages:
                for msg in reversed(previous_messages):
                    role = "user" if msg['role'] == 'user' else "assistant"
                    initial_messages.append({"role": role, "content": msg['content']})
                logger.info(f"Using DB conversation history: {len(previous_messages)} messages")
        
        # Create LlmChat instance with conversation history
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_prompt,
            initial_messages=initial_messages if initial_messages else None,
        )
        chat = chat.with_model('anthropic', 'claude-sonnet-4-6')
        chat = chat.with_params(max_tokens=1024)
        
        response = await chat.send_message(UserMessage(text=request.message))
        
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
