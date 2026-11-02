"""GRIDTWIN Toll-Free IVR Service - Automated Test Suite"""

import sys
import os

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from starlette.testclient import TestClient
from app import app

client = TestClient(app)

def run_tests():
    print("Testing GRIDTWIN Toll-Free IVR Service...")

    # 1. Test Welcome endpoint (Plays greetings in Ta, En, Hi)
    res = client.get("/ivr/welcome")
    assert res.status_code == 200, f"Welcome failed: {res.status_code}"
    assert "<Gather" in res.text, "Gather missing in welcome"
    assert "தமிழுக்கு ஒன்று அழுத்தவும்" in res.text
    assert "For English, press 2" in res.text
    assert "हिंदी के लिए तीन दबाएं" in res.text
    print("✓ Test 1: /ivr/welcome passed")

    # 2. Test Select Language (1 -> Tamil)
    res = client.post("/ivr/language-selected", data={"Digits": "1"})
    assert res.status_code == 200
    assert 'action="/ivr/tower-selected?lang=ta"' in res.text
    print("✓ Test 2: /ivr/language-selected (Tamil) passed")

    # 3. Test Select Tower (Tower 3 Isolated in Tamil)
    res = client.post("/ivr/tower-selected?lang=ta", data={"Digits": "3"})
    assert res.status_code == 200
    assert "கோபுரம் 3" in res.text
    print("✓ Test 3: /ivr/tower-selected (Tower 3 in Tamil) passed")

    # 4. Test Select Tower (Tower 1 Normal in English)
    res = client.post("/ivr/tower-selected?lang=en", data={"Digits": "1"})
    assert res.status_code == 200
    assert "Tower 1 is NOT isolated" in res.text
    print("✓ Test 4: /ivr/tower-selected (Tower 1 in English) passed")

    # 5. Test Select Tower (Tower 1 in Hindi)
    res = client.post("/ivr/tower-selected?lang=hi", data={"Digits": "1"})
    assert res.status_code == 200
    assert "टावर 1" in res.text
    print("✓ Test 5: /ivr/tower-selected (Tower 1 in Hindi) passed")

    # 6. Test Simulator Call initiation
    call_res = client.post("/api/simulator/call")
    assert call_res.status_code == 200
    assert call_res.json()["status"] == "connected"
    print("✓ Test 6: /api/simulator/call passed")

    # 7. Test Simulator DTMF (Language: English)
    dtmf_res = client.post("/api/simulator/dtmf", json={"digit": "2", "stage": "LANGUAGE_SELECTION"})
    assert dtmf_res.status_code == 200
    assert dtmf_res.json()["lang"] == "en"
    print("✓ Test 7: /api/simulator/dtmf (English) passed")

    # 8. Test Simulator DTMF (Isolate Tower 3 and verify status report)
    client.post("/api/towers/T3/isolate")
    tower_res = client.post("/api/simulator/dtmf", json={"digit": "3", "stage": "TOWER_SELECTION", "lang": "en"})
    assert tower_res.status_code == 200
    assert "ISOLATED" in tower_res.json()["display_text"]
    print("✓ Test 8: /api/simulator/dtmf (Tower 3 isolated) passed")

    # 9. Test /api/towers status
    all_towers = client.get("/api/towers")
    assert all_towers.status_code == 200
    t_data = all_towers.json()
    assert "1" in t_data and "5" in t_data
    print("✓ Test 9: /api/towers passed")

    # 10. Test Menu Options (1 -> loop back to tower selection)
    menu_res = client.post("/ivr/menu-options?lang=en", data={"Digits": "1"})
    assert menu_res.status_code == 200
    assert "/ivr/language-selected?lang=en" in menu_res.text
    print("✓ Test 10: /ivr/menu-options (Repeat tower) passed")

    print("\n🎉 ALL 10 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()

