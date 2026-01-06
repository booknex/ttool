import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  LogOut,
  UserPlus,
  CheckCircle,
  Clock,
  Share2,
  Trophy,
  Star,
  Flame,
  Target,
  Award,
  Crown,
  Zap,
  Medal,
} from "lucide-react";
import { format } from "date-fns";

interface AffiliateStats {
  totalReferrals: number;
  registered: number;
  converted: number;
  conversionRate: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalEarnings: number;
  referralCode: string;
  payoutRate: string;
}

interface Referral {
  id: string;
  leadEmail: string;
  leadName: string | null;
  status: string;
  commissionAmount: string | null;
  commissionStatus: string | null;
  createdAt: string;
}

interface Affiliate {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  referralCode: string;
}

interface LeaderboardEntry {
  rank: number;
  referrals: number;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  currentRank: number;
  currentUserEntry: LeaderboardEntry | null;
  totalAffiliates: number;
}

const TIERS = [
  { name: "Bronze", minReferrals: 0, color: "bg-amber-600", icon: Medal, nextAt: 5 },
  { name: "Silver", minReferrals: 5, color: "bg-gray-400", icon: Star, nextAt: 15 },
  { name: "Gold", minReferrals: 15, color: "bg-yellow-500", icon: Trophy, nextAt: 30 },
  { name: "Platinum", minReferrals: 30, color: "bg-indigo-500", icon: Crown, nextAt: 50 },
  { name: "Diamond", minReferrals: 50, color: "bg-cyan-400", icon: Zap, nextAt: null },
];

const BADGES = [
  { id: "first_referral", name: "First Steps", description: "Get your first referral", icon: UserPlus, requirement: (s: AffiliateStats) => s.totalReferrals >= 1 },
  { id: "five_referrals", name: "Getting Traction", description: "Refer 5 clients", icon: Users, requirement: (s: AffiliateStats) => s.totalReferrals >= 5 },
  { id: "first_conversion", name: "Closer", description: "Get your first conversion", icon: Target, requirement: (s: AffiliateStats) => s.converted >= 1 },
  { id: "five_conversions", name: "Momentum", description: "Convert 5 clients", icon: Flame, requirement: (s: AffiliateStats) => s.converted >= 5 },
  { id: "hundred_earned", name: "Benjamin", description: "Earn $100 in commissions", icon: DollarSign, requirement: (s: AffiliateStats) => s.totalEarnings >= 100 },
  { id: "high_converter", name: "Sharp Shooter", description: "Achieve 50%+ conversion rate", icon: TrendingUp, requirement: (s: AffiliateStats) => s.conversionRate >= 50 && s.totalReferrals >= 3 },
];

function getTier(referrals: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (referrals >= TIERS[i].minReferrals) {
      return { current: TIERS[i], next: TIERS[i + 1] || null, index: i };
    }
  }
  return { current: TIERS[0], next: TIERS[1], index: 0 };
}

export default function AffiliateDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAchievements, setShowAchievements] = useState(false);

  const { data: affiliate, isLoading: affiliateLoading } = useQuery<Affiliate>({
    queryKey: ["/api/affiliate/auth/user"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AffiliateStats>({
    queryKey: ["/api/affiliate/stats"],
    enabled: !!affiliate,
  });

  const { data: referrals, isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ["/api/affiliate/referrals"],
    enabled: !!affiliate,
  });

  const { data: leaderboardData } = useQuery<LeaderboardData>({
    queryKey: ["/api/affiliate/leaderboard"],
    enabled: !!affiliate,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/affiliate/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/affiliate/login");
    },
  });

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${stats?.referralCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const copyReferralCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
    }
  };

  if (affiliateLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!affiliate) {
    setLocation("/affiliate/login");
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "registered":
        return <Badge variant="secondary">Registered</Badge>;
      case "converted":
        return <Badge className="bg-green-100 text-green-800">Converted</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCommissionBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800">Pending</Badge>;
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      default:
        return null;
    }
  };

  const tierInfo = getTier(stats?.totalReferrals || 0);
  const progressToNext = tierInfo.next
    ? ((stats?.totalReferrals || 0) - tierInfo.current.minReferrals) / (tierInfo.next.minReferrals - tierInfo.current.minReferrals) * 100
    : 100;

  const earnedBadges = stats ? BADGES.filter(b => b.requirement(stats)) : [];
  const lockedBadges = stats ? BADGES.filter(b => !b.requirement(stats)) : BADGES;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Affiliate Dashboard</h1>
              <p className="text-sm text-gray-500">
                Welcome, {affiliate.firstName || affiliate.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card 
            className={`border-2 ${tierInfo.current.color.replace('bg-', 'border-')} col-span-1 cursor-pointer hover:shadow-lg transition-shadow`}
            onClick={() => setShowAchievements(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-full ${tierInfo.current.color} flex items-center justify-center`}>
                  <tierInfo.current.icon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Tier</p>
                  <h2 className="text-2xl font-bold">{tierInfo.current.name}</h2>
                </div>
              </div>
              {tierInfo.next && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Progress to {tierInfo.next.name}</span>
                    <span className="font-medium">{stats?.totalReferrals || 0}/{tierInfo.next.minReferrals}</span>
                  </div>
                  <Progress value={progressToNext} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    {tierInfo.next.minReferrals - (stats?.totalReferrals || 0)} more referrals to unlock
                  </p>
                </div>
              )}
              {!tierInfo.next && (
                <p className="text-sm text-gray-500">You've reached the highest tier!</p>
              )}
              <p className="text-xs text-center text-gray-400 mt-3">Tap to view achievements</p>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 col-span-1 lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Your Referral Code</h2>
                  <div className="flex items-center gap-2">
                    <code className="text-2xl font-bold text-indigo-600 bg-white px-4 py-2 rounded-lg border">
                      {stats?.referralCode || "Loading..."}
                    </code>
                    <Button size="icon" variant="outline" onClick={copyReferralCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button onClick={copyReferralLink} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Copy Referral Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Referrals</p>
                  <p className="text-3xl font-bold">
                    {statsLoading ? <Skeleton className="h-9 w-12" /> : stats?.totalReferrals || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Conversions</p>
                  <p className="text-3xl font-bold">
                    {statsLoading ? <Skeleton className="h-9 w-12" /> : stats?.converted || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Conversion Rate</p>
                  <p className="text-3xl font-bold">
                    {statsLoading ? <Skeleton className="h-9 w-12" /> : `${stats?.conversionRate || 0}%`}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Earnings</p>
                  <p className="text-3xl font-bold text-green-600">
                    {statsLoading ? (
                      <Skeleton className="h-9 w-16" />
                    ) : (
                      `$${(stats?.totalEarnings || 0).toFixed(2)}`
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                {leaderboardData?.currentRank
                  ? `You're #${leaderboardData.currentRank} of ${leaderboardData.totalAffiliates}`
                  : "Top performers this month"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {leaderboardData?.leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    entry.isCurrentUser ? "bg-indigo-50 border border-indigo-200" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      entry.rank === 1 ? "bg-yellow-400 text-white" :
                      entry.rank === 2 ? "bg-gray-300 text-gray-700" :
                      entry.rank === 3 ? "bg-amber-600 text-white" :
                      "bg-gray-200 text-gray-600"
                    }`}>
                      {entry.rank}
                    </span>
                    <span className={`text-sm ${entry.isCurrentUser ? "font-bold text-indigo-600" : "text-gray-600"}`}>
                      {entry.isCurrentUser ? "You" : `#${entry.rank} Affiliate`}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{entry.referrals} refs</span>
                </div>
              ))}
              {leaderboardData?.currentUserEntry && (
                <>
                  <div className="text-center text-xs text-gray-400 py-1">• • •</div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-indigo-500 text-white">
                        {leaderboardData.currentUserEntry.rank}
                      </span>
                      <span className="text-sm font-bold text-indigo-600">You</span>
                    </div>
                    <span className="text-sm font-medium">{leaderboardData.currentUserEntry.referrals} refs</span>
                  </div>
                </>
              )}
              {!leaderboardData && (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Commission Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm">Pending</span>
                <span className="font-semibold text-yellow-700">
                  ${(stats?.pendingCommissions || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm">Paid</span>
                <span className="font-semibold text-green-700">
                  ${(stats?.paidCommissions || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500">Commission Rate</p>
                <p className="text-xl font-bold text-indigo-600">{stats?.payoutRate || "10%"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Referrals</CardTitle>
              <CardDescription>Track the status of your referrals</CardDescription>
            </CardHeader>
            <CardContent>
              {referralsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : referrals && referrals.length > 0 ? (
                <div className="space-y-2">
                  {referrals.slice(0, 4).map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{referral.leadName || referral.leadEmail}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(referral.createdAt), "MMM d")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(referral.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No referrals yet</p>
                  <p className="text-xs">Share your code to start earning!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showAchievements} onOpenChange={setShowAchievements}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Your Achievements
            </DialogTitle>
            <DialogDescription>
              {earnedBadges.length} of {BADGES.length} badges unlocked
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2 text-green-700">Unlocked</h4>
              {earnedBadges.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {earnedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-200"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <badge.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{badge.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{badge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No badges unlocked yet. Keep referring!</p>
              )}
            </div>
            {lockedBadges.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-500">Locked</h4>
                <div className="grid grid-cols-2 gap-2">
                  {lockedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 opacity-60"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <badge.icon className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500 truncate">{badge.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{badge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
