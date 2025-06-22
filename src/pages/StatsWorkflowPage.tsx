
import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calculator, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Copy,
  AlertCircle
} from "lucide-react";

const StatsWorkflowPage = () => {
  return (
    <div className="container mx-auto py-6 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Daily Stats Entry Workflow</h1>
        <p className="text-xl text-muted-foreground">
          Quick and efficient process for entering campaign statistics
        </p>
      </div>

      {/* Quick Start Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Quick Start
          </CardTitle>
          <CardDescription>
            Ready to enter today's stats? Click below to get started immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/bulk-stats">
            <Button size="lg" className="w-full md:w-auto">
              Enter Daily Stats Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Data Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Data Requirements</CardTitle>
          <CardDescription>
            What you need to collect for each campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Ad Spend ($)</h3>
                <p className="text-sm text-muted-foreground">Total daily advertising costs</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Leads</h3>
                <p className="text-sm text-muted-foreground">Number of leads generated</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Cases</h3>
                <p className="text-sm text-muted-foreground">Number of cases/conversions</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Calculator className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Revenue ($)</h3>
                <p className="text-sm text-muted-foreground">Total revenue generated</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Process */}
      <Card>
        <CardHeader>
          <CardTitle>Step-by-Step Process</CardTitle>
          <CardDescription>
            Follow this workflow for consistent and accurate data entry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-2">Navigate to Bulk Stats</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Click the button below to access the daily stats entry form
                </p>
                <Link to="/bulk-stats">
                  <Button variant="outline" size="sm">
                    Go to Bulk Stats
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-2">Select Yesterday's Date</h3>
                <p className="text-sm text-muted-foreground">
                  The form defaults to yesterday - verify the date is correct
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-2">Select Campaigns</h3>
                <p className="text-sm text-muted-foreground">
                  Check the boxes for campaigns you have stats for
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-2">Enter Data</h3>
                <p className="text-sm text-muted-foreground">
                  Use individual inputs or bulk paste for efficiency
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                5
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-2">Save & Verify</h3>
                <p className="text-sm text-muted-foreground">
                  Click Save Stats and verify success message
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips & Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Tips & Best Practices</CardTitle>
          <CardDescription>
            Important reminders for accurate data entry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Copy className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Bulk Paste Feature</h3>
                <p className="text-sm text-blue-700">
                  Copy data from spreadsheets and use 'Bulk Paste' buttons for faster entry
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-900">Currency Formatting</h3>
                <p className="text-sm text-green-700">
                  Dollar signs ($) and commas will be automatically removed from pasted values
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-purple-900">Data Validation</h3>
                <p className="text-sm text-purple-700">
                  Only enter data for campaigns you have verified stats for
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-900">Daily Routine</h3>
                <p className="text-sm text-orange-700">
                  Complete stats entry by 10 AM daily for best tracking accuracy
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final CTA */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-green-900">Ready to Get Started?</h3>
            <Link to="/bulk-stats">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                Start Entering Stats
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsWorkflowPage;
