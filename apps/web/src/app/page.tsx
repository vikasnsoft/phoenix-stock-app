import Link from "next/link";
import {
  Search,
  TrendingUp,
  Bell,
  Star,
  BarChart3,
  Plus,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Phoenix Stock Scanner. Start scanning or manage your
          watchlists.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          title="New Scan"
          description="Create a custom scan"
          icon={<Search className="h-5 w-5" />}
          href="/scans"
          variant="primary"
        />
        <QuickActionCard
          title="Saved Scans"
          description="View your saved scans"
          icon={<Star className="h-5 w-5" />}
          href="/saved-scans"
        />
        <QuickActionCard
          title="Watchlists"
          description="Manage watchlists"
          icon={<BarChart3 className="h-5 w-5" />}
          href="/watchlists"
        />
        <QuickActionCard
          title="Discover"
          description="Explore public scans"
          icon={<TrendingUp className="h-5 w-5" />}
          href="/discover"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Scans */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Scans</CardTitle>
              <CardDescription>Your recently run scans</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/saved-scans">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <RecentScansWidget />
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Active Alerts</CardTitle>
              <CardDescription>Monitoring for triggers</CardDescription>
            </div>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AlertsWidget />
          </CardContent>
        </Card>

        {/* Watchlists */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Watchlists</CardTitle>
              <CardDescription>Your stock watchlists</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/watchlists">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <WatchlistsWidget />
          </CardContent>
        </Card>

        {/* Market Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
            <CardDescription>Your activity overview</CardDescription>
          </CardHeader>
          <CardContent>
            <StatsWidget />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  icon,
  href,
  variant = "default",
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  variant?: "default" | "primary";
}) {
  return (
    <Link href={href}>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
          variant === "primary" ? "border-primary bg-primary/5" : ""
        }`}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className={`rounded-lg p-2 ${
              variant === "primary"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            {icon}
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function RecentScansWidget() {
  const recentScans = [
    { id: "1", name: "RSI Oversold", lastRun: "2 hours ago", results: 12 },
    { id: "2", name: "Golden Cross", lastRun: "5 hours ago", results: 8 },
    { id: "3", name: "Volume Breakout", lastRun: "1 day ago", results: 24 },
  ];

  if (recentScans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Search className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No recent scans</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/scans">Create your first scan</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentScans.map((scan) => (
        <div
          key={scan.id}
          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">{scan.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {scan.lastRun}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold">{scan.results}</span>
            <p className="text-xs text-muted-foreground">matches</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsWidget() {
  const alerts = [
    { id: "1", name: "AAPL > $200", status: "active" },
    { id: "2", name: "RSI < 30 Alert", status: "active" },
  ];

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Bell className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No active alerts</p>
        <Button variant="link" size="sm" className="mt-2" asChild>
          <Link href="/alerts">Create alert</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between p-3 rounded-lg border"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">{alert.name}</span>
          </div>
          <span className="text-xs text-muted-foreground capitalize">
            {alert.status}
          </span>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full mt-2">
        <Plus className="h-4 w-4 mr-1" />
        Add Alert
      </Button>
    </div>
  );
}

function WatchlistsWidget() {
  const watchlists = [
    { id: "1", name: "Tech Stocks", count: 15 },
    { id: "2", name: "Dividend Kings", count: 8 },
    { id: "3", name: "Small Caps", count: 22 },
  ];

  if (watchlists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Star className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No watchlists yet</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/watchlists">Create a watchlist</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {watchlists.map((list) => (
        <Link key={list.id} href={`/watchlists/${list.id}`}>
          <div className="p-4 rounded-lg border hover:bg-accent/50 transition-colors text-center">
            <p className="text-2xl font-bold">{list.count}</p>
            <p className="text-sm text-muted-foreground truncate">
              {list.name}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function StatsWidget() {
  const stats = [
    { label: "Total Scans", value: "47" },
    { label: "Saved Scans", value: "12" },
    { label: "Active Alerts", value: "5" },
    { label: "Watchlists", value: "3" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="text-center p-3 rounded-lg bg-muted/50"
        >
          <p className="text-2xl font-bold">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
