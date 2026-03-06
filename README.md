This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

### 🏠 Homepage Features
- **Smart Search**: Search recipes by title, description, or ingredients
- **Advanced Filtering**: Filter by dietary preferences, meal category, and cooking time
- **Flexible Sorting**: Sort by recency, alphabetical, or serving size
- **Real-time Results**: Instant filtering and sorting as you type

### 👨‍🍳 Recipe Management
- **Tabbed Interface**: Toggle between ingredients and instructions
- **Rich Metadata**: Add categories, dietary preferences, cooking time, and tags to recipes
- **Draft Management**: Cancel new recipes without leaving data behind
- **Mobile-First**: Optimized for cooking on mobile devices

### 📅 Meal Planning
- **Weekly Planning**: Plan meals for each day of the week
- **Shopping Integration**: Generate shopping lists from meal plans

## Database Setup

### Initial Schema Migration
Run the following SQL in your Supabase SQL Editor to set up the enhanced recipe schema:

```sql
-- Run this file: enhance-recipes-schema.sql
-- Adds category, total_time, and tags fields to recipes table
```

### Environment Variables
Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
