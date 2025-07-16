import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Clock, Activity, TrendingUp, Calendar, Plus, Play, Pause, Target } from 'lucide-react';

const API_BASE = '/.netlify/functions';

const TimeWarp = () => {
  const [activities, setActivities] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentActivity, setCurrentActivity] = useState({ app: '', title: '', category: 'other' });
  const [manualEntry, setManualEntry] = useState({ app: '', title: '', duration: 5 });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [trackingTime, setTrackingTime] = useState(0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

  useEffect(() => {
    fetchActivities();
    fetchAnalytics();
  }, []);

  // Timer for tracking duration
  useEffect(() => {
    let interval;
    if (isTracking) {
      interval = setInterval(() => {
        setTrackingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const fetchActivities = async () => {
    try {
      const response = await fetch(`${API_BASE}/activity`);
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const categorizeActivity = async (app, title) => {
    try {
      const response = await fetch(`${API_BASE}/categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app, title })
      });
      const data = await response.json();
      return data.category;
    } catch (error) {
      console.error('Error categorizing:', error);
      return 'other';
    }
  };

  const saveActivity = async (activityData) => {
    try {
      await fetch(`${API_BASE}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      });
      fetchActivities();
      fetchAnalytics();
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const startTracking = async () => {
    if (!currentActivity.app || !currentActivity.title) {
      alert('Please enter both app and title');
      return;
    }
    
    const category = await categorizeActivity(currentActivity.app, currentActivity.title);
    setCurrentActivity(prev => ({ ...prev, category }));
    setIsTracking(true);
    setTrackingTime(0);
  };

  const stopTracking = async () => {
    setIsTracking(false);
    if (trackingTime > 0) {
      await saveActivity({
        app: currentActivity.app,
        title: currentActivity.title,
        category: currentActivity.category,
        duration: trackingTime
      });
    }
    setTrackingTime(0);
  };

  const addManualEntry = async () => {
    if (!manualEntry.app || !manualEntry.title) {
      alert('Please fill in all fields');
      return;
    }
    
    const category = await categorizeActivity(manualEntry.app, manualEntry.title);
    await saveActivity({
      app: manualEntry.app,
      title: manualEntry.title,
      category,
      duration: manualEntry.duration * 60 // Convert minutes to seconds
    });
    
    setManualEntry({ app: '', title: '', duration: 5 });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (category) => {
    const colors = {
      work: '#0088FE',
      social: '#00C49F',
      entertainment: '#FFBB28',
      browsing: '#FF8042',
      writing: '#8884D8',
      design: '#82CA9D',
      productivity: '#FFC658',
      other: '#8DD1E1'
    };
    return colors[category] || colors.other;
  };

  const DashboardView = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Activities</p>
              <p className="text-2xl font-bold">{activities.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active Time</p>
              <p className="text-2xl font-bold">{formatTime(trackingTime)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-2xl font-bold">{analytics?.category_stats.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-2xl font-bold text-green-600">{isTracking ? 'Tracking' : 'Idle'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Activity by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.category_stats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, count }) => `${category}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.category_stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Hourly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.hourly_stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Activities */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activities.slice(0, 10).map((activity, index) => (
            <div key={index} className="flex items-center p-3 bg-gray-50 rounded">
              <div 
                className="w-4 h-4 rounded-full mr-3"
                style={{ backgroundColor: getCategoryColor(activity.category) }}
              />
              <div className="flex-1">
                <p className="font-medium">{activity.app}</p>
                <p className="text-sm text-gray-600">{activity.title}</p>
              </div>
              <div className="text-sm text-gray-500">
                {formatTime(activity.duration)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const TrackerView = () => (
    <div className="space-y-6">
      {/* Current Tracking */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Live Tracking</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application</label>
              <input
                type="text"
                value={currentActivity.app}
                onChange={(e) => setCurrentActivity(prev => ({ ...prev, app: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., VS Code, Chrome, Slack"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title/Task</label>
              <input
                type="text"
                value={currentActivity.title}
                onChange={(e) => setCurrentActivity(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Coding React App, Reading Article"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-4xl font-mono font-bold text-gray-800">
              {formatTime(trackingTime)}
            </div>
            <div className="flex space-x-4">
              {!isTracking ? (
                <button
                  onClick={startTracking}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Tracking
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Tracking
                </button>
              )}
            </div>
          </div>
          
          {currentActivity.category !== 'other' && (
            <div className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: getCategoryColor(currentActivity.category) }}
              />
              <span className="text-sm font-medium capitalize">{currentActivity.category}</span>
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Add Manual Entry</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application</label>
              <input
                type="text"
                value={manualEntry.app}
                onChange={(e) => setManualEntry(prev => ({ ...prev, app: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Application name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title/Task</label>
              <input
                type="text"
                value={manualEntry.title}
                onChange={(e) => setManualEntry(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Task description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={manualEntry.duration}
                onChange={(e) => setManualEntry(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Duration in minutes"
                min="1"
              />
            </div>
          </div>
          
          <button
            onClick={addManualEntry}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">TimeWarp</h1>
            </div>
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('tracker')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'tracker'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tracker
              </button>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'tracker' && <TrackerView />}
      </div>
    </div>
  );
};

export default TimeWarp;