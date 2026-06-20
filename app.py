import os
from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

@app.get("/")
async def root():
    return {"status": "ok"}

@app.post("/api/chat")
async def chat(req: ChatRequest):
    history_text = "\n".join(f"{m.role}: {m.content}" for m in req.history[-10:])
    response = model.generate_content(f"{history_text}\nUser: {req.message}")
    return {"reply": response.text}
