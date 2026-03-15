from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
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

# Import models from refactored schemas
from models.schemas import (
    StatusCheck, StatusCheckCreate, ChatContext, ConversationMessage,
    ChatRequest, WorkoutAction, ChatResponse, ChatMessage,
    UserProfile, WorkoutLog, RecoveryLog, GenerateWorkoutRequest,
)

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
    
    # Training preferences
    training_style_str = 'Not set'
    training_split_str = 'Not set'
    training_pref_instructions = ''
    style_enforcement = ''
    
    if context and context.trainingStyle:
        style_map = {
            'bodybuilding': 'Bodybuilding — Focus on hypertrophy, 8-12 reps compound, 12-15 isolation, mind-muscle connection, pump, volume, drop sets, supersets',
            'powerlifting': 'Powerlifting — Focus on the big three (squat/bench/deadlift), 1-5 reps main lifts, 3-8 accessories, RPE-based, longer rest 3-5min',
            'calisthenics': 'Calisthenics — Bodyweight only, skill progressions, 5-15 reps, movement quality, includes skill work like L-sit/handstand',
            'yoga': 'Yoga — Pose holds, flow sequences, flexibility, breathing, recovery-focused',
            'pilates': 'Pilates — 10-20 reps slow and controlled, core stability, posture, breathing patterns, low impact',
            'sport_specific': f'Sport Specific ({context.sport or "general"}) — Power, speed, agility, sport-specific patterns, plyometrics, explosive movements',
            'crossfit': 'CrossFit/Functional — High reps, AMRAP/EMOM/For Time, Olympic lifts, kettlebells, conditioning focus',
            'hybrid': 'Hybrid — Rotates between heavy days, volume days, conditioning days',
        }
        training_style_str = style_map.get(context.trainingStyle, context.trainingStyle)
        
        if context.trainingStyle == 'hybrid' and context.hybridStyles:
            hybrid_names = [style_map.get(s, s).split(' — ')[0] for s in context.hybridStyles]
            training_style_str += f' (combining: {", ".join(hybrid_names)})'
        
        # STRICT style enforcement rules
        style_enforcement_map = {
            'bodybuilding': """STYLE ENFORCEMENT RULES (BODYBUILDING):
- All exercises MUST use 8-15 rep ranges (8-12 compound, 12-15 isolation)
- MUST include isolation movements (curls, flies, raises, extensions)
- Include mind-muscle connection cues in every exercise note
- Recommend drop sets, supersets, and time under tension techniques
- Rest periods: 60-90s isolation, 90-120s compound
- Never recommend exercises below 6 reps or above 20 reps
- Always include pump finisher exercises""",
            'powerlifting': """STYLE ENFORCEMENT RULES (POWERLIFTING):
- Every workout MUST include squat, bench press, OR deadlift as the MAIN lift
- Main lifts: 1-5 reps, RPE 7-9
- Accessory lifts: 3-8 reps
- Rest periods: 3-5 minutes between heavy sets
- Programming must be RPE-based or percentage-based
- Never recommend isolation-only workouts
- Include warm-up set progressions for main lifts""",
            'calisthenics': """STYLE ENFORCEMENT RULES (CALISTHENICS):
- ONLY recommend bodyweight exercises — NO barbells, dumbbells, cables, or machines
- Use skill progressions (easier → harder variations)
- Include skill work: L-sit, handstand, muscle-up progressions
- Rep ranges: 5-15 for strength, holds for skill work
- Equipment allowed: pull-up bar, dip bars, resistance bands ONLY
- Never recommend bench press, curls with weights, or machine exercises""",
            'yoga': """STYLE ENFORCEMENT RULES (YOGA):
- Recommend pose flows, flexibility movements, and breathing exercises
- Focus on recovery, stress relief, and mobility
- Include breathing cues (pranayama) with every recommendation
- Pose holds: 30s-2min
- No heavy lifting or high-impact exercises
- Recommend yoga specifically on rest days""",
            'pilates': """STYLE ENFORCEMENT RULES (PILATES):
- All movements MUST be slow and controlled
- Core-focused in every session
- Rep ranges: 10-20 reps
- Low impact ONLY — no jumping, no heavy weights
- Emphasize breathing patterns with every exercise
- Focus on postural alignment and body awareness""",
            'sport_specific': f"""STYLE ENFORCEMENT RULES (SPORT SPECIFIC - {context.sport or 'GENERAL'}):
- All exercises must improve {context.sport or 'athletic'} performance
- Include plyometrics, agility drills, and explosive movements
- Include sport-specific movement patterns
- Power development: 3-6 reps explosive
- Conditioning: sport-specific intervals
- Never recommend exercises that don't translate to sport performance""",
            'crossfit': """STYLE ENFORCEMENT RULES (CROSSFIT/FUNCTIONAL):
- Program workouts as AMRAP, EMOM, or For Time format
- Include functional movements: Olympic lifts, kettlebell work, gymnastics
- High intensity — short rest periods (30-60s)
- Include conditioning component in every workout
- Varied modalities: weightlifting + gymnastics + cardio
- Never recommend bodybuilding-style isolation splits""",
            'hybrid': """STYLE ENFORCEMENT RULES (HYBRID):
- Rotate between training styles across the week
- Day 1: Heavy/Strength focus (powerlifting style)
- Day 2: Volume/Hypertrophy focus (bodybuilding style)
- Day 3: Conditioning/Functional (crossfit style)
- Balance all three energy systems
- Include mobility work from yoga/pilates as warm-up/cool-down""",
        }
        style_enforcement = style_enforcement_map.get(context.trainingStyle, '')
        training_pref_instructions = style_enforcement
    
    # Training frequency context
    training_freq = context.trainingFrequency if context else None
    training_days_list = context.trainingDays if context and context.trainingDays else None
    freq_block = ''
    if training_freq:
        freq_block = f"\n- Training Frequency: {training_freq} days per week"
        if training_days_list:
            freq_block += f"\n- Training Days: {', '.join(training_days_list)}"
            # Determine rest days
            all_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            rest_days = [d for d in all_days if d not in training_days_list]
            if rest_days:
                freq_block += f"\n- Rest Days: {', '.join(rest_days)}"
    
    # Split day context
    split_day_block = ''
    if context and context.trainingSplit and training_days_list:
        import datetime as dt
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        today = day_names[dt.datetime.now().weekday()]
        is_training_today = today in training_days_list
        
        if is_training_today:
            training_idx = training_days_list.index(today)
            split = context.trainingSplit
            
            split_day_muscles = {
                'full_body': (['Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Core'], 'Full Body'),
                'upper_lower': (['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'] if training_idx % 2 == 0 else ['Quads', 'Hamstrings', 'Glutes', 'Calves'], 'Upper Body' if training_idx % 2 == 0 else 'Lower Body'),
                'push_pull_legs': ([['Chest', 'Shoulders', 'Triceps'], ['Back', 'Biceps'], ['Quads', 'Hamstrings', 'Glutes', 'Calves']][training_idx % 3], ['Push', 'Pull', 'Legs'][training_idx % 3]),
                'bro_split': ([['Chest', 'Triceps'], ['Back', 'Biceps'], ['Shoulders'], ['Biceps', 'Triceps'], ['Quads', 'Hamstrings', 'Glutes', 'Calves']][training_idx % 5], ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'][training_idx % 5]),
                'arnold_split': ([['Chest', 'Back'], ['Shoulders', 'Biceps', 'Triceps'], ['Quads', 'Hamstrings', 'Glutes', 'Calves']][training_idx % 3], ['Chest+Back', 'Shoulders+Arms', 'Legs'][training_idx % 3]),
            }
            
            if split in split_day_muscles:
                muscles, label = split_day_muscles[split]
                split_day_block = f"""
CURRENT SPLIT DAY: {label} ({today})
TARGET MUSCLES FOR TODAY: {', '.join(muscles)}
SPLIT ENFORCEMENT RULES:
- Today's workout MUST target: {', '.join(muscles)}
- Do NOT recommend training muscle groups that are not part of today's split day
- Exception: if a muscle is below 40% readiness, swap it for the next most recovered muscle in the split"""
        else:
            split_day_block = f"""
CURRENT SPLIT DAY: Rest Day ({today})
- Today is a rest day. Recommend active recovery, mobility work, or light activity only.
- Do NOT recommend a full workout on rest days."""
    
    if context and context.trainingSplit:
        split_map = {
            'full_body': 'Full Body (all major muscle groups each session)',
            'upper_lower': 'Upper/Lower (alternate upper and lower body days)',
            'push_pull_legs': 'Push/Pull/Legs (one movement pattern per session)',
            'fresh_muscle': 'Fresh Muscle Groups (AI selects based on recovery data)',
            'bro_split': 'Bro Split (one muscle group per day)',
            'arnold_split': 'Arnold Split (chest+back / shoulders+arms / legs)',
            'athletic': 'Athletic Performance (power/strength/conditioning rotation)',
            'bodyweight_only': 'Bodyweight Only (no equipment needed)',
        }
        training_split_str = split_map.get(context.trainingSplit, context.trainingSplit)
    
    training_block = f"""
THEIR TRAINING PROFILE:
- Experience Level: {experience}
- Training Days Per Week: {training_days}
- Workout Style: {workout_style}
- Injuries or Limitations: {injuries}
- Training Style Preference: {training_style_str}
- Training Split: {training_split_str}{freq_block}
- Current Streak: {streak} days
- Workouts This Month: {workouts_month}
{split_day_block}"""

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

TRAINING STYLE INSTRUCTIONS:
- {training_pref_instructions if training_pref_instructions else 'No specific training style preference set. Default to balanced programming.'}

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

CRITICAL: You MUST include an [ACTIONS] block for ANY workout modification request. The app reads this block to actually apply changes. Without it, nothing happens. Write your short confirmation message FIRST, then the action block at the very end.

WORKOUT CHANGE BEHAVIOR — NEVER REFUSE:
- Training preferences are GUIDELINES not restrictions.
- The user's request in the moment ALWAYS overrides training preferences.
- If user wants bodyweight when weighted is set: DO IT immediately.
- If user wants leg day when push day is scheduled: DO IT immediately.
- If user wants easier/harder: DO IT immediately.
- NEVER refuse a workout change.
- NEVER say "this conflicts with your preferences" — just make the change.
- The sequence is ALWAYS: include [ACTIONS] block THEN send text confirmation.
- Never describe what you would do — just do it using actions."""

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
        
        # FIX 9: If force_actions was requested but no actions were returned,
        # send a follow-up message to force the AI to produce the action block
        if request.force_actions and not actions and request.context and request.context.fullWorkoutPlan:
            logger.info("Force actions requested but none returned - sending follow-up")
            follow_up = (
                "You forgot to include the [ACTIONS] block. The user's request requires a workout modification. "
                "Please re-read the user's last message and output ONLY the [ACTIONS] block with the appropriate "
                "workout changes in JSON format. Do not repeat your explanation. Just output the [ACTIONS] block."
            )
            follow_up_response = await chat.send_message(UserMessage(text=follow_up))
            if '[ACTIONS]' in follow_up_response and '[/ACTIONS]' in follow_up_response:
                try:
                    import json as json_module
                    action_start = follow_up_response.index('[ACTIONS]') + len('[ACTIONS]')
                    action_end = follow_up_response.index('[/ACTIONS]')
                    action_json = follow_up_response[action_start:action_end].strip()
                    actions = json_module.loads(action_json)
                    logger.info(f"Force actions retry: parsed {len(actions)} workout actions")
                except Exception as parse_error:
                    logger.warning(f"Force actions retry: failed to parse: {parse_error}")
        
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

# AI Workout Generator endpoint
@api_router.post("/generate-workout")
async def generate_workout(request: GenerateWorkoutRequest):
    """AI-powered workout generator"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        # Build context
        profile_ctx = ""
        if request.userProfile:
            name = request.userProfile.get('name', 'User')
            exp = request.userProfile.get('trainingExperience', 'intermediate')
            injuries = request.userProfile.get('injuries', 'None')
            profile_ctx = f"User: {name}, Experience: {exp}, Injuries/Limitations: {injuries}"
        
        style_ctx = f"Training Style: {request.trainingStyle or 'General'}"
        if request.sport:
            style_ctx += f" (Sport: {request.sport})"
        
        equipment_map = {
            'full_gym': 'Full gym with all equipment (barbells, dumbbells, cables, machines)',
            'dumbbells_only': 'Dumbbells only',
            'bodyweight': 'No equipment - bodyweight only',
            'home_gym': 'Home gym (dumbbells, pull-up bar, resistance bands)',
            'barbell_only': 'Barbell and plates only',
        }
        equipment_desc = equipment_map.get(request.equipment, request.equipment)
        
        # Build strict style enforcement rules for the prompt
        style_rules = {
            'bodybuilding': """STRICT STYLE RULES (BODYBUILDING):
- ALL exercises must use 8-15 rep ranges (8-12 compound, 12-15 isolation)
- MUST include at least 2 isolation movements (curls, flies, raises, extensions)
- Add "mind-muscle connection" cues in every exercise note
- Include at least one drop set or superset suggestion
- Rest periods: 60-90s isolation, 90-120s compound""",
            'powerlifting': """STRICT STYLE RULES (POWERLIFTING):
- The FIRST exercise MUST be Barbell Squat, Barbell Bench Press, OR Deadlift
- Main lift: 1-5 reps, RPE 7-9
- Accessory lifts: 3-8 reps
- Rest periods: 180-300 seconds (3-5 minutes) for main lifts
- Include warm-up set note for the main lift
- NO isolation-only exercises as main movements""",
            'calisthenics': """STRICT STYLE RULES (CALISTHENICS):
- ONLY bodyweight exercises. NO barbells, dumbbells, cables, or machines
- Equipment allowed: pull-up bar, dip bars, resistance bands ONLY
- Include skill progressions (easier and harder variations in notes)
- Rep ranges: 5-15 for strength movements
- Include at least one skill/hold exercise (L-sit, handstand, planche progression)""",
            'yoga': """STRICT STYLE RULES (YOGA):
- Only yoga poses, flows, and flexibility movements
- Include breathing cues in every exercise note
- Use pose hold times (30s-2min) instead of traditional reps
- Focus on flexibility, balance, and mindfulness
- NO heavy lifting or high-impact movements""",
            'pilates': """STRICT STYLE RULES (PILATES):
- All movements must be slow and controlled
- Core-focused: at least 60% of exercises target core
- Rep ranges: 10-20 reps
- LOW IMPACT ONLY — no jumping, no heavy weights
- Include breathing pattern cues in every exercise note""",
            'sport_specific': f"""STRICT STYLE RULES (SPORT SPECIFIC - {request.sport or 'GENERAL'}):
- All exercises must translate to {request.sport or 'athletic'} performance
- Include at least 2 plyometric/explosive movements
- Include agility or sport-specific movement patterns
- Power movements: 3-6 reps explosive
- Include conditioning intervals""",
            'crossfit': """STRICT STYLE RULES (CROSSFIT):
- Format as AMRAP, EMOM, or For Time in the title and notes
- Include functional movements: Olympic lifts, kettlebell, gymnastics
- Short rest periods (30-60s) or no rest (AMRAP style)
- Mix modalities: weightlifting + bodyweight + conditioning
- Include a time cap or round count in the title""",
            'hybrid': """STRICT STYLE RULES (HYBRID):
- Mix heavy compound lifts with isolation work and conditioning
- Include at least one heavy strength movement (1-5 reps)
- Include at least one hypertrophy movement (8-12 reps)
- Include at least one conditioning element (circuit, AMRAP, or cardio)""",
        }
        
        style_enforcement = style_rules.get(request.trainingStyle, '') if request.trainingStyle else ''
        
        prompt = f"""Generate a complete workout plan. Return ONLY valid JSON, no other text.

REQUIREMENTS:
- Focus muscles: {', '.join(request.focusMuscles) if request.focusMuscles else 'Full body'}
- Equipment available: {equipment_desc}
- Target duration: {request.duration} minutes
- Intensity: {request.intensity}
- {style_ctx}
- {profile_ctx}

{style_enforcement}

Return this exact JSON structure:
{{
  "title": "Workout name",
  "type": "push/pull/legs/upper/lower/full/cardio",
  "targetMuscles": ["muscle1", "muscle2"],
  "duration": {request.duration},
  "intensity": "{request.intensity}",
  "exercises": [
    {{
      "name": "Exercise Name",
      "sets": 3,
      "reps": "8-10",
      "weight": null,
      "targetMuscles": ["Primary Muscle"],
      "restSeconds": 90,
      "notes": "Brief form tip"
    }}
  ]
}}

Include 5-8 exercises. STRICTLY follow the style rules above. Be specific with exercise names."""

        chat = LlmChat(
            api_key=api_key,
            session_id=str(uuid.uuid4()),
            system_message="You are a workout programming expert. Return ONLY valid JSON. No markdown, no explanation, just the JSON object.",
        )
        chat = chat.with_model('anthropic', 'claude-sonnet-4-6')
        chat = chat.with_params(max_tokens=2048)
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON from response
        import json as json_module
        # Try to extract JSON from the response
        clean = response.strip()
        if clean.startswith('```'):
            # Remove markdown code fences
            lines = clean.split('\n')
            clean = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
        
        workout_data = json_module.loads(clean)
        
        # Add IDs to exercises
        for i, ex in enumerate(workout_data.get('exercises', [])):
            ex['id'] = f"gen_{uuid.uuid4().hex[:8]}"
        
        workout_data['id'] = f"ai_{uuid.uuid4().hex[:8]}"
        
        logger.info(f"Generated workout: {workout_data.get('title', 'Unknown')}")
        return workout_data
        
    except Exception as e:
        logger.error(f"Workout generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate workout: {str(e)}")

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
