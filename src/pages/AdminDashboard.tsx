import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BILLABLE_STAFF_ROLES, formatPlanLabel } from "@contracts/plans";
import { formatRoleSeatBreakdown, formatTotalSeatLabel } from "@/lib/plan-usage";
import {
  Users,
  UserPlus,
  Settings,
  Shield,
  AlertCircle,
  BarChart3,
} from "lucide-react";

export default function AdminDashboard() {
  const { data: planUsage, isLoading: planLoading } = trpc.users.planUsage.useQuery();
  const { data: usersList, isLoading: usersLoading } = trpc.users.list.useQuery();

  const staff = (usersList?.items ?? []).filter((u) => u.role !== "admin");
  const activeStaff = staff.filter((u) => u.status === "active");
  const usagePercent = planUsage && !planUsage.unlimited && planUsage.limit > 0
    ? Math.min(100, (planUsage.used / planUsage.limit) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Agency Admin</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Manage your team, agency settings, and day-to-day operations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Current Plan</p>
                <p className="text-lg font-semibold">{planUsage ? formatPlanLabel(planUsage.plan) : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Active Users</p>
                <p className="text-lg font-semibold">
                  {planLoading ? "…" : planUsage ? formatTotalSeatLabel(planUsage) : "—"}
                </p>
                <p className="text-[10px] text-slate-500">staff users active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Staff Members</p>
                <p className="text-lg font-semibold">{usersLoading ? "…" : activeStaff.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Team Management</CardTitle>
          {planUsage?.canAdd ? (
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" asChild>
              <Link to="/settings?tab=users">
                <UserPlus className="h-4 w-4 mr-1.5" />
                Add Staff User
              </Link>
            </Button>
          ) : (
            <Badge variant="secondary" className="text-amber-700 bg-amber-50">
              <AlertCircle className="h-3 w-3 mr-1" />
              User limit reached
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {planUsage && (
            <>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${planUsage.canAdd ? "bg-indigo-600" : "bg-red-500"}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {BILLABLE_STAFF_ROLES.map((role) => {
                  const slot = planUsage.byRole[role];
                  return (
                    <div key={role} className="rounded-md border px-3 py-2 text-xs">
                      <p className="font-medium capitalize">{role}</p>
                      <p className="text-slate-500">{slot.used} / {slot.limit} seats</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">{formatRoleSeatBreakdown(planUsage)}</p>
            </>
          )}
          <p className="text-xs text-slate-500">
            Add agents, accountants, and managers to handle tickets, CRM, and daily operations.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings?tab=users">
                <Users className="h-4 w-4 mr-1.5" />
                Manage Users
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">
                <Settings className="h-4 w-4 mr-1.5" />
                Agency Settings
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reports">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                View Reports
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Staff Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-500 text-xs">Name</th>
                  <th className="text-left p-3 font-medium text-slate-500 text-xs">Role</th>
                  <th className="text-left p-3 font-medium text-slate-500 text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {(usersList?.items ?? []).map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-3">
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="p-3 capitalize text-sm">{u.role}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] capitalize">{u.status}</Badge>
                    </td>
                  </tr>
                ))}
                {!usersLoading && (usersList?.items?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-sm text-slate-400">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
