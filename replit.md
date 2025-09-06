# Overview

This is a full-stack real-time video meeting application called "SynergySphere" built with Node.js/Express backend and React frontend. The application enables two-person video calls using WebRTC with advanced features like AI-powered transcription, meeting summarization, team collaboration tools, gamification elements, and comprehensive meeting management. It's designed as a modern alternative to traditional video conferencing platforms with emphasis on productivity and team engagement.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for development and build tooling
- **UI Components**: Shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: Custom WebSocket client for signaling and WebRTC for peer-to-peer video/audio

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Real-time Communication**: WebSocket server for WebRTC signaling using native WebSocket implementation
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: PostgreSQL-based session storage with connect-pg-simple

## Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Structure**: 
  - Users with gamification features (points, badges, streaks)
  - Teams and team membership management
  - Meetings with room-based organization
  - Messages for chat functionality
  - Tasks with priority and assignment tracking
  - Leave requests for team management
  - Mood ratings for team sentiment analysis

## WebRTC Implementation
- **Signaling Server**: Custom WebSocket-based signaling for offer/answer/ICE candidate exchange
- **Peer Connection Management**: Support for multiple participants with automatic connection handling
- **Media Handling**: Comprehensive audio/video controls with screen sharing capabilities

## AI Integration
- **Service Provider**: OpenAI GPT-5 for advanced language processing
- **Features**: 
  - Real-time meeting transcription
  - Automated meeting summarization
  - Sentiment analysis for team mood tracking
  - Task priority generation
  - Meeting insights and recommendations
  - Interactive AI chat assistant

## Component Architecture
- **Modular Design**: Separate components for video calls, chat, AI assistant, whiteboard, calendar, and gamification
- **Real-time Updates**: WebSocket integration across components for live collaboration
- **Responsive Design**: Mobile-first approach with responsive breakpoints

## Security & Session Management
- **Authentication**: User registration and login with secure password handling
- **Session Storage**: Server-side session management with PostgreSQL backend
- **API Security**: Request validation with Zod schemas and proper error handling

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL client for database connectivity
- **drizzle-orm & drizzle-kit**: Type-safe ORM with migration tooling
- **express**: Web application framework for Node.js backend
- **socket.io**: Real-time bidirectional event-based communication (note: code shows native WebSocket implementation)

## Frontend UI Dependencies
- **@radix-ui/***: Comprehensive set of UI primitives for accessible components
- **@tanstack/react-query**: Server state management and caching
- **tailwindcss**: Utility-first CSS framework for styling
- **wouter**: Lightweight router for React applications

## AI and Real-time Features
- **openai**: Official OpenAI API client for GPT-5 integration
- **ws**: WebSocket library for real-time communication
- **react-hook-form**: Form handling with validation

## Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production builds

## Database and Session
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **zod**: Schema validation for runtime type checking

The application uses environment variables for configuration including `DATABASE_URL` for PostgreSQL connection and `OPENAI_API_KEY` for AI services integration.