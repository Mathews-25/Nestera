import React from "react";
import NetWorthCard from "../components/dashboard/NetWorthCard";
import QuickActionsGrid from "../components/dashboard/QuickActionsGrid";
import ActivePoolList from "../components/dashboard/ActivePoolList";
import RecentTransactionsWidget from "../components/dashboard/RecentTransactionsWidget";

export default function DashboardPage() {
  return (
    <div className="w-full">
      {/* Top row: NetWorth (stretches) + QuickActions (fixed width) */}
      <div className="flex gap-[18px] items-start flex-col md:flex-row">
        <div className="flex-1 w-full">
          <NetWorthCard />
        </div>
        <div className="w-full md:w-[360px] md:max-w-[40%]">
          <QuickActionsGrid />
        </div>
      </div>

      {/* Second row: ActivePoolList + RecentTransactions */}
      <div className="mt-5 flex gap-5">
        <div className="flex-1 max-w-[760px]">
          <ActivePoolList />
        </div>
        <div className="w-[320px] hidden lg:block">
          <RecentTransactionsWidget />
        </div>
      </div>
    </div>
  );
}
