import BudgetCapacityTab from "@/components/dashboard/BudgetCapacityTab";

const BudgetCapacityPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Budget Capacity</h1>
        <p className="text-muted-foreground">Track buyer budget capacity and utilization</p>
      </div>
      <BudgetCapacityTab />
    </div>
  );
};

export default BudgetCapacityPage;
