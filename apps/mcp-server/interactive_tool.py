#!/usr/bin/env python3
"""
Interactive MCP Tool Runner
Run tools with natural language prompts or direct parameters
"""

import asyncio
import json
import argparse
from pathlib import Path
from fastmcp import Client
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.json import JSON
from rich import box

console = Console()


async def run_tool(tool_name: str, params: dict):
    """Execute a tool and display results"""
    server_path = str(Path(__file__).with_name("server.py"))
    async with Client(server_path) as client:
        try:
            console.print(f"\n[bold cyan]Executing:[/bold cyan] {tool_name}")
            console.print(f"[dim]Parameters:[/dim] {json.dumps(params, indent=2)}\n")
            
            response = await client.call_tool(tool_name, params)
            result = response.data if hasattr(response, 'data') else response
            
            # Display based on tool type
            if tool_name == "fetch_stock_data":
                display_stock_data(result)
            elif tool_name == "get_technical_indicator":
                display_indicator(result)
            elif tool_name == "scan_stocks":
                display_scan_results(result)
            elif tool_name == "run_preset_scan":
                display_preset_scan(result)
            else:
                # Fallback: display as JSON
                console.print(JSON(json.dumps(result, indent=2)))
                
        except Exception as e:
            console.print(f"[bold red]Error:[/bold red] {e}")


def display_stock_data(result):
    """Display stock data in table format"""
    table = Table(title=f"Stock Data - {result['symbol']}", box=box.ROUNDED)
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("Symbol", result['symbol'])
    table.add_row("Interval", result['interval'])
    table.add_row("Data Points", str(result['data_points']))
    table.add_row("Latest Price", f"${result['latest_price']:.2f}")
    table.add_row("Last Updated", result['last_updated'])
    
    console.print(table)
    
    # Show recent data
    if result['data']:
        data_table = Table(title="Recent Price Data (Last 5 Days)", box=box.SIMPLE)
        data_table.add_column("Date", style="cyan")
        data_table.add_column("Open", style="yellow", justify="right")
        data_table.add_column("High", style="green", justify="right")
        data_table.add_column("Low", style="red", justify="right")
        data_table.add_column("Close", style="blue", justify="right")
        data_table.add_column("Volume", style="magenta", justify="right")
        
        for record in result['data'][-5:]:
            data_table.add_row(
                record['date'],
                f"${record['open']:.2f}" if record['open'] else "N/A",
                f"${record['high']:.2f}" if record['high'] else "N/A",
                f"${record['low']:.2f}" if record['low'] else "N/A",
                f"${record['close']:.2f}" if record['close'] else "N/A",
                f"{record['volume']:,}" if record['volume'] else "N/A"
            )
        
        console.print(data_table)


def display_indicator(result):
    """Display technical indicator results"""
    table = Table(title=f"{result['indicator']} - {result['symbol']}", box=box.ROUNDED)
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("Symbol", result['symbol'])
    table.add_row("Indicator", result['indicator'])
    table.add_row("Interval", result['interval'])
    
    if isinstance(result['latest_value'], dict):
        # MACD or Bollinger Bands
        for key, value in result['latest_value'].items():
            table.add_row(key.replace('_', ' ').title(), f"{value:.4f}")
    else:
        table.add_row("Latest Value", f"{result['latest_value']:.4f}")
    
    if 'parameters' in result:
        table.add_row("Parameters", json.dumps(result['parameters']))
    
    console.print(table)


def display_scan_results(result):
    """Display scan results"""
    # Summary
    summary_table = Table(title="Scan Summary", box=box.ROUNDED)
    summary_table.add_column("Metric", style="cyan")
    summary_table.add_column("Value", style="green")
    
    summary_table.add_row("Total Scanned", str(result['total_scanned']))
    summary_table.add_row("Total Matched", str(result['total_matched']))
    summary_table.add_row("Failed", str(len(result['failed_stocks'])))
    summary_table.add_row("Filter Logic", result['filter_logic'])
    
    console.print(summary_table)
    
    # Matched stocks
    if result['matched_stocks']:
        stocks_table = Table(title="Matched Stocks", box=box.ROUNDED)
        stocks_table.add_column("Symbol", style="cyan", justify="center")
        stocks_table.add_column("Close Price", style="green", justify="right")
        stocks_table.add_column("Volume", style="magenta", justify="right")
        stocks_table.add_column("Matched Filters", style="yellow", justify="center")
        stocks_table.add_column("Date", style="blue")
        
        for stock in result['matched_stocks']:
            stocks_table.add_row(
                stock['symbol'],
                f"${stock['close']:.2f}",
                f"{stock['volume']:,}" if stock['volume'] else "N/A",
                f"{stock['matched_filters']}/{stock['total_filters']}",
                stock['date']
            )
        
        console.print(stocks_table)
        
        # Show filter details for first match
        if result['matched_stocks'][0].get('filter_details'):
            console.print(f"\n[dim]Filter details for {result['matched_stocks'][0]['symbol']}:[/dim]")
            console.print(JSON(json.dumps(result['matched_stocks'][0]['filter_details'], indent=2)))
    else:
        console.print("\n[yellow]No stocks matched the filters[/yellow]")
    
    # Failed stocks
    if result['failed_stocks']:
        console.print("\n[bold red]Failed Stocks:[/bold red]")
        for failed in result['failed_stocks']:
            console.print(f"  • {failed['symbol']}: {failed['error']}")


def display_preset_scan(result):
    """Display preset scan results"""
    # Header
    console.print(Panel(
        f"[bold]{result['preset_name']}[/bold]\n{result['preset_description']}",
        title="Preset Scan",
        border_style="cyan"
    ))
    
    # Summary
    summary_table = Table(box=box.SIMPLE)
    summary_table.add_column("Metric", style="cyan")
    summary_table.add_column("Value", style="green")
    
    summary_table.add_row("Total Scanned", str(result['total_scanned']))
    summary_table.add_row("Total Matched", str(result['total_matched']))
    
    console.print(summary_table)
    
    # Matched stocks
    if result['matched_stocks']:
        stocks_table = Table(title="Matched Stocks", box=box.ROUNDED)
        stocks_table.add_column("Symbol", style="cyan", justify="center")
        stocks_table.add_column("Close Price", style="green", justify="right")
        stocks_table.add_column("Volume", style="magenta", justify="right")
        stocks_table.add_column("Date", style="blue")
        
        for stock in result['matched_stocks']:
            stocks_table.add_row(
                stock['symbol'],
                f"${stock['close']:.2f}",
                f"{stock['volume']:,}" if stock['volume'] else "N/A",
                stock['date']
            )
        
        console.print(stocks_table)
    else:
        console.print("\n[yellow]No stocks matched this preset[/yellow]")


def parse_prompt(prompt: str):
    """Parse natural language prompt into tool and parameters"""
    prompt_lower = prompt.lower()
    
    # Fetch stock data
    if any(word in prompt_lower for word in ['fetch', 'get stock', 'stock data', 'price']):
        # Extract symbol
        words = prompt.split()
        symbol = None
        for i, word in enumerate(words):
            if word.upper() in ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA']:
                symbol = word.upper()
                break
        
        if not symbol:
            # Try to find any uppercase word
            for word in words:
                if word.isupper() and len(word) <= 5:
                    symbol = word
                    break
        
        interval = "daily"
        if "weekly" in prompt_lower:
            interval = "weekly"
        elif "monthly" in prompt_lower:
            interval = "monthly"
        elif "intraday" in prompt_lower or "minute" in prompt_lower:
            interval = "5min"
        
        return "fetch_stock_data", {
            "symbol": symbol or "AAPL",
            "interval": interval,
            "outputsize": "compact"
        }
    
    # Technical indicator
    elif any(word in prompt_lower for word in ['rsi', 'macd', 'sma', 'ema', 'indicator']):
        words = prompt.split()
        symbol = None
        indicator = "RSI"
        
        # Extract symbol
        for word in words:
            if word.upper() in ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA']:
                symbol = word.upper()
        
        # Extract indicator
        if "rsi" in prompt_lower:
            indicator = "RSI"
        elif "macd" in prompt_lower:
            indicator = "MACD"
        elif "sma" in prompt_lower:
            indicator = "SMA"
        elif "ema" in prompt_lower:
            indicator = "EMA"
        elif "bollinger" in prompt_lower or "bbands" in prompt_lower:
            indicator = "BBANDS"
        
        return "get_technical_indicator", {
            "symbol": symbol or "AAPL",
            "indicator": indicator,
            "interval": "daily",
            "time_period": 14
        }
    
    # Scan stocks
    elif "scan" in prompt_lower and "preset" not in prompt_lower:
        # Default scan for high RSI
        symbols = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]
        
        return "scan_stocks", {
            "symbols": symbols,
            "filters": [
                {
                    "type": "indicator",
                    "field": "RSI",
                    "operator": "gt",
                    "value": 50,
                    "time_period": 14
                }
            ],
            "filter_logic": "AND"
        }
    
    # Preset scan
    elif "preset" in prompt_lower or "oversold" in prompt_lower or "overbought" in prompt_lower:
        preset = "rsi_oversold"
        
        if "overbought" in prompt_lower:
            preset = "rsi_overbought"
        elif "oversold" in prompt_lower:
            preset = "rsi_oversold"
        elif "momentum" in prompt_lower:
            preset = "strong_momentum"
        elif "volume" in prompt_lower:
            preset = "high_volume"
        elif "breakout" in prompt_lower:
            preset = "breakout_candidate"
        
        symbols = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "META", "NVDA"]
        
        return "run_preset_scan", {
            "preset_name": preset,
            "symbols": symbols
        }
    
    else:
        return None, None


async def main():
    parser = argparse.ArgumentParser(
        description="Interactive MCP Tool Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Natural language prompts:
  python interactive_tool.py "fetch AAPL stock data"
  python interactive_tool.py "get RSI for TSLA"
  python interactive_tool.py "scan stocks for high RSI"
  python interactive_tool.py "find oversold stocks"
  
  # Direct tool calls:
  python interactive_tool.py --tool fetch_stock_data --params '{"symbol": "AAPL", "interval": "daily"}'
  python interactive_tool.py --tool get_technical_indicator --params '{"symbol": "TSLA", "indicator": "RSI"}'
  python interactive_tool.py --tool run_preset_scan --params '{"preset_name": "rsi_oversold", "symbols": ["AAPL", "GOOGL"]}'
        """
    )
    
    parser.add_argument("prompt", nargs="?", help="Natural language prompt")
    parser.add_argument("--tool", help="Tool name (fetch_stock_data, get_technical_indicator, scan_stocks, run_preset_scan)")
    parser.add_argument("--params", help="Tool parameters as JSON string")
    
    args = parser.parse_args()
    
    console.print("\n[bold cyan]═══════════════════════════════════════════════════════════════[/bold cyan]")
    console.print("[bold cyan]  Phoenix Stock Scanner - Interactive Tool Runner[/bold cyan]")
    console.print("[bold cyan]═══════════════════════════════════════════════════════════════[/bold cyan]")
    
    if args.tool and args.params:
        # Direct tool call
        try:
            params = json.loads(args.params)
            await run_tool(args.tool, params)
        except json.JSONDecodeError as e:
            console.print(f"[bold red]Invalid JSON parameters:[/bold red] {e}")
    
    elif args.prompt:
        # Natural language prompt
        tool_name, params = parse_prompt(args.prompt)
        
        if tool_name:
            console.print(f"\n[dim]Interpreted as:[/dim] {tool_name}")
            await run_tool(tool_name, params)
        else:
            console.print("[bold red]Could not understand the prompt.[/bold red]")
            console.print("\nTry prompts like:")
            console.print("  • 'fetch AAPL stock data'")
            console.print("  • 'get RSI for TSLA'")
            console.print("  • 'scan stocks for high RSI'")
            console.print("  • 'find oversold stocks'")
    
    else:
        parser.print_help()
    
    console.print("\n[bold cyan]═══════════════════════════════════════════════════════════════[/bold cyan]\n")


if __name__ == "__main__":
    asyncio.run(main())
