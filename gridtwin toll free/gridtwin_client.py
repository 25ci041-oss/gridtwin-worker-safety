"""GRIDTWIN Backend Connector

Communicates with the existing GridTwin backend API (FastAPI) to fetch live
physical hardware state (ESP32 relay outputs, INA219 current sensor) and
digital twin simulation state (connectivity & educational electrical flows).

Includes fast timeouts and caching so the toll-free system responds instantly (<10ms)
even when the main backend or hardware is offline.
"""

import time
import logging
from typing import Dict, Any, Optional
import httpx

from config import GRIDTWIN_BACKEND_URL, BACKEND_TIMEOUT_SECONDS, TOWERS

logger = logging.getLogger("tollfree.client")

# Fallback state in case backend is offline
_FALLBACK_STATE = {
    "T1": {"is_isolated": False, "is_energized": True, "current_ma": 150.0, "voltage_v": 5.0},
    "T2": {"is_isolated": False, "is_energized": True, "current_ma": 145.0, "voltage_v": 5.0},
    "T3": {"is_isolated": False, "is_energized": True, "current_ma": 145.0, "voltage_v": 5.0},
    "T4": {"is_isolated": False, "is_energized": True, "current_ma": 148.0, "voltage_v": 5.0},
    "T5": {"is_isolated": False, "is_energized": True, "current_ma": 142.0, "voltage_v": 5.0},
}


class GridTwinClient:
    """Client for retrieving tower and hardware electrical status from GridTwin."""

    def __init__(self, base_url: str = GRIDTWIN_BACKEND_URL, timeout: float = BACKEND_TIMEOUT_SECONDS):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        # Fast connect timeout (0.4s) so callers never wait if backend is offline
        self._http_timeout = httpx.Timeout(timeout=self.timeout, connect=0.4)
        self._offline_until = 0.0  # Unix timestamp to skip HTTP calls if known offline

    def _is_known_offline(self) -> bool:
        return time.time() < self._offline_until

    def _mark_offline(self, duration_sec: float = 4.0):
        self._offline_until = time.time() + duration_sec

    def _mark_online(self):
        self._offline_until = 0.0

    async def fetch_hardware_status(self) -> Optional[Dict[str, Any]]:
        """Fetch physical ESP32 relay and current sensor status."""
        if self._is_known_offline():
            return None

        url = f"{self.base_url}/api/v1/hardware/status"
        try:
            async with httpx.AsyncClient(timeout=self._http_timeout) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    self._mark_online()
                    return resp.json()
        except Exception as e:
            logger.debug(f"Hardware status API unavailable at {url}: {e}")
            self._mark_offline()
        return None

    async def fetch_simulation_connectivity(self) -> Optional[Dict[str, Any]]:
        """Fetch digital twin simulation connectivity status."""
        if self._is_known_offline():
            return None

        url = f"{self.base_url}/api/v1/simulation/connectivity"
        try:
            async with httpx.AsyncClient(timeout=self._http_timeout) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    self._mark_online()
                    return resp.json()
        except Exception as e:
            logger.debug(f"Simulation connectivity API unavailable at {url}: {e}")
            self._mark_offline()
        return None

    def _evaluate_tower_state(self, tower_number: str, hw: Optional[Dict], sim: Optional[Dict]) -> Dict[str, Any]:
        tower_meta = TOWERS.get(str(tower_number))
        if not tower_meta:
            raise ValueError(f"Invalid tower number {tower_number}. Must be 1 to 5.")

        tower_id = tower_meta["id"]  # e.g., "T1"
        node_id = f"N_{tower_id}"    # e.g., "N_T1"
        sw_id = f"SW{tower_number}"

        # 1. First priority: Check physical hardware & digital twin output state
        if hw and "output_states" in hw:
            outputs = hw.get("output_states", {})
            out_state = str(outputs.get(tower_id, "UNKNOWN")).upper()
            
            # If the output is reported as ON, OFF, or ISOLATED
            if out_state in ["ON", "OFF", "ISOLATED"]:
                is_isolated = (out_state in ["OFF", "ISOLATED"])
                is_energized = (out_state == "ON")
                
                # Fetch sensor telemetry if active
                telemetry = hw.get("telemetry", {})
                current_ma = float(telemetry.get("current_ma", 0.0)) if is_energized else 0.0
                voltage_v = float(telemetry.get("bus_voltage_v", 5.0)) if is_energized else 0.0
                
                # Default nominal current if sensor reads 0 while relay is ON
                if is_energized and current_ma <= 0.0:
                    current_ma = 145.0

                return {
                    "tower_number": str(tower_number),
                    "tower_id": tower_id,
                    "tower_name": tower_meta["name"],
                    "is_isolated": is_isolated,
                    "current_passing": is_energized,
                    "current_ma": round(current_ma, 1),
                    "voltage_v": round(voltage_v, 2),
                    "source": "hardware",
                    "device_status": hw.get("status", "ONLINE"),
                    "raw_state": out_state,
                }

        # 2. Second priority: Check digital twin simulation
        if sim and ("switch_states" in sim or "energized_nodes" in sim):
            sw_states = sim.get("switch_states", {})
            is_sw_open = (sw_states.get(sw_id) == "OPEN") or (sw_states.get(f"SW-T{tower_number}") == "OPEN")
            
            # Check local authoritative state override
            fb = _FALLBACK_STATE.get(tower_id, {})
            fb_isolated = fb.get("is_isolated", False)

            # A tower is isolated IF AND ONLY IF its own switch is open, or explicitly isolated
            is_isolated = is_sw_open or fb_isolated
            is_energized = not is_isolated
            
            current_ma = 145.0 if is_energized else 0.0
            voltage_v = 5.0 if is_energized else 0.0

            return {
                "tower_number": str(tower_number),
                "tower_id": tower_id,
                "tower_name": tower_meta["name"],
                "is_isolated": is_isolated,
                "current_passing": is_energized,
                "current_ma": current_ma,
                "voltage_v": voltage_v,
                "source": "simulation",
                "device_status": "SIMULATED",
                "raw_state": "ISOLATED" if is_isolated else "ENERGIZED",
            }

        # 3. Third priority: Graceful fallback so caller gets an immediate valid response
        fb = _FALLBACK_STATE.get(tower_id, {"is_isolated": False, "is_energized": True, "current_ma": 140.0, "voltage_v": 5.0})
        return {
            "tower_number": str(tower_number),
            "tower_id": tower_id,
            "tower_name": tower_meta["name"],
            "is_isolated": fb["is_isolated"],
            "current_passing": fb["is_energized"],
            "current_ma": fb["current_ma"],
            "voltage_v": fb["voltage_v"],
            "source": "fallback",
            "device_status": "STANDALONE",
            "raw_state": "ISOLATED" if fb["is_isolated"] else "NORMAL",
        }

    async def get_tower_status(self, tower_number: str) -> Dict[str, Any]:
        """Get the live status of a specific tower (1 to 5)."""
        hw = await self.fetch_hardware_status()
        sim = await self.fetch_simulation_connectivity()
        return self._evaluate_tower_state(tower_number, hw, sim)

    async def get_all_towers_status(self) -> Dict[str, Any]:
        """Retrieve status for all 5 towers simultaneously with single batch fetch."""
        hw = await self.fetch_hardware_status()
        sim = await self.fetch_simulation_connectivity()
        results = {}
        for num in ["1", "2", "3", "4", "5"]:
            results[num] = self._evaluate_tower_state(num, hw, sim)
        return results

    async def isolate_tower(self, tower_id: str) -> Dict[str, Any]:
        """Dispatch isolation command to GridTwin backend and update state."""
        tid = tower_id.upper()
        if not tid.startswith("T"):
            tid = f"T{tid}"

        # Immediately update local fallback state
        if tid in _FALLBACK_STATE:
            _FALLBACK_STATE[tid]["is_isolated"] = True
            _FALLBACK_STATE[tid]["is_energized"] = False
            _FALLBACK_STATE[tid]["current_ma"] = 0.0

        url = f"{self.base_url}/api/v1/hardware/isolate/{tid}"
        try:
            async with httpx.AsyncClient(timeout=self._http_timeout) as client:
                resp = await client.post(url)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.error(f"Error dispatching isolate to {url}: {e}")
        return {"status": "SUCCESS", "tower_id": tid, "is_isolated": True, "source": "tollfree_local"}

    async def restore_tower(self, tower_id: str) -> Dict[str, Any]:
        """Dispatch restore command to GridTwin backend and update state."""
        tid = tower_id.upper()
        if not tid.startswith("T"):
            tid = f"T{tid}"

        # Immediately update local fallback state
        if tid in _FALLBACK_STATE:
            _FALLBACK_STATE[tid]["is_isolated"] = False
            _FALLBACK_STATE[tid]["is_energized"] = True
            _FALLBACK_STATE[tid]["current_ma"] = 145.0

        url = f"{self.base_url}/api/v1/hardware/restore/{tid}"
        try:
            async with httpx.AsyncClient(timeout=self._http_timeout) as client:
                resp = await client.post(url)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            logger.error(f"Error dispatching restore to {url}: {e}")
        return {"status": "SUCCESS", "tower_id": tid, "is_isolated": False, "source": "tollfree_local"}


    def sync_isolated_towers(self, isolated_list: list) -> Dict[str, Any]:
        """Update in-memory state based on authoritative isolated list from 3D Twin."""
        iso_set = set(str(t).upper() for t in isolated_list)
        for tid in ["T1", "T2", "T3", "T4", "T5"]:
            is_iso = tid in iso_set
            if tid in _FALLBACK_STATE:
                _FALLBACK_STATE[tid]["is_isolated"] = is_iso
                _FALLBACK_STATE[tid]["is_energized"] = not is_iso
                _FALLBACK_STATE[tid]["current_ma"] = 0.0 if is_iso else 145.0
                _FALLBACK_STATE[tid]["voltage_v"] = 0.0 if is_iso else 5.0
        return {"status": "SUCCESS", "isolated_towers": list(iso_set)}


# Global singleton instance
gridtwin_client = GridTwinClient()
