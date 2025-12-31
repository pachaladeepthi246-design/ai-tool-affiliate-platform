import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import backend from '~backend/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Users, DollarSign, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => backend.referrals.getReferralStats(),
  });

  const createCodeMutation = useMutation({
    mutationFn: () => backend.referrals.createReferralCode({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
      toast({ title: 'Referral code created' });
    },
  });

  const applyCodeMutation = useMutation({
    mutationFn: (code: string) => backend.referrals.applyReferralCode({ code }),
    onSuccess: () => {
      toast({ title: 'Referral code applied successfully' });
      setReferralCode('');
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Referral Program</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReferrals ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.completedReferrals ?? 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalCommissions?.toFixed(2) ?? '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              ${stats?.pendingCommissions?.toFixed(2) ?? '0.00'} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.referralCode?.commission_rate ?? 5}%
            </div>
            <p className="text-xs text-muted-foreground">Per referral</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats?.referralCode ? (
            <div className="flex items-center gap-2">
              <Input
                value={stats.referralCode.code}
                readOnly
                className="font-mono text-lg"
              />
              <Button
                onClick={() => copyToClipboard(stats.referralCode.code)}
                variant="outline"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={() => createCodeMutation.mutate()}>
              Generate Referral Code
            </Button>
          )}

          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Apply a Referral Code</h3>
            <div className="flex gap-2">
              <Input
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Enter referral code"
              />
              <Button
                onClick={() => applyCodeMutation.mutate(referralCode)}
                disabled={!referralCode || applyCodeMutation.isPending}
              >
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats?.recentReferrals && stats.recentReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentReferrals.map((referral: any) => (
                <div key={referral.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">Referral #{referral.id}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={referral.status === 'completed' ? 'default' : 'secondary'}>
                      {referral.status}
                    </Badge>
                    <div className="text-sm font-medium text-green-600 mt-1">
                      ${referral.commission_earned.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
