"""GRIDTWIN Toll-Free IVR Service - SQLite Database Module

Stores persistent call records, caller phone numbers, selected languages,
queried tower statuses, physical voltage/current telemetry at the moment of call,
and spoken audio responses.
"""

import os
import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "call_logs.db")


def get_connection():
    """Get SQLite database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables for call usage tracking."""
    conn = get_connection()
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS call_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    call_sid TEXT,
                    caller_number TEXT NOT NULL,
                    call_type TEXT NOT NULL,
                    language TEXT,
                    tower_id TEXT,
                    tower_status TEXT,
                    voltage_v REAL DEFAULT 0.0,
                    current_ma REAL DEFAULT 0.0,
                    spoken_response TEXT,
                    duration_seconds INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'COMPLETED'
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_call_logs_timestamp 
                ON call_logs(timestamp DESC);
            """)
    finally:
        conn.close()


def log_call(
    caller_number: str,
    call_type: str = "TWILIO_INBOUND",
    language: Optional[str] = "en",
    tower_id: Optional[str] = None,
    tower_status: Optional[str] = None,
    voltage_v: float = 0.0,
    current_ma: float = 0.0,
    spoken_response: Optional[str] = None,
    duration_seconds: int = 0,
    call_sid: Optional[str] = None,
    status: str = "COMPLETED"
) -> int:
    """Insert a new call usage and response log into SQLite database."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_connection()
    try:
        with conn:
            cursor = conn.execute("""
                INSERT INTO call_logs (
                    timestamp, call_sid, caller_number, call_type, language,
                    tower_id, tower_status, voltage_v, current_ma,
                    spoken_response, duration_seconds, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now_str, call_sid, caller_number, call_type, language,
                tower_id, tower_status, voltage_v, current_ma,
                spoken_response, duration_seconds, status
            ))
            return cursor.lastrowid
    finally:
        conn.close()


def get_call_logs(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve recent call records in reverse chronological order."""
    init_db()
    conn = get_connection()
    try:
        cursor = conn.execute("""
            SELECT id, timestamp, call_sid, caller_number, call_type, language,
                   tower_id, tower_status, voltage_v, current_ma,
                   spoken_response, duration_seconds, status
            FROM call_logs
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def clear_call_logs() -> bool:
    """Clear all call logs."""
    conn = get_connection()
    try:
        with conn:
            conn.execute("DELETE FROM call_logs")
            conn.execute("VACUUM")
        return True
    finally:
        conn.close()


# Initialize on import
init_db()

