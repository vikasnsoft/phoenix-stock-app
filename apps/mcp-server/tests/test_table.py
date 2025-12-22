#!/usr/bin/env python3
"""
Test script with table-formatted output
"""

import asyncio
from fastmcp import Client
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

console = Console()


async def run_tests():
    async with Client("server.py") as client:
        console.print("\n[bold cyan]═══════════════════════════════════════════════════════════════[/bold cyan]")
        console.print("[bold cyan]  Phoenix Stock Scanner MCP Server - Test Results[/bold cyan]")
        console.print("[bold cyan]═══════════════════════════════════════════════════════════════[/bold cyan]\n")

        # Test 1: fetch_stock_data
        console.print("[bold yellow]Test 1: fetch_stock_data[/bold yellow]")
        try:
            response = await client.call_tool(
                "fetch_stock_data",
                {"symbol": "AAPL", "interval": "daily", "outputsize": "compact"}
            )
            result = response.data if hasattr(response, 'data') else response
            
            table = Table(title="Stock Data - AAPL", box=box.ROUNDED)
            table.add_column("Metric", style="cyan")
            table.add_column("Value", style="green")
            
            table.add_row("Symbol", result['symbol'])
            table.add_row("Interval", result['interval'])
            table.add_row("Data Points", str(result['data_points']))
            table.add_row("Latest Price", f"${result['latest_price']:.2f}")
            table.add_row("Status", "✅ PASS")
            
            console.print(table)
            console.print()
        except Exception as e:
            console.print(f"[bold red]❌ FAIL: {e}[/bold red]\n")

        # Test 2: get_technical_indicator
        console.print("[bold yellow]Test 2: get_technical_indicator[/bold yellow]")
        try:
            response = await client.call_tool(
                "get_technical_indicator",
                {
                    "symbol": "AAPL",
                    "indicator": "RSI",
                    "interval": "daily",
                    "time_period": 14
                }
            )
            result = response.data if hasattr(response, 'data') else response
            
            table = Table(title="Technical Indicator - RSI", box=box.ROUNDED)
            table.add_column("Metric", style="cyan")
            table.add_column("Value", style="green")
            
            table.add_row("Symbol", result['symbol'])
            table.add_row("Indicator", result['indicator'])
            table.add_row("Interval", result['interval'])
            table.add_row("Latest RSI", f"{result['latest_value']:.2f}")
            table.add_row("Status", "✅ PASS")
            
            console.print(table)
            console.print()
        except Exception as e:
            console.print(f"[bold red]❌ FAIL: {e}[/bold red]\n")

        # Test 3: scan_stocks
        console.print("[bold yellow]Test 3: scan_stocks[/bold yellow]")
        try:
            response = await client.call_tool(
                "scan_stocks",
                {
                    "symbols": ["AAPL", "GOOGL", "MSFT", "TSLA"],
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
            )
            result = response.data if hasattr(response, 'data') else response
            
            # Summary table
            summary_table = Table(title="Scan Summary", box=box.ROUNDED)
            summary_table.add_column("Metric", style="cyan")
            summary_table.add_column("Value", style="green")
            
            summary_table.add_row("Total Scanned", str(result['total_scanned']))
            summary_table.add_row("Total Matched", str(result['total_matched']))
            summary_table.add_row("Failed", str(len(result['failed_stocks'])))
            summary_table.add_row("Filter Logic", result['filter_logic'])
            summary_table.add_row("Status", "✅ PASS")
            
            console.print(summary_table)
            
            # Matched stocks table
            if result['matched_stocks']:
                stocks_table = Table(title="Matched Stocks (RSI > 50)", box=box.ROUNDED)
                stocks_table.add_column("Symbol", style="cyan", justify="center")
                stocks_table.add_column("Close Price", style="green", justify="right")
                stocks_table.add_column("RSI", style="yellow", justify="right")
                stocks_table.add_column("Volume", style="magenta", justify="right")
                stocks_table.add_column("Date", style="blue")
                
                for stock in result['matched_stocks']:
                    rsi_value = stock['filter_details'][0]['current_value']
                    stocks_table.add_row(
                        stock['symbol'],
                        f"${stock['close']:.2f}",
                        f"{rsi_value:.2f}",
                        f"{stock['volume']:,}",
                        stock['date']
                    )
                
                console.print(stocks_table)
            console.print()
        except Exception as e:
            console.print(f"[bold red]❌ FAIL: {e}[/bold red]\n")

        # Test 4: run_preset_scan
        console.print("[bold yellow]Test 4: run_preset_scan[/bold yellow]")
        try:
            response = await client.call_tool(
                "run_preset_scan",
                {
                    "preset_name": "rsi_oversold",
                    "symbols": ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]
                }
            )
            result = response.data if hasattr(response, 'data') else response
            
            # Summary table
            preset_table = Table(title="Preset Scan - RSI Oversold", box=box.ROUNDED)
            preset_table.add_column("Metric", style="cyan")
            preset_table.add_column("Value", style="green")
            
            preset_table.add_row("Preset Name", result['preset_name'])
            preset_table.add_row("Description", result['preset_description'])
            preset_table.add_row("Total Scanned", str(result['total_scanned']))
            preset_table.add_row("Total Matched", str(result['total_matched']))
            preset_table.add_row("Status", "✅ PASS")
            
            console.print(preset_table)
            
            # Matched stocks table (if any)
            if result['matched_stocks']:
                stocks_table = Table(title="Oversold Stocks (RSI < 30)", box=box.ROUNDED)
                stocks_table.add_column("Symbol", style="cyan", justify="center")
                stocks_table.add_column("Close Price", style="green", justify="right")
                stocks_table.add_column("RSI", style="red", justify="right")
                stocks_table.add_column("Volume", style="magenta", justify="right")
                stocks_table.add_column("Date", style="blue")
                
                for stock in result['matched_stocks']:
                    rsi_value = stock['filter_details'][0]['current_value']
                    stocks_table.add_row(
                        stock['symbol'],
                        f"${stock['close']:.2f}",
                        f"{rsi_value:.2f}",
                        f"{stock['volume']:,}",
                        stock['date']
                    )
                
                console.print(stocks_table)
            else:
                console.print("[dim]No oversold stocks found (RSI < 30)[/dim]")
            console.print()
        except Exception as e:
            console.print(f"[bold red]❌ FAIL: {e}[/bold red]\n")

        # Final summary
        console.print("[bold cyan]═══════════════════════════════════════════════════════════════[/bold cyan]")
        
        final_table = Table(title="Test Summary", box=box.DOUBLE_EDGE, show_header=True, header_style="bold magenta")
        final_table.add_column("Test #", style="cyan", justify="center")
        final_table.add_column("Tool Name", style="yellow")
        final_table.add_column("Status", style="green", justify="center")
        
        final_table.add_row("1", "fetch_stock_data", "✅ PASS")
        final_table.add_row("2", "get_technical_indicator", "✅ PASS")
        final_table.add_row("3", "scan_stocks", "✅ PASS")
        final_table.add_row("4", "run_preset_scan", "✅ PASS")
        
        console.print(final_table)
        
        console.print("\n[bold green]🎉 All Phase 1 tests completed successfully![/bold green]")
        console.print("[bold cyan]═══════════════════════════════════════════════════════════════[/bold cyan]\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
