"""GRIDTWIN Toll-Free CLI Call Simulator

Runs a simulated interactive phone call in the terminal to test the complete
IVR flow without opening a browser or having a real telecom carrier.

Usage:
    python simulate_call.py
"""

import sys
import asyncio

# Fix Windows console encoding for Tamil and Hindi characters
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stdin, "reconfigure"):
    sys.stdin.reconfigure(encoding="utf-8")

from gridtwin_client import gridtwin_client
from audio_messages import (
    WELCOME_PROMPTS,
    TOWER_SELECTION_PROMPTS,
    INVALID_TOWER_PROMPTS,
    MENU_OPTIONS_PROMPTS,
    GOODBYE_PROMPTS,
    build_tower_status_message
)
from config import LANGUAGES, TOWERS, TOLL_FREE_NUMBER


def print_banner():
    print("\n" + "=" * 65)
    print(f"📞  GRIDTWIN TOLL-FREE HELPLINE: {TOLL_FREE_NUMBER}")
    print("    Automated Power Grid Tower Status & Fault Reporting")
    print("=" * 65 + "\n")


async def run_cli_call():
    print_banner()
    print("🔔 [Ringing] Dialing toll-free number...")
    await asyncio.sleep(0.5)
    print("✅ [Connected] Call answered by GridTwin Automated IVR Server.\n")

    # Step 1: Welcome & Language Selection
    while True:
        print("-" * 55)
        print("🔊 [IVR VOICE PROMPT]:")
        for p in WELCOME_PROMPTS:
            print(f"   • {p['text']}")
        print("-" * 55)
        print("Keys: [1] தமிழ் (Tamil)  |  [2] English  |  [3] हिंदी (Hindi)  |  [0] Hang Up")
        
        choice = input("\n👉 Enter DTMF Key (1/2/3/0): ").strip()
        if choice == "0":
            print("\n📴 Call ended by caller.")
            return

        lang_meta = LANGUAGES.get(choice)
        if not lang_meta:
            print("❌ Invalid selection. Please enter 1, 2, or 3.\n")
            continue

        selected_lang = lang_meta["code"]
        lang_name = lang_meta["name"]
        print(f"\n🌐 [Language Selected]: {lang_name} ({lang_meta['label']})")
        break

    # Step 2: Tower ID Selection Loop
    while True:
        prompt_text = TOWER_SELECTION_PROMPTS.get(selected_lang, TOWER_SELECTION_PROMPTS["en"])
        print("\n" + "-" * 55)
        print(f"🔊 [IVR VOICE PROMPT in {lang_name}]:")
        print(f"   \"{prompt_text}\"")
        print("-" * 55)
        print("Available Towers: [1] Tower 1  |  [2] Tower 2  |  [3] Tower 3  |  [4] Tower 4  |  [5] Tower 5")
        
        tower_input = input("\n👉 Enter Tower ID (1 to 5, or 'q' to quit): ").strip()
        if tower_input.lower() in ["q", "0"]:
            print(f"\n🔊 {GOODBYE_PROMPTS.get(selected_lang)}")
            print("📴 [Call Ended]")
            return

        if tower_input not in ["1", "2", "3", "4", "5"]:
            print(f"\n❌ {INVALID_TOWER_PROMPTS.get(selected_lang)}")
            continue

        print(f"\n⏳ Querying GridTwin Digital Twin for Tower {tower_input}...")
        tower_data = await gridtwin_client.get_tower_status(tower_input)

        # Build Status Message
        speech = build_tower_status_message(tower_data, lang=selected_lang)

        print("\n" + "=" * 65)
        print(f"📢 [IVR VOICE STATUS REPORT]:")
        print(f"\"{speech}\"")
        print("=" * 65)
        print(f"📊 [Telemetry]: Isolated={tower_data['is_isolated']}, Current={tower_data['current_ma']}mA, Voltage={tower_data['voltage_v']}V (Source: {tower_data['source']})")

        # Step 3: Next options
        menu_text = MENU_OPTIONS_PROMPTS.get(selected_lang, MENU_OPTIONS_PROMPTS["en"])
        print("\n" + "-" * 55)
        print(f"🔊 [OPTIONS]: {menu_text}")
        print("-" * 55)
        print("Keys: [1] Check Another Tower  |  [9] Change Language  |  [Any Other Key] Hang Up")
        
        next_action = input("\n👉 Enter choice: ").strip()
        if next_action == "1":
            continue
        elif next_action == "9":
            # Restart with language choice
            await run_cli_call()
            return
        else:
            goodbye = GOODBYE_PROMPTS.get(selected_lang, GOODBYE_PROMPTS["en"])
            print(f"\n🔊 [IVR]: \"{goodbye}\"")
            print("📴 [Call Ended]")
            return


if __name__ == "__main__":
    try:
        asyncio.run(run_cli_call())
    except KeyboardInterrupt:
        print("\n📴 Call aborted by user.")
        sys.exit(0)
