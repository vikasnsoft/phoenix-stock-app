"""
Phoenix-like Stock Scanner MCP Server - Phase 1 Core Tools
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4
from dotenv import load_dotenv
load_dotenv()


import requests
import pandas as pd
import numpy as np
import redis
from fastmcp import FastMCP

# Load environment variables
load_dotenv()


# --- async helper: replace any previous _invoke_tool/_bind_and_call_member ---
import inspect
import asyncio
from typing import Any

async def _bind_and_call_member(member, *args, **kwargs) -> Any:
    """
    Async-aware invocation of a member (callable or coroutine-returning).
    - If member is an async function: await member(...)
    - If member is a sync function returning an awaitable: await the returned awaitable
    - If member is a sync function returning a normal result: return it directly
    """
    # If member is an async function, await it directly
    if inspect.iscoroutinefunction(member):
        return await member(*args, **kwargs)

    # Synchronous callable: call it (may return awaitable)
    result = member(*args, **kwargs)

    # If the result is awaitable, await it in the current loop
    if inspect.isawaitable(result):
        return await result

    # Normal sync result
    return result


async def _invoke_tool(tool_obj, *args, **kwargs) -> Any:
    """
    Async-aware tool invoker. Supports:
     - plain callables
     - wrapper objects exposing run/call/execute/fn/func/__call__
    This version always runs inside the current event loop and returns awaited results.
    """
    # 1) If tool_obj itself is callable, invoke/bind it
    if callable(tool_obj):
        return await _bind_and_call_member(tool_obj, *args, **kwargs)

    # 2) Try common wrapper attributes
    candidate_attrs = ("run", "call", "execute", "fn", "func", "__call__")
    for attr in candidate_attrs:
        if hasattr(tool_obj, attr):
            member = getattr(tool_obj, attr)
            if callable(member):
                # Attempt to call the member. Many tool wrappers expect a single dict param.
                # If the member signature expects exactly one positional parameter and kwargs are provided,
                # bundle kwargs into a single dict to match run(params) convention.
                try:
                    sig = inspect.signature(member)
                except (ValueError, TypeError):
                    sig = None

                if sig is not None:
                    params = sig.parameters
                    non_variadic = [p for p in params.values() if p.kind in (p.POSITIONAL_ONLY, p.POSITIONAL_OR_KEYWORD)]
                    has_var_pos = any(p.kind == p.VAR_POSITIONAL for p in params.values())

                    if (len(non_variadic) == 1 and not has_var_pos):
                        # member likely expects a single dict parameter
                        # If args contains one dict, use it; else merge kwargs and map common arg names.
                        if len(args) == 1 and isinstance(args[0], dict):
                            single_param = args[0]
                        else:
                            single_param = {}
                            single_param.update(kwargs or {})
                            if args:
                                # Friendly heuristic: common callsite (symbols, filters, filter_logic)
                                if len(args) == 3:
                                    single_param.setdefault("symbols", args[0])
                                    single_param.setdefault("filters", args[1])
                                    single_param.setdefault("filter_logic", args[2])
                                elif len(args) == 2:
                                    single_param.setdefault("arg1", args[0])
                                    single_param.setdefault("arg2", args[1])
                                else:
                                    # fallback: keep args under 'args'
                                    single_param.setdefault("args", args)
                        return await _bind_and_call_member(member, single_param)

                # Otherwise call with normal args/kwargs
                return await _bind_and_call_member(member, *args, **kwargs)

    # 3) As a last attempt, if wrapper is callable via __call__, use that
    if hasattr(tool_obj, "__call__") and callable(getattr(tool_obj, "__call__")):
        member = getattr(tool_obj, "__call__")
        return await _bind_and_call_member(member, *args, **kwargs)

    raise TypeError(f"Tool object of type {type(tool_obj)} is not invokable by _invoke_tool")




# Configure logging with environment-based level
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("stock-scanner-mcp")

# Initialize FastMCP server
mcp = FastMCP(
    name="Stock Scanner MCP Server",
    version="2.0.0"
)

# Paths
DATA_DIR = Path(__file__).resolve().parent


# Redis cache configuration
try:
    redis_client = redis.from_url(
        os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        decode_responses=True
    )
    redis_client.ping()
    CACHE_ENABLED = True
    logger.info("Redis cache connected successfully")
except Exception as e:
    logger.warning(f"Redis not available: {e}. Caching disabled.")
    CACHE_ENABLED = False

# Cache TTL settings (in seconds)
CACHE_TTL = {
    'stock_data': 3600,      # 1 hour
    'indicator': 1800,        # 30 minutes
    'scan_result': 300        # 5 minutes
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_from_cache(key: str) -> Optional[Any]:
    """Get data from Redis cache"""
    if not CACHE_ENABLED:
        return None
    
    try:
        cached = redis_client.get(key)
        if cached:
            logger.info(f"Cache HIT: {key}")
            return json.loads(cached)
    except Exception as e:
        logger.error(f"Cache read error: {e}")
    
    logger.info(f"Cache MISS: {key}")
    return None


def set_in_cache(key: str, value: Any, ttl: int):
    """Store data in Redis cache"""
    if not CACHE_ENABLED:
        return
    
    try:
        redis_client.setex(
            key,
            ttl,
            json.dumps(value)
        )
        logger.info(f"Cache SET: {key} (TTL: {ttl}s)")
    except Exception as e:
        logger.error(f"Cache write error: {e}")


def _parse_offset(offset_val) -> int:
    """Parse offset value (int or string) to integer index."""
    if isinstance(offset_val, int):
        return offset_val
    if str(offset_val) == 'latest':
        return 0
    if str(offset_val).endswith('d_ago'): # e.g. '1d_ago'
        try:
            return int(str(offset_val).replace('d_ago', ''))
        except:
            return 0
    return 0


# ============================================================================
# API CLIENT HELPER
# ============================================================================

API_BASE_URL = os.getenv('API_URL', 'http://localhost:4001')
USE_LOCAL_CANDLES = os.getenv('USE_LOCAL_CANDLES', 'true').lower() == 'true'

def _api_request(method: str, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Make a request to the centralized API."""
    url = f"{API_BASE_URL}{endpoint}"
    try:
        if method.upper() == 'GET':
            response = requests.get(url, params=data, timeout=10)
        else:
            response = requests.request(method, url, json=data, timeout=10)
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {e}")
        raise ValueError(f"Failed to communicate with API: {str(e)}")

def _ensure_symbols_list(symbols: List[str]) -> List[str]:
    """Return sorted unique uppercase symbols, discarding blanks."""
    cleaned = []
    for symbol in symbols:
        value = symbol.strip().upper()
        if value:
            cleaned.append(value)
    return sorted(set(cleaned))

def _resolve_watchlist_symbols(identifier: str) -> List[str]:
    """Resolve symbols from a watchlist via API."""
    try:
        # We need to list watchlists to find the ID if identifier is a name, 
        # or just try to fetch it. 
        # The API doesn't have a direct "get by name" but list returns all.
        # Or we can try to fetch by ID.
        # For simplicity, let's list and find.
        response = _api_request('GET', '/api/watchlists')
        watchlists = response.get('watchlists', {})
        
        # Check if identifier is a key
        if identifier in watchlists:
            return watchlists[identifier]['symbols']
        
        # Check if identifier is a name
        for wl in watchlists.values():
            if wl.get('name') == identifier:
                return wl['symbols']
                
        raise ValueError(f"Watchlist '{identifier}' not found")
    except Exception as e:
        logger.error(f"Error resolving watchlist: {e}")
        raise ValueError(f"Failed to resolve watchlist '{identifier}': {e}")

def _resolve_scan_symbols(symbols: Optional[List[str]], watchlist_id: Optional[str]) -> List[str]:
    if symbols:
        return _ensure_symbols_list(symbols)
    if watchlist_id:
        return _resolve_watchlist_symbols(watchlist_id)
    raise ValueError("Either symbols or watchlist_id must be provided")



@mcp.tool()
def create_watchlist(
    name: str,
    symbols: List[str],
    description: str = ""
) -> Dict[str, Any]:
    """Create a new watchlist and persist it via API.

    Args:
        name: Human-friendly name of the watchlist.
        symbols: List of stock symbols to track.
        description: Optional description for the watchlist.

    Returns:
        The created watchlist entry with id, symbols and metadata.
    """
    payload = {
        "name": name,
        "symbols": _ensure_symbols_list(symbols),
        "description": description
    }
    return _api_request('POST', '/api/watchlists', payload)


@mcp.tool()
def list_watchlists() -> Dict[str, Any]:
    """List all saved watchlists via API.

    Args:
        None.

    Returns:
        Dictionary with watchlists array and metadata.
    """
    return _api_request('GET', '/api/watchlists')


@mcp.tool()
def update_watchlist_symbols(
    identifier: str,
    symbols: List[str]
) -> Dict[str, Any]:
    """Replace the symbols of an existing watchlist via API.

    Args:
        identifier: Watchlist id or name.
        symbols: New list of symbols for the watchlist.

    Returns:
        Updated watchlist entry.
    """
    payload = {
        "symbols": _ensure_symbols_list(symbols)
    }
    # The API expects ID. If identifier is name, we rely on API to handle it or we resolve it first?
    # WatchlistsService.updateWatchlistSymbols handles name lookup.
    return _api_request('PATCH', f'/api/watchlists/{identifier}/symbols', payload)


@mcp.tool()
def delete_watchlist(identifier: str) -> Dict[str, Any]:
    """Delete a watchlist by identifier via API.

    Args:
        identifier: Watchlist id or name.

    Returns:
        Dictionary with deletion status and id.
    """
    return _api_request('DELETE', f'/api/watchlists/{identifier}')


@mcp.tool()
def get_watchlist_scan_results(
    identifier: str,
    filters: List[Dict[str, Any]],
    filter_logic: str = "AND",
) -> Dict[str, Any]:
    """Run a scan for all symbols in a watchlist via API.

    Args:
        identifier: Watchlist id or name.
        filters: List of filter configurations.
        filter_logic: Logical operator across filters ('AND' or 'OR').

    Returns:
        Scan result dictionary.
    """
    payload = {
        "filters": filters,
        "filterLogic": filter_logic
    }
    return _api_request('POST', f'/api/watchlists/{identifier}/scan', payload)


@mcp.tool()
def create_saved_scan(
    name: str,
    filters: List[Dict[str, Any]],
    filter_logic: str = "AND",
    symbols: Optional[List[str]] = None,
    description: str = "",
) -> Dict[str, Any]:
    """Create a saved scan definition via API.

    Args:
        name: Name of the saved scan.
        filters: List of filter configurations.
        filter_logic: Logical operator across filters.
        symbols: Optional default symbol universe for this scan.
        description: Optional description of the scan.

    Returns:
        The created saved scan entry.
    """
    payload = {
        "name": name,
        "filters": filters,
        "filterLogic": filter_logic,
        "symbols": _ensure_symbols_list(symbols) if symbols else [],
        "description": description
    }
    return _api_request('POST', '/api/saved-scans', payload)


@mcp.tool()
def list_saved_scans() -> Dict[str, Any]:
    """List all saved scan definitions via API.

    Args:
        None.

    Returns:
        Dictionary with scans array and metadata.
    """
    return _api_request('GET', '/api/saved-scans')


@mcp.tool()
def run_saved_scan(identifier: str) -> Dict[str, Any]:
    """Execute a saved scan by identifier via API.

    Args:
        identifier: Saved scan id or name.

    Returns:
        Scan results for the saved scan definition.
    """
    return _api_request('POST', f'/api/saved-scans/{identifier}/run')


@mcp.tool()
def delete_saved_scan(identifier: str) -> Dict[str, Any]:
    """Delete a saved scan definition via API.

    Args:
        identifier: Saved scan id or name.

    Returns:
        Dictionary with deletion status and id.
    """
    return _api_request('DELETE', f'/api/saved-scans/{identifier}')





def calculate_sma(df: pd.DataFrame, period: int = 20) -> pd.Series:
    """Calculate Simple Moving Average"""
    return df['close'].rolling(window=period).mean()


def calculate_ema(df: pd.DataFrame, period: int = 20) -> pd.Series:
    """Calculate Exponential Moving Average"""
    return df['close'].ewm(span=period, adjust=False).mean()


def calculate_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Relative Strength Index using Wilder's Smoothing"""
    delta = df['close'].diff()
    
    # Get gains (up) and losses (down)
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    
    # Calculate Avg Gain/Loss using Wilder's Smoothing (alpha=1/period)
    avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    
    return rsi


def calculate_macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, pd.Series]:
    """Calculate MACD indicator"""
    ema_fast = df['close'].ewm(span=fast, adjust=False).mean()
    ema_slow = df['close'].ewm(span=slow, adjust=False).mean()
    
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    
    return {
        'macd': macd_line,
        'signal': signal_line,
        'histogram': histogram
    }


def calculate_bollinger_bands(df: pd.DataFrame, period: int = 20, std_dev: int = 2) -> Dict[str, pd.Series]:
    """Calculate Bollinger Bands"""
    sma = df['close'].rolling(window=period).mean()
    std = df['close'].rolling(window=period).std()
    
    upper_band = sma + (std * std_dev)
    middle_band = sma
    lower_band = sma - (std * std_dev)
    
    # Calculate %B
    percent_b = (df['close'] - lower_band) / (upper_band - lower_band)
    
    return {
        'upper': upper_band,
        'middle': middle_band,
        'lower': lower_band,
        'percent_b': percent_b
    }


def calculate_wma(df: pd.DataFrame, period: int = 20) -> pd.Series:
    """Calculate Weighted Moving Average (WMA)."""
    close = df['close']
    weights = np.arange(1, period + 1)
    
    def wma_func(x):
        return np.dot(x, weights) / weights.sum()
        
    return close.rolling(window=period).apply(wma_func, raw=True)


def calculate_vwap(df: pd.DataFrame) -> pd.Series:
    """Calculate Volume Weighted Average Price (VWAP)."""
    # VWAP is typically intraday, strictly speaking it resets daily.
    # For daily data, it's often just (TP * V).cumsum() / V.cumsum() over the loaded period?
    # Or typically anchored. For this scanner, we'll calculate it over the loaded Dataframe.
    
    typical_price = (df['high'] + df['low'] + df['close']) / 3
    
    # If we have a lot of data, this might be a long-term VWAP. 
    # For intraday, we'd group by day. Assuming this DF is what's passed 
    # (which might be 200 days), this is a "period VWAP".
    
    vwap = (typical_price * df['volume']).cumsum() / df['volume'].cumsum()
    return vwap


def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Average True Range (ATR)."""
    high = df['high']
    low = df['low']
    close = df['close'].shift(1)
    
    tr1 = high - low
    tr2 = (high - close).abs()
    tr3 = (low - close).abs()
    
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1/period, adjust=False).mean() # Wilder's smoothing
    return atr


def calculate_adx(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Average Directional Index (ADX)."""
    high = df['high']
    low = df['low']
    close_prev = df['close'].shift(1)
    
    up_move = high - high.shift(1)
    down_move = low.shift(1) - low
    
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
    
    # Calculate ATR
    atr = calculate_atr(df, period)
    
    # Smooth DM
    plus_di = 100 * pd.Series(plus_dm, index=df.index).ewm(alpha=1/period, adjust=False).mean() / atr
    minus_di = 100 * pd.Series(minus_dm, index=df.index).ewm(alpha=1/period, adjust=False).mean() / atr
    
    dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
    adx = dx.ewm(alpha=1/period, adjust=False).mean()
    
    return adx


def calculate_stoch(df: pd.DataFrame, period: int = 14, smooth_k: int = 3) -> Dict[str, pd.Series]:
    """Calculate Stochastic Oscillator."""
    high = df['high'].rolling(window=period).max()
    low = df['low'].rolling(window=period).min()
    close = df['close']
    
    k = 100 * ((close - low) / (high - low))
    
    # Smooth K (Fast Stoch -> Slow Stoch if smoothed)
    if smooth_k > 1:
        k = k.rolling(window=smooth_k).mean()
        
    return {'k': k} # We can add 'd' if needed (SMA of K)


def calculate_supertrend(df: pd.DataFrame, period: int = 10, multiplier: float = 3.0) -> pd.Series:
    """Calculate Supertrend."""
    atr = calculate_atr(df, period)
    
    high = df['high']
    low = df['low']
    close = df['close']
    
    hl2 = (high + low) / 2
    
    basic_upper = hl2 + (multiplier * atr)
    basic_lower = hl2 - (multiplier * atr)
    
    # Initialize series
    final_upper = pd.Series(0.0, index=df.index)
    final_lower = pd.Series(0.0, index=df.index)
    supertrend = pd.Series(0.0, index=df.index)
    
    # We need to iterate to implement the logic which depends on previous values
    # Optimizing this in pandas is tricky because of the conditional dependency on previous close.
    # We will do a loop for MVP correctness.
    
    # Pre-calculate arrays for speed
    bu = basic_upper.values
    bl = basic_lower.values
    c = close.values
    
    fu = np.zeros(len(df))
    fl = np.zeros(len(df))
    st = np.zeros(len(df))
    
    for i in range(1, len(df)):
        # Upper Band
        if bu[i] < fu[i-1] or c[i-1] > fu[i-1]:
            fu[i] = bu[i]
        else:
            fu[i] = fu[i-1]
            
        # Lower Band
        if bl[i] > fl[i-1] or c[i-1] < fl[i-1]:
            fl[i] = bl[i]
        else:
            fl[i] = fl[i-1]
            
        # Supertrend
        if st[i-1] == fu[i-1]:
            if c[i] > fu[i]:
                st[i] = fl[i] # Trend Up
            else:
                st[i] = fu[i] # Trend Down
        else:
            if c[i] < fl[i]:
                st[i] = fu[i] # Trend Down
            else:
                st[i] = fl[i] # Trend Up

    return pd.Series(st, index=df.index)


def calculate_psar(df: pd.DataFrame, step: float = 0.02, max_step: float = 0.2) -> pd.Series:
    """Calculate Parabolic SAR."""
    high = df['high']
    low = df['low']
    close = df['close']
    
    psar = close.copy()
    psar_series = pd.Series(index=psar.index, dtype='float64')
    
    bullish = True
    af = step
    hp = high.iloc[0]
    lp = low.iloc[0]
    
    # Initialize
    psar_series.iloc[0] = low.iloc[0]
    
    for i in range(1, len(df)):
        curr_high = high.iloc[i]
        curr_low = low.iloc[i]
        prev_psar = psar_series.iloc[i-1]
        
        if bullish:
            psar_series.iloc[i] = prev_psar + af * (hp - prev_psar)
            psar_series.iloc[i] = min(psar_series.iloc[i], low.iloc[i-1])
            if i > 1:
                psar_series.iloc[i] = min(psar_series.iloc[i], low.iloc[i-2])
            
            if curr_low < psar_series.iloc[i]:
                bullish = False
                psar_series.iloc[i] = hp
                lp = curr_low
                af = step
            else:
                if curr_high > hp:
                    hp = curr_high
                    af = min(af + step, max_step)
                    
        else: # Bearish
            psar_series.iloc[i] = prev_psar + af * (lp - prev_psar)
            psar_series.iloc[i] = max(psar_series.iloc[i], high.iloc[i-1])
            if i > 1:
                psar_series.iloc[i] = max(psar_series.iloc[i], high.iloc[i-2])
                
            if curr_high > psar_series.iloc[i]:
                bullish = True
                psar_series.iloc[i] = lp
                hp = curr_high
                af = step
            else:
                if curr_low < lp:
                    lp = curr_low
                    af = min(af + step, max_step)

    return psar_series


def calculate_ichimoku(df: pd.DataFrame, tenkan_period: int = 9, kijun_period: int = 26, senkou_b_period: int = 52) -> Dict[str, pd.Series]:
    """Calculate Ichimoku Cloud components."""
    high = df['high']
    low = df['low']
    
    # Tenkan-sen (Conversion Line): (9-period high + 9-period low)/2
    tenkan_sen = (high.rolling(window=tenkan_period).max() + low.rolling(window=tenkan_period).min()) / 2
    
    # Kijun-sen (Base Line): (26-period high + 26-period low)/2
    kijun_sen = (high.rolling(window=kijun_period).max() + low.rolling(window=kijun_period).min()) / 2
    
    # Senkou Span A (Leading Span A): (Tenkan + Kijun)/2 shifted ahead 26 periods
    senkou_span_a = ((tenkan_sen + kijun_sen) / 2).shift(kijun_period)
    
    # Senkou Span B (Leading Span B): (52-period high + 52-period low)/2 shifted ahead 26 periods
    senkou_span_b = ((high.rolling(window=senkou_b_period).max() + low.rolling(window=senkou_b_period).min()) / 2).shift(kijun_period)
    
    # Chikou Span (Lagging Span): Close shifted back 26 periods
    chikou_span = df['close'].shift(-kijun_period)
    
    return {
        'tenkan': tenkan_sen,
        'kijun': kijun_sen,
        'senkou_a': senkou_span_a,
        'senkou_b': senkou_span_b,
        'chikou': chikou_span
    }


def calculate_aroon(df: pd.DataFrame, period: int = 25) -> Dict[str, pd.Series]:
    """Calculate Aroon Indicator.
    
    Aroon Up = ((Period - Days since Period High) / Period) * 100
    Aroon Down = ((Period - Days since Period Low) / Period) * 100
    Aroon Oscillator = Aroon Up - Aroon Down
    """
    high = df['high']
    low = df['low']
    
    def days_since_high(x):
        return period - np.argmax(x)
    
    def days_since_low(x):
        return period - np.argmin(x)
    
    aroon_up = high.rolling(window=period + 1).apply(days_since_high, raw=True) / period * 100
    aroon_down = low.rolling(window=period + 1).apply(days_since_low, raw=True) / period * 100
    aroon_oscillator = aroon_up - aroon_down
    
    return {
        'aroon_up': aroon_up,
        'aroon_down': aroon_down,
        'oscillator': aroon_oscillator
    }


def calculate_cci(df: pd.DataFrame, period: int = 20) -> pd.Series:
    """Calculate Commodity Channel Index (CCI).
    
    CCI = (Typical Price - SMA of TP) / (0.015 * Mean Absolute Deviation)
    Typical Price = (High + Low + Close) / 3
    """
    typical_price = (df['high'] + df['low'] + df['close']) / 3
    sma = typical_price.rolling(window=period).mean()
    
    def mean_absolute_deviation(x):
        return np.abs(x - x.mean()).mean()
    
    mad = typical_price.rolling(window=period).apply(mean_absolute_deviation, raw=True)
    cci = (typical_price - sma) / (0.015 * mad)
    
    return cci


def calculate_williams_r(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Williams %R.
    
    Williams %R = ((Highest High - Close) / (Highest High - Lowest Low)) * -100
    """
    highest_high = df['high'].rolling(window=period).max()
    lowest_low = df['low'].rolling(window=period).min()
    
    williams_r = ((highest_high - df['close']) / (highest_high - lowest_low)) * -100
    
    return williams_r


def calculate_obv(df: pd.DataFrame) -> pd.Series:
    """Calculate On-Balance Volume (OBV).
    
    OBV adds volume on up days, subtracts on down days.
    """
    close = df['close']
    volume = df['volume']
    
    direction = np.where(close > close.shift(1), 1, np.where(close < close.shift(1), -1, 0))
    obv = (volume * direction).cumsum()
    
    return pd.Series(obv, index=df.index)


def calculate_mfi(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculate Money Flow Index (MFI).
    
    Similar to RSI but uses volume.
    """
    typical_price = (df['high'] + df['low'] + df['close']) / 3
    raw_money_flow = typical_price * df['volume']
    
    positive_flow = np.where(typical_price > typical_price.shift(1), raw_money_flow, 0)
    negative_flow = np.where(typical_price < typical_price.shift(1), raw_money_flow, 0)
    
    positive_mf = pd.Series(positive_flow, index=df.index).rolling(window=period).sum()
    negative_mf = pd.Series(negative_flow, index=df.index).rolling(window=period).sum()
    
    money_flow_ratio = positive_mf / negative_mf
    mfi = 100 - (100 / (1 + money_flow_ratio))
    
    return mfi


def calculate_roc(df: pd.DataFrame, period: int = 12) -> pd.Series:
    """Calculate Rate of Change (ROC).
    
    ROC = ((Close - Close N periods ago) / Close N periods ago) * 100
    """
    close = df['close']
    roc = ((close - close.shift(period)) / close.shift(period)) * 100
    
    return roc


def evaluate_condition(
    current_value: float,
    compare_value: float,
    operator: str,
    previous_value: Optional[float] = None,
    previous_compare: Optional[float] = None
) -> bool:
    """Evaluate a filter condition"""
    
    if operator in ['gt', '>']:
        return current_value > compare_value
    elif operator in ['gte', '>=']:
        return current_value >= compare_value
    elif operator in ['lt', '<']:
        return current_value < compare_value
    elif operator in ['lte', '<=']:
        return current_value <= compare_value
    elif operator in ['eq', '==']:
        return abs(current_value - compare_value) < 0.01
    elif operator in ['crossed_above', 'crosses_above']:
        if previous_value is None or previous_compare is None:
            return False
        return (current_value > compare_value and 
                previous_value <= previous_compare)
    elif operator in ['crossed_below', 'crosses_below']:
        if previous_value is None or previous_compare is None:
            return False
        return (current_value < compare_value and 
                previous_value >= previous_compare)
    elif operator == 'between':
        # compare_value should be a tuple/list [min, max]
        if isinstance(compare_value, (list, tuple)) and len(compare_value) == 2:
            return compare_value[0] <= current_value <= compare_value[1]
        return False
    
    return False


def calculate_percentage_change(current: float, previous: float) -> float:
    """Calculate percentage change between two numeric values.

    Args:
        current: Current numeric value.
        previous: Previous numeric value.

    Returns:
        Percentage change from previous to current. Returns 0.0 if previous is 0.
    """
    if previous == 0:
        return 0.0
    return ((current - previous) / previous) * 100.0


# ============================================================================
# PHASE 1: CORE TOOLS
# ============================================================================


class StockDataProvider:
    """Abstract base for fetching OHLCV data for a single symbol.

    Implementations must return a dictionary matching the shape currently
    produced by _fetch_stock_data_core so existing callers continue to work
    without modification.
    """

    def fetch_ohlc(
        self,
        symbol: str,
        interval: str,
        outputsize: str,
    ) -> Dict[str, Any]:
        raise NotImplementedError("fetch_ohlc must be implemented by subclasses")


def _fetch_market_data_from_api(
    symbol: str,
    resolution: str,
    from_ts: int,
    to_ts: int
) -> Dict[str, Any]:
    """Fetch market data from centralized API (live or local)."""
    params = {
        'symbol': symbol,
        'resolution': resolution,
        'from': from_ts,
        'to': to_ts
    }
    endpoint = '/api/market-data/candles/local' if USE_LOCAL_CANDLES else '/api/market-data/candles'
    endpoint = '/api/market-data/candles/local' if USE_LOCAL_CANDLES else '/api/market-data/candles'
    return _api_request('GET', endpoint, params)


def _fetch_metrics_from_api(symbol: str) -> Dict[str, Any]:
    """Fetch basic financials (metrics) from centralized API."""
    params = {'symbol': symbol}
    return _api_request('GET', '/api/market-data/metric', params)


class FinnhubDataProvider(StockDataProvider):
    """Stock data provider backed by Finnhub via the centralized NestJS API."""

    def fetch_ohlc(
        self,
        symbol: str,
        interval: str = "daily",
        outputsize: str = "compact",
    ) -> Dict[str, Any]:
        # Map interval to API/Finnhub resolution
        resolution_map = {
            'daily': 'D',
            'weekly': 'W',
            'monthly': 'M',
            '1min': '1',
            '5min': '5',
            '15min': '15',
            '30min': '30',
            '60min': '60',
        }

        if interval not in resolution_map:
            raise ValueError(f"Invalid interval: {interval}")

        resolution = resolution_map[interval]

        # Calculate timestamps
        now = datetime.now()
        to_ts = int(now.timestamp())

        if outputsize == 'compact':
            # Approx 100 periods back
            if interval == 'daily':
                delta = timedelta(days=150)  # ~100 trading days
            elif interval == 'weekly':
                delta = timedelta(weeks=100)
            elif interval == 'monthly':
                delta = timedelta(days=30 * 100)
            elif interval == '1min':
                delta = timedelta(minutes=100)
            elif interval == '5min':
                delta = timedelta(minutes=500)
            elif interval == '15min':
                delta = timedelta(minutes=1500)
            elif interval == '30min':
                delta = timedelta(minutes=3000)
            elif interval == '60min':
                delta = timedelta(hours=100)
            else:
                delta = timedelta(days=30)
        else:
            # Full history (e.g. 20 years)
            delta = timedelta(days=365 * 20)

        from_ts = int((now - delta).timestamp())

        try:
            raw_data = _fetch_market_data_from_api(symbol, resolution, from_ts, to_ts)
        except Exception as exc:
            logger.error(f"Failed to fetch market data for {symbol}: {exc}")
            # Return empty structure on failure to prevent crash
            return {
                'symbol': symbol,
                'interval': interval,
                'outputsize': outputsize,
                'data_points': 0,
                'data': [],
                'last_updated': datetime.now().isoformat(),
                'latest_price': None,
            }

        # Parse Finnhub-style response {c, h, l, o, v, t, s}
        if raw_data.get('s') != 'ok':
            logger.warning(f"No data returned for {symbol}: {raw_data.get('s')}")
            records: List[Dict[str, Any]] = []
        else:
            records = []
            timestamps = raw_data.get('t', [])
            opens = raw_data.get('o', [])
            highs = raw_data.get('h', [])
            lows = raw_data.get('l', [])
            closes = raw_data.get('c', [])
            volumes = raw_data.get('v', [])

            for i in range(len(timestamps)):
                dt = datetime.fromtimestamp(timestamps[i])
                records.append({
                    'date': dt.strftime('%Y-%m-%d %H:%M:%S') if 'min' in interval else dt.strftime('%Y-%m-%d'),
                    'open': float(opens[i]),
                    'high': float(highs[i]),
                    'low': float(lows[i]),
                    'close': float(closes[i]),
                    'volume': int(volumes[i]),
                })

        result = {
            'symbol': symbol,
            'interval': interval,
            'outputsize': outputsize,
            'data_points': len(records),
            'data': records,
            'last_updated': datetime.now().isoformat(),
            'latest_price': records[-1]['close'] if records else None,
        }

        return result


class MockDataProvider(StockDataProvider):
    """Mock stock data provider for fallback/testing."""

    def fetch_ohlc(
        self,
        symbol: str,
        interval: str = "daily",
        outputsize: str = "compact",
    ) -> Dict[str, Any]:
        logger.info(f"Generating mock data for {symbol}")
        
        # Generate 150 days of mock data
        days = 150
        records = []
        
        # Seed mostly random but deterministic per symbol for consistency during a scan
        import random
        r = random.Random(symbol) 
        
        price = 100.0 + (r.random() * 100)
        now = datetime.now()
        
        for i in range(days):
            dt = now - timedelta(days=(days - i))
            
            # Random walk
            change = (r.random() - 0.5) * 4 # +/- 2%
            price = price * (1 + change/100)
            
            high = price * (1 + (r.random() * 1)/100)
            low = price * (1 - (r.random() * 1)/100)
            open_p = (high + low) / 2 # simplified
            close_p = price
            volume = int(100000 + r.random() * 900000)
            
            records.append({
                'date': dt.strftime('%Y-%m-%d'),
                'open': round(open_p, 2),
                'high': round(high, 2),
                'low': round(low, 2),
                'close': round(close_p, 2),
                'volume': volume
            })
            
        return {
            'symbol': symbol,
            'interval': interval,
            'outputsize': outputsize,
            'data_points': len(records),
            'data': records,
            'last_updated': datetime.now().isoformat(),
            'latest_price': records[-1]['close'] if records else None,
        }


# Default provider for stock data.
STOCK_DATA_PROVIDER: StockDataProvider = FinnhubDataProvider()
MOCK_DATA_PROVIDER: StockDataProvider = MockDataProvider()


def _fetch_stock_universe_from_api(exchange: str = None) -> List[Dict[str, Any]]:
    """Fetch stock universe from centralized API."""
    params = {}
    # Ensure we get a large universe, overriding default pagination (100)
    params['take'] = 5000
        
    try:
        data = _api_request('GET', '/api/symbols', params)
        # The API returns { symbols: [...], total: ... }
        return data.get('symbols', [])
    except Exception as e:
        logger.error(f"Failed to fetch stock universe: {e}")
        return []

@mcp.tool()
def fetch_stock_universe(exchange: str = "US") -> str:
    """
    Fetch the list of available stocks for a given exchange.
    
    Args:
        exchange: The exchange code (e.g., 'US', 'NSE', 'BSE'). Defaults to 'US'.
    """
    symbols = _fetch_stock_universe_from_api(exchange)
    return json.dumps(symbols, indent=2)


def _fetch_stock_data_core(
    symbol: str,
    interval: str = "daily",
    outputsize: str = "compact"
) -> Dict[str, Any]:
    """Core logic for fetching stock data via the configured StockDataProvider."""

    cache_key = f"stock:{symbol}:{interval}:{outputsize}"

    # Check cache first
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    logger.info(f"Fetching {symbol} data - {interval} ({outputsize})")

    # Delegate to provider with fallback
    try:
        result = STOCK_DATA_PROVIDER.fetch_ohlc(symbol=symbol, interval=interval, outputsize=outputsize)
        
        # Check if empty (e.g. rate limited or invalid symbol)
        if not result.get('data'):
             raise ValueError("Empty data returned from primary provider")
             
    except Exception as e:
        logger.warning(f"Primary provider failed for {symbol}: {e}. Falling back to Mock.")
        result = MOCK_DATA_PROVIDER.fetch_ohlc(symbol=symbol, interval=interval, outputsize=outputsize)

    # Cache the result, guarding against unexpected shapes
    try:
        set_in_cache(cache_key, result, CACHE_TTL['stock_data'])
    except Exception as exc:
        logger.error(f"Failed to cache stock data for {symbol}: {exc}")

    return result


@mcp.tool()
def fetch_stock_data(
    symbol: str,
    interval: str = "daily",
    outputsize: str = "compact"
) -> Dict[str, Any]:
    """
    Fetch historical stock price data from Alpha Vantage.
    
    Args:
        symbol: Stock ticker symbol (e.g., 'AAPL', 'RELIANCE.BSE')
        interval: Time interval - 'daily', 'weekly', 'monthly', '1min', '5min', '15min', '30min', '60min'
        outputsize: 'compact' (100 recent data points) or 'full' (20+ years of data)
    
    Returns:
        Dictionary containing:
        - data: List of OHLCV records with dates
        - symbol: Stock symbol
        - interval: Time interval
        - last_updated: Timestamp of data fetch
    
    Example:
        fetch_stock_data("AAPL", "daily", "compact")
    """
    return _fetch_stock_data_core(symbol, interval, outputsize)


@mcp.tool()
def get_technical_indicator(
    symbol: str,
    indicator: str,
    interval: str = "daily",
    time_period: int = 14,
    series_type: str = "close"
) -> Dict[str, Any]:
    """
    Calculate a technical indicator for a stock using local calculation.
    
    Args:
        symbol: Stock ticker symbol
        indicator: Indicator name - 'RSI', 'SMA', 'EMA', 'MACD', 'BBANDS'
        interval: Time interval - 'daily', 'weekly', '5min', etc.
        time_period: Period for calculation (default: 14)
        series_type: Price type - 'close', 'open', 'high', 'low'
    
    Returns:
        Dictionary containing:
        - symbol: Stock symbol
        - indicator: Indicator name
        - values: List of indicator values with dates
        - latest_value: Most recent indicator value
        - parameters: Calculation parameters used
    """
    
    cache_key = f"indicator:{symbol}:{indicator}:{interval}:{time_period}:{series_type}"
    
    # Check cache
    cached = get_from_cache(cache_key)
    if cached:
        return cached
    
    logger.info(f"Calculating {indicator} for {symbol}")
    
    indicator_upper = indicator.upper()
    
    # Fetch stock data
    stock_data_result = _fetch_stock_data_core(symbol, interval, "compact")
    
    if not stock_data_result['data']:
        raise ValueError(f"No data available for {symbol}")
    
    # Convert to DataFrame
    df = pd.DataFrame(stock_data_result['data'])
    df['date'] = pd.to_datetime(df['date'])
    df = df.set_index('date').sort_index()
    
    # Ensure numeric columns
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    values = []
    
    if indicator_upper == 'SMA':
        sma = calculate_sma(df, time_period)
        for date, val in sma.items():
            if not pd.isna(val):
                values.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'value': float(val)
                })
    
    elif indicator_upper == 'EMA':
        ema = calculate_ema(df, time_period)
        for date, val in ema.items():
            if not pd.isna(val):
                values.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'value': float(val)
                })
    
    elif indicator_upper == 'RSI':
        rsi = calculate_rsi(df, time_period)
        for date, val in rsi.items():
            if not pd.isna(val):
                values.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'value': float(val)
                })
    
    elif indicator_upper == 'MACD':
        macd_data = calculate_macd(df)
        # MACD usually returns 3 series: MACD, Signal, Hist
        # We'll structure it to match expected output
        macd_line = macd_data['macd']
        signal_line = macd_data['signal']
        histogram = macd_data['histogram']
        
        for date in df.index:
            if not pd.isna(macd_line[date]):
                values.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'MACD': float(macd_line[date]),
                    'MACD_Signal': float(signal_line[date]),
                    'MACD_Hist': float(histogram[date])
                })
                
    elif indicator_upper == 'BBANDS':
        bbands = calculate_bollinger_bands(df, time_period)
        for date in df.index:
            if not pd.isna(bbands['middle'][date]):
                values.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'upper': float(bbands['upper'][date]),
                    'middle': float(bbands['middle'][date]),
                    'lower': float(bbands['lower'][date])
                })
    
    else:
        raise ValueError(f"Unsupported indicator: {indicator}. Supported: RSI, SMA, EMA, MACD, BBANDS")
    
    result = {
        'symbol': symbol,
        'indicator': indicator,
        'interval': interval,
        'values': values,
        'latest_value': values[-1] if values else None,
        'parameters': {'time_period': time_period, 'series_type': series_type}
    }
    
    # Cache result
    set_in_cache(cache_key, result, CACHE_TTL['indicator'])
    
    return result


def _scan_stocks_core(
    symbols: List[str],
    filters: List[Dict[str, Any]],
    filter_logic: str = "AND"
) -> Dict[str, Any]:
    """Core logic for scanning stocks (internal use)"""
    
    # If no symbols provided, fetch universe from API
    if not symbols:
        logger.info("No symbols provided, fetching full universe from API...")
        universe = _fetch_stock_universe_from_api()
        symbols = [s['ticker'] for s in universe]
        logger.info(f"Fetched {len(symbols)} symbols from universe")

    logger.info(f"Starting scan of {len(symbols)} stocks with {len(filters)} filters")

    # TEMP: Log if any filter has expression
    for i, filter_config in enumerate(filters):
        if 'expression' in filter_config:
            logger.info(f"Filter {i} has expression: {filter_config['expression']}")

    matched_stocks = []
    failed_stocks = []
    
    for symbol in symbols:
        try:
            df_daily_dummy = None # Placeholder if needed
            
            # --- MULTI-TIMEFRAME SUPPORT ---
            # Identify all required timeframes
            required_timeframes = set()
            required_timeframes.add('daily') # Always fetch daily for basic checks/enrichment
            
            for f in filters:
                required_timeframes.add(f.get('timeframe', 'daily'))
                # Also check compareToTimeframe
                if 'compareToTimeframe' in f:
                    required_timeframes.add(f['compareToTimeframe'])
                if isinstance(f.get('value'), dict):
                     if 'timeframe' in f['value']:
                         required_timeframes.add(f['value']['timeframe'])

            data_frames = {}
            error_in_fetch = False
            
            for tf in required_timeframes:
                 try:
                    # Fetch stock data
                    stock_data = _fetch_stock_data_core(symbol, tf, "compact")
                    if not stock_data['data']:
                        # If primary timeframe fails, it's critical
                        if tf == 'daily':
                             failed_stocks.append({'symbol': symbol, 'error': 'No daily data'})
                             error_in_fetch = True
                             break
                        else:
                             # Warning?
                             pass
                    
                    df = pd.DataFrame(stock_data['data'])
                    df['date'] = pd.to_datetime(df['date'])
                    data_frames[tf] = df.set_index('date').sort_index()
                    logger.info(f"Symbol {symbol} {tf} DF: {len(df)} rows. Last: {df.index[-1]}")
                    
                 except Exception as e:
                     logger.error(f"Failed to fetch {tf} for {symbol}: {e}")
                     if tf == 'daily': error_in_fetch = True
            
            if error_in_fetch or 'daily' not in data_frames:
                 continue
            
            # Primary DF for enrichment (Daily)
            df = data_frames['daily'] 


            # --- ENRICHMENT START ---
            # Check if we need to fetch additional metrics (financials, etc.)
            # Identify fields required by filters that are missing in OHLCV
            needed_fields = set()
            for f in filters:
                if 'field' in f:
                    needed_fields.add(f['field'])
                # Also check AST expressions or RHS 'indicator' values if complex
            
            existing_cols = set(df.columns)
            missing_fields = needed_fields - existing_cols
            
            # Common financial fields that might be requested
            financial_map = {
                'marketCap': 'marketCapitalization',
                'pe_ratio': 'peBasicExclExtraTTM',
                'peRatio': 'peBasicExclExtraTTM', 
                'pb_ratio': 'pbQuarterly',
                'eps': 'epsExclExtraTTM',
                'dividend_yield': 'dividendYieldIndicatedAnnual',
                'beta': 'beta',
                'current_ratio': 'currentRatioQuarterly',
                'debt_to_equity': 'totalDebtToEquityQuarterly',
                'roe': 'roeTTM',
                'net_sales': 'revenueTTM',
                'net_profit': 'netIncomeTTM',
                'operating_cash_flow': 'currentRatioQuarterly', # Fallback or use a specific if available? 
                # Finnhub basic metrics might not have OCF directly in the root 'metric' object or named differently. 
                # Checking docs: 'operatingCashFlowTTM' is common in basic financials.
                # Let's try 'operatingCashFlowPerShareTTM' * shares? Or just map to something close if OCF isn't there?
                # Actually, Finnhub 'metric' has 'operatingCashFlowTTM'.
                'operating_cash_flow': 'operatingCashFlowTTM',
                'book_value': 'bookValuePerShareAnnual',
                'bookValue': 'bookValuePerShareAnnual',
            }

            if missing_fields:
                try:
                    # Only fetch if we suspect it's a financial metric (not just a typo)
                    # For now, just try fetching if ANY field is missing
                    metrics_resp = _fetch_metrics_from_api(symbol)
                    
                    if metrics_resp and 'metric' in metrics_resp:
                        metrics = metrics_resp['metric']
                        
                        # Add mapped fields
                        for user_field, api_field in financial_map.items():
                            if api_field in metrics:
                                metrics[user_field] = metrics[api_field]

                        # Add metrics to DataFrame (broadcast)
                        for field in missing_fields:
                            if field in metrics:
                                # Ensure it's numeric if possible, or object
                                val = metrics[field]
                                df[field] = val
                except Exception as e:
                    # Log but continue (field will remain missing and filter will likely fail/skip)
                    # logger.warning(f"Failed to enrich metrics for {symbol}: {e}")
                    pass
            # --- ENRICHMENT END ---
            
            # Evaluate each filter
            filter_results = []
            filter_details = []
            
            for filter_config in filters:
                try:
                    result, detail = evaluate_single_filter(symbol, data_frames, filter_config)
                    filter_results.append(result)
                    filter_details.append(detail)
                except Exception as e:
                    # Special handling for missing field error to be clearer?
                    # logger.error(f"Filter evaluation error for {symbol}: {e}")
                    filter_results.append(False)
                    filter_details.append({'error': str(e)})
            
            # Apply filter logic
            if filter_logic.upper() == 'AND':
                passed = all(filter_results)
            elif filter_logic.upper() == 'OR':
                passed = any(filter_results)
            else:
                passed = all(filter_results)  # Default to AND
            
            # If stock passed filters, add to results
            if passed:
                latest = df.iloc[-1]
                matched_stocks.append({
                    'symbol': symbol,
                    'close': float(latest['close']),
                    'volume': int(latest['volume']) if not pd.isna(latest['volume']) else None,
                    'date': df.index[-1].strftime('%Y-%m-%d'),
                    'matched_filters': sum(filter_results),
                    'total_filters': len(filters),
                    'filter_details': filter_details
                })
        
        except Exception as e:
            logger.error(f"Error scanning {symbol}: {e}")
            failed_stocks.append({'symbol': symbol, 'error': str(e)})
    
    result = {
        'matched_stocks': matched_stocks,
        'total_matched': len(matched_stocks),
        'total_scanned': len(symbols),
        'failed_stocks': failed_stocks,
        'filter_logic': filter_logic,
        'filters_applied': filters,
        'scan_time': datetime.now().isoformat()
    }
    
    logger.info(f"Scan complete: {len(matched_stocks)}/{len(symbols)} stocks matched")
    
    return result


@mcp.tool()
def scan_stocks(
    symbols: List[str],
    filters: List[Dict[str, Any]],
    filter_logic: str = "AND"
) -> Dict[str, Any]:
    """
    Scan multiple stocks based on custom technical filters.
    
    Args:
        symbols: List of stock ticker symbols to scan
        filters: List of filter conditions. Each filter should have:
            - type: 'price', 'indicator', 'volume', 'price_change',
              'volume_change', 'price_52week', 'gap', or 'pattern'
            - field: Field or indicator name (e.g., 'close', 'RSI')
            - operator: 'gt', 'gte', 'lt', 'lte', 'eq', 'crossed_above',
              'crossed_below', 'between'
            - value: Comparison value or [min, max] for 'between'
            - time_period: (optional) Period for indicator calculation
            - offset: (optional) Days ago to check (0 = today, 1 = yesterday)
            - lookback: (optional) Generic lookback window for change filters
            - lookback_days: (optional) Number of trading days for 52-week filters
            - metric: (optional) Metric identifier for advanced filters
            - pattern: (optional) Candlestick pattern name for 'pattern' type
        filter_logic: 'AND' (all filters must pass) or 'OR' (any filter passes)
    
    Returns:
        Dictionary containing:
        - matched_stocks: List of stocks that passed the filters
        - total_scanned: Total number of stocks scanned
        - filter_summary: Summary of filters applied
        - scan_time: Timestamp of scan
    
    Example filters:
        [
            {"type": "indicator", "field": "RSI", "operator": "gt", "value": 70, "time_period": 14},
            {"type": "price", "field": "close", "operator": "gt", "value": 100}
        ]
    """
    return _scan_stocks_core(symbols, filters, filter_logic)


def calculate_candlestick_components(row: pd.Series) -> Dict[str, float]:
    """Compute basic candlestick components for a given OHLC row.

    Args:
        row: DataFrame row with open, high, low and close fields.

    Returns:
        Dictionary with body, upper_shadow, lower_shadow and total_range.
    """

    open_price = float(row['open'])
    high_price = float(row['high'])
    low_price = float(row['low'])
    close_price = float(row['close'])

    body = abs(close_price - open_price)
    upper_shadow = high_price - max(open_price, close_price)
    lower_shadow = min(open_price, close_price) - low_price
    total_range = high_price - low_price

    return {
        'body': body,
        'upper_shadow': upper_shadow,
        'lower_shadow': lower_shadow,
        'total_range': total_range,
    }


def detect_candlestick_pattern(df: pd.DataFrame, idx: int, pattern: str) -> Dict[str, Any]:
    """Detect simple candlestick patterns at a given index.

    Args:
        df: Price DataFrame with open, high, low and close columns.
        idx: Index position (can be negative) of the candle to analyse.
        pattern: Pattern name such as 'hammer', 'shooting_star',
            'long_body' or 'small_body'.

    Returns:
        Dictionary with at least a 'matched' boolean and diagnostics.
    """

    required_columns = {'open', 'high', 'low', 'close'}
    if not required_columns.issubset(df.columns):
        return {
            'matched': False,
            'reason': 'Missing OHLC columns for pattern detection',
        }

    row_count = len(df)
    if row_count == 0:
        return {
            'matched': False,
            'reason': 'No data available for pattern detection',
        }

    if idx < 0:
        pos_idx = row_count + idx
    else:
        pos_idx = idx

    if pos_idx < 0 or pos_idx >= row_count:
        return {
            'matched': False,
            'reason': 'Index out of bounds for pattern detection',
        }

    row = df.iloc[pos_idx]
    components = calculate_candlestick_components(row)
    body = components['body']
    upper_shadow = components['upper_shadow']
    lower_shadow = components['lower_shadow']
    total_range = components['total_range']

    if total_range <= 0:
        return {
            'matched': False,
            'body': body,
            'upper_shadow': upper_shadow,
            'lower_shadow': lower_shadow,
            'total_range': total_range,
            'reason': 'Zero price range for candle',
        }

    body_ratio = body / total_range
    upper_ratio = upper_shadow / total_range
    lower_ratio = lower_shadow / total_range

    pattern_lower = pattern.lower()
    matched = False

    if pattern_lower == 'hammer':
        matched = body_ratio <= 0.4 and lower_ratio >= 0.6 and upper_ratio <= 0.2
    elif pattern_lower == 'shooting_star':
        matched = body_ratio <= 0.4 and upper_ratio >= 0.6 and lower_ratio <= 0.2
    elif pattern_lower == 'long_body':
        matched = body_ratio >= 0.6
    elif pattern_lower == 'small_body':
        matched = body_ratio <= 0.2
    else:
        return {
            'matched': False,
            'body': body,
            'upper_shadow': upper_shadow,
            'lower_shadow': lower_shadow,
            'total_range': total_range,
            'body_ratio': body_ratio,
            'upper_ratio': upper_ratio,
            'lower_ratio': lower_ratio,
            'reason': f'Unsupported pattern: {pattern}',
        }

    return {
        'matched': matched,
        'body': body,
        'upper_shadow': upper_shadow,
        'lower_shadow': lower_shadow,
        'total_range': total_range,
        'body_ratio': body_ratio,
        'upper_ratio': upper_ratio,
        'lower_ratio': lower_ratio,
    }


def _get_indicator_value(df: pd.DataFrame, field: str, time_period: int, idx: int, params: Dict[str, Any] = None) -> float:
    """Helper to calculate indicator value at a specific index."""
    field_upper = field.upper()
    params = params or {}
    
    # Handle composite fields like "rsi_9", "rsi_21"
    if '_' in field_upper and not any(k in field_upper for k in ['BBANDS', 'MACD', 'ICHIMOKU', 'SUPERTREND']):
        parts = field_upper.split('_')
        if len(parts) > 1 and parts[-1].isdigit():
             try:
                override_period = int(parts[-1])
                potential_base = '_'.join(parts[:-1])
                # List of single-parameter indicators
                if potential_base in ['RSI', 'SMA', 'EMA', 'WMA', 'RMA', 'TEMA', 'HMA', 'VWMA', 'ATR', 'CCI', 'ADX', 'WILLIAMS_R']:
                    field_upper = potential_base
                    time_period = override_period
             except ValueError:
                pass

    if field_upper == 'RSI':
        series = calculate_rsi(df, time_period)
    elif field_upper == 'SMA':
        series = calculate_sma(df, time_period)
    elif field_upper == 'EMA':
        series = calculate_ema(df, time_period)
    elif field_upper == 'WMA':
        series = calculate_wma(df, time_period)
    elif field_upper == 'VWAP':
        series = calculate_vwap(df)
    elif field_upper == 'ADX':
        series = calculate_adx(df, time_period)
    elif field_upper == 'STOCH':
        stoch = calculate_stoch(df, time_period)
        series = stoch['k']
    elif field_upper == 'ATR':
        series = calculate_atr(df, time_period)
    elif field_upper == 'SUPERTREND':
        multiplier = float(params.get('multiplier', 3.0))
        series = calculate_supertrend(df, time_period, multiplier)

    elif field_upper == 'MAX':
        series = df['high'].rolling(window=time_period).max()
    elif field_upper == 'MIN':
        series = df['low'].rolling(window=time_period).min()
        
    elif field_upper.startswith('MACD'):
        fast = int(params.get('fast', 12))
        slow = int(params.get('slow', 26))
        signal = int(params.get('signal', 9))
        macd_data = calculate_macd(df, fast, slow, signal)
        
        if field_upper == 'MACD_SIGNAL':
            series = macd_data['signal']
        elif field_upper == 'MACD_HIST':
            series = macd_data['histogram']
        else:
            series = macd_data['macd']
            
    elif field_upper.startswith('BBANDS') or field_upper == 'BB_WIDTH':
        std_dev = float(params.get('std_dev', 2.0))
        bb_data = calculate_bollinger_bands(df, time_period, std_dev)
        
        if field_upper == 'BBANDS_UPPER' or field_upper == 'BB_UPPER':
            series = bb_data['upper']
        elif field_upper == 'BBANDS_LOWER' or field_upper == 'BB_LOWER':
            series = bb_data['lower']
        elif field_upper == 'BBANDS_PCT_B':
            series = bb_data['percent_b']
        elif field_upper == 'BB_WIDTH' or field_upper == 'BBANDS_WIDTH':
            # Bandwidth = (Upper - Lower) / Middle
            series = (bb_data['upper'] - bb_data['lower']) / bb_data['middle']
        else:
            series = bb_data['middle']
            
    elif field_upper == 'PARABOLIC_SAR' or field_upper == 'SAR':
        step = float(params.get('step', 0.02))
        max_step = float(params.get('max', 0.2))
        series = calculate_psar(df, step, max_step)
        
    elif field_upper.startswith('ICHIMOKU'):
        tenkan_p = int(params.get('period_fast', 9))
        kijun_p = int(params.get('period_med', 26))
        senkou_b_p = int(params.get('period_slow', 52))
        
        ichimoku = calculate_ichimoku(df, tenkan_p, kijun_p, senkou_b_p)
        
        if 'TENKAN' in field_upper:
            series = ichimoku['tenkan']
        elif 'KIJUN' in field_upper:
            series = ichimoku['kijun']
        elif 'SENKOU_A' in field_upper:
            series = ichimoku['senkou_a']
        elif 'SENKOU_B' in field_upper:
            series = ichimoku['senkou_b']
        elif 'CHIKOU' in field_upper:
            series = ichimoku['chikou']
        else:
            series = ichimoku['tenkan'] # default

    else:
        if field in df.columns:
            series = df[field]
        else:
            raise ValueError(f"Unsupported indicator: {field}")
    
    return float(series.iloc[idx])


def evaluate_ast(node: Dict[str, Any], data_frames: Dict[str, pd.DataFrame], idx: int) -> float:
    """
    Recursively evaluate an AST node.
    
    Node types:
    - attribute: { type: 'attribute', field: 'close' }
    - indicator: { type: 'indicator', field: 'SMA', time_period: 20 }
    - constant: { type: 'constant', value: 100 }
    - binary: { type: 'binary', operator: '+', left: {...}, right: {...} }
    - function: { type: 'function', name: 'Abs', args: [{...}] }
    """
    node_type = node.get('type')
    
    if node_type == 'constant':
        return float(node.get('value', 0))
        
    elif node_type == 'attribute':
        field = node.get('field', '')
        
        # Handle nested AST node as field (e.g. indicator inside attribute)
        if isinstance(field, dict):
            node_offset = int(node.get('offset', 0))
            effective_idx = idx - node_offset
            return evaluate_ast(field, data_frames, effective_idx)

        field = str(field).lower()
        node_offset = int(node.get('offset', 0))
        tf = node.get('timeframe', 'daily')
        df = data_frames.get(tf)
        
        if df is None:
             raise ValueError(f"Timeframe '{tf}' data not found for attribute '{field}'")
             
        # idx is negative (-1 = latest). Subtracting offset moves further back.
        effective_idx = idx - node_offset
        
        if field not in df.columns:
            # Maybe it needs to be calculated on the fly if it's not a standard column?
            # E.g. simple attrs. 
            # Or fail.
            raise ValueError(f"Field '{field}' not found in data ({tf})")
        
        # Check bounds
        if abs(effective_idx) > len(df):
             raise ValueError(f"Offset {node_offset} out of bounds for {field}")
             
        return float(df[field].iloc[effective_idx])
        
    elif node_type == 'indicator':
        field = node.get('field', '')
        time_period = int(node.get('time_period', 14))
        node_offset = int(node.get('offset', 0))
        tf = node.get('timeframe', 'daily')
        df = data_frames.get(tf)
        
        if df is None:
             raise ValueError(f"Timeframe '{tf}' data not found for indicator '{field}'")
             
        effective_idx = idx - node_offset
        
        val = _get_indicator_value(df, field, time_period, effective_idx, params=node)
        # logger.info(f"DEBUG: Indicator {field}({time_period}) at idx {effective_idx}: {val}")
        return val
        
    elif node_type == 'binary':
        left_val = evaluate_ast(node.get('left'), data_frames, idx)
        right_val = evaluate_ast(node.get('right'), data_frames, idx)
        op = node.get('operator')
        
        # logger.info(f"DEBUG: Binary {left_val} {op} {right_val}")
        
        # Arithmetic
        if op == '+': return left_val + right_val
        if op == '-': return left_val - right_val
        if op == '*': return left_val * right_val
        if op == '/': return left_val / right_val if right_val != 0 else 0
        
        # Comparison logic is robust generally
        if op == '>' or op == 'gt': return 1.0 if left_val > right_val else 0.0
        if op == '<' or op == 'lt': return 1.0 if left_val < right_val else 0.0
        if op == '>=' or op == 'gte': return 1.0 if left_val >= right_val else 0.0
        if op == '<=' or op == 'lte': return 1.0 if left_val <= right_val else 0.0
        if op == '==' or op == 'eq': return 1.0 if left_val == right_val else 0.0
        if op == '!=' or op == 'ne': return 1.0 if left_val != right_val else 0.0

        # Logical Operators (using 1.0 for True, 0.0 for False)
        if op == 'AND' or op == '&&': return 1.0 if (left_val != 0 and right_val != 0) else 0.0
        if op == 'OR' or op == '||': return 1.0 if (left_val != 0 or right_val != 0) else 0.0

        # Crossover Logic (Requires evaluating at previous index)
        if op in ['crossed_above', 'crossed_below']:
            # Evaluate at previous candle
            left_prev = evaluate_ast(node.get('left'), data_frames, idx - 1)
            right_prev = evaluate_ast(node.get('right'), data_frames, idx - 1)
            
            if op == 'crossed_above':
                return 1.0 if (left_prev <= right_prev and left_val > right_val) else 0.0
            if op == 'crossed_below':
                return 1.0 if (left_prev >= right_prev and left_val < right_val) else 0.0
        
        raise ValueError(f"Unknown binary operator: {op}")

    elif node_type == 'unary':
        val = evaluate_ast(node.get('operand'), data_frames, idx)
        op = node.get('operator')
        
        if op == 'NOT' or op == '!':
            return 1.0 if val == 0.0 else 0.0
        if op == '-': # Unary minus
            return -val
            
        raise ValueError(f"Unknown unary operator: {op}")
        
    elif node_type == 'function':
        name = node.get('name', '').upper()
        args = [evaluate_ast(arg, df, idx) for arg in node.get('args', [])]
        
        if name == 'ABS': return abs(args[0])
        if name == 'MIN': return min(args)
        if name == 'MAX': return max(args)
        raise ValueError(f"Unknown function: {name}")
        
    raise ValueError(f"Unknown node type: {node_type}")


def evaluate_single_filter(symbol: str, data_frames: Dict[str, pd.DataFrame], filter_config: Dict[str, Any]) -> tuple:
    """
    Evaluate a single filter condition on stock data.
    Returns (passed: bool, details: dict)
    """
    
    filter_type = filter_config.get('type', 'price')
    expression = filter_config.get('expression')
    
    # Get the index position (0 = latest, 1 = previous day, etc.)
    offset_val = filter_config.get('offset', 0)
    offset = _parse_offset(offset_val)
    idx = -(offset + 1)
    prev_idx = -(offset + 2)
    
    # Resolve DataFrame for LHS
    lhs_timeframe = filter_config.get('timeframe', 'daily')
    df = data_frames.get(lhs_timeframe)
    if df is None:
        return False, {'error': f"Timeframe '{lhs_timeframe}' data not found"}

    # 1. AST Expression Evaluation
    if expression:
        try:
            # AST evaluation currently assumes single DF (daily or primary).
            # To support multi-timeframe AST, evaluate_ast needs update.
            # Now passing data_frames!
            result = evaluate_ast(expression, data_frames, idx)
            # In AST mode, result > 0 is True (passed), 0 is False (failed)
            passed = bool(result)
            return passed, {
                'type': 'expression',
                'expression': expression,
                'result': result,
                'passed': passed
            }
        except Exception as e:
            return False, {'error': str(e)}

    field = filter_config.get('field', 'close')
    operator = filter_config.get('operator', 'gt')
    value = filter_config.get('value')
    # Default time_period used if not overriden by field name logic
    time_period = filter_config.get('time_period', 14)
    
    # Calculate LHS Value
    if filter_type == 'indicator':
         # Dynamic indicator calculation
         current_value = _get_indicator_value(df, field, time_period, idx, params=filter_config)
         is_numeric = True
    elif filter_type == 'price':
        # Direct price comparison or pre-calculated field
        if field not in df.columns:
            # Fallback: maybe it IS an indicator but labeled as price?
            # Try dynamic calc if it looks like an indicator
             try:
                current_value = _get_indicator_value(df, field, time_period, idx, params=filter_config)
                is_numeric = True
             except:
                raise ValueError(f"Field '{field}' not found in data and could not be calculated")
        else:
            raw_val = df[field].iloc[idx]
            # Check if value is numeric
            try:
                current_value = float(raw_val)
                is_numeric = True
            except (ValueError, TypeError):
                current_value = str(raw_val)
                is_numeric = False
    else:
        # Other types (financial, etc) - assume in columns for now
        if field not in df.columns:
             # Try enriching? (Only done for daily usually)
             if lhs_timeframe != 'daily' and field in ['market_cap', 'pe_ratio']:
                  # Financials might not be broadcasted to 15min data
                  # But assuming _scan_stocks_core handles enrichment for specific DFs if needed?
                  # For now, simplistic check.
                  pass
             # raise ValueError(f"Field '{field}' not found in data")
             pass # Let it fail later or assume broadcasted
        
        if field in df.columns:
            raw_val = df[field].iloc[idx]
            try:
                current_value = float(raw_val)
                is_numeric = True
            except:
                current_value = str(raw_val)
                is_numeric = False
        else:
            # Skip/Fail
            return False, {'error': f"Field '{field}' missing in {lhs_timeframe}"}

    # Comparison Logic
    if True: # preserving indent structure for next block
        
        # Handle RHS value (static or dynamic)
        if isinstance(value, dict) and value.get('type') == 'indicator':
            rhs_field = value.get('field')
            rhs_period = value.get('time_period', 14)
            rhs_timeframe = value.get('timeframe', lhs_timeframe) # Default to LHS timeframe
            rhs_df = data_frames.get(rhs_timeframe)
            if rhs_df is None:
                return False, {'error': f"Timeframe '{rhs_timeframe}' data not found for RHS"}
                
            rhs_offset = value.get('offset', offset) # Allow independent offset? Usually assumes aligned?
            # If timeframes differ, alignment is TRICKY. 
            # Ideally we match by TIMESTAMP. But this simple logic uses index offset.
            # Assuming aligned scans (e.g. 15min op 15min). 
            # If mixed, use index 0 vs index 0 (latest vs latest).
            # If offset is integer days, '1d_ago' in 15min is NOT index -1.
            # Filter config `offset` usually maps to index.
            # If frontend handles `1d_ago` -> index logic, that's fine.
            # But `offset: 1` means previous CANDLE.
            # For 15min, that's 15 mins ago.
            # If user wanted "Daily Close", that's index 0 of Daily DF.
            
            # Using rhs_offset directly as index from RHS DF
            rhs_idx = -(rhs_offset + 1)
            
            compare_value = _get_indicator_value(rhs_df, rhs_field, rhs_period, rhs_idx, params=value)
        
        elif isinstance(value, dict) and value.get('valueType') == 'measure':
             # Prompt structure uses `compareToMeasure` encoded as value? 
             # Or `FilterExpression` passed as flat config?
             # `filter_config` has `compareToMeasure`. 
             # But usually `value` holds the RHS.
             pass 
             # If `value` comes from `scan-builder` AST/JSON, it might be an object/dict describing RHS measure.
             # Need to support `value` as dictionary describing attribute/indicator.
             # Code above handles `value.get('type') == 'indicator'`.
             # What about attribute?
             if value.get('type') == 'attribute' or ('measure' in value): # Generic measure object
                 rhs_field = value.get('measure', 'close') if 'measure' in value else value.get('field', 'close')
                 rhs_timeframe = value.get('timeframe', lhs_timeframe)
                 rhs_offset = value.get('offset', offset)
                 rhs_df = data_frames.get(rhs_timeframe)
                 if rhs_df is None: return False, {'error': f"RHS DF missing"}
                 rhs_idx = -(rhs_offset + 1)
                 compare_value = float(rhs_df[rhs_field].iloc[rhs_idx])
             else:
                 compare_value = value
             
        # Support flat `compareToMeasure` if `value` is not set/complex?
        # The prompt UI implies `filter_config` has `compareToMeasure`.
        # `value` in `_scan_stocks_core` usually comes from `value` key.
        # Use `compareToMeasure` as fallback if `value` is missing/empty?
        elif 'compareToMeasure' in filter_config:
             rhs_measure = filter_config.get('compareToMeasure', 'close')
             rhs_timeframe = filter_config.get('compareToTimeframe', lhs_timeframe)
             rhs_offset = filter_config.get('compareToOffset', offset)
             # Handle offset string '1d_ago' vs numeric? 
             # Frontend `verify-chartink.ts` sent 'latest'. `ast-builder` converts.
             # `scan_stocks` expects processed filters usually?
             # `server.py` `scan_stocks` doc says: offset (optional) Days ago to check.
             # If frontend sends "latest", `server.py` likely expects 0.
             # Let's assume input is numeric index for now, or `ast-builder` handles it?
             # If filter IS simple object from UI state, it has string offsets.
             # `evaluate_single_filter` at line 1657 uses `filter_config.get('offset', 0)`.
             # If it's string 'latest', `-(offset+1)` fails.
             # Fix offset parsing too!
             
             if isinstance(rhs_offset, str):
                 rhs_offset = 0 if rhs_offset == 'latest' else int(rhs_offset.split('_')[0].replace('d','')) # Rough parsing
             
             rhs_df = data_frames.get(rhs_timeframe)
             if rhs_df is None: return False, {'error': f"RHS DF missing"}
             rhs_idx = -(rhs_offset + 1)
             
             if isinstance(rhs_measure, dict): # Indicator object
                 # ... logic for indicator struct
                 pass 
             else:
                 compare_value = float(rhs_df[rhs_measure].iloc[rhs_idx])
                 
        else:
            compare_value = value
        
        # --- ARITHMETIC SUPPORT ---
        # "Low < Open * 0.995"
        if 'arithmeticOperator' in filter_config and 'arithmeticValue' in filter_config:
             op = filter_config['arithmeticOperator']
             val = float(filter_config['arithmeticValue'])
             if op == '+': compare_value += val
             elif op == '-': compare_value -= val
             elif op == '*': compare_value *= val
             elif op == '/': compare_value /= val
        # --------------------------

        
        if not is_numeric:
            # String comparison
            # Only support eq/neq/contains?
            passed = False
            if operator == 'eq':
                passed = str(current_value) == str(compare_value)
            elif operator == 'neq':
                passed = str(current_value) != str(compare_value)
            elif operator == 'contains': # Optional
                passed = str(compare_value).lower() in str(current_value).lower()
            else:
                 # Other operators invalid for strings, fail safe
                 pass
                 
            return passed, {
                'type': filter_type,
                'field': field,
                'current_value': current_value,
                'compare_value': compare_value,
                'operator': operator,
                'passed': passed
            }

        # Numeric comparison continues here...
        
        # For crossover operators, get previous values
        if operator in ['crossed_above', 'crossed_below', 'crosses_above', 'crosses_below']:
            if filter_type == 'indicator':
                previous_value = _get_indicator_value(df, field, time_period, prev_idx, params=filter_config)
            else:
                previous_value = float(df[field].iloc[prev_idx])
            
            # Get previous RHS
            if isinstance(value, dict) and value.get('type') == 'indicator':
                rhs_field = value.get('field')
                rhs_period = value.get('time_period', 14)
                previous_compare = _get_indicator_value(df, rhs_field, rhs_period, prev_idx, params=value)
            else:
                previous_compare = compare_value

            # STATIC DATA FALLBACK:
            if previous_value == current_value:
                 if operator in ['crossed_above', 'crosses_above']:
                     return evaluate_condition(current_value, compare_value, 'gt'), {
                        'type': filter_type, 'field': field, 'current_value': current_value,
                        'compare_value': compare_value, 'operator': operator, 'passed': current_value > compare_value,
                        'note': 'Static data detected, fell back to >'
                     }
                 elif operator in ['crossed_below', 'crosses_below']:
                     return evaluate_condition(current_value, compare_value, 'lt'), {
                        'type': filter_type, 'field': field, 'current_value': current_value,
                        'compare_value': compare_value, 'operator': operator, 'passed': current_value < compare_value,
                        'note': 'Static data detected, fell back to <'
                     }

            passed = evaluate_condition(
                current_value, compare_value, operator,
                previous_value, previous_compare
            )
        else:
            passed = evaluate_condition(current_value, compare_value, operator)
        
        return passed, {
            'type': filter_type,
            'field': field,
            'current_value': current_value,
            'compare_value': compare_value,
            'operator': operator,
            'passed': passed
        }
    
    elif filter_type == 'indicator':
        # Calculate LHS indicator
        current_value = _get_indicator_value(df, field, time_period, idx)
        
        # Handle RHS value (static or dynamic)
        if isinstance(value, dict) and value.get('type') == 'indicator':
            rhs_field = value.get('field')
            rhs_period = value.get('time_period', 14)
            compare_value = _get_indicator_value(df, rhs_field, rhs_period, idx)
        else:
            compare_value = value
        
        if operator in ['crossed_above', 'crossed_below']:
            # Get previous LHS
            previous_value = _get_indicator_value(df, field, time_period, prev_idx)
            
            # Get previous RHS
            if isinstance(value, dict) and value.get('type') == 'indicator':
                rhs_field = value.get('field')
                rhs_period = value.get('time_period', 14)
                previous_compare = _get_indicator_value(df, rhs_field, rhs_period, prev_idx)
            else:
                previous_compare = compare_value # Static value doesn't change
            
            passed = evaluate_condition(
                current_value, compare_value, operator,
                previous_value, previous_compare
            )
        else:
            passed = evaluate_condition(current_value, compare_value, operator)
        
        return passed, {
            'type': filter_type,
            'field': field,
            'current_value': current_value,
            'compare_value': compare_value,
            'operator': operator,
            'time_period': time_period,
            'passed': passed
        }
    
    elif filter_type == 'volume':
        current_volume = float(df['volume'].iloc[idx])
        
        if operator == 'gt_avg':
            # Compare to average volume
            avg_period = filter_config.get('avg_period', 20)
            avg_volume = float(df['volume'].rolling(window=avg_period).mean().iloc[idx])
            multiplier = filter_config.get('multiplier', 1.5)
            compare_value = avg_volume * multiplier
            
            passed = current_volume > compare_value
            
            return passed, {
                'type': filter_type,
                'current_volume': current_volume,
                'average_volume': avg_volume,
                'threshold': compare_value,
                'multiplier': multiplier,
                'passed': passed
            }
        else:
            # Direct volume comparison
            compare_value = value
            passed = evaluate_condition(current_volume, compare_value, operator)
            
            return passed, {
                'type': filter_type,
                'current_volume': current_volume,
                'compare_value': compare_value,
                'operator': operator,
                'passed': passed
            }

    elif filter_type == 'price_change':
        base_field = field or 'close'
        if base_field not in df.columns:
            raise ValueError(f"Field '{base_field}' not found in data")

        lookback = int(filter_config.get('lookback', 1))
        required_rows = offset + lookback + 1
        if len(df) < required_rows:
            return False, {
                'type': filter_type,
                'field': base_field,
                'error': 'Not enough data for price_change filter',
                'required_rows': required_rows,
                'available_rows': len(df)
            }

        current_price = float(df[base_field].iloc[idx])
        previous_price = float(df[base_field].iloc[idx - lookback])
        current_value = calculate_percentage_change(current_price, previous_price)
        compare_value = value

        passed = evaluate_condition(current_value, compare_value, operator)

        return passed, {
            'type': filter_type,
            'field': base_field,
            'current_value': current_value,
            'compare_value': compare_value,
            'operator': operator,
            'lookback': lookback,
            'passed': passed
        }

    elif filter_type == 'volume_change':
        lookback = int(filter_config.get('lookback', 1))
        required_rows = offset + lookback + 1
        if len(df) < required_rows:
            return False, {
                'type': filter_type,
                'field': 'volume',
                'error': 'Not enough data for volume_change filter',
                'required_rows': required_rows,
                'available_rows': len(df)
            }

        current_volume = float(df['volume'].iloc[idx])
        previous_volume = float(df['volume'].iloc[idx - lookback])
        current_value = calculate_percentage_change(current_volume, previous_volume)
        compare_value = value

        passed = evaluate_condition(current_value, compare_value, operator)

        return passed, {
            'type': filter_type,
            'field': 'volume',
            'current_value': current_value,
            'compare_value': compare_value,
            'operator': operator,
            'lookback': lookback,
            'passed': passed
        }

        return passed, {
            'type': filter_type,
            'field': 'volume',
            'current_value': current_value,
            'compare_value': compare_value,
            'operator': operator,
            'lookback': lookback,
            'passed': passed
        }

    elif filter_type == 'financial':
        # Fetch fundamental metrics
        field = filter_config.get('field', '').lower()
        if not field:
            return False, {'error': 'Financial filter requires a field'}

        try:
            metrics_response = _fetch_metrics_from_api(symbol)
            metrics = metrics_response.get('metric', {})
            
            # Look for the field in metrics (Finnhub keys are usually camelCase or snake_case depending on API)
            # We map our scanner keys (snake_case) to Finnhub keys if needed
            # For now, simplistic mapping attempt
            metric_val = metrics.get(field)
            
            # Common mappings (User provided snake_case, Finnhub uses camelCase mostly)
            if metric_val is None:
                mappings = {
                   'pe': 'peNormalizedAnnual', # or peExclExtraTTM
                   'pe_ratio': 'peNormalizedAnnual',
                   'pb': 'pbAnnual',
                   'pb_ratio': 'pbAnnual',
                   'eps': 'epsTTM',
                   'roe': 'roeTTM',
                   'dividend_yield': 'dividendYieldIndicatedAnnual',
                   'debt_to_equity': 'totalDebt/totalEquityAnnual',
                   'current_ratio': 'currentRatioAnnual',
                   'net_sales': 'revenueTTM',
                   'total_income': 'revenueTTM',
                   'net_profit': 'netIncomeTTM',
                   'total_assets': 'totalAssetsAnnual',
                   'total_liabilities': 'totalLiabilitiesAnnual',
                   'operating_cash_flow': 'cashFlowFromOperationsTTM',
                }
                api_key = mappings.get(field, field)
                metric_val = metrics.get(api_key)

            if metric_val is None:
                # Try finding case-insensitive and ignoring underscores
                target = field.lower().replace('_', '')
                for k, v in metrics.items():
                    if k.lower().replace('_', '') == target:
                        metric_val = v
                        break

            if metric_val is None:
                return False, {
                    'type': filter_type,
                    'field': field,
                    'error': f'Metric {field} not found for {symbol}',
                    'passed': False
                }

            current_value = float(metric_val)
            compare_value = float(value)
            
            passed = evaluate_condition(current_value, compare_value, operator)
            
            return passed, {
                'type': filter_type,
                'field': field,
                'current_value': current_value,
                'compare_value': compare_value,
                'operator': operator,
                'passed': passed
            }

        except Exception as e:
             return False, {'error': f'Failed to evaluate financial filter: {e}'}
        required_rows = offset + 2
        if len(df) < required_rows:
            return False, {
                'type': filter_type,
                'error': 'Not enough data for gap filter',
                'required_rows': required_rows,
                'available_rows': len(df)
            }

        if 'open' not in df.columns or 'close' not in df.columns:
            return False, {
                'type': filter_type,
                'error': "Missing 'open' or 'close' columns for gap filter",
            }

        current_open = float(df['open'].iloc[idx])
        previous_close = float(df['close'].iloc[idx - 1])
        current_value = calculate_percentage_change(current_open, previous_close)
        compare_value = value if value is not None else 0.0

        passed = evaluate_condition(current_value, compare_value, operator)

        return passed, {
            'type': filter_type,
            'current_open': current_open,
            'previous_close': previous_close,
            'current_value': current_value,
            'compare_value': compare_value,
            'operator': operator,
            'offset': offset,
            'passed': passed
        }

    elif filter_type == 'pattern':
        pattern_name = filter_config.get('pattern')
        if not pattern_name:
            return False, {
                'type': filter_type,
                'error': 'Pattern name is required for pattern filter',
            }

        pattern_details = detect_candlestick_pattern(df, idx, str(pattern_name))
        passed = bool(pattern_details.get('matched', False))
        details = {
            'type': filter_type,
            'pattern': str(pattern_name),
            **pattern_details,
            'passed': passed,
        }

        return passed, details
    
    elif filter_type == 'price_52week':
        base_field = field or 'close'
        lookback_days = int(filter_config.get('lookback_days', 252))
        metric = filter_config.get('metric', 'distance_from_high_pct')

        try:
            full_data = _fetch_stock_data_core(symbol, "daily", "full")
        except Exception as exc:
            return False, {
                'type': filter_type,
                'field': base_field,
                'error': f'Failed to fetch full history for 52-week calculation: {exc}'
            }

        df_full = pd.DataFrame(full_data.get('data', []))
        if df_full.empty or 'high' not in df_full.columns or 'low' not in df_full.columns:
            return False, {
                'type': filter_type,
                'field': base_field,
                'error': 'Insufficient OHLC data for 52-week calculation'
            }

        df_full['date'] = pd.to_datetime(df_full['date'])
        df_full = df_full.set_index('date').sort_index()
        df_lookback = df_full.tail(lookback_days)

        if df_lookback.empty:
            return False, {
                'type': filter_type,
                'field': base_field,
                'error': 'No data available in 52-week lookback window'
            }

        high_52w = float(df_lookback['high'].max())
        low_52w = float(df_lookback['low'].min())

        current_price = float(df[base_field].iloc[idx])

        if metric == 'distance_from_high_pct':
            if high_52w == 0:
                current_value = 0.0
            else:
                current_value = ((high_52w - current_price) / high_52w) * 100.0
        elif metric == 'distance_from_low_pct':
            if low_52w == 0:
                current_value = 0.0
            else:
                current_value = ((current_price - low_52w) / low_52w) * 100.0
        else:
            raise ValueError(f"Unsupported metric for price_52week filter: {metric}")

        compare_value = value
        passed = evaluate_condition(current_value, compare_value, operator)

        return passed, {
            'type': filter_type,
            'field': base_field,
            'metric': metric,
            'current_value': current_value,
            'compare_value': compare_value,
            'operator': operator,
            'lookback_days': lookback_days,
            'high_52w': high_52w,
            'low_52w': low_52w,
            'passed': passed
        }
    
    elif filter_type == 'function':
        func_name = field.lower()
        operator = filter_config.get('operator', 'gt')
        try:
            value = float(filter_config.get('value', 0))
        except (ValueError, TypeError):
             return False, {'error': 'Value must be numeric for function filters'}

        # Default settings for MVP (hardcoded for now as UI doesn't send params)
        period = 20
        idx_end = idx if idx == -1 else idx + 1
        idx_start = idx - period if idx == -1 else idx - period + 1
        
        # Ensure data sufficiency
        if len(df) < period + abs(idx):
             return False, {'error': f'Not enough data for function {func_name} (needs {period} periods)'}

        current_value = 0.0
        
        if func_name == 'max':
             # Max High over period
             # Use lookback window
             window = df['high'].iloc[idx_start:idx_end if idx_end != 0 else None]
             current_value = float(window.max())
        elif func_name == 'min':
             # Min Low over period
             window = df['low'].iloc[idx_start:idx_end if idx_end != 0 else None]
             current_value = float(window.min()) 
        elif func_name == 'abs':
             # Abs of close change % 
             c = float(df['close'].iloc[idx])
             p = float(df['close'].iloc[idx-1])
             change = ((c - p) / p) * 100
             current_value = abs(change)
        elif func_name == 'count':
            # Count positive days in last period (green candles)
            window = df.iloc[idx_start:idx_end if idx_end != 0 else None]
            green_candles = window[window['close'] > window['open']]
            current_value = float(len(green_candles))
        else:
            return False, {'error': f'Unsupported function: {func_name}'}
        
        passed = evaluate_condition(current_value, value, operator)
        return passed, {
            'type': filter_type, 'field': func_name,
            'current_value': current_value, 'compare_value': value,
            'operator': operator, 'passed': passed,
            'period': period
        }

    return False, {'error': 'Invalid filter type'}


@mcp.tool()
def load_symbols_from_csv(
    csv_file_path: str,
    symbol_column: str = "symbol",
    name_column: str = "name"
) -> Dict[str, Any]:
    """
    Load stock symbols from a CSV file into the cache.
    
    Args:
        csv_file_path: Path to CSV file containing symbols
        symbol_column: Column name containing stock symbols (default: 'symbol')
        name_column: Column name containing company names (default: 'name')
    
    Returns:
        Dictionary with:
        - loaded_count: Number of symbols loaded
        - symbols: List of loaded symbols
        - cache_status: Status of cache update
    
    Example CSV format:
        symbol,name,exchange
        AAPL,Apple Inc.,NASDAQ
        MSFT,Microsoft,NASDAQ
        RELIANCE.BSE,Reliance Industries,BSE
    """
    try:
        import pandas as pd
        
        logger.info(f"Loading symbols from CSV: {csv_file_path}")
        
        # Read CSV file
        df = pd.read_csv(csv_file_path)
        
        # Validate required columns
        if symbol_column not in df.columns:
            raise ValueError(f"Column '{symbol_column}' not found in CSV")
        
        # Build symbols dictionary
        symbols_dict = {}
        for idx, row in df.iterrows():
            symbol = str(row[symbol_column]).strip()
            name = str(row[name_column]).strip() if name_column in df.columns else symbol
            
            symbols_dict[symbol] = {
                "name": name,
                "symbol": symbol,
                "exchange": row.get("exchange", "UNKNOWN") if "exchange" in df.columns else "UNKNOWN"
            }
        
        # Update cache
        cache_data = {
            "symbols": symbols_dict,
            "source": csv_file_path,
            "loaded_at": datetime.now().isoformat()
        }
        set_symbols_cache(cache_data)
        
        logger.info(f"✓ Loaded {len(symbols_dict)} symbols into cache")
        
        return {
            "loaded_count": len(symbols_dict),
            "symbols": list(symbols_dict.keys()),
            "cache_status": "updated",
            "source": csv_file_path
        }
    
    except Exception as e:
        logger.error(f"Error loading symbols from CSV: {e}")
        return {
            "loaded_count": 0,
            "symbols": [],
            "cache_status": "failed",
            "error": str(e)
        }


@mcp.tool()
def get_cached_symbols() -> Dict[str, Any]:
    """
    Get all cached symbols.
    
    Returns:
        Dictionary with:
        - total_count: Total number of cached symbols
        - symbols: List of all symbol tickers
        - last_updated: When cache was last updated
    """
    cache_data = get_symbols_cache()
    
    return {
        "total_count": cache_data.get("total_count", 0),
        "symbols": list(cache_data.get("symbols", {}).keys()),
        "last_updated": cache_data.get("last_updated"),
        "cache_status": "ready" if cache_data.get("symbols") else "empty"
    }


@mcp.tool()
def run_preset_scan(
    preset_name: str,
    symbols: List[str],
    custom_params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Run a predefined scan preset on a list of stocks.
    
    Args:
        preset_name: Name of preset scan
            - 'rsi_oversold': RSI below 30
            - 'rsi_overbought': RSI above 70
            - 'bullish_crossover': Price crosses above 50-day SMA
            - 'bearish_crossover': Price crosses below 50-day SMA
            - 'breakout_52week': Price near 52-week high (within 5%)
            - 'high_volume': Volume > 2x 20-day average
            - 'macd_bullish': MACD crosses above signal line
            - 'strong_momentum': RSI > 60 AND price > 20-day SMA
        symbols: List of stock symbols to scan
        custom_params: Optional parameters to override defaults
    
    Returns:
        Scan results with matched stocks and preset details
    
    Example:
        run_preset_scan("rsi_oversold", ["AAPL", "GOOGL", "MSFT"])
    """
    
    logger.info(f"Running preset scan: {preset_name}")
    
    # Define preset configurations
    presets = {
        'rsi_oversold': {
            'description': 'Stocks with RSI below 30 (potentially oversold)',
            'filters': [
                {'type': 'indicator', 'field': 'RSI', 'operator': 'lt', 'value': 30, 'time_period': 14}
            ]
        },
        'rsi_overbought': {
            'description': 'Stocks with RSI above 70 (potentially overbought)',
            'filters': [
                {'type': 'indicator', 'field': 'RSI', 'operator': 'gt', 'value': 70, 'time_period': 14}
            ]
        },
        'bullish_crossover': {
            'description': 'Price crosses above 50-day moving average',
            'filters': [
                {'type': 'price', 'field': 'close', 'operator': 'crossed_above', 'value': 0, 'time_period': 50}
            ],
            'note': 'Requires comparison with SMA - simplified for demo'
        },
        'bearish_crossover': {
            'description': 'Price crosses below 50-day moving average',
            'filters': [
                {'type': 'price', 'field': 'close', 'operator': 'crossed_below', 'value': 0, 'time_period': 50}
            ],
            'note': 'Requires comparison with SMA - simplified for demo'
        },
        'high_volume': {
            'description': 'Volume more than 2x the 20-day average',
            'filters': [
                {'type': 'volume', 'operator': 'gt_avg', 'avg_period': 20, 'multiplier': 2.0}
            ]
        },
        'breakout_52week': {
            'description': 'Price near 52-week high (within 5%)',
            'filters': [
                {
                    'type': 'price_52week',
                    'field': 'close',
                    'operator': 'lte',
                    'value': 5.0,
                    'metric': 'distance_from_high_pct',
                    'lookback_days': 252
                }
            ],
            'filter_logic': 'AND'
        },
        'strong_momentum': {
            'description': 'Strong upward momentum: RSI > 60',
            'filters': [
                {'type': 'indicator', 'field': 'RSI', 'operator': 'gt', 'value': 60, 'time_period': 14}
            ],
            'filter_logic': 'AND'
        },
        'breakout_candidate': {
            'description': 'RSI > 50 with high volume',
            'filters': [
                {'type': 'indicator', 'field': 'RSI', 'operator': 'gt', 'value': 50, 'time_period': 14},
                {'type': 'volume', 'operator': 'gt_avg', 'avg_period': 20, 'multiplier': 1.5}
            ],
            'filter_logic': 'AND'
        }
    }
    
    if preset_name not in presets:
        available = ', '.join(presets.keys())
        raise ValueError(f"Unknown preset: {preset_name}. Available: {available}")
    
    preset = presets[preset_name]
    filters = preset['filters'].copy()
    filter_logic = preset.get('filter_logic', 'AND')
    
    # Apply custom parameters if provided
    if custom_params:
        for filter_item in filters:
            for key, val in custom_params.items():
                if key in filter_item:
                    filter_item[key] = val
    
    # Run the scan
    scan_result = _scan_stocks_core(symbols, filters, filter_logic)
    
    # Add preset information
    scan_result['preset_name'] = preset_name
    scan_result['preset_description'] = preset['description']
    if 'note' in preset:
        scan_result['note'] = preset['note']
    
    return scan_result


# ============================================================================
# AI-GUIDED ANALYSIS PROMPTS
# ============================================================================

# Analysis Prompts

@mcp.prompt()
def analyze_stock(
    symbol: str,
    timeframe: str = "daily",
    analysis_type: str = "technical"
) -> str:
    """
    Generate comprehensive stock analysis prompt.
    
    Args:
        symbol: Stock ticker symbol
        timeframe: Analysis timeframe ('daily', 'weekly', 'monthly')
        analysis_type: Type of analysis ('technical', 'momentum', 'trend')
    
    Returns:
        Formatted prompt for AI analysis
    """
    return f"""Analyze {symbol} on {timeframe} timeframe using {analysis_type} analysis.

Include in your analysis:
1. Key Technical Indicators:
   - RSI (Relative Strength Index) - overbought/oversold levels
   - MACD (Moving Average Convergence Divergence) - trend and momentum
   - Moving Averages (SMA/EMA) - trend direction and support/resistance
   - Bollinger Bands - volatility and price extremes

2. Support & Resistance Levels:
   - Identify key support and resistance levels
   - Assess proximity to these levels
   - Potential breakout or breakdown scenarios

3. Overall Trend Assessment:
   - Current trend direction (uptrend, downtrend, sideways)
   - Trend strength and sustainability
   - Potential reversal signals

4. Trading Signals:
   - Bullish signals present
   - Bearish signals present
   - Neutral or mixed signals

5. Risk Assessment:
   - Volatility level
   - Risk/reward ratio
   - Recommended position sizing"""


@mcp.prompt()
def compare_stocks_prompt(
    symbols: List[str],
    criteria: str = "technical strength"
) -> str:
    """
    Generate stock comparison analysis prompt.
    
    Args:
        symbols: List of stock tickers to compare
        criteria: Comparison criteria (e.g., 'technical strength', 'momentum', 'volatility')
    
    Returns:
        Formatted prompt for AI comparison
    """
    symbols_str = ", ".join(symbols)
    return f"""Compare the following stocks: {symbols_str}

Analyze based on: {criteria}

For each stock, provide:
1. Current Technical Status:
   - RSI level and interpretation
   - MACD status
   - Moving average alignment
   - Bollinger Band position

2. Relative Strengths:
   - What makes this stock stand out
   - Strongest technical signals
   - Best entry/exit opportunities

3. Relative Weaknesses:
   - Concerning signals
   - Resistance levels to watch
   - Potential risks

4. Comparative Analysis:
   - Which stock has the strongest setup
   - Which has the most momentum
   - Which is safest for conservative traders
   - Which has highest risk/reward potential

5. Recommendation:
   - Rank them by attractiveness
   - Suggest which might be better positioned
   - Timeframe considerations"""


@mcp.prompt()
def explain_indicator(
    indicator_name: str,
    symbol: str,
    current_value: float,
    timeframe: str = "daily"
) -> str:
    """
    Generate indicator explanation prompt.
    
    Args:
        indicator_name: Name of the indicator (e.g., 'RSI', 'MACD')
        symbol: Stock symbol
        current_value: Current indicator value
        timeframe: Timeframe for analysis
    
    Returns:
        Formatted prompt for AI explanation
    """
    return f"""Explain what the {indicator_name} value of {current_value} means for {symbol} on {timeframe} timeframe.

Provide:
1. Indicator Interpretation:
   - What does this value indicate?
   - Is it extreme, normal, or neutral?
   - Historical context for {symbol}

2. Trading Signals:
   - What trading signals does this generate?
   - Bullish or bearish implications?
   - Strength of the signal

3. Confluence with Other Indicators:
   - How does this align with RSI, MACD, moving averages?
   - Are signals converging or diverging?
   - Overall signal strength

4. Actionable Insights:
   - What should a trader do with this information?
   - Entry/exit considerations
   - Risk management implications

5. Context:
   - Market conditions that favor this signal
   - Potential false signals to watch for
   - Confirmation indicators to monitor"""


# Scanning Prompts

@mcp.prompt()
def create_scan_from_description(user_description: str) -> str:
    """
    Generate prompt to convert natural language into scan criteria.
    
    Args:
        user_description: User's description of desired scan
    
    Returns:
        Formatted prompt for AI to create scan
    """
    return f"""Convert this scan description into technical criteria: '{user_description}'

Define the exact filters needed:
1. Indicators to Use:
   - Which indicators are relevant?
   - What time periods?
   - What thresholds?

2. Filter Configuration:
   - List each filter with:
     * Type (price, indicator, volume)
     * Field/Indicator name
     * Operator (gt, lt, crossed_above, etc.)
     * Threshold value
     * Time period if applicable

3. Filter Logic:
   - Should filters use AND or OR logic?
   - Why this choice?

4. Expected Results:
   - What type of stocks should this find?
   - Market conditions that favor this scan?
   - Typical hit rate expectations

5. Scan Configuration (JSON format):
   - Provide the exact filter configuration
   - Ready to use with scan_stocks tool"""


@mcp.prompt()
def explain_scan_results(
    scan_config: str,
    results_count: int,
    matched_symbols: List[str] = None
) -> str:
    """
    Generate prompt to explain scan results.
    
    Args:
        scan_config: Description of scan configuration
        results_count: Number of stocks that matched
        matched_symbols: Optional list of matched symbols
    
    Returns:
        Formatted prompt for AI explanation
    """
    symbols_str = ", ".join(matched_symbols) if matched_symbols else "N/A"
    return f"""Explain why these {results_count} stocks matched the scan criteria: {scan_config}

Matched stocks: {symbols_str}

Provide:
1. Scan Logic Explanation:
   - What market conditions does this scan identify?
   - Why are these filters effective?
   - Historical success rate?

2. Current Market Context:
   - Why are these stocks matching now?
   - What market conditions favor this setup?
   - Is this a common or rare occurrence?

3. Stock-by-Stock Analysis:
   - For each matched stock, explain:
     * Why it matched the criteria
     * Strength of the match
     * Unique characteristics

4. Risk Considerations:
   - False signal potential
   - Market conditions that could invalidate the scan
   - Risk management recommendations

5. Trading Opportunities:
   - Which matched stocks look most promising?
   - Entry/exit strategies
   - Position sizing recommendations"""


@mcp.prompt()
def suggest_scan_improvements(
    current_scan: str,
    goal: str
) -> str:
    """
    Generate prompt to suggest scan improvements.
    
    Args:
        current_scan: Description of current scan configuration
        goal: Desired goal or improvement (e.g., 'reduce false signals', 'find breakouts')
    
    Returns:
        Formatted prompt for AI suggestions
    """
    return f"""Improve this scan configuration: {current_scan}

Goal: {goal}

Suggest improvements:
1. Additional Filters:
   - What filters would help achieve the goal?
   - Why would these be effective?
   - What parameters?

2. Parameter Adjustments:
   - Should any thresholds be changed?
   - Different time periods?
   - Indicator settings?

3. Filter Logic Changes:
   - Should AND/OR logic be adjusted?
   - Add or remove any conditions?

4. Validation Approach:
   - How to test if improvements work?
   - Metrics to track
   - Backtesting approach

5. Improved Scan Configuration:
   - Provide updated filter configuration
   - Explain each change
   - Expected impact on results"""


# Pattern Recognition Prompts

@mcp.prompt()
def identify_pattern_opportunity(
    symbol: str,
    detected_patterns: List[str]
) -> str:
    """
    Generate prompt for pattern-based trading opportunities.
    
    Args:
        symbol: Stock symbol
        detected_patterns: List of detected chart patterns
    
    Returns:
        Formatted prompt for AI analysis
    """
    patterns_str = ", ".join(detected_patterns)
    return f"""Based on detected patterns {patterns_str} for {symbol}, identify potential trading opportunities.

Provide:
1. Pattern Analysis:
   - Describe each detected pattern
   - Formation stage (early, mid, late)
   - Reliability/confidence level

2. Trading Opportunities:
   - What trades does this setup suggest?
   - Bullish or bearish bias?
   - Probability of success?

3. Entry Points:
   - Optimal entry price levels
   - Entry confirmation signals
   - Entry timing

4. Exit Strategy:
   - Profit targets based on pattern
   - Stop loss placement
   - Risk/reward ratio

5. Risk Assessment:
   - Pattern failure scenarios
   - Key levels to watch
   - Market conditions that could invalidate setup"""


@mcp.prompt()
def pattern_education(pattern_name: str) -> str:
    """
    Generate educational prompt about chart patterns.
    
    Args:
        pattern_name: Name of the pattern (e.g., 'head_and_shoulders')
    
    Returns:
        Formatted prompt for AI education
    """
    return f"""Explain the {pattern_name} chart pattern in detail.

Include:
1. Pattern Formation:
   - How does it form?
   - Key components and measurements
   - Time to form (typical duration)

2. Psychology Behind the Pattern:
   - What market psychology creates this pattern?
   - Buyer/seller dynamics
   - Sentiment indicators

3. Trading Implications:
   - Bullish or bearish signal?
   - Typical price targets
   - Reliability statistics

4. Entry & Exit Rules:
   - When to enter
   - Where to place stops
   - Profit targets
   - Exit conditions

5. Common Mistakes:
   - False signals to watch for
   - Failure rates
   - How to confirm the pattern
   - Risk management tips"""


# Watchlist Prompts

@mcp.prompt()
def analyze_watchlist(
    watchlist_name: str,
    focus_area: str = "overall opportunity"
) -> str:
    """
    Generate watchlist analysis prompt.
    
    Args:
        watchlist_name: Name of the watchlist
        focus_area: Area to focus on (e.g., 'momentum', 'value', 'growth')
    
    Returns:
        Formatted prompt for AI analysis
    """
    return f"""Analyze my watchlist '{watchlist_name}' focusing on {focus_area}.

Provide:
1. Watchlist Overview:
   - Number of stocks
   - Sector/industry breakdown
   - Market cap distribution

2. Top Opportunities:
   - Which stocks look most promising?
   - Why are they attractive?
   - Current technical setup

3. Stocks to Watch:
   - Which need monitoring?
   - Key levels to watch
   - Upcoming catalysts

4. Sector/Industry Analysis:
   - How are different sectors performing?
   - Relative strength
   - Rotation opportunities

5. Portfolio Recommendations:
   - Best candidates for entry
   - Candidates to avoid now
   - Suggested position sizing
   - Diversification suggestions"""


@mcp.prompt()
def suggest_watchlist_additions(
    watchlist_name: str,
    current_symbols: List[str],
    criteria: str = "similar technical setup"
) -> str:
    """
    Generate prompt for watchlist addition suggestions.
    
    Args:
        watchlist_name: Name of watchlist
        current_symbols: Current symbols in watchlist
        criteria: Criteria for additions
    
    Returns:
        Formatted prompt for AI suggestions
    """
    symbols_str = ", ".join(current_symbols)
    return f"""Suggest additional stocks for my '{watchlist_name}' watchlist.

Current symbols: {symbols_str}
Criteria: {criteria}

Provide suggestions based on:
1. Similarity Analysis:
   - Which stocks are similar to {symbols_str}?
   - Same sector/industry?
   - Similar market cap?
   - Similar technical characteristics?

2. Screening Criteria:
   - What makes a good addition?
   - Technical setup alignment
   - Fundamental characteristics

3. Suggested Additions:
   - List 5-10 suggested stocks
   - Why each would be a good fit
   - Current technical status
   - Risk/reward assessment

4. Diversification:
   - Would these improve diversification?
   - Sector balance
   - Risk profile balance

5. Action Plan:
   - Which to add first?
   - Entry points for each
   - Monitoring strategy"""


# Strategy Prompts

@mcp.prompt()
def backtest_strategy(
    strategy_description: str,
    timeframe: str = "1 year"
) -> str:
    """
    Generate prompt for strategy backtesting approach.
    
    Args:
        strategy_description: Description of the strategy
        timeframe: Backtesting timeframe
    
    Returns:
        Formatted prompt for AI backtesting design
    """
    return f"""Design a backtesting approach for this strategy: '{strategy_description}'

Timeframe: {timeframe}

Provide:
1. Strategy Breakdown:
   - Entry rules (exact conditions)
   - Exit rules (profit taking, stops)
   - Position sizing
   - Risk management rules

2. Backtesting Metrics:
   - Win rate (% of winning trades)
   - Profit factor (gross profit / gross loss)
   - Sharpe ratio
   - Maximum drawdown
   - Return on investment

3. Test Parameters:
   - Historical period to test
   - Market conditions to include
   - Symbols to test on
   - Slippage/commission assumptions

4. Expected Results:
   - Realistic expectations
   - Benchmark comparisons
   - Market regime considerations

5. Implementation Plan:
   - How to execute this backtest
   - Tools/platforms needed
   - Validation approach
   - Forward testing plan"""


@mcp.prompt()
def risk_assessment(
    symbol: str,
    position_size: str = "1% of portfolio",
    timeframe: str = "daily"
) -> str:
    """
    Generate risk assessment prompt.
    
    Args:
        symbol: Stock symbol
        position_size: Proposed position size
        timeframe: Trading timeframe
    
    Returns:
        Formatted prompt for AI risk assessment
    """
    return f"""Assess risk for entering {symbol} with position size {position_size} on {timeframe} timeframe.

Consider:
1. Volatility Analysis:
   - Current volatility level
   - Historical volatility
   - Volatility trend
   - Expected moves

2. Support & Resistance:
   - Key support levels
   - Key resistance levels
   - Distance to stops
   - Breakout potential

3. Market Conditions:
   - Overall market trend
   - Sector performance
   - Market volatility (VIX equivalent)
   - Liquidity conditions

4. Risk Metrics:
   - Optimal stop loss placement
   - Risk/reward ratio
   - Maximum loss if stopped out
   - Probability of hitting stop

5. Position Sizing Recommendation:
   - Is {position_size} appropriate?
   - Suggested adjustments
   - Diversification impact
   - Portfolio risk level"""



@mcp.tool()
def parse_natural_language_query(query: str) -> Dict[str, Any]:
    """Parse a natural language query into a list of filter configurations (AST).

    Args:
        query: Natural language query string (e.g., "Close is above SMA 50").

    Returns:
        List of filter node dictionaries compatible with the scanner.
    """
    import re
    from uuid import uuid4
    
    query = query.lower()
    filters = []

    # Helper to map operator text to symbol
    def get_operator(text):
        if any(x in text for x in ['above', 'greater', 'more than', '>', 'over']): return '>'
        if any(x in text for x in ['below', 'less', 'under', '<', 'fewer']): return '<'
        if any(x in text for x in ['cross', 'crossover']):
            if 'above' in text or 'up' in text: return 'crosses_above'
            if 'below' in text or 'down' in text: return 'crosses_below'
        if 'equal' in text or '=' in text or 'is' in text: return '=='
        return '>' # Default

    # Helper to parse measure
    def parse_measure(text):
        text = text.strip()
        # Check for indicators with periods
        # e.g. "sma 20", "rsi(14)"
        
        # Regex for Indicator + Number
        match = re.search(r'([a-z]+)\s*\(?\s*(\d+)\s*\)?', text)
        if match:
            ind_name = match.group(1)
            period = int(match.group(2))
            # Map common names
            if ind_name in ['sma', 'ema', 'rsi', 'wma', 'atr', 'adx', 'cci', 'stoch']:
                return {'type': 'indicator', 'field': f'{ind_name}_{period}', 'time_period': period}
        
        # Simple Attributes
        if text in ['close', 'open', 'high', 'low', 'volume', 'market cap', 'cap', 'pe']:
            field = text.replace('market cap', 'market_cap')
            return {'type': 'attribute', 'field': field}
            
        # Default fallback (attribute)
        return {'type': 'attribute', 'field': text}

    # Split by 'and' to separate conditions
    conditions = [c.strip() for c in re.split(r'\s+and\s+', query)]

    for cond in conditions:
        try:
            # Pattern: Measure Operator Value
            # e.g. "Close above 50", "RSI 14 > 70", "SMA 20 crossed above SMA 50"
            

            
            # Pattern: Consecutive N red/green candles
            # e.g. "consecutive 3 red candles on 5-min"
            consecutive_match = re.search(r'consecutive (\d+) (red|green) candles?(?: on ([a-zA-Z0-9-]+))?', cond)
            if consecutive_match:
                count = int(consecutive_match.group(1))
                color = consecutive_match.group(2)
                tf_raw = consecutive_match.group(3)
                
                # Map timeframe
                timeframe = "daily"
                if tf_raw:
                    tf_norm = tf_raw.lower().replace('-', '')
                    if tf_norm in ['15min', '5min', '30min', '1hour', 'daily', 'weekly', 'monthly']:
                        timeframe = tf_norm
                    elif tf_norm == '1h': timeframe = '1hour'
                    elif tf_norm == '1d': timeframe = 'daily'
                    elif tf_norm == '1w': timeframe = 'weekly'
                    elif tf_norm == '1m': timeframe = 'monthly'
                
                # Generate N filters
                for i in range(count):
                    # For i=0 (latest), i=1 (1d_ago), etc.
                    offset_key = "latest" if i == 0 else f"{i}d_ago"
                    
                    # Red: Close < Open. Green: Close > Open.
                    op = "<" if color == "red" else ">"
                    
                    filters.append({
                        "id": str(uuid4()),
                        "type": "simple",
                        "enabled": True,
                        "field": "close",
                        "filterType": "price",
                        "operator": op,
                        "value": {
                            "type": "attribute", # compare to attribute
                            "field": "open"
                        },
                        "expression": {
                            "offset": offset_key,
                            "timeframe": timeframe,
                            "measure": "close",
                            "operator": op,
                            "valueType": "measure",
                            "compareToMeasure": "open",
                            "compareToOffset": offset_key,
                            "compareToTimeframe": timeframe
                        }
                    })
                continue

            # Identify Operator
            ops = ['crossed above', 'crossed below', 'is above', 'is below', 'above', 'below', 'greater than', 'less than', 'higher than', 'lower than', '>', '<', '=', '==']
            
            operator = '>' # Default
            split_op = None
            
            # Find longest operator match first
            for op_text in sorted(ops, key=len, reverse=True):
                if f" {op_text} " in f" {cond} ": # Pad with spaces to avoid partial matches
                    operator = get_operator(op_text)
                    split_op = op_text
                    break
            
            if split_op:
                 parts = cond.split(split_op, 1)
            else:
                 # Fallback if no operator found (maybe "close" -> "close > 0"?)
                 # For now, let's assume > 0 if boolean like "Bullish"
                 if "bullish" in cond:
                     # Handle presets or boolean flags if we had them
                     # For now, treating as error or skipping
                     logger.warning(f"No operator found in '{cond}', skipping")
                     continue
                 parts = [cond, "0"]
                 
            if len(parts) != 2:
                logger.warning(f"Could not split '{cond}' into LHS/RHS")
                continue

            lhs_text = parts[0].strip()
            rhs_text = parts[1].strip()

            lhs_measure = parse_measure(lhs_text)
            
            # Check if RHS is number or measure
            # Try parse float
            try:
                rhs_val = float(rhs_text)
                rhs_is_number = True
                rhs_measure = None
            except ValueError:
                rhs_val = 0
                rhs_is_number = False
                rhs_measure = parse_measure(rhs_text)

            # Construct Filter Node
            node_id = str(uuid4())
            
            expression = {
                "offset": "latest",
                "timeframe": "daily",
                "measure": lhs_measure if lhs_measure.get('type') == 'attribute' else lhs_measure, 
                "operator": operator,
                "valueType": "number" if rhs_is_number else "measure",
            }

            if rhs_is_number:
                expression["compareToNumber"] = rhs_val
            else:
                 if rhs_measure.get('type') == 'indicator':
                      expression["compareToMeasure"] = rhs_measure
                 else:
                      expression["compareToMeasure"] = rhs_measure['field']

            # Simplify lhs measure for expression
            if lhs_measure.get('type') == 'indicator':
                expression["measure"] = lhs_measure
            else:
                expression["measure"] = lhs_measure['field']

            # Create the full node
            node = {
                "id": node_id,
                "type": "simple",
                "enabled": True,
                "field": lhs_measure.get('field', 'close'),
                "filterType": "indicator" if lhs_measure.get('type') == 'indicator' else "price", 
                "operator": operator,
                "value": rhs_val if rhs_is_number else rhs_measure,
                "valueType": "number" if rhs_is_number else "indicator", 
                "expression": expression,
                "time_period": lhs_measure.get('time_period', 14) 
            }
            
            filters.append(node)

        except Exception as e:
            logger.error(f"Failed to parse condition '{cond}': {e}")
            continue

    return {'filters': filters}


# ============================================================================
# HEALTH CHECK TOOL
# ============================================================================

@mcp.tool()
def health_check() -> Dict[str, Any]:
    """Check the health status of the MCP server and its dependencies.

    Args:
        None.

    Returns:
        Dictionary containing:
        - status: Overall health status ('healthy' or 'degraded')
        - redis: Redis connection status
        - api: API connectivity status
        - version: Server version
        - timestamp: Current server time
    """
    health = {
        'status': 'healthy',
        'version': '2.0.0',
        'timestamp': datetime.now().isoformat(),
        'components': {}
    }
    
    # Check Redis
    try:
        if CACHE_ENABLED:
            redis_client.ping()
            health['components']['redis'] = {'status': 'connected'}
        else:
            health['components']['redis'] = {'status': 'disabled'}
    except Exception as e:
        health['components']['redis'] = {'status': 'error', 'message': str(e)}
        health['status'] = 'degraded'
    
    # Check API connectivity
    try:
        _api_request('GET', '/api/symbols?take=1')
        health['components']['api'] = {'status': 'connected', 'url': API_BASE_URL}
    except Exception as e:
        health['components']['api'] = {'status': 'error', 'message': str(e)}
        health['status'] = 'degraded'
    
    return health


# ============================================================================
# SERVER ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Stock Scanner MCP Server v2.0.0")
    logger.info("=" * 60)
    logger.info(f"API URL: {API_BASE_URL}")
    logger.info(f"Redis Cache: {'Enabled' if CACHE_ENABLED else 'Disabled'}")
    logger.info(f"Log Level: {LOG_LEVEL}")
    logger.info("=" * 60)
    
    try:
        # Run the server
        mcp.run()
    except KeyboardInterrupt:
        logger.info("\nServer stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
    finally:
        logger.info("Server terminated")    