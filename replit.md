# Overview

This is a full-stack notification management system built with React frontend, Express backend, and message queue integration. The application allows users to create, manage, and monitor notifications through a real-time dashboard interface. It features a modern UI built with shadcn/ui components, PostgreSQL database with Drizzle ORM, RabbitMQ for message queuing, and WebSocket connections for live updates.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture (Angular MVC)
- **Framework**: React with TypeScript and Vite for development and building
- **UI Components**: shadcn/ui component library with Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Real-time Updates**: Custom WebSocket hook for live data synchronization

## Backend Architecture (MVC Pattern)
- **Framework**: Express.js with TypeScript for API server
- **Controllers**: Separated route handlers in `controllers/` directory for clean responsibility separation
- **Services**: Business logic in `services/` for RabbitMQ and WebSocket management
- **Bootstrap**: Service initialization separated from routing logic in `bootstrap.ts`
- **Database ORM**: Drizzle ORM for type-safe database operations and schema management
- **Message Queue**: RabbitMQ with amqplib for asynchronous notification processing
- **Real-time Communication**: WebSocket server for broadcasting live updates to connected clients
- **Storage**: In-memory storage implementation with interface for easy database integration
- **Development**: Vite integration for hot module replacement in development mode

## Data Storage Solutions
- **Primary Database**: PostgreSQL configured through Drizzle with schema definitions for users and notifications
- **Schema Management**: Drizzle migrations with schema files in shared directory for type consistency
- **Connection**: Neon Database serverless driver for PostgreSQL connectivity
- **Session Storage**: PostgreSQL session store with connect-pg-simple for persistent sessions

## Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session storage
- **User Model**: Basic user schema with username/password authentication
- **Security**: Ring offset background and form validation for secure data handling

## External Service Integrations
- **Message Broker**: CloudAMQP (RabbitMQ as a Service) for reliable message queuing and processing
- **Database Hosting**: Neon Database for serverless PostgreSQL hosting
- **Development Tools**: Replit integration for cloud development environment

## Key Design Patterns
- **MVC Architecture**: Both frontend (Angular) and backend (Express) follow MVC patterns for clear separation of concerns
- **Frontend MVC**: Models in `models/`, Views in `views/` (HTML/CSS), Controllers in `controllers/` (Angular components)
- **Backend MVC**: Controllers in `controllers/`, Services in `services/`, Bootstrap initialization separate from routing
- **Shared Types**: Common schema definitions between frontend and backend for type safety
- **Event-Driven Architecture**: RabbitMQ message queuing for decoupled notification processing
- **Real-time Updates**: WebSocket broadcasting for live dashboard updates
- **Form Validation**: Zod schema validation shared between client and server
- **Component Composition**: Modular UI components with consistent design system
- **Error Handling**: Comprehensive error boundaries and API error handling
- **Development Experience**: Hot reload, TypeScript support, and integrated development tools

# External Dependencies

## Core Framework Dependencies
- **React 18+**: Frontend framework with TypeScript support
- **Express**: Node.js web framework for API server
- **Vite**: Build tool and development server with React plugin

## Database and ORM
- **Drizzle ORM**: Type-safe ORM with PostgreSQL support
- **@neondatabase/serverless**: Neon Database driver for serverless PostgreSQL
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## UI and Styling
- **shadcn/ui**: Complete UI component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Unstyled, accessible UI components
- **Lucide React**: Icon library for consistent iconography

## Message Queue and Real-time
- **amqplib**: RabbitMQ client library for Node.js
- **ws**: WebSocket library for real-time communication
- **CloudAMQP**: Hosted RabbitMQ service for message queuing

## Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema declaration and validation
- **@hookform/resolvers**: Validation resolvers for React Hook Form

## State Management and Data Fetching
- **TanStack Query**: Powerful data synchronization for React
- **Wouter**: Minimalist routing library for React

## Development and Build Tools
- **TypeScript**: Static type checking and enhanced developer experience
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay for Replit environment