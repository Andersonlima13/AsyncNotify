import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertNotificationSchema, type Notification } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Send, Bell, Clock, Server, ArrowLeftRight, Plug, ChartBar, Trash, CheckCircle, AlertCircle, Loader, XCircle } from "lucide-react";

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface MessageLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  status: 'success' | 'processing' | 'error' | 'info';
}

export default function Dashboard() {
  const { toast } = useToast();
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({ pending: 0, processing: 0, completed: 0, failed: 0 });
  
  const { isConnected, lastMessage } = useWebSocket();

  const form = useForm({
    resolver: zodResolver(insertNotificationSchema),
    defaultValues: {
      recipient: "",
      subject: "",
      message: "",
      priority: "medium" as const,
    },
  });

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: false,
  });

  // Fetch queue stats
  const { data: statsData } = useQuery({
    queryKey: ["/api/queue/stats"],
    refetchInterval: false,
  });

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/notifications", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Notification Sent",
        description: "Your notification has been queued successfully.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/stats"] });
      
      // Add to message log
      addMessageLog({
        action: "Notification queued successfully",
        details: `ID: ${data.notification.id} | Recipient: ${data.notification.recipient}`,
        status: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive",
      });
      
      addMessageLog({
        action: "Failed to queue notification",
        details: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      });
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        switch (data.type) {
          case 'initial_data':
            setQueueStats(data.queueStats);
            break;
            
          case 'status_update':
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            queryClient.invalidateQueries({ queryKey: ["/api/queue/stats"] });
            
            addMessageLog({
              action: `Notification status updated to ${data.status}`,
              details: `ID: ${data.notificationId}`,
              status: data.status === 'completed' ? 'success' : data.status === 'failed' ? 'error' : 'processing',
            });
            break;
            
          case 'queue_stats':
            setQueueStats(data.stats);
            break;
            
          case 'system_event':
            addMessageLog({
              action: data.event,
              details: data.details,
              status: 'info',
            });
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  // Update queue stats from API data
  useEffect(() => {
    if (statsData?.stats) {
      setQueueStats(statsData.stats);
    }
  }, [statsData]);

  function addMessageLog(log: Omit<MessageLog, 'id' | 'timestamp'>) {
    const newLog: MessageLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setMessageLogs(prev => [newLog, ...prev].slice(0, 20)); // Keep only last 20 logs
  }

  function onSubmit(data: any) {
    createNotificationMutation.mutate(data);
  }

  function clearLogs() {
    setMessageLogs([]);
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  function getLogStatusColor(status: string) {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'processing':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      case 'info':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Bell className="text-primary text-2xl" />
              <h1 className="text-xl font-semibold text-foreground">Async Notification System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  WebSocket {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Server className="text-muted-foreground w-4 h-4" />
                <span className="text-sm text-muted-foreground">RabbitMQ: Active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Notification Form */}
          <div className="lg:col-span-1">
            <Card className="notification-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="text-primary mr-2 w-5 h-5" />
                  Send Notification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="notification-form">
                    <FormField
                      control={form.control}
                      name="recipient"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="user@example.com"
                              {...field}
                              data-testid="input-recipient"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Notification subject"
                              {...field}
                              data-testid="input-subject"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your notification message..."
                              rows={4}
                              className="resize-none"
                              {...field}
                              data-testid="textarea-message"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createNotificationMutation.isPending}
                      data-testid="button-send-notification"
                    >
                      {createNotificationMutation.isPending ? (
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {createNotificationMutation.isPending ? 'Sending...' : 'Send Notification'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Queue Statistics */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChartBar className="text-primary mr-2 w-5 h-5" />
                  Queue Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600" data-testid="stat-pending">{queueStats.pending}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600" data-testid="stat-processing">{queueStats.processing}</div>
                    <div className="text-sm text-muted-foreground">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="stat-completed">{queueStats.completed}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600" data-testid="stat-failed">{queueStats.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Status */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Clock className="text-primary mr-2 w-5 h-5" />
                    Real-time Status
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearLogs}
                    data-testid="button-clear-logs"
                  >
                    <Trash className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notificationsData?.notifications?.slice(0, 10).map((notification: Notification) => (
                      <div
                        key={notification.id}
                        className="flex items-center justify-between p-3 bg-secondary rounded-md border border-border"
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(notification.status)}
                          <div>
                            <div className="font-medium text-foreground">{notification.subject}</div>
                            <div className="text-sm text-muted-foreground">{notification.recipient}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getStatusColor(notification.status)}`}>
                            {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(notification.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {(!notificationsData?.notifications || notificationsData.notifications.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No notifications yet. Send your first notification above!
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message Logs */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="text-primary mr-2 w-5 h-5" />
                  Message Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {messageLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start space-x-3 p-3 bg-muted/30 rounded-md"
                      data-testid={`log-${log.id}`}
                    >
                      <div className="text-xs text-muted-foreground mt-1 font-mono min-w-[60px]">
                        {log.timestamp}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{log.action}</div>
                        <div className="text-xs text-muted-foreground">{log.details}</div>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          log.status === 'success' ? 'bg-green-500' :
                          log.status === 'processing' ? 'bg-blue-500' :
                          log.status === 'error' ? 'bg-red-500' : 'bg-green-500'
                        }`} />
                        <span className={`text-xs font-medium uppercase ${getLogStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {messageLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No logs yet. Activity will appear here in real-time.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Health Status */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">API Server</h3>
                  <div className="text-2xl font-bold text-green-600 mt-1">Online</div>
                </div>
                <div className="text-green-600">
                  <Server className="w-8 h-8" />
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Uptime: Active
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">RabbitMQ</h3>
                  <div className="text-2xl font-bold text-green-600 mt-1">Connected</div>
                </div>
                <div className="text-green-600">
                  <ArrowLeftRight className="w-8 h-8" />
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Processing queue
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">WebSocket</h3>
                  <div className={`text-2xl font-bold mt-1 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? 'Active' : 'Disconnected'}
                  </div>
                </div>
                <div className={isConnected ? 'text-green-600' : 'text-red-600'}>
                  <Plug className="w-8 h-8" />
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Real-time updates
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
