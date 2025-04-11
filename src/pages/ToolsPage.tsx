
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Code, MessageSquare, Bug } from "lucide-react";

const ToolsPage = () => {
  const tools = [
    {
      id: "hook-creator",
      name: "Hook Creator",
      description: "Create custom React hooks for your applications",
      icon: <Code className="h-12 w-12 text-blue-500" />,
      url: "https://claude.ai/project/019626cf-911c-7613-a811-e6a2ad399a9b",
      color: "bg-blue-50 border-blue-200",
      iconBg: "bg-blue-100",
      buttonColor: "bg-blue-500 hover:bg-blue-600"
    },
    {
      id: "ad-writer",
      name: "Ad Writer",
      description: "Generate compelling ad copy for your marketing campaigns",
      icon: <MessageSquare className="h-12 w-12 text-green-500" />,
      url: "https://claude.ai/project/6c612014-41c5-4f49-a95c-f063b9492e90",
      color: "bg-green-50 border-green-200",
      iconBg: "bg-green-100",
      buttonColor: "bg-green-500 hover:bg-green-600"
    },
    {
      id: "software-troubleshooting",
      name: "Software Troubleshooting",
      description: "Diagnose and fix issues with your software applications",
      icon: <Bug className="h-12 w-12 text-purple-500" />,
      url: "https://claude.ai/project/01961557-3631-73e0-a27b-23bfa9142560",
      color: "bg-purple-50 border-purple-200",
      iconBg: "bg-purple-100",
      buttonColor: "bg-purple-500 hover:bg-purple-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Tools</h1>
        <p className="text-muted-foreground mt-1">
          Access specialized AI tools to enhance your campaign management
        </p>
      </div>

      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <Card key={tool.id} className={`overflow-hidden transition-all duration-200 hover:shadow-md ${tool.color}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${tool.iconBg}`}>
                      {tool.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl mt-4">{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button className={`w-full ${tool.buttonColor}`} onClick={() => window.open(tool.url, "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Tool
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="w-full">
          <div className="space-y-4">
            {tools.map((tool) => (
              <Card key={tool.id} className={`overflow-hidden transition-all duration-200 hover:shadow-md ${tool.color}`}>
                <CardContent className="p-0">
                  <div className="flex items-center p-4 gap-4">
                    <div className={`p-3 rounded-lg ${tool.iconBg}`}>
                      {tool.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                    <Button 
                      className={`${tool.buttonColor}`} 
                      size="sm"
                      onClick={() => window.open(tool.url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ToolsPage;
