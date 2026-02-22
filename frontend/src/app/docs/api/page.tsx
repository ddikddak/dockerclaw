'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { EndpointCard } from '@/components/docs/EndpointCard'
import { CodeBlock } from '@/components/docs/CodeBlock'
import { ApiKeySection } from '@/components/docs/ApiKeySection'
import { 
  BookOpen, 
  Key, 
  Globe, 
  Bell, 
  Code2,
  Server,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Webhook
} from 'lucide-react'

// Navigation sections
const sections = [
  { id: 'overview', name: 'Overview', icon: BookOpen },
  { id: 'authentication', name: 'Authentication', icon: Key },
  { id: 'endpoints', name: 'Endpoints', icon: Globe },
  { id: 'webhooks', name: 'Webhooks', icon: Bell },
  { id: 'examples', name: 'Examples', icon: Code2 },
]

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('overview')

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f5f5f5]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Server className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
                  <p className="text-gray-500">Integrate DockerClaw into your agents</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                v1.0
              </Badge>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:w-64 shrink-0">
              <nav className="bg-white rounded-xl border border-gray-200 p-2 lg:sticky lg:top-28">
                <ul className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon
                    const isActive = activeSection === section.id
                    return (
                      <li key={section.id}>
                        <button
                          onClick={() => {
                            setActiveSection(section.id)
                            document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          {section.name}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <div className="space-y-12">
                {/* Overview Section */}
                <section id="overview" className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <BookOpen className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
                  </div>

                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-600 text-lg">
                      DockerClaw is a C2H (Computer-to-Human) platform that enables AI agents to create 
                      interactive cards for human review. Our REST API allows your agents to programmatically 
                      create cards, manage templates, and receive real-time updates via webhooks.
                    </p>

                    <div className="grid md:grid-cols-2 gap-6 mt-8">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Use Cases
                        </h3>
                        <ul className="space-y-2 text-blue-800">
                          <li>• Send notifications for human approval</li>
                          <li>• Create data collection forms</li>
                          <li>• Request human-in-the-loop decisions</li>
                          <li>• Share insights and reports</li>
                        </ul>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                        <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                          <Server className="h-5 w-5" />
                          Base URL
                        </h3>
                        <div className="space-y-2">
                          <div className="font-mono text-sm bg-white p-3 rounded border border-purple-200">
                            <span className="text-purple-600">Production:</span>
                            <br />
                            https://api.dockerclaw.io
                          </div>
                          <div className="font-mono text-sm bg-white p-3 rounded border border-purple-200">
                            <span className="text-purple-600">Development:</span>
                            <br />
                            http://localhost:3001
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Authentication Section */}
                <section id="authentication" className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Key className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-bold text-gray-900">Authentication</h2>
                  </div>

                  <ApiKeySection />
                </section>

                {/* Endpoints Section */}
                <section id="endpoints" className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Globe className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-bold text-gray-900">Endpoints</h2>
                  </div>

                  <div className="space-y-4">
                    {/* POST /api/cards */}
                    <EndpointCard
                      method="POST"
                      path="/api/cards"
                      title="Create a new card"
                      description="Creates a new card using a template. The card will be delivered to the dashboard for human review."
                      headers={[
                        { name: 'X-API-Key', value: 'your_api_key_here', required: true },
                        { name: 'Content-Type', value: 'application/json', required: true },
                      ]}
                      requestBody={{
                        description: 'Template ID and data to populate the card',
                        example: JSON.stringify({
                          template_id: "template_abc123",
                          data: {
                            title: "Q3 Sales Report Ready",
                            content: "The quarterly sales report has been generated and is ready for review.",
                            priority: "high"
                          },
                          tags: ["sales", "quarterly", "review"]
                        }, null, 2),
                      }}
                      responseBody={{
                        description: 'Returns the created card object',
                        example: JSON.stringify({
                          id: "card_xyz789",
                          template_id: "template_abc123",
                          agent_id: "agent_def456",
                          data: {
                            title: "Q3 Sales Report Ready",
                            content: "The quarterly sales report has been generated and is ready for review.",
                            priority: "high"
                          },
                          status: "pending",
                          tags: ["sales", "quarterly", "review"],
                          created_at: "2026-02-22T10:30:00Z",
                          updated_at: "2026-02-22T10:30:00Z"
                        }, null, 2),
                      }}
                    />

                    {/* GET /api/cards */}
                    <EndpointCard
                      method="GET"
                      path="/api/cards"
                      title="List all cards"
                      description="Retrieves a list of cards created by your agent. Supports filtering by tags and search query."
                      headers={[
                        { name: 'X-API-Key', value: 'your_api_key_here', required: true },
                      ]}
                      responseBody={{
                        description: 'Returns an array of cards',
                        example: JSON.stringify({
                          cards: [
                            {
                              id: "card_xyz789",
                              template_id: "template_abc123",
                              agent_id: "agent_def456",
                              data: { title: "Q3 Sales Report Ready" },
                              status: "pending",
                              tags: ["sales", "quarterly"],
                              created_at: "2026-02-22T10:30:00Z",
                              template: { name: "Notification" }
                            }
                          ]
                        }, null, 2),
                      }}
                    />

                    {/* GET /api/cards/:id */}
                    <EndpointCard
                      method="GET"
                      path="/api/cards/:id"
                      title="Get a specific card"
                      description="Retrieves detailed information about a specific card including its full data and template."
                      headers={[
                        { name: 'X-API-Key', value: 'your_api_key_here', required: true },
                      ]}
                      responseBody={{
                        description: 'Returns the card object with template details',
                        example: JSON.stringify({
                          id: "card_xyz789",
                          template_id: "template_abc123",
                          agent_id: "agent_def456",
                          data: {
                            title: "Q3 Sales Report Ready",
                            content: "The quarterly sales report...",
                            priority: "high"
                          },
                          status: "pending",
                          tags: ["sales", "quarterly", "review"],
                          created_at: "2026-02-22T10:30:00Z",
                          template: {
                            id: "template_abc123",
                            name: "Notification",
                            schema: { /* template schema */ }
                          }
                        }, null, 2),
                      }}
                    />

                    {/* PATCH /api/cards/:id */}
                    <EndpointCard
                      method="PATCH"
                      path="/api/cards/:id"
                      title="Update a card"
                      description="Updates an existing card's data, tags, or status. Only cards owned by your agent can be updated."
                      headers={[
                        { name: 'X-API-Key', value: 'your_api_key_here', required: true },
                        { name: 'Content-Type', value: 'application/json', required: true },
                      ]}
                      requestBody={{
                        description: 'Fields to update (all optional)',
                        example: JSON.stringify({
                          data: {
                            title: "Updated Title",
                            content: "Updated content here"
                          },
                          tags: ["updated", "tags"],
                          status: "completed"
                        }, null, 2),
                      }}
                      responseBody={{
                        description: 'Returns the updated card object',
                        example: JSON.stringify({
                          id: "card_xyz789",
                          template_id: "template_abc123",
                          data: {
                            title: "Updated Title",
                            content: "Updated content here"
                          },
                          status: "completed",
                          tags: ["updated", "tags"],
                          updated_at: "2026-02-22T11:00:00Z"
                        }, null, 2),
                      }}
                    />

                    {/* GET /api/templates */}
                    <EndpointCard
                      method="GET"
                      path="/api/templates"
                      title="List templates"
                      description="Retrieves all templates available to your agent. Templates define the structure of cards."
                      headers={[
                        { name: 'X-API-Key', value: 'your_api_key_here', required: true },
                      ]}
                      responseBody={{
                        description: 'Returns an array of templates',
                        example: JSON.stringify({
                          templates: [
                            {
                              id: "template_abc123",
                              name: "Notification",
                              schema: {
                                fields: [
                                  { name: "title", type: "string", required: true },
                                  { name: "content", type: "text", required: true },
                                  { name: "priority", type: "select", options: ["low", "medium", "high"] }
                                ]
                              },
                              created_at: "2026-01-15T08:00:00Z"
                            }
                          ]
                        }, null, 2),
                      }}
                    />

                    {/* POST /api/cards/:id/comments */}
                    <EndpointCard
                      method="POST"
                      path="/api/cards/:id/comments"
                      title="Add a comment"
                      description="Adds a comment to an existing card. Comments are visible to humans reviewing the card."
                      headers={[
                        { name: 'X-API-Key', value: 'your_api_key_here', required: true },
                        { name: 'Content-Type', value: 'application/json', required: true },
                      ]}
                      requestBody={{
                        description: 'Comment content',
                        example: JSON.stringify({
                          content: "This report includes data from all regional offices."
                        }, null, 2),
                      }}
                      responseBody={{
                        description: 'Returns the created comment',
                        example: JSON.stringify({
                          id: "comment_123",
                          card_id: "card_xyz789",
                          content: "This report includes data from all regional offices.",
                          author: "agent",
                          created_at: "2026-02-22T11:30:00Z"
                        }, null, 2),
                      }}
                    />
                  </div>
                </section>

                {/* Webhooks Section */}
                <section id="webhooks" className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Bell className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-bold text-gray-900">Webhooks</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
                      <div className="flex items-start gap-3">
                        <Webhook className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                        <div>
                          <h3 className="font-semibold text-indigo-900">What are Webhooks?</h3>
                          <p className="text-indigo-700 mt-1">
                            Webhooks allow DockerClaw to notify your agent in real-time when events occur. 
                            Configure a webhook URL in your agent settings to receive HTTP POST requests 
                            when cards are created, updated, or interacted with.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Events</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="font-mono text-sm text-green-600 mb-2">card.created</div>
                          <p className="text-sm text-gray-600">Triggered when a new card is created</p>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="font-mono text-sm text-blue-600 mb-2">card.updated</div>
                          <p className="text-sm text-gray-600">Triggered when a card is modified</p>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="font-mono text-sm text-purple-600 mb-2">card.completed</div>
                          <p className="text-sm text-gray-600">Triggered when a card is marked complete</p>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="font-mono text-sm text-orange-600 mb-2">comment.added</div>
                          <p className="text-sm text-gray-600">Triggered when a comment is added</p>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="font-mono text-sm text-pink-600 mb-2">reaction.added</div>
                          <p className="text-sm text-gray-600">Triggered when a reaction is added</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Webhook Payload</h3>
                      <CodeBlock
                        language="json"
                        code={JSON.stringify({
                          event: "card.completed",
                          timestamp: "2026-02-22T12:00:00Z",
                          data: {
                            card_id: "card_xyz789",
                            agent_id: "agent_def456",
                            template_id: "template_abc123",
                            status: "completed",
                            completed_at: "2026-02-22T12:00:00Z",
                            completed_by: "user@example.com"
                          }
                        }, null, 2)}
                      />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="font-semibold text-amber-900">Webhook Configuration</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            To configure webhooks, go to Settings → Webhooks and add your endpoint URL. 
                            Your endpoint must respond with a 2xx status code within 30 seconds.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Examples Section */}
                <section id="examples" className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Code2 className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-bold text-gray-900">Code Examples</h2>
                  </div>

                  <Tabs defaultValue="curl" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
                      <TabsTrigger value="curl">cURL</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                      <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                      <TabsTrigger value="go">Go</TabsTrigger>
                    </TabsList>

                    <TabsContent value="curl" className="mt-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">Create a Card</h3>
                        <CodeBlock
                          language="bash"
                          code={`curl -X POST "https://api.dockerclaw.io/api/cards" \\
  -H "X-API-Key: dk_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "template_abc123",
    "data": {
      "title": "Q3 Sales Report Ready",
      "content": "The quarterly sales report has been generated.",
      "priority": "high"
    },
    "tags": ["sales", "quarterly"]
  }'`}
                        />
                        <h3 className="text-sm font-medium text-gray-700 mt-6">List Cards</h3>
                        <CodeBlock
                          language="bash"
                          code={`curl -X GET "https://api.dockerclaw.io/api/cards?tags=sales" \\
  -H "X-API-Key: dk_your_api_key_here"`}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="python" className="mt-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">Create a Card</h3>
                        <CodeBlock
                          language="python"
                          code={`import requests

API_KEY = "dk_your_api_key_here"
BASE_URL = "https://api.dockerclaw.io"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

payload = {
    "template_id": "template_abc123",
    "data": {
        "title": "Q3 Sales Report Ready",
        "content": "The quarterly sales report has been generated.",
        "priority": "high"
    },
    "tags": ["sales", "quarterly"]
}

response = requests.post(
    f"{BASE_URL}/api/cards",
    headers=headers,
    json=payload
)

card = response.json()
print(f"Card created: {card['id']}")`}
                        />
                        <h3 className="text-sm font-medium text-gray-700 mt-6">List Cards</h3>
                        <CodeBlock
                          language="python"
                          code={`import requests

API_KEY = "dk_your_api_key_here"
BASE_URL = "https://api.dockerclaw.io"

headers = {"X-API-Key": API_KEY}

response = requests.get(
    f"{BASE_URL}/api/cards",
    headers=headers,
    params={"tags": "sales"}
)

cards = response.json()["cards"]
for card in cards:
    print(f"{card['id']}: {card['data']['title']}")`}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="nodejs" className="mt-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">Create a Card</h3>
                        <CodeBlock
                          language="javascript"
                          code={`const API_KEY = 'dk_your_api_key_here';
const BASE_URL = 'https://api.dockerclaw.io';

async function createCard() {
  const response = await fetch(BASE_URL + '/api/cards', {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      template_id: 'template_abc123',
      data: {
        title: 'Q3 Sales Report Ready',
        content: 'The quarterly sales report has been generated.',
        priority: 'high'
      },
      tags: ['sales', 'quarterly']
    })
  });

  const card = await response.json();
  console.log('Card created:', card.id);
}

createCard();`}
                        />
                        <h3 className="text-sm font-medium text-gray-700 mt-6">List Cards</h3>
                        <CodeBlock
                          language="javascript"
                          code={`const API_KEY = 'dk_your_api_key_here';
const BASE_URL = 'https://api.dockerclaw.io';

async function listCards() {
  const response = await fetch(
    BASE_URL + '/api/cards?tags=sales',
    {
      headers: { 'X-API-Key': API_KEY }
    }
  );

  const data = await response.json();
  for (const card of data.cards) {
    console.log(card.id + ': ' + card.data.title);
  }
}

listCards();`}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="go" className="mt-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-700">Create a Card</h3>
                        <CodeBlock
                          language="go"
                          code={`package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

const API_KEY = "dk_your_api_key_here"
const BASE_URL = "https://api.dockerclaw.io"

type CardRequest struct {
    TemplateID string
    Data       map[string]string
    Tags       []string
}

func main() {
    payload := CardRequest{
        TemplateID: "template_abc123",
        Data: map[string]string{
            "title":    "Q3 Sales Report Ready",
            "content":  "The quarterly sales report has been generated.",
            "priority": "high",
        },
        Tags: []string{"sales", "quarterly"},
    }

    jsonData, _ := json.Marshal(payload)
    
    req, _ := http.NewRequest(
        "POST",
        BASE_URL+"/api/cards",
        bytes.NewBuffer(jsonData),
    )
    req.Header.Set("X-API-Key", API_KEY)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    fmt.Println("Status:", resp.Status)
}`}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </section>
              </div>
            </main>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
