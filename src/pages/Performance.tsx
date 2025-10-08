import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface SalesMetric {
  id: string;
  user_id: string;
  metric_month: string;
  rn_auto: number;
  fire: number;
  life: number;
  health: number;
  life_premium: number;
  health_premium: number;
  total_sales: number;
  created_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  name: string;
  total_sales: number;
  rn_auto: number;
  fire: number;
  life: number;
  health: number;
  life_premium: number;
  health_premium: number;
}

const Performance = () => {
  const [metrics, setMetrics] = useState<SalesMetric[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rnAuto, setRnAuto] = useState("");
  const [fire, setFire] = useState("");
  const [life, setLife] = useState("");
  const [health, setHealth] = useState("");
  const [lifePremium, setLifePremium] = useState("");
  const [healthPremium, setHealthPremium] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's sales metrics
      const { data: metricsData } = await supabase
        .from("sales_metrics")
        .select("*")
        .eq("user_id", user.id)
        .order("metric_month", { ascending: false })
        .limit(12);

      // Fetch leaderboard (top performers based on last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: leaderboardData } = await supabase
        .from("sales_metrics")
        .select(`
          user_id,
          rn_auto,
          fire,
          life,
          health,
          life_premium,
          health_premium,
          total_sales,
          profiles!inner(first_name, last_name)
        `)
        .gte("metric_month", threeMonthsAgo.toISOString().split('T')[0])
        .order("total_sales", { ascending: false });

      // Aggregate leaderboard data by user
      const aggregatedLeaderboard = leaderboardData?.reduce((acc: any[], curr: any) => {
        const existing = acc.find(item => item.user_id === curr.user_id);
        if (existing) {
          existing.total_sales += curr.total_sales;
          existing.rn_auto += curr.rn_auto;
          existing.fire += curr.fire;
          existing.life += curr.life;
          existing.health += curr.health;
          existing.life_premium += curr.life_premium;
          existing.health_premium += curr.health_premium;
        } else {
          acc.push({
            user_id: curr.user_id,
            name: `${curr.profiles.first_name} ${curr.profiles.last_name}`,
            total_sales: curr.total_sales,
            rn_auto: curr.rn_auto,
            fire: curr.fire,
            life: curr.life,
            health: curr.health,
            life_premium: curr.life_premium,
            health_premium: curr.health_premium,
          });
        }
        return acc;
      }, []).sort((a, b) => b.total_sales - a.total_sales).slice(0, 10) || [];

      setMetrics(metricsData || []);
      setLeaderboard(aggregatedLeaderboard);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rnAutoVal = parseInt(rnAuto) || 0;
    const fireVal = parseInt(fire) || 0;
    const lifeVal = parseInt(life) || 0;
    const healthVal = parseInt(health) || 0;
    const lifePremiumVal = parseInt(lifePremium) || 0;
    const healthPremiumVal = parseInt(healthPremium) || 0;

    if (rnAutoVal < 0 || fireVal < 0 || lifeVal < 0 || healthVal < 0 || lifePremiumVal < 0 || healthPremiumVal < 0) {
      toast({
        title: "Invalid input",
        description: "Please enter valid positive numbers",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentMonth = format(new Date(), "yyyy-MM") + "-01";

      const { error } = await supabase
        .from("sales_metrics")
        .upsert({
          user_id: user.id,
          metric_month: currentMonth,
          rn_auto: rnAutoVal,
          fire: fireVal,
          life: lifeVal,
          health: healthVal,
          life_premium: lifePremiumVal,
          health_premium: healthPremiumVal,
        }, {
          onConflict: 'user_id,metric_month'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales metrics saved successfully",
      });

      setRnAuto("");
      setFire("");
      setLife("");
      setHealth("");
      setLifePremium("");
      setHealthPremium("");
      fetchData();
    } catch (error) {
      console.error("Error saving metrics:", error);
      toast({
        title: "Error",
        description: "Failed to save sales metrics",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Track your sales and compete with your team</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Log Monthly Sales</CardTitle>
            <CardDescription>Enter your sales for this month</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rn_auto">RN Auto</Label>
                  <Input
                    id="rn_auto"
                    type="number"
                    placeholder="0"
                    value={rnAuto}
                    onChange={(e) => setRnAuto(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fire">Fire</Label>
                  <Input
                    id="fire"
                    type="number"
                    placeholder="0"
                    value={fire}
                    onChange={(e) => setFire(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="life">Life</Label>
                  <Input
                    id="life"
                    type="number"
                    placeholder="0"
                    value={life}
                    onChange={(e) => setLife(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="health">Health</Label>
                  <Input
                    id="health"
                    type="number"
                    placeholder="0"
                    value={health}
                    onChange={(e) => setHealth(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="life_premium">Life Premium</Label>
                  <Input
                    id="life_premium"
                    type="number"
                    placeholder="0"
                    value={lifePremium}
                    onChange={(e) => setLifePremium(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="health_premium">Health Premium</Label>
                  <Input
                    id="health_premium"
                    type="number"
                    placeholder="0"
                    value={healthPremium}
                    onChange={(e) => setHealthPremium(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit">Submit Sales</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Sales History</CardTitle>
            <CardDescription>Your recent sales performance</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : metrics.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No sales data yet</p>
            ) : (
              <div className="space-y-4">
                {metrics.map((metric) => (
                  <div key={metric.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-medium">
                        {format(new Date(metric.metric_month), "MMMM yyyy")}
                      </p>
                      <div className="text-xl font-bold">Total: {metric.total_sales}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div>RN Auto: {metric.rn_auto}</div>
                      <div>Fire: {metric.fire}</div>
                      <div>Life: {metric.life}</div>
                      <div>Health: {metric.health}</div>
                      <div>Life Premium: {metric.life_premium}</div>
                      <div>Health Premium: {metric.health_premium}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Top Performers
            </CardTitle>
            <CardDescription>Leaderboard based on last 3 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No leaderboard data available</p>
            ) : (
              <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                  <div 
                    key={entry.user_id} 
                    className={`p-4 border rounded-lg transition-colors ${
                      index === 0 ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                      index === 1 ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800' :
                      index === 2 ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' :
                      'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-2">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-500 text-white' :
                        'bg-primary text-primary-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{entry.name}</p>
                      </div>
                      <div className="text-2xl font-bold">{entry.total_sales}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground ml-14">
                      <div>RN Auto: {entry.rn_auto}</div>
                      <div>Fire: {entry.fire}</div>
                      <div>Life: {entry.life}</div>
                      <div>Health: {entry.health}</div>
                      <div>Life Premium: {entry.life_premium}</div>
                      <div>Health Premium: {entry.health_premium}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Performance;
