"""
ai_service.py
--------------
Single point of contact for every GenAI call in the app.

Why this exists: the internship gave everyone different access (some have
IBM watsonx, some OpenAI, some nothing yet). Every feature in the app calls
generate_text() below, so switching providers is a one-line .env change --
nothing in app.py has to know or care which provider is active.

Supported providers (set AI_PROVIDER in .env):
  - "openai"        -> OpenAI Chat Completions API
  - "gemini"        -> Google Gemini API
  - "groq"          -> Groq API (very fast, runs open models like Llama)
  - "huggingface"   -> HuggingFace Inference API
  - "mock"          -> no API key needed, returns realistic canned output.
                       Useful for developing/demoing before you have a key,
                       and as a safety net if every real provider is down.

FALLBACK CHAIN: AI_PROVIDER can also be a comma-separated list, e.g.
  AI_PROVIDER=gemini,groq,mock
generate_text() tries each one in order and uses the first that succeeds --
so a rate limit on your first-choice provider doesn't stall your demo, it
just quietly retries with the next one.
"""
import os
import json
import requests

PROVIDER_CHAIN = [p.strip().lower() for p in os.getenv("AI_PROVIDER", "mock").split(",") if p.strip()]

PROVIDER_FUNCS = {}  # populated below, after each _call_* function is defined


class AIServiceError(Exception):
    pass


def generate_text(prompt: str, system: str = "", max_tokens: int = 700) -> str:
    """
    Try each provider in AI_PROVIDER (in order) and return the first
    successful response. Falls back to a mock response if every provider
    fails, so a flaky/rate-limited API never crashes the app mid-demo.
    """
    last_error = None
    for provider in PROVIDER_CHAIN:
        if provider == "mock":
            continue  # mock is always the final fallback, handled below
        func = PROVIDER_FUNCS.get(provider)
        if not func:
            print(f"[ai_service] Unknown provider '{provider}' in AI_PROVIDER -- skipping.")
            continue
        try:
            return func(prompt, system, max_tokens)
        except Exception as exc:  # noqa: BLE001 - try the next provider instead of crashing
            last_error = exc
            print(f"[ai_service] Provider '{provider}' failed ({exc}); trying next provider.")

    if last_error is not None:
        print(f"[ai_service] All configured providers failed (last error: {last_error}); using mock.")
    return _mock_response(prompt, system)


def _call_openai(prompt, system, max_tokens):
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    if not api_key:
        raise AIServiceError("OPENAI_API_KEY not set")

    resp = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system or "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.7,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _call_gemini(prompt, system, max_tokens):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    if not api_key:
        raise AIServiceError("GEMINI_API_KEY not set")

    # Uses Google's official SDK rather than a hand-rolled HTTP call.
    # As of mid-2026, Google is migrating from "Standard" API keys (AIza...)
    # to "Auth" keys (AQ...), and the official SDK is what reliably handles
    # both key formats -- a raw REST call to the older generateContent
    # endpoint can return 401 errors with newer Auth keys.
    from google import genai  # imported here so other providers don't need this package installed

    client = genai.Client(api_key=api_key)
    full_prompt = f"{system}\n\n{prompt}" if system else prompt
    interaction = client.interactions.create(model=model, input=full_prompt)
    return interaction.output_text.strip()


def _call_huggingface(prompt, system, max_tokens):
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    model = os.getenv("HUGGINGFACE_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
    if not api_key:
        raise AIServiceError("HUGGINGFACE_API_KEY not set")

    full_prompt = f"{system}\n\n{prompt}" if system else prompt
    resp = requests.post(
        f"https://api-inference.huggingface.co/models/{model}",
        headers={"Authorization": f"Bearer {api_key}"},
        json={"inputs": full_prompt, "parameters": {"max_new_tokens": max_tokens, "temperature": 0.7}},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, list) and data and "generated_text" in data[0]:
        return data[0]["generated_text"].strip()
    raise AIServiceError(f"Unexpected HuggingFace response shape: {data}")


def _call_groq(prompt, system, max_tokens):
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    if not api_key:
        raise AIServiceError("GROQ_API_KEY not set")

    # Groq's API is OpenAI-compatible, so this looks just like _call_openai
    # but hits Groq's endpoint. Groq runs open models (Llama, etc.) on
    # custom hardware -- typically the fastest option of the four, and its
    # free tier (no credit card) is generous.
    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system or "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.7,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _mock_response(prompt, system):
    """
    Deterministic, readable placeholder output so every feature is fully
    testable with zero API key. Replace AI_PROVIDER in .env with a real
    provider when you're ready to use live GenAI output.
    """
    lower = prompt.lower()
    if "quiz" in (system or "").lower():
        return json.dumps({
            "questions": [
                {
                    "question": "This is a sample question generated in mock mode. What does AI_PROVIDER=mock do?",
                    "options": ["Uses a real AI model", "Returns placeholder output for testing", "Deletes the database", "Deploys to AWS"],
                    "correct_index": 1,
                    "explanation": "Mock mode lets you test the whole app before you have a real API key."
                }
            ]
        })
    if "resume" in (system or "").lower():
        return json.dumps({
            "match_score": 72,
            "strengths": ["Relevant technical skills listed", "Clear project descriptions"],
            "gaps": ["No mention of cloud platforms", "Missing quantifiable achievements"],
            "suggestions": ["Add measurable outcomes (e.g. 'improved performance by 20%')",
                             "Mention any cloud/AWS exposure explicitly"]
        })
    if "interview" in (system or "").lower():
        if "candidate's answer" in lower:
            return ("That's a solid start -- try adding a specific example next time. "
                     "Next question: Tell me about a challenging bug you fixed recently.")
        return "Tell me about a project you're proud of and what your specific role was in it."
    if "study plan" in (system or "").lower() or "roadmap" in (system or "").lower():
        return json.dumps({
            "milestones": [
                {"title": "Week 1: Fundamentals", "description": "Review core concepts and terminology."},
                {"title": "Week 2: Hands-on Practice", "description": "Build a small project applying what you learned."},
                {"title": "Week 3: Deepen Knowledge", "description": "Study intermediate topics and common patterns."},
                {"title": "Week 4: Portfolio Project", "description": "Build a polished project to showcase this skill."}
            ]
        })
    if "summar" in (system or "").lower():
        return ("This is a mock summary. In mock mode the app returns placeholder text so you can test "
                "the UI end-to-end. Switch AI_PROVIDER in your .env file to 'openai', 'gemini', or "
                "'huggingface' (with an API key) to get real summaries of your notes.")
    return ("[Mock AI response] I received your message: \"" + prompt[:120] + "\". "
            "Set AI_PROVIDER in .env to a real provider to get live AI answers.")


PROVIDER_FUNCS.update({
    "openai": _call_openai,
    "gemini": _call_gemini,
    "groq": _call_groq,
    "huggingface": _call_huggingface,
})
