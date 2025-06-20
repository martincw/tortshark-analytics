
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, CheckCircle, FileText, Users, DollarSign, Target, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ContractorWorkflowPage = () => {
  const navigate = useNavigate();

  const steps = [
    {
      number: 1,
      title: "Navigate to Bulk Stats",
      description: "Click the button below to access the daily stats entry form",
      icon: <FileText className="h-5 w-5" />,
      action: () => navigate("/bulk-stats")
    },
    {
      number: 2,
      title: "Select Yesterday's Date",
      description: "The form defaults to yesterday - verify the date is correct",
      icon: <Calendar className="h-5 w-5" />
    },
    {
      number: 3,
      title: "Select Campaigns",
      description: "Check the boxes for campaigns you have stats for",
      icon: <Users className="h-5 w-5" />
    },
    {
      number: 4,
      title: "Enter Data",
      description: "Use individual inputs or bulk paste for efficiency",
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      number: 5,
      title: "Save & Verify",
      description: "Click Save Stats and verify success message",
      icon: <CheckCircle className="h-5 w-5" />
    }
  ];

  const tips = [
    {
      title: "Bulk Paste Feature",
      description: "Copy data from spreadsheets and use 'Bulk Paste' buttons for faster entry",
      type: "tip"
    },
    {
      title: "Currency Formatting",
      description: "Dollar signs ($) and commas will be automatically removed from pasted values",
      type: "info"
    },
    {
      title: "Data Validation",
      description: "Only enter data for campaigns you have verified stats for",
      type: "warning"
    },
    {
      title: "Daily Routine",
      description: "Complete stats entry by 10 AM daily for best tracking accuracy",
      type: "tip"
    }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Daily Stats Entry Workflow</h1>
        <p className="text-muted-foreground">
          Quick and efficient process for entering campaign statistics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quick Start
            </CardTitle>
            <CardDescription>
              Ready to enter today's stats? Click below to get started immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate("/bulk-stats")} 
              className="w-full"
              size="lg"
            >
              Enter Daily Stats Now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Requirements</CardTitle>
            <CardDescription>
              What you need to collect for each campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Ad Spend ($)</Badge>
              <span className="text-sm">Total daily advertising costs</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Leads</Badge>
              <span className="text-sm">Number of leads generated</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Cases</Badge>
              <span className="text-sm">Number of cases/conversions</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Revenue ($)</Badge>
              <span className="text-sm">Total revenue generated</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step-by-Step Process</CardTitle>
          <CardDescription>
            Follow this workflow for consistent and accurate data entry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-4 p-4 rounded-lg border">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">
                  {step.number}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {step.icon}
                    <h3 className="font-medium">{step.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.action && (
                    <Button variant="outline" size="sm" onClick={step.action} className="mt-2">
                      Go to Bulk Stats
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips & Best Practices</CardTitle>
          <CardDescription>
            Important reminders for accurate data entry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="flex-shrink-0 mt-0.5">
                  {tip.type === "warning" && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                  {tip.type === "tip" && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {tip.type === "info" && <FileText className="h-4 w-4 text-blue-500" />}
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">{tip.title}</h4>
                  <p className="text-xs text-muted-foreground">{tip.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button 
          onClick={() => navigate("/bulk-stats")} 
          size="lg"
          className="px-8"
        >
          Start Entering Stats
        </Button>
      </div>
    </div>
  );
};

export default ContractorWorkflowPage;
