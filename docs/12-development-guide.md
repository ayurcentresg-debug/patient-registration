# AYUR GATE — Development Guide

## Prerequisites
- Node.js 20+ (tested on v24)
- npm (comes with Node.js)
- Git

## Local Setup

```bash
# Clone the repository
git clone git@github.com:ayurcentresg-debug/ayurgate.git
cd ayurgate

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your JWT_SECRET and other vars

# Push database schema (creates dev.db)
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed initial data (optional)
npx tsx scripts/seed-admin.ts
npx tsx scripts/seed-inventory.ts

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Known Issues

### Turbopack Path Bug
The local project path contains spaces (`/Users/karthik/Cladue CODE1/`), which causes Turbopack to panic. The dev server may crash. Workarounds:
- Use `npx tsc --noEmit` to check TypeScript compilation
- Railway builds work fine (no spaces in path)
- Alternatively, clone to a path without spaces

### TypeScript Checking
```bash
# Check for TypeScript errors without building
npx tsc --noEmit
```

## Project Conventions

### File Naming
- Pages: `src/app/[route]/page.tsx` (Next.js App Router convention)
- API routes: `src/app/api/[route]/route.ts`
- Components: PascalCase (`Sidebar.tsx`, `EmailVerifyBanner.tsx`)
- Utilities: camelCase (`formatters.ts`, `tenant-db.ts`)

### API Route Pattern
```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getTenantPrisma } from "@/lib/tenant-db";

export async function GET(request: NextRequest) {
  // 1. Authenticate
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Get tenant-scoped database
  const db = getTenantPrisma(payload.clinicId);

  // 3. Query data
  const results = await db.someModel.findMany();

  // 4. Return response
  return NextResponse.json(results);
}
```

### Styling Conventions
- Use shared tokens from `src/lib/styles.ts` (cardStyle, btnPrimary, inputStyle)
- Use CSS variables for colors (`var(--blue-500)`, `var(--text-primary)`)
- Use Tailwind utility classes for layout and spacing
- Inline `style={}` for one-off values (borders, gradients)

### Component Conventions
- All page components are `"use client"` (client-side rendered)
- Use `useState` and `useEffect` for data fetching
- Use shared `Toast` component for feedback
- Use shared `Skeleton` components for loading states
- Use shared formatters for dates and currencies

## Schema Changes

```bash
# 1. Edit prisma/schema.prisma

# 2. Push changes to database
npx prisma db push

# 3. Regenerate Prisma client
npx prisma generate

# 4. TypeScript check
npx tsc --noEmit
```

Note: `prisma db push` for SQLite may require `--accept-data-loss` if changing column types.

## Adding a New Page

1. Create `src/app/[route]/page.tsx`
2. If it needs auth, the middleware will auto-protect it
3. If it should be public, add the path to `PUBLIC_PATHS` in middleware
4. If it needs an API, create `src/app/api/[route]/route.ts`
5. If it needs a sidebar link, add it to `src/components/Sidebar.tsx`

## Adding a New API Route

1. Create `src/app/api/[route]/route.ts`
2. Export async functions: `GET`, `POST`, `PUT`, `DELETE`
3. Always verify auth token at the start
4. Use `getTenantPrisma()` for tenant-scoped queries
5. Return `NextResponse.json()` with appropriate status codes

## Testing
- No automated test framework is set up
- Manual testing via browser and API tools (Postman/curl)
- TypeScript compiler (`tsc --noEmit`) catches type errors
- ESLint for code quality (`npm run lint`)
