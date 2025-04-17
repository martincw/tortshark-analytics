
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
      <h1 className="text-4xl font-bold mb-6">Welcome to TortShark</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        Manage your mass tort campaigns and track performance metrics
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild size="lg">
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/campaigns">View Campaigns</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
