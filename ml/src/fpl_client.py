import httpx
import time

BASE_URL = "https://fantasy.premierleague.com/api"
HEADERS = {"User-Agent": "fpl-oracle/1.0 (learning project)"}

def get_bootstrap():
    response = httpx.get(f"{BASE_URL}/bootstrap-static/", headers=HEADERS)
    response.raise_for_status()
    return response.json()

def get_fixtures():
    response = httpx.get(f"{BASE_URL}/fixtures/", headers=HEADERS)
    response.raise_for_status()
    return response.json()
