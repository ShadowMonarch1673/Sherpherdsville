"""Deterministic complaint triage used by both preview and creation APIs."""

CATEGORY_RULES = {
    "Electrical": ("power", "electric", "socket", "light", "spark", "shock"),
    "Plumbing": ("water", "leak", "tap", "toilet", "drain", "pipe", "flood"),
    "Carpentry": ("door", "window", "bed", "chair", "desk", "wood"),
    "Cleaning": ("clean", "waste", "rubbish", "trash", "dirty", "sanitation"),
    "Security": ("lock", "key", "access", "theft", "security", "unsafe"),
    "Internet": ("wifi", "wi-fi", "internet", "network", "router"),
}

URGENT_TERMS = (
    "fire",
    "smoke",
    "spark",
    "shock",
    "electrocution",
    "flood",
    "gas",
    "danger",
    "emergency",
    "burst pipe",
)
HIGH_TERMS = (
    "no water",
    "power outage",
    "lockout",
    "leak",
    "broken lock",
    "security",
    "sewage",
    "unsafe",
)
LOW_TERMS = ("paint", "scratch", "cosmetic", "minor", "loose handle")


def analyze_complaint(title, description=""):
    """Return a category suggestion and an automatically assigned priority."""
    text = f"{title} {description}".lower()
    scores = {
        category: sum(term in text for term in terms)
        for category, terms in CATEGORY_RULES.items()
    }
    category_name, score = max(scores.items(), key=lambda item: item[1])
    if score == 0:
        category_name = "Other"

    if any(term in text for term in URGENT_TERMS):
        priority = "URGENT"
    elif any(term in text for term in HIGH_TERMS):
        priority = "HIGH"
    elif any(term in text for term in LOW_TERMS):
        priority = "LOW"
    else:
        priority = "MEDIUM"

    return {
        "category_name": category_name,
        "priority": priority,
        "confidence": "high" if score >= 2 else "medium" if score == 1 else "low",
    }
