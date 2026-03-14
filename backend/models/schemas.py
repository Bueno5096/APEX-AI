from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime


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
    # Comprehensive data fields
    bodyComposition: Optional[Dict[str, Any]] = None
    bodyCompHistory: Optional[List[Dict[str, Any]]] = None
    muscleReadiness: Optional[List[Dict[str, Any]]] = None
    strengthProgress: Optional[Dict[str, Any]] = None
    goalLayeringActive: Optional[bool] = False
    unitSystem: Optional[str] = "imperial"
    fullWorkoutPlan: Optional[List[Dict[str, Any]]] = None
    # Training preferences
    trainingStyle: Optional[str] = None
    trainingSplit: Optional[str] = None
    sport: Optional[str] = None
    hybridStyles: Optional[List[str]] = None
    trainingFrequency: Optional[int] = None
    trainingDays: Optional[List[str]] = None

class ConversationMessage(BaseModel):
    role: str  # 'user' or 'coach'
    content: str

class ChatRequest(BaseModel):
    message: str
    context: Optional[ChatContext] = None
    session_id: Optional[str] = None
    conversation_history: Optional[List[ConversationMessage]] = None
    force_actions: Optional[bool] = False

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

class GenerateWorkoutRequest(BaseModel):
    focusMuscles: List[str] = []
    equipment: str = "full_gym"
    duration: int = 45
    intensity: str = "moderate"
    trainingStyle: Optional[str] = None
    trainingSplit: Optional[str] = None
    sport: Optional[str] = None
    userProfile: Optional[Dict[str, Any]] = None
